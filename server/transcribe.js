import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';
import {config} from './config.js';
import {runCommand} from './shell.js';

const hasOpenAi = Boolean(config.openAiApiKey);
const openai = hasOpenAi ? new OpenAI({apiKey: config.openAiApiKey}) : null;

const mockTranscript = ({brief, durationSec}) => {
  const fallback =
    brief?.trim() ||
    'Bienvenidos, hoy veremos resultados comparativos y una llamada a la accion final para suscribirse al canal.';
  const tokens = fallback.split(/\s+/).filter(Boolean);

  const words = tokens.map((word, index) => {
    const start = (index / Math.max(1, tokens.length)) * Math.max(1, durationSec - 0.5);
    const end = start + 0.3;
    return {word, start, end};
  });

  return {
    text: fallback,
    words,
    source: 'mock',
  };
};

const createTempAudioPath = (suffix = '.mp3') => {
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return path.join(config.uploadsDir, `.transcribe-${token}${suffix}`);
};

const extractAudio = async ({videoPath, outputPath, startSec, durationSec}) => {
  const args = ['-y'];

  if (Number.isFinite(startSec) && startSec > 0) {
    args.push('-ss', String(startSec));
  }

  args.push('-i', videoPath);

  if (Number.isFinite(durationSec) && durationSec > 0) {
    args.push('-t', String(durationSec));
  }

  args.push('-vn', '-ac', '1', '-ar', '16000', '-c:a', 'libmp3lame', '-b:a', '32k', outputPath);

  await runCommand('ffmpeg', args);
};

const mapTranscriptWords = (rawWords, offsetSec) => {
  return (rawWords || []).map((item) => ({
    word: item.word,
    start: Number(item.start || 0) + offsetSec,
    end: Number(item.end || item.start || 0) + offsetSec,
  }));
};

const transcribeAudioFile = async ({audioPath, offsetSec = 0}) => {
  const response = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: config.transcribeModel,
    response_format: 'verbose_json',
    timestamp_granularities: ['word'],
  });

  return {
    text: (response.text || '').trim(),
    words: mapTranscriptWords(response.words, offsetSec),
  };
};

const transcribeWithPreparedAudio = async ({videoPath, durationSec}) => {
  const filesToCleanup = [];

  try {
    const fullAudioPath = createTempAudioPath('.full.mp3');
    filesToCleanup.push(fullAudioPath);
    await extractAudio({videoPath, outputPath: fullAudioPath});

    const fullAudioStats = await fsPromises.stat(fullAudioPath);
    if (fullAudioStats.size <= config.transcribeMaxBytes) {
      const transcript = await transcribeAudioFile({
        audioPath: fullAudioPath,
      });

      return {
        ...transcript,
        source: 'openai',
      };
    }

    const chunkSeconds = Math.max(120, config.transcribeChunkSeconds);
    const mergedWords = [];
    const mergedText = [];

    for (let cursor = 0; cursor < durationSec; cursor += chunkSeconds) {
      const segmentDuration = Math.min(chunkSeconds, durationSec - cursor);
      const chunkPath = createTempAudioPath(`.chunk-${Math.floor(cursor)}.mp3`);
      filesToCleanup.push(chunkPath);

      await extractAudio({
        videoPath,
        outputPath: chunkPath,
        startSec: cursor,
        durationSec: segmentDuration,
      });

      const chunkStats = await fsPromises.stat(chunkPath);
      if (chunkStats.size > config.transcribeMaxBytes) {
        throw new Error(
          `Segmento de audio (${Math.floor(cursor)}s - ${Math.floor(cursor + segmentDuration)}s) excede el límite de ${config.transcribeMaxBytes} bytes para OpenAI.`,
        );
      }

      const segmentTranscript = await transcribeAudioFile({
        audioPath: chunkPath,
        offsetSec: cursor,
      });

      if (segmentTranscript.text) {
        mergedText.push(segmentTranscript.text);
      }
      if (segmentTranscript.words.length > 0) {
        mergedWords.push(...segmentTranscript.words);
      }
    }

    return {
      text: mergedText.join(' ').trim(),
      words: mergedWords,
      source: 'openai-chunked',
    };
  } finally {
    await Promise.all(
      filesToCleanup.map((filePath) =>
        fsPromises.unlink(filePath).catch(() => {
          return undefined;
        }),
      ),
    );
  }
};

const transcribeRawVideo = async ({videoPath}) => {
  const response = await openai.audio.transcriptions.create({
    file: fs.createReadStream(videoPath),
    model: config.transcribeModel,
    response_format: 'verbose_json',
    timestamp_granularities: ['word'],
  });

  return {
    text: (response.text || '').trim(),
    words: mapTranscriptWords(response.words, 0),
    source: 'openai-raw',
  };
};

const getErrorMessage = (error) => {
  if (error?.error?.message) {
    return error.error.message;
  }
  if (error?.message) {
    return error.message;
  }
  return String(error);
};

export const transcribeVideo = async ({videoPath, brief, durationSec}) => {
  if (!hasOpenAi) {
    return mockTranscript({brief, durationSec});
  }

  try {
    return await transcribeWithPreparedAudio({videoPath, durationSec});
  } catch (error) {
    try {
      return await transcribeRawVideo({videoPath});
    } catch (secondError) {
      const fallback = mockTranscript({brief, durationSec});
      return {
        ...fallback,
        warning: `Falló transcripción OpenAI: ${getErrorMessage(error)}. Intento alternativo: ${getErrorMessage(secondError)}`,
      };
    }
  }
};

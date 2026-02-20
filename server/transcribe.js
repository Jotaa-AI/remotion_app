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

  // Cadena de limpieza para priorizar voz en español:
  // - downmix a mono
  // - filtrar graves y agudos extremos
  // - normalizar sonoridad
  // - compresión suave para inteligibilidad
  const voiceFilter =
    'highpass=f=90,lowpass=f=7000,loudnorm=I=-16:LRA=11:TP=-1.5,acompressor=threshold=-18dB:ratio=2.5:attack=20:release=250:makeup=3';

  args.push('-vn', '-ac', '1', '-ar', '16000', '-af', voiceFilter, '-c:a', 'libmp3lame', '-b:a', '48k', outputPath);

  await runCommand('ffmpeg', args);
};

const mapTranscriptWords = (rawWords, offsetSec) => {
  return (rawWords || []).map((item) => ({
    word: item.word,
    start: Number(item.start || 0) + offsetSec,
    end: Number(item.end || item.start || 0) + offsetSec,
  }));
};

const buildTranscriptionParams = ({audioPath, prompt}) => ({
  file: fs.createReadStream(audioPath),
  model: config.transcribeModel,
  response_format: 'verbose_json',
  timestamp_granularities: ['word'],
  language: 'es',
  temperature: 0,
  prompt,
});

const transcribeAudioFile = async ({audioPath, offsetSec = 0, prompt = ''}) => {
  const response = await openai.audio.transcriptions.create(buildTranscriptionParams({audioPath, prompt}));

  return {
    text: (response.text || '').trim(),
    words: mapTranscriptWords(response.words, offsetSec),
  };
};

const transcribeWithPreparedAudio = async ({videoPath, durationSec, prompt}) => {
  const filesToCleanup = [];

  try {
    const fullAudioPath = createTempAudioPath('.full.mp3');
    filesToCleanup.push(fullAudioPath);
    await extractAudio({videoPath, outputPath: fullAudioPath});

    const fullAudioStats = await fsPromises.stat(fullAudioPath);
    if (fullAudioStats.size <= config.transcribeMaxBytes) {
      const transcript = await transcribeAudioFile({
        audioPath: fullAudioPath,
        prompt,
      });

      return {
        ...transcript,
        source: 'openai-es',
      };
    }

    const chunkSeconds = Math.max(90, config.transcribeChunkSeconds || 120);
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
        // Si un chunk sigue siendo grande, lo partimos en microchunks para no perder el tramo.
        const microSeconds = 45;
        for (let micro = cursor; micro < cursor + segmentDuration; micro += microSeconds) {
          const microDuration = Math.min(microSeconds, cursor + segmentDuration - micro);
          const microPath = createTempAudioPath(`.micro-${Math.floor(micro)}.mp3`);
          filesToCleanup.push(microPath);

          await extractAudio({
            videoPath,
            outputPath: microPath,
            startSec: micro,
            durationSec: microDuration,
          });

          const microTranscript = await transcribeAudioFile({
            audioPath: microPath,
            offsetSec: micro,
            prompt,
          });

          if (microTranscript.text) mergedText.push(microTranscript.text);
          if (microTranscript.words.length > 0) mergedWords.push(...microTranscript.words);
        }

        continue;
      }

      const segmentTranscript = await transcribeAudioFile({
        audioPath: chunkPath,
        offsetSec: cursor,
        prompt,
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
      source: 'openai-es-chunked',
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

const transcribeRawVideo = async ({videoPath, prompt}) => {
  const response = await openai.audio.transcriptions.create({
    file: fs.createReadStream(videoPath),
    model: config.transcribeModel,
    response_format: 'verbose_json',
    timestamp_granularities: ['word'],
    language: 'es',
    temperature: 0,
    prompt,
  });

  return {
    text: (response.text || '').trim(),
    words: mapTranscriptWords(response.words, 0),
    source: 'openai-es-raw',
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
    return {
      ...mockTranscript({brief, durationSec}),
      warning: 'No hay API key de OpenAI. Se usó transcripción de respaldo.',
    };
  }

  const prompt = [
    'Transcribe en español neutro.',
    'No traduzcas ni inventes contenido.',
    'Mantén nombres propios y tecnicismos tal como se pronuncien.',
    brief ? `Contexto del video: ${String(brief).slice(0, 300)}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  try {
    const transcript = await transcribeWithPreparedAudio({videoPath, durationSec, prompt});
    if (!transcript.text) {
      throw new Error('La transcripción llegó vacía.');
    }
    return transcript;
  } catch (error) {
    try {
      const raw = await transcribeRawVideo({videoPath, prompt});
      if (!raw.text) {
        throw new Error('La transcripción raw llegó vacía.');
      }
      return {
        ...raw,
        warning: `Se usó ruta alternativa de transcripción por audio preparado fallido: ${getErrorMessage(error)}`,
      };
    } catch (secondError) {
      const fallback = mockTranscript({brief, durationSec});
      return {
        ...fallback,
        warning: `Falló transcripción OpenAI. Error principal: ${getErrorMessage(error)}. Alternativo: ${getErrorMessage(secondError)}.`,
      };
    }
  }
};

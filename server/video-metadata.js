import {config} from './config.js';
import {runCommand} from './shell.js';

export const getVideoMetadata = async (videoPath) => {
  try {
    const {stdout} = await runCommand('ffprobe', [
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_streams',
      '-show_format',
      videoPath,
    ]);

    const parsed = JSON.parse(stdout);
    const videoStream = parsed.streams?.find((stream) => stream.codec_type === 'video');

    const durationSec = Number(parsed.format?.duration || videoStream?.duration || 0);
    const width = Number(videoStream?.width || config.defaultWidth);
    const height = Number(videoStream?.height || config.defaultHeight);

    if (!Number.isFinite(durationSec) || durationSec <= 0) {
      throw new Error('Duration not found in ffprobe output.');
    }

    return {
      width,
      height,
      durationSec,
    };
  } catch (error) {
    return {
      width: config.defaultWidth,
      height: config.defaultHeight,
      durationSec: 30,
      warning: `No se pudo leer metadata con ffprobe: ${error.message}`,
    };
  }
};

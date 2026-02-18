import fs from 'fs';
import path from 'path';
import {config} from './config.js';
import {runCommand} from './shell.js';

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

const toUrl = (value) => {
  try {
    return new URL(String(value || '').trim());
  } catch {
    return null;
  }
};

export const isYoutubeUrl = (value) => {
  const parsed = toUrl(value);
  if (!parsed) {
    return false;
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  if (YOUTUBE_HOSTS.has(host)) {
    return true;
  }
  return host.endsWith('.youtube.com');
};

const findDownloadedFile = (prefix) => {
  const candidates = fs
    .readdirSync(config.uploadsDir)
    .filter((filename) => filename.startsWith(prefix))
    .map((filename) => {
      const fullPath = path.join(config.uploadsDir, filename);
      return {
        filename,
        fullPath,
        mtimeMs: fs.statSync(fullPath).mtimeMs,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return candidates[0] || null;
};

export const downloadYoutubeVideo = async ({jobId, youtubeUrl}) => {
  const token = `yt-${jobId}-${Date.now()}`;
  const outputTemplate = path.join(config.uploadsDir, `${token}.%(ext)s`);

  try {
    await runCommand('yt-dlp', [
      '--no-playlist',
      '--merge-output-format',
      'mp4',
      '-f',
      'bestvideo+bestaudio/best',
      '--restrict-filenames',
      '--newline',
      '-o',
      outputTemplate,
      youtubeUrl,
    ]);
  } catch (error) {
    if (/ENOENT|spawn yt-dlp/i.test(String(error?.message || ''))) {
      throw new Error(
        'No se encontró `yt-dlp` en el sistema. Instálalo para habilitar ingest de YouTube (brew install yt-dlp).',
      );
    }
    throw new Error(`No se pudo descargar el video de YouTube: ${error.message}`);
  }

  const downloaded = findDownloadedFile(token);
  if (!downloaded) {
    throw new Error('yt-dlp terminó, pero no se encontró el archivo descargado en uploads.');
  }

  const stats = fs.statSync(downloaded.fullPath);
  return {
    filename: downloaded.filename,
    originalname: downloaded.filename,
    mimetype: 'video/mp4',
    size: stats.size,
    path: downloaded.fullPath,
  };
};

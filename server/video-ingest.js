import fs from 'fs';
import path from 'path';
import {Readable} from 'stream';
import {config} from './config.js';
import {runCommand} from './shell.js';
import ytdl from '@distube/ytdl-core';

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

const BLOB_HOST_SUFFIXES = ['.public.blob.vercel-storage.com'];

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

export const isSupportedRemoteVideoUrl = (value) => {
  const parsed = toUrl(value);
  if (!parsed) return false;
  if (!['http:', 'https:'].includes(parsed.protocol)) return false;

  const host = parsed.hostname.toLowerCase();
  if (isYoutubeUrl(value)) return true;
  if (BLOB_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true;
  return false;
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
  } catch (error) {
    const missingYtDlp = /ENOENT|spawn yt-dlp/i.test(String(error?.message || ''));
    if (!missingYtDlp) {
      throw new Error(`No se pudo descargar el video de YouTube: ${error.message}`);
    }

    // Fallback Vercel-friendly: ytdl-core (sin binarios externos)
    try {
      const cookieHeader = process.env.YOUTUBE_COOKIE || '';
      const requestOptions = cookieHeader
        ? {
            headers: {
              cookie: cookieHeader,
              'user-agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            },
          }
        : undefined;

      const info = await ytdl.getInfo(youtubeUrl, {
        requestOptions,
      });

      const format =
        ytdl.chooseFormat(info.formats, {
          quality: 'highest',
          filter: (f) => f.hasVideo && f.hasAudio && f.container === 'mp4',
        }) || ytdl.chooseFormat(info.formats, {quality: 'highest', filter: 'audioandvideo'});

      if (!format || !format.url) {
        throw new Error('No se encontró un formato reproducible en YouTube.');
      }

      const filename = `${token}.mp4`;
      const fullPath = path.join(config.uploadsDir, filename);

      await new Promise((resolve, reject) => {
        const ws = fs.createWriteStream(fullPath);
        ytdl
          .downloadFromInfo(info, {format, requestOptions})
          .on('error', reject)
          .pipe(ws)
          .on('finish', resolve)
          .on('error', reject);
      });

      const stats = fs.statSync(fullPath);
      return {
        filename,
        originalname: filename,
        mimetype: 'video/mp4',
        size: stats.size,
        path: fullPath,
      };
    } catch (fallbackError) {
      const hint =
        String(fallbackError?.message || '').includes('410') || String(fallbackError?.message || '').includes('403')
          ? ' YouTube bloqueó la descarga desde servidor. Prueba otro enlace o configura YOUTUBE_COOKIE en Vercel.'
          : '';
      throw new Error(`No se pudo descargar el video de YouTube (fallback): ${fallbackError.message}.${hint}`);
    }
  }
};

export const downloadRemoteVideo = async ({jobId, sourceUrl}) => {
  const parsed = toUrl(sourceUrl);
  if (!parsed) {
    throw new Error('URL remota inválida.');
  }

  const extFromPath = path.extname(parsed.pathname || '').toLowerCase();
  const ext = ['.mp4', '.mov', '.webm', '.mkv'].includes(extFromPath) ? extFromPath : '.mp4';
  const filename = `remote-${jobId}-${Date.now()}${ext}`;
  const fullPath = path.join(config.uploadsDir, filename);

  const response = await fetch(parsed.toString());
  if (!response.ok || !response.body) {
    throw new Error(`No se pudo descargar el video remoto (HTTP ${response.status}).`);
  }

  const stream = fs.createWriteStream(fullPath);
  await new Promise((resolve, reject) => {
    const nodeReadable = Readable.fromWeb(response.body);
    nodeReadable.pipe(stream);
    nodeReadable.on('error', reject);
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  const stats = fs.statSync(fullPath);
  return {
    filename,
    originalname: filename,
    mimetype: response.headers.get('content-type') || 'video/mp4',
    size: stats.size,
    path: fullPath,
  };
};

import dotenv from 'dotenv';
import path from 'path';
import {fileURLToPath} from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
const DATA_DIR = IS_VERCEL ? path.join('/tmp', 'smart-overlay-mvp-data') : path.join(ROOT_DIR, 'data');
const PORT = Number(process.env.PORT || 8787);
const BASE_URL =
  process.env.BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${PORT}`);

export const config = {
  port: PORT,
  baseUrl: BASE_URL,
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  transcribeModel: process.env.TRANSCRIBE_MODEL || 'whisper-1',
  transcribeMaxBytes: Number(process.env.TRANSCRIBE_MAX_BYTES || 24 * 1024 * 1024),
  transcribeChunkSeconds: Number(process.env.TRANSCRIBE_CHUNK_SECONDS || 900),
  llmModel: process.env.LLM_MODEL || 'gpt-4o-mini',
  fps: Number(process.env.RENDER_FPS || 30),
  defaultWidth: Number(process.env.DEFAULT_WIDTH || 1920),
  defaultHeight: Number(process.env.DEFAULT_HEIGHT || 1080),
  isVercel: IS_VERCEL,
  rootDir: ROOT_DIR,
  uploadsDir: path.join(DATA_DIR, 'uploads'),
  rendersDir: path.join(DATA_DIR, 'renders'),
  jobsDir: path.join(DATA_DIR, 'jobs'),
  remotionEntry: path.join(ROOT_DIR, 'remotion', 'index.jsx'),
  useSceneGraph: String(process.env.USE_SCENE_GRAPH || 'false').toLowerCase() === 'true',
};

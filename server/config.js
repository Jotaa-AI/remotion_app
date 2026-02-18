import dotenv from 'dotenv';
import path from 'path';
import {fileURLToPath} from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

export const config = {
  port: Number(process.env.PORT || 8787),
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 8787}`,
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  transcribeModel: process.env.TRANSCRIBE_MODEL || 'whisper-1',
  transcribeMaxBytes: Number(process.env.TRANSCRIBE_MAX_BYTES || 24 * 1024 * 1024),
  transcribeChunkSeconds: Number(process.env.TRANSCRIBE_CHUNK_SECONDS || 900),
  llmModel: process.env.LLM_MODEL || 'gpt-4o-mini',
  fps: Number(process.env.RENDER_FPS || 30),
  defaultWidth: Number(process.env.DEFAULT_WIDTH || 1920),
  defaultHeight: Number(process.env.DEFAULT_HEIGHT || 1080),
  rootDir: ROOT_DIR,
  uploadsDir: path.join(ROOT_DIR, 'data', 'uploads'),
  rendersDir: path.join(ROOT_DIR, 'data', 'renders'),
  jobsDir: path.join(ROOT_DIR, 'data', 'jobs'),
  remotionEntry: path.join(ROOT_DIR, 'remotion', 'index.jsx'),
  useSceneGraph: String(process.env.USE_SCENE_GRAPH || 'false').toLowerCase() === 'true',
};

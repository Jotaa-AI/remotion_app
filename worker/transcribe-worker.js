import express from 'express';
import dotenv from 'dotenv';
import {transcribeVideo} from '../server/transcribe.js';

dotenv.config();

const app = express();
app.use(express.json({limit: '2mb'}));

const port = Number(process.env.TRANSCRIBE_WORKER_PORT || 8790);
const token = process.env.TRANSCRIBE_WORKER_TOKEN || '';

app.get('/health', (_req, res) => {
  res.json({ok: true, service: 'transcribe-worker'});
});

app.post('/transcribe', async (req, res) => {
  try {
    if (token) {
      const auth = String(req.headers.authorization || '');
      if (auth !== `Bearer ${token}`) {
        res.status(401).json({error: 'Unauthorized'});
        return;
      }
    }

    const videoPath = String(req.body?.videoPath || '').trim();
    const brief = String(req.body?.brief || '').trim();
    const durationSec = Number(req.body?.durationSec || 0);

    if (!videoPath) {
      res.status(400).json({error: 'videoPath requerido'});
      return;
    }

    const result = await transcribeVideo({videoPath, brief, durationSec});
    res.json(result);
  } catch (error) {
    res.status(500).json({error: error.message || 'Error en worker de transcripción'});
  }
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Transcribe worker escuchando en http://localhost:${port}`);
});

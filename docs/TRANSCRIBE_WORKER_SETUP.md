# Transcribe Worker (VPS) - Setup rápido

Objetivo: mover transcripción fuera de Vercel para evitar fallos por falta de ffmpeg/ffprobe.

## 1) En el VPS (worker)

Configura variables de entorno:

- `OPENAI_API_KEY`
- `TRANSCRIBE_WORKER_PORT=8790` (o el puerto que prefieras)
- `TRANSCRIBE_WORKER_TOKEN=<token-secreto-largo>`
- `TRANSCRIBE_WORKER_URL=` (vacío en worker para evitar recursion)

Arranque:

```bash
npm run worker:transcribe
```

Healthcheck:

`GET http://<VPS_HOST>:8790/health`

## 2) En Vercel (app)

Añade:

- `TRANSCRIBE_WORKER_URL=http://<VPS_HOST>:8790`
- `TRANSCRIBE_WORKER_TOKEN=<token-secreto-largo>`

Mantén también:

- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 3) Qué cambia en runtime

Cuando `TRANSCRIBE_WORKER_URL` está configurado, la app delega la transcripción al worker.
Si el worker falla, intenta fallback local (si procede).

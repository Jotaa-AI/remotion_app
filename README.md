# Smart Overlay MVP

MVP funcional para validar el concepto de **"subes video (local o YouTube) + IA propone animaciones + eliges/ajustas + descarga final lista para YouTube"**.

## Qué hace

1. Subes un video local o pegas un enlace de YouTube.
2. El backend transcribe el video (OpenAI opcional).
3. Se genera un análisis estratégico exhaustivo por tramos importantes del video (texto explicativo por timestamp).
4. Un planificador IA/rules propone overlays estratégicos con `template + timestamps + payload`.
5. Revisas la propuesta en UI y seleccionas qué animaciones quieres usar.
6. Editas texto, tiempo y estilo de cada animación o añades nuevas.
7. Opcionalmente ajustas con IA (iterativo).
8. Cuando estás conforme, lanzas el render final.
9. Descargas el MP4 final listo para YouTube.

## Stack

- API: Express + Multer
- IA: OpenAI (opcional, con fallback heurístico local)
- Render: Remotion (`@remotion/bundler`, `@remotion/renderer`)
- Frontend: HTML/CSS/JS vanilla

## Requisitos

- Node.js 20+
- `ffmpeg` + `ffprobe` instalados en el sistema
- `yt-dlp` instalado si quieres usar enlaces de YouTube
- (Opcional) `OPENAI_API_KEY` para mejor calidad de transcripción y planificación semántica

## Arranque

```bash
cp .env.example .env
npm install
npm run dev
```

Abrir: `http://localhost:8787`

## Flujo API

- `POST /api/jobs`
  - `multipart/form-data`
  - Campos:
    - `video`: archivo de video (opcional)
    - `youtubeUrl`: enlace de YouTube (opcional)
  - Reglas:
    - Debes enviar al menos uno (`video` o `youtubeUrl`)
  - Acción:
    - solo analiza/transcribe y propone overlays (no renderiza todavía)
- `POST /api/jobs/:id/refine`
  - `application/json`
  - Campos:
    - `instruction`: instrucción para ajustar la propuesta con IA
- `POST /api/jobs/:id/visual-overrides`
  - `application/json`
  - Campos:
    - `overrides`: array de ajustes visuales por `id` de overlay
      - selección: `enabled`
      - contenido: `title`, `subtitle`, `startSec`, `durationSec`
      - estilo: `layout`, `intent`, `stylePack`, `enter`, `exit`, `effects[]`, `typography`, `energy`, `position`, colores
      - alta manual: `isNew: true`
- `POST /api/jobs/:id/render`
  - Acción:
    - inicia el render final usando la propuesta revisada
- `GET /api/jobs/:id`
  - Estado del job + `analysisInsights` + plan + link de descarga cuando termina

## Plantillas incluidas

- `lower-third`
- `subscribe`
- `subscribe-sticker` (estilo sticker/comic, tipo referencia social)
- `stat-compare`
- `text-pop`
- `cta-banner`

## Toolkit de animación Remotion (controlado por IA)

La IA ahora puede seleccionar presets de animación en `payload.motion`:

- `enter`: `spring-pop`, `slide-up`, `slide-left`, `whip-left`, `stamp`, `tilt-in`
- `exit`: `fade`, `shrink`, `slide-down`, `swipe-right`
- `effects`: `wiggle`, `float`, `pulse`, `shake`, `glow`, `saturate`
- `stylePack`: `clean`, `comic-blue`, `retro-red`

## Variables de entorno

Ver `.env.example`.

Clave:

- `OPENAI_API_KEY`: si no existe, el MVP usa planificación heurística para que siga funcionando.

## Limitaciones actuales (esperadas en MVP)

- Cola en memoria (si reinicias servidor, se pierde estado en RAM del proceso)
- Sin autenticación multiusuario
- Ingest de YouTube requiere `yt-dlp` local instalado
- El plan de overlays prioriza validación de flujo, no calidad editorial final

## Próximo paso recomendado

- Añadir autenticación + storage externo (S3/R2)
- Migrar jobs a cola persistente (Redis)
- Añadir validación humana rápida del plan antes de render
- Integrar ingest por URL (YouTube/Loom) en un worker separado

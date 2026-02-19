import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import {v4 as uuid} from 'uuid';
import {config} from './config.js';
import {createJob, getJob, updateJob} from './job-store.js';
import {enqueueAnalysis, enqueueRender} from './pipeline.js';
import {applyOverlayToolkitDefaults, refineOverlayEvents, REMOTION_VISUAL_TOOLKIT} from './plan-overlays.js';
import {normalizeEvents} from './normalize-events.js';
import {handleUpload} from '@vercel/blob/client';
import {isSupportedRemoteVideoUrl, isYoutubeUrl} from './video-ingest.js';
import {eventsToScenes} from '../server-v2/event-to-scene.js';

const app = express();

for (const folder of [config.uploadsDir, config.rendersDir, config.jobsDir]) {
  fs.mkdirSync(folder, {recursive: true});
}

app.use(cors());
app.use(express.json({limit: '5mb'}));
app.use(express.urlencoded({extended: true}));

const storage = multer.diskStorage({
  destination: (_, __, callback) => callback(null, config.uploadsDir),
  filename: (_, file, callback) => {
    const ext = path.extname(file.originalname || '.mp4') || '.mp4';
    callback(null, `${uuid()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024,
  },
});

const ALLOWED_TEMPLATES = new Set([
  'lower-third',
  'subscribe',
  'subscribe-sticker',
  'stat-compare',
  'text-pop',
  'cta-banner',
]);

const ALLOWED_STYLE_PACKS = new Set(REMOTION_VISUAL_TOOLKIT.stylePacks);
const ALLOWED_ENTER = new Set(REMOTION_VISUAL_TOOLKIT.enter);
const ALLOWED_EXIT = new Set(REMOTION_VISUAL_TOOLKIT.exit);
const ALLOWED_EFFECTS = new Set(REMOTION_VISUAL_TOOLKIT.effects);
const ALLOWED_TYPOGRAPHY = new Set(REMOTION_VISUAL_TOOLKIT.typographyPresets || []);
const ALLOWED_ENERGY = new Set(REMOTION_VISUAL_TOOLKIT.energyLevels || []);
const ALLOWED_POSITION = new Set(REMOTION_VISUAL_TOOLKIT.positions || []);
const ALLOWED_INTENTS = new Set(REMOTION_VISUAL_TOOLKIT.intents || []);
const ALLOWED_LAYOUTS = new Set(REMOTION_VISUAL_TOOLKIT.layouts || []);

const toStringOrNull = (value) => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
};

const toHexOrNull = (value) => {
  const candidate = toStringOrNull(value);
  if (!candidate) {
    return null;
  }
  const lower = candidate.toLowerCase();
  return /^#[0-9a-f]{6}$/.test(lower) ? lower : null;
};

const toBooleanOrNull = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return null;
};

const toNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const upsertAnimationElement = (elements, type, patch) => {
  const list = Array.isArray(elements) ? [...elements] : [];
  const at = list.findIndex((entry) => String(entry?.type || '').toLowerCase() === type);
  const current = at >= 0 ? list[at] : {type};
  const next = {
    ...current,
    ...patch,
    type,
  };
  if (at >= 0) {
    list[at] = next;
  } else {
    list.push(next);
  }
  return list;
};

const getTemplateFromVisualChoice = ({template, layout, intent}) => {
  if (template && ALLOWED_TEMPLATES.has(template)) {
    return template;
  }

  if (layout === 'split-bars') return 'stat-compare';
  if (layout === 'sticker-burst') return 'subscribe-sticker';
  if (layout === 'cta-ribbon') return 'cta-banner';
  if (layout === 'quote-focus' || layout === 'data-pill') return 'text-pop';
  if (layout === 'headline-card') return 'lower-third';

  if (intent === 'proof') return 'stat-compare';
  if (intent === 'cta') return 'cta-banner';
  if (intent === 'hook') return 'lower-third';
  return 'text-pop';
};

const applyCopyToPayload = ({template, payload, title, subtitle}) => {
  const nextPayload = {
    ...(payload || {}),
    animationSpec: {
      ...((payload || {}).animationSpec || {}),
    },
  };

  let elements = Array.isArray(nextPayload.animationSpec.elements) ? nextPayload.animationSpec.elements : [];
  if (title) {
    elements = upsertAnimationElement(elements, 'title', {text: title});
  }
  if (subtitle) {
    elements = upsertAnimationElement(elements, 'subtitle', {text: subtitle});
  }
  nextPayload.animationSpec.elements = elements;

  if (template === 'stat-compare') {
    if (title) {
      nextPayload.title = title;
    }
    return nextPayload;
  }

  if (template === 'lower-third' || template === 'subscribe') {
    if (title) {
      nextPayload.title = title;
    }
    if (subtitle) {
      nextPayload.subtitle = subtitle;
    }
    return nextPayload;
  }

  if (template === 'cta-banner') {
    if (title) {
      nextPayload.text = title;
    }
    if (subtitle) {
      nextPayload.subtitle = subtitle;
    }
    return nextPayload;
  }

  if (template === 'subscribe-sticker') {
    if (title) {
      nextPayload.text = title;
    }
    if (subtitle) {
      nextPayload.caption = subtitle;
    }
    return nextPayload;
  }

  if (template === 'text-pop') {
    if (title) {
      nextPayload.text = title;
    }
    if (subtitle) {
      nextPayload.subtitle = subtitle;
    }
    return nextPayload;
  }

  if (title) {
    nextPayload.title = title;
  }
  if (subtitle) {
    nextPayload.subtitle = subtitle;
  }
  return nextPayload;
};

const createManualOverlay = ({override, durationSec}) => {
  const intent = override.intent || 'explanation';
  const layout = override.layout || 'quote-focus';
  const template = getTemplateFromVisualChoice({
    template: override.template,
    layout,
    intent,
  });
  const title = override.title || 'Nuevo punto importante';
  const subtitle = override.subtitle || 'Refuerzo visual añadido manualmente.';

  const payloadBase =
    template === 'stat-compare'
      ? {
          title,
          leftLabel: 'Antes',
          rightLabel: 'Después',
          leftValue: '10k',
          rightValue: '20k',
        }
      : template === 'subscribe-sticker'
        ? {
            text: title,
            badge: 'you',
            caption: subtitle,
          }
        : template === 'cta-banner'
          ? {
              text: title,
              subtitle,
              buttonText: 'Seguir +',
            }
          : template === 'lower-third'
            ? {
                title,
                subtitle,
                kicker: 'HIGHLIGHT',
              }
            : {
                text: title,
                subtitle,
                chip: 'CLAVE',
              };

  const maxStart = Math.max(0, Number(durationSec || 1) - 0.6);
  const start = Number.isFinite(override.startSec) ? Math.max(0, Math.min(maxStart, override.startSec)) : 0;
  const duration = Number.isFinite(override.durationSec) ? override.durationSec : 3;

  const payload = applyCopyToPayload({
    template,
    payload: {
      ...payloadBase,
      stylePack: override.stylePack || 'clean',
      motion: {
        enter: override.enter || 'spring-pop',
        exit: override.exit || 'fade',
        effects: Array.isArray(override.effects) ? override.effects : [],
      },
      design: {
        typography: override.typography || 'display-bold',
        energy: override.energy || 'balanced',
        position: override.position || 'center',
        primaryColor: override.primaryColor || null,
        accentColor: override.accentColor || null,
        textColor: override.textColor || null,
      },
      animationSpec: {
        intent,
        layout,
        emphasis: override.energy || 'balanced',
        elements: [],
      },
    },
    title,
    subtitle,
  });

  return {
    id: uuid(),
    template,
    startSec: start,
    durationSec: duration,
    payload,
    reasoning: 'Overlay añadido manualmente por el usuario.',
    confidence: 0.6,
  };
};

const serializeJob = (job) => {
  const inputSource =
    job.input?.sourceType === 'youtube'
      ? {
          type: 'youtube',
          label: job.input?.sourceUrl || 'YouTube',
        }
      : job.input?.sourceType === 'blob'
        ? {
            type: 'blob',
            label: job.input?.sourceUrl || 'Vercel Blob',
          }
        : {
            type: 'upload',
            label: job.input?.originalname || 'Archivo local',
          };

  return {
    id: job.id,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    warnings: job.warnings,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    inputSource,
    video: job.video,
    transcript: job.transcript
      ? {
          preview: job.transcript.preview,
          source: job.transcript.source,
          wordsCount: job.transcript.words?.length || 0,
        }
      : null,
    analysisInsights: job.analysisInsights || [],
    overlayPlan: job.overlayPlan,
    scenePlan: job.scenePlan || [],
    sceneQuality: job.sceneQuality || null,
    refinementHistory: job.refinementHistory || [],
    reviewState: job.reviewState || {
      mode: 'sequential',
      currentIndex: 0,
      approvedIds: [],
      rejectedIds: [],
      completed: false,
    },
    currentOverlay:
      Array.isArray(job.overlayPlan) && job.overlayPlan.length > 0
        ? job.overlayPlan[Math.max(0, Math.min((job.reviewState?.currentIndex || 0), job.overlayPlan.length - 1))]
        : null,
    output: job.output,
    visualToolkit: REMOTION_VISUAL_TOOLKIT,
  };
};

app.use('/media', express.static(config.uploadsDir));
app.use('/downloads', express.static(config.rendersDir));
app.use(express.static(path.join(config.rootDir, 'public')));

app.get('/api/health', (_, res) => {
  res.json({
    ok: true,
    service: 'smart-overlay-mvp',
    now: new Date().toISOString(),
  });
});

app.post('/api/blob/upload', async (req, res) => {
  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({source: 'smart-overlay-studio'}),
        };
      },
      onUploadCompleted: async () => {
        return;
      },
    });

    res.status(200).json(jsonResponse);
  } catch (error) {
    res.status(400).json({error: error.message || 'No se pudo preparar la subida a Blob.'});
  }
});

app.post('/api/jobs', upload.single('video'), (req, res) => {
  const youtubeUrl = toStringOrNull(req.body?.youtubeUrl);
  const blobUrl = toStringOrNull(req.body?.blobUrl);
  const hasFile = Boolean(req.file);
  const hasYoutube = Boolean(youtubeUrl);
  const hasBlob = Boolean(blobUrl);

  if (!hasFile && !hasYoutube && !hasBlob) {
    res.status(400).json({error: 'Debes subir un video local, pegar YouTube o enviar blobUrl.'});
    return;
  }

  if (!hasFile && hasYoutube && !isYoutubeUrl(youtubeUrl)) {
    res.status(400).json({error: 'El enlace debe ser una URL válida de YouTube.'});
    return;
  }

  if (!hasFile && hasBlob && !isSupportedRemoteVideoUrl(blobUrl)) {
    res.status(400).json({error: 'El blobUrl no es válido o no está permitido.'});
    return;
  }

  const job = hasFile
    ? createJob({file: req.file})
    : createJob({
        sourceUrl: hasBlob ? blobUrl : youtubeUrl,
        sourceType: hasBlob ? 'blob' : 'youtube',
      });
  enqueueAnalysis(job.id);

  res.status(202).json({
    jobId: job.id,
    status: 'queued',
    stage: 'analyze-queued',
    progress: 0,
  });
});

app.post('/api/jobs/:id/refine', async (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({error: 'Job no encontrado.'});
    return;
  }

  const instruction = String(req.body?.instruction || '').trim();
  if (!instruction) {
    res.status(400).json({error: 'Debes escribir una instrucción para ajustar la propuesta.'});
    return;
  }

  if (!job.transcript || !job.video || !job.overlayPlan) {
    res.status(409).json({error: 'El análisis aún no está listo. Espera a la etapa "review-ready".'});
    return;
  }

  updateJob(job.id, {
    status: 'review',
    stage: 'refining-overlays',
    error: null,
  });

  try {
    const currentIndex = Math.max(0, Math.min(job.reviewState?.currentIndex || 0, job.overlayPlan.length - 1));
    const targetEvent = job.overlayPlan[currentIndex];

    const refined = await refineOverlayEvents({
      brief: job.brief,
      transcriptText: job.transcript.text,
      words: job.transcript.words,
      durationSec: job.video.durationSec,
      currentEvents: targetEvent ? [targetEvent] : [],
      instruction,
    });

    const refinedCurrent = normalizeEvents({
      events: Array.isArray(refined.events) ? refined.events.slice(0, 1) : [],
      durationSec: job.video.durationSec,
    })[0];

    const nextOverlayPlan = [...job.overlayPlan];
    if (refinedCurrent) {
      nextOverlayPlan[currentIndex] = {
        ...refinedCurrent,
        id: targetEvent?.id || refinedCurrent.id,
      };
    }

    const refreshed = getJob(job.id);
    const updated = updateJob(job.id, {
      status: 'review',
      stage: 'review-ready',
      overlayPlan: nextOverlayPlan,
      refinementHistory: [
        ...(refreshed?.refinementHistory || []),
        {
          at: new Date().toISOString(),
          instruction,
          overlays: nextOverlayPlan.length,
          targetIndex: currentIndex,
        },
      ],
    });

    res.json(serializeJob(updated));
  } catch (error) {
    const updated = updateJob(job.id, {
      status: 'review',
      stage: 'review-ready',
      error: error.message,
    });

    res.status(500).json({
      error: error.message,
      job: updated ? serializeJob(updated) : null,
    });
  }
});

app.post('/api/jobs/:id/visual-overrides', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({error: 'Job no encontrado.'});
    return;
  }

  if (!job.overlayPlan || !job.video || !job.transcript) {
    res.status(409).json({error: 'Primero debes completar el análisis.'});
    return;
  }

  const rawOverrides = Array.isArray(req.body?.overrides) ? req.body.overrides : null;
  if (!rawOverrides || rawOverrides.length === 0) {
    res.status(400).json({error: 'Debes enviar una lista de overrides visuales.'});
    return;
  }

  const byId = new Map();
  const ordered = [];

  for (const raw of rawOverrides.slice(0, 60)) {
    const id = toStringOrNull(raw?.id);
    if (!id) {
      continue;
    }

    const template = toStringOrNull(raw?.template);
    const stylePack = toStringOrNull(raw?.stylePack);
    const enter = toStringOrNull(raw?.enter);
    const exit = toStringOrNull(raw?.exit);
    const typography = toStringOrNull(raw?.typography);
    const energy = toStringOrNull(raw?.energy);
    const position = toStringOrNull(raw?.position);
    const intent = toStringOrNull(raw?.intent);
    const layout = toStringOrNull(raw?.layout);
    const primaryColor = toHexOrNull(raw?.primaryColor);
    const accentColor = toHexOrNull(raw?.accentColor);
    const textColor = toHexOrNull(raw?.textColor);
    const enabledRaw = toBooleanOrNull(raw?.enabled);
    const isNewRaw = toBooleanOrNull(raw?.isNew);
    const startSec = toNumberOrNull(raw?.startSec);
    const durationSec = toNumberOrNull(raw?.durationSec);
    const title = toStringOrNull(raw?.title);
    const subtitle = toStringOrNull(raw?.subtitle);
    const effects = Array.isArray(raw?.effects)
      ? raw.effects
          .map((item) => toStringOrNull(item))
          .filter(Boolean)
          .filter((item, index, arr) => arr.indexOf(item) === index)
      : null;

    const normalized = {
      id,
      enabled: enabledRaw === null ? true : enabledRaw,
      isNew: isNewRaw === true,
      template: template && ALLOWED_TEMPLATES.has(template) ? template : null,
      stylePack: stylePack && ALLOWED_STYLE_PACKS.has(stylePack) ? stylePack : null,
      enter: enter && ALLOWED_ENTER.has(enter) ? enter : null,
      exit: exit && ALLOWED_EXIT.has(exit) ? exit : null,
      effects: effects ? effects.filter((item) => ALLOWED_EFFECTS.has(item)) : null,
      typography: typography && ALLOWED_TYPOGRAPHY.has(typography) ? typography : null,
      energy: energy && ALLOWED_ENERGY.has(energy) ? energy : null,
      position: position && ALLOWED_POSITION.has(position) ? position : null,
      intent: intent && ALLOWED_INTENTS.has(intent) ? intent : null,
      layout: layout && ALLOWED_LAYOUTS.has(layout) ? layout : null,
      primaryColor,
      accentColor,
      textColor,
      startSec,
      durationSec,
      title,
      subtitle,
    };

    byId.set(id, normalized);
    ordered.push(normalized);
  }

  const existingById = new Map(job.overlayPlan.map((event) => [event.id, event]));
  const patched = [];

  for (const event of job.overlayPlan) {
    const override = byId.get(event.id);
    if (!override) {
      patched.push(event);
      continue;
    }

    if (!override.enabled) {
      continue;
    }

    const payload = {
      ...(event.payload || {}),
      motion: {
        ...((event.payload || {}).motion || {}),
      },
      design: {
        ...((event.payload || {}).design || {}),
      },
      animationSpec: {
        ...((event.payload || {}).animationSpec || {}),
      },
    };

    if (override.stylePack) {
      payload.stylePack = override.stylePack;
    }
    if (override.enter) {
      payload.motion.enter = override.enter;
    }
    if (override.exit) {
      payload.motion.exit = override.exit;
    }
    if (override.effects) {
      payload.motion.effects = override.effects;
    }
    if (override.typography) {
      payload.design.typography = override.typography;
    }
    if (override.energy) {
      payload.design.energy = override.energy;
    }
    if (override.position) {
      payload.design.position = override.position;
    }
    if (override.primaryColor) {
      payload.design.primaryColor = override.primaryColor;
    }
    if (override.accentColor) {
      payload.design.accentColor = override.accentColor;
    }
    if (override.textColor) {
      payload.design.textColor = override.textColor;
    }
    if (override.intent) {
      payload.animationSpec.intent = override.intent;
    }
    if (override.layout) {
      payload.animationSpec.layout = override.layout;
    }

    const template = getTemplateFromVisualChoice({
      template: override.template || event.template,
      layout: payload.animationSpec.layout,
      intent: payload.animationSpec.intent,
    });

    const payloadWithCopy = applyCopyToPayload({
      template,
      payload,
      title: override.title,
      subtitle: override.subtitle,
    });

    patched.push({
      ...event,
      template,
      startSec: Number.isFinite(override.startSec) ? override.startSec : event.startSec,
      durationSec: Number.isFinite(override.durationSec) ? override.durationSec : event.durationSec,
      payload: payloadWithCopy,
    });
  }

  for (const override of ordered) {
    if (!override.enabled) {
      continue;
    }

    if (!override.isNew && existingById.has(override.id)) {
      continue;
    }

    const manualOverlay = createManualOverlay({
      override,
      durationSec: job.video.durationSec,
    });
    patched.push(manualOverlay);
  }

  const withDefaults = applyOverlayToolkitDefaults(patched);
  const normalizedEvents = normalizeEvents({
    events: withDefaults,
    durationSec: job.video.durationSec,
  });

  const refreshed = getJob(job.id);
  const updated = updateJob(job.id, {
    status: 'review',
    stage: 'review-ready',
    overlayPlan: normalizedEvents,
    refinementHistory: [
      ...(refreshed?.refinementHistory || []),
      {
        at: new Date().toISOString(),
        instruction: '[Editor visual] Selección y ajustes manuales de animaciones',
        overlays: normalizedEvents.length,
      },
    ],
  });

  res.json(serializeJob(updated));
});

app.post('/api/jobs/:id/review/advance', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({error: 'Job no encontrado.'});
    return;
  }

  if (!Array.isArray(job.overlayPlan) || job.overlayPlan.length === 0) {
    res.status(409).json({error: 'No hay animaciones para revisar.'});
    return;
  }

  const action = String(req.body?.action || 'approve').trim().toLowerCase();
  if (!['approve', 'reject', 'skip'].includes(action)) {
    res.status(400).json({error: 'Acción inválida. Usa approve, reject o skip.'});
    return;
  }

  const state = job.reviewState || {
    mode: 'sequential',
    currentIndex: 0,
    approvedIds: [],
    rejectedIds: [],
    completed: false,
  };

  const currentIndex = Math.max(0, Math.min(state.currentIndex || 0, job.overlayPlan.length - 1));
  const current = job.overlayPlan[currentIndex];

  const approvedIds = Array.isArray(state.approvedIds) ? [...state.approvedIds] : [];
  const rejectedIds = Array.isArray(state.rejectedIds) ? [...state.rejectedIds] : [];

  if (current?.id) {
    if (action === 'approve' && !approvedIds.includes(current.id)) {
      approvedIds.push(current.id);
    }
    if ((action === 'reject' || action === 'skip') && !rejectedIds.includes(current.id)) {
      rejectedIds.push(current.id);
    }
  }

  const nextIndex = Math.min(currentIndex + 1, job.overlayPlan.length);
  const completed = nextIndex >= job.overlayPlan.length;

  const updated = updateJob(job.id, {
    status: 'review',
    stage: completed ? 'review-ready' : 'review-ready',
    reviewState: {
      mode: 'sequential',
      currentIndex: completed ? job.overlayPlan.length - 1 : nextIndex,
      approvedIds,
      rejectedIds,
      completed,
    },
  });

  res.json(serializeJob(updated));
});

app.post('/api/jobs/:id/render', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({error: 'Job no encontrado.'});
    return;
  }

  const approvedIds = Array.isArray(job.reviewState?.approvedIds) ? job.reviewState.approvedIds : [];
  const approvedOverlays = Array.isArray(job.overlayPlan)
    ? job.overlayPlan.filter((event) => approvedIds.includes(event.id))
    : [];

  const hasOverlayPlan = approvedOverlays.length > 0;
  const hasScenePlan = Array.isArray(job.scenePlan) && job.scenePlan.length > 0;

  if (!(hasOverlayPlan || hasScenePlan) || !job.video || !job.transcript) {
    res.status(409).json({error: 'Debes aprobar al menos una animación antes de renderizar.'});
    return;
  }

  if (approvedOverlays.length > 0) {
    updateJob(job.id, {
      overlayPlan: approvedOverlays,
      scenePlan: eventsToScenes({events: approvedOverlays}),
    });
  }

  if (job.stage === 'render-queued' || job.status === 'rendering') {
    res.status(409).json({error: 'El render ya está en curso.'});
    return;
  }

  enqueueRender(job.id);
  const queued = getJob(job.id);

  res.status(202).json(serializeJob(queued));
});

app.get('/api/jobs/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({error: 'Job no encontrado.'});
    return;
  }

  res.json(serializeJob(job));
});

app.get('*', (_, res) => {
  res.sendFile(path.join(config.rootDir, 'public', 'index.html'));
});

export default app;

if (!config.isVercel) {
  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Smart Overlay MVP escuchando en ${config.baseUrl}`);
  });
}

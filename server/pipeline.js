import path from 'path';
import {config} from './config.js';
import {getJob, updateJob} from './job-store.js';
import {getVideoMetadata} from './video-metadata.js';
import {transcribeVideo} from './transcribe.js';
import {buildExhaustiveAnalysisInsights} from './exhaustive-analysis.js';
import {planOverlayEvents} from './plan-overlays.js';
import {normalizeEvents} from './normalize-events.js';
import {renderCompositedVideo} from './remotion-render.js';
import {downloadRemoteVideo, downloadYoutubeVideo} from './video-ingest.js';
import {planSceneGraph} from '../server-v2/plan-scenes.js';
import {validateAndOptimizeScenes} from '../server-v2/scene-quality.js';

const queue = [];
let isProcessing = false;

const ensureInputReady = async (jobId, job) => {
  if (job.input?.path && job.input?.filename) {
    return job.input;
  }

  if ((job.input?.sourceType === 'youtube' || job.input?.sourceType === 'blob') && job.input?.sourceUrl) {
    // Para Blob en cloud, evitamos descargar de nuevo para no bloquear en serverless.
    if (job.input.sourceType === 'blob') {
      const filenameFromUrl = (() => {
        try {
          const parsed = new URL(job.input.sourceUrl);
          return decodeURIComponent(parsed.pathname.split('/').pop() || `blob-${jobId}.mp4`);
        } catch {
          return `blob-${jobId}.mp4`;
        }
      })();

      const input = {
        ...job.input,
        filename: filenameFromUrl,
        originalname: filenameFromUrl,
        mimetype: job.input.mimetype || 'video/mp4',
        size: job.input.size || null,
        path: job.input.sourceUrl,
        isRemote: true,
      };

      updateJob(jobId, {
        stage: 'input-download',
        progress: 6,
        input,
      });

      return input;
    }

    updateJob(jobId, {
      stage: 'input-download',
      progress: 6,
    });

    const downloaded = await downloadYoutubeVideo({
      jobId,
      youtubeUrl: job.input.sourceUrl,
    });

    const input = {
      ...job.input,
      ...downloaded,
      sourceType: job.input.sourceType,
    };

    updateJob(jobId, {input});
    return input;
  }

  throw new Error('No se encontró una fuente de video válida para el job.');
};

const ensureMetadata = async (jobId, job) => {
  if (job.video?.durationSec && job.video?.width && job.video?.height && job.input?.path) {
    return job.video;
  }

  if (!job.input?.path) {
    throw new Error('No hay archivo local de video para leer metadata.');
  }

  const metadata = await getVideoMetadata(job.input.path);
  if (metadata.warning) {
    updateJob(jobId, {warnings: [metadata.warning]});
  }

  updateJob(jobId, {video: metadata});
  return metadata;
};

const analyzeJob = async (jobId) => {
  let job = getJob(jobId);
  if (!job) {
    return;
  }

  updateJob(jobId, {
    status: 'analyzing',
    stage: 'video-metadata',
    progress: 10,
    error: null,
    output: null,
  });

  const resolvedInput = await ensureInputReady(jobId, job);
  job = getJob(jobId);
  if (!job) {
    return;
  }
  job = {
    ...job,
    input: resolvedInput,
  };

  const metadata = await ensureMetadata(jobId, job);

  updateJob(jobId, {
    status: 'analyzing',
    stage: 'transcription',
    progress: 32,
    video: metadata,
  });

  const transcript = await transcribeVideo({
    videoPath: resolvedInput.path,
    brief: job.brief,
    durationSec: metadata.durationSec,
  });

  const transcriptPreview = transcript.text.slice(0, 500);
  const transcriptWarnings = transcript.warning ? [transcript.warning] : [];

  updateJob(jobId, {
    status: 'analyzing',
    stage: 'insight-extraction',
    progress: 58,
    transcript: {
      text: transcript.text,
      preview: transcriptPreview,
      words: transcript.words,
      source: transcript.source,
    },
    warnings: transcriptWarnings,
  });

  const insights = await buildExhaustiveAnalysisInsights({
    brief: job.brief,
    transcriptText: transcript.text,
    words: transcript.words,
    durationSec: metadata.durationSec,
  });

  updateJob(jobId, {
    status: 'analyzing',
    stage: 'planning-overlays',
    progress: 72,
    analysisInsights: insights.insights,
  });

  const planned = await planOverlayEvents({
    brief: job.brief,
    transcriptText: transcript.text,
    words: transcript.words,
    durationSec: metadata.durationSec,
    analysisInsights: insights.insights,
  });

  const normalizedEvents = normalizeEvents({
    events: planned.events,
    durationSec: metadata.durationSec,
  });

  updateJob(jobId, {
    status: 'analyzing',
    stage: 'planning-scenes',
    progress: 88,
    overlayPlan: normalizedEvents,
  });

  const scenePlan = await planSceneGraph({
    brief: job.brief,
    transcriptText: transcript.text,
    durationSec: metadata.durationSec,
    analysisInsights: insights.insights,
  });

  const optimized = validateAndOptimizeScenes({
    scenePlan: scenePlan.scenes,
    durationSec: metadata.durationSec,
    fallbackEvents: normalizedEvents,
    words: transcript.words,
  });

  updateJob(jobId, {
    status: 'review',
    stage: 'review-ready',
    progress: 100,
    overlayPlan: normalizedEvents,
    scenePlan: optimized.scenes,
    sceneQuality: optimized.quality,
    reviewState: {
      mode: 'sequential',
      currentIndex: 0,
      approvedIds: [],
      rejectedIds: [],
      completed: normalizedEvents.length === 0,
    },
    warnings: optimized.quality?.warnings || [],
    error: null,
  });
};

const renderJob = async (jobId) => {
  let job = getJob(jobId);
  if (!job) {
    return;
  }

  const hasOverlayPlan = Array.isArray(job.overlayPlan) && job.overlayPlan.length > 0;
  const hasScenePlan = Array.isArray(job.scenePlan) && job.scenePlan.length > 0;

  if (config.useSceneGraph ? !hasScenePlan : !hasOverlayPlan) {
    throw new Error(
      config.useSceneGraph
        ? 'No existe un plan de escenas para renderizar. Primero analiza y revisa la propuesta.'
        : 'No existe un plan de overlays para renderizar. Primero analiza y revisa la propuesta.',
    );
  }

  updateJob(jobId, {
    status: 'rendering',
    stage: 'rendering',
    progress: 10,
    error: null,
  });

  const resolvedInput = await ensureInputReady(jobId, job);
  job = getJob(jobId);
  if (!job) {
    return;
  }
  job = {
    ...job,
    input: resolvedInput,
  };

  const metadata = await ensureMetadata(jobId, job);

  const encodedFilename = encodeURIComponent(resolvedInput.filename || 'video.mp4');
  const videoUrl =
    resolvedInput.sourceType === 'blob' && resolvedInput.sourceUrl
      ? resolvedInput.sourceUrl
      : `${config.baseUrl}/media/${encodedFilename}`;

  const outputPath = await renderCompositedVideo({
    jobId,
    videoUrl,
    width: metadata.width,
    height: metadata.height,
    durationSec: metadata.durationSec,
    events: job.overlayPlan,
    scenes: job.scenePlan,
    onRenderProgress: (progress) => {
      if (!Number.isFinite(progress)) {
        return;
      }
      const pct = 10 + Math.round(progress * 85);
      updateJob(jobId, {
        stage: 'rendering',
        progress: Math.min(95, pct),
      });
    },
  });

  const outputFilename = path.basename(outputPath);

  updateJob(jobId, {
    status: 'completed',
    stage: 'completed',
    progress: 100,
    output: {
      path: outputPath,
      filename: outputFilename,
      downloadUrl: `${config.baseUrl}/downloads/${encodeURIComponent(outputFilename)}`,
    },
  });
};

const processTask = async (task) => {
  if (task.type === 'analyze') {
    await analyzeJob(task.jobId);
    return;
  }

  if (task.type === 'render') {
    await renderJob(task.jobId);
    return;
  }

  throw new Error(`Tipo de tarea desconocido: ${task.type}`);
};

const workQueue = async () => {
  if (isProcessing) {
    return;
  }

  isProcessing = true;

  while (queue.length > 0) {
    const task = queue.shift();

    try {
      await processTask(task);
    } catch (error) {
      if (task.type === 'render') {
        updateJob(task.jobId, {
          status: 'review',
          stage: 'render-failed',
          error: error.message,
        });
      } else {
        updateJob(task.jobId, {
          status: 'failed',
          stage: 'failed',
          progress: 100,
          error: error.message,
        });
      }
    }
  }

  isProcessing = false;
};

export const enqueueAnalysis = (jobId) => {
  updateJob(jobId, {
    status: 'queued',
    stage: 'analyze-queued',
    progress: 0,
    error: null,
  });

  queue.push({jobId, type: 'analyze'});
  workQueue();
};

export const enqueueRender = (jobId) => {
  updateJob(jobId, {
    status: 'queued',
    stage: 'render-queued',
    progress: 0,
    error: null,
  });

  queue.push({jobId, type: 'render'});
  workQueue();
};

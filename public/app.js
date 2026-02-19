const form = document.getElementById('job-form');
const submitBtn = document.getElementById('submit-btn');
const fileInput = document.getElementById('video');
const youtubeInput = document.getElementById('youtubeUrl');

const pipelineGlobalProgress = document.getElementById('pipeline-global-progress');
const pipelineSvg = document.getElementById('pipeline-svg');
const pipelinePathBase = document.getElementById('pipeline-path-base');
const pipelinePathProgress = document.getElementById('pipeline-path-progress');
const pipelinePulse = document.getElementById('pipeline-pulse');
const pipelineNodes = document.getElementById('pipeline-nodes');
const pipelineMobileList = document.getElementById('pipeline-mobile-list');
const pipelineMobileFill = document.getElementById('pipeline-mobile-fill');
const pipelineMobilePulse = document.getElementById('pipeline-mobile-pulse');

const pipelinePhaseChip = document.getElementById('pipeline-phase-chip');
const pipelinePhaseStep = document.getElementById('pipeline-phase-step');
const pipelinePhaseTitle = document.getElementById('pipeline-phase-title');
const pipelinePhaseSummary = document.getElementById('pipeline-phase-summary');
const pipelinePhaseAction = document.getElementById('pipeline-phase-action');
const pipelineInput = document.getElementById('pipeline-input');
const pipelineOutput = document.getElementById('pipeline-output');
const pipelineLocalProgressBar = document.getElementById('pipeline-local-progress-bar');
const pipelineLocalProgressText = document.getElementById('pipeline-local-progress-text');
const pipelineWarning = document.getElementById('pipeline-warning');
const pipelineError = document.getElementById('pipeline-error');

const transcriptPanel = document.getElementById('transcript-panel');
const transcriptPreviewEl = document.getElementById('transcript-preview');
const insightsPanel = document.getElementById('insights-panel');
const insightsList = document.getElementById('insights-list');
const aiPanel = document.getElementById('ai-panel');
const resultPanel = document.getElementById('result-panel');
const downloadLink = document.getElementById('download-link');
const resultVideo = document.getElementById('result-video');

const visualEditor = document.getElementById('visual-editor');
const addOverlayBtn = document.getElementById('add-overlay-btn');
const applyVisualBtn = document.getElementById('apply-visual-btn');
const chatLog = document.getElementById('chat-log');
const refineInput = document.getElementById('refine-input');
const refineBtn = document.getElementById('refine-btn');
const renderBtn = document.getElementById('render-btn');

let pollTimer = null;
let currentJobId = null;
let latestJob = null;
let pinnedPhaseId = null;
let autoFollowPhase = true;
let lastStablePhaseId = null;

const TOOLKIT_FALLBACK = {
  enter: ['spring-pop', 'slide-up', 'slide-left', 'whip-left', 'stamp', 'tilt-in'],
  exit: ['fade', 'shrink', 'slide-down', 'swipe-right'],
  effects: ['wiggle', 'float', 'pulse', 'shake', 'glow', 'saturate'],
  stylePacks: ['clean', 'comic-blue', 'retro-red'],
  typographyPresets: ['display-bold', 'clean-sans', 'editorial', 'impact'],
  energyLevels: ['calm', 'balanced', 'high'],
  positions: ['top', 'center', 'bottom'],
  intents: ['hook', 'proof', 'explanation', 'objection', 'cta', 'transition', 'summary'],
  layouts: ['headline-card', 'split-bars', 'sticker-burst', 'quote-focus', 'cta-ribbon', 'data-pill'],
};

const STYLE_PACK_COLOR_FALLBACK = {
  clean: {primary: '#2f6bff', accent: '#22d3ee', text: '#f8fafc'},
  'comic-blue': {primary: '#2f88ff', accent: '#0ea5e9', text: '#f8fafc'},
  'retro-red': {primary: '#ef4444', accent: '#fb7185', text: '#fff7ed'},
};

const LAYOUT_LABELS = {
  'headline-card': 'Tarjeta titular',
  'split-bars': 'Comparativa',
  'sticker-burst': 'Sticker llamativo',
  'quote-focus': 'Frase destacada',
  'cta-ribbon': 'Cinta CTA',
  'data-pill': 'Dato corto',
};

const INTENT_LABELS = {
  hook: 'Gancho inicial',
  proof: 'Prueba / dato',
  explanation: 'Explicación',
  objection: 'Resolver duda',
  cta: 'Llamada a la acción',
  transition: 'Transición',
  summary: 'Resumen',
};

const PHASES = [
  {
    id: 'input_received',
    label: 'Entrada recibida',
    summary: 'El sistema registra el video o enlace como punto de partida.',
    input: 'Archivo local o URL de YouTube.',
    output: 'Solicitud lista para validación.',
    anchorId: 'section-input',
  },
  {
    id: 'source_validation',
    label: 'Validación de fuente',
    summary: 'Se comprueba que la fuente sea válida y procesable.',
    input: 'Solicitud de análisis.',
    output: 'Fuente aprobada para ingest.',
    anchorId: 'section-input',
  },
  {
    id: 'source_download',
    label: 'Descarga remota',
    summary: 'Si viene por enlace, se descarga el video a almacenamiento local.',
    input: 'URL de YouTube.',
    output: 'Archivo local listo para análisis.',
    anchorId: 'section-input',
  },
  {
    id: 'metadata',
    label: 'Lectura de metadatos',
    summary: 'Se detectan duración y resolución para preparar el pipeline.',
    input: 'Archivo de video local.',
    output: 'Metadatos de video listos.',
    anchorId: 'section-transcript',
  },
  {
    id: 'transcription',
    label: 'Transcripción',
    summary: 'El audio se convierte en texto con marcas temporales.',
    input: 'Audio del video.',
    output: 'Transcripción con timestamps.',
    anchorId: 'section-transcript',
  },
  {
    id: 'semantic_analysis',
    label: 'Análisis semántico',
    summary: 'Se detectan tramos de mayor valor narrativo o impacto.',
    input: 'Transcripción completa.',
    output: 'Momentos clave identificados.',
    anchorId: 'section-insights',
  },
  {
    id: 'overlay_planning',
    label: 'Propuesta de animaciones',
    summary: 'Se genera una propuesta inicial de animaciones estratégicas.',
    input: 'Momentos clave + contexto del video.',
    output: 'Plan inicial de overlays.',
    anchorId: 'section-insights',
  },
  {
    id: 'review',
    label: 'Revisión y ajustes',
    summary: 'Seleccionas, editas o añades animaciones antes de exportar.',
    input: 'Plan inicial de overlays.',
    output: 'Plan final aprobado por el usuario.',
    anchorId: 'section-review',
  },
  {
    id: 'render_queue',
    label: 'Preparación de render',
    summary: 'Se prepara la composición final antes de renderizar.',
    input: 'Plan final aprobado.',
    output: 'Render listo para ejecutarse.',
    anchorId: 'section-render',
  },
  {
    id: 'rendering',
    label: 'Render final',
    summary: 'Se compone el video final con todas las animaciones.',
    input: 'Video base + overlays definidos.',
    output: 'Archivo final en proceso.',
    anchorId: 'section-render',
  },
  {
    id: 'output_ready',
    label: 'Resultado listo',
    summary: 'El video final queda disponible para descarga y vista previa.',
    input: 'Render completado.',
    output: 'MP4 final listo para publicar.',
    anchorId: 'section-result',
  },
];

const PHASE_BY_ID = new Map(PHASES.map((phase, index) => [phase.id, {...phase, index}]));

const STAGE_TO_PHASE = {
  queued: 'source_validation',
  'analyze-queued': 'source_validation',
  'input-download': 'source_download',
  'video-metadata': 'metadata',
  transcription: 'transcription',
  'insight-extraction': 'semantic_analysis',
  'planning-overlays': 'overlay_planning',
  'planning-scenes': 'overlay_planning',
  'review-ready': 'review',
  'refining-overlays': 'review',
  'render-queued': 'render_queue',
  rendering: 'rendering',
  completed: 'output_ready',
  failed: 'source_validation',
  'render-failed': 'rendering',
};

const STAGE_COPY = {
  queued: {
    action: 'Recibiendo solicitud',
    description: 'Creando el trabajo inicial para arrancar el pipeline.',
  },
  'analyze-queued': {
    action: 'Validando fuente de video',
    description: 'Comprobando si la entrada llega por archivo local o enlace.',
  },
  'input-download': {
    action: 'Descargando video del enlace',
    description: 'Guardando el video remoto para procesarlo como archivo local.',
  },
  'video-metadata': {
    action: 'Leyendo metadatos del video',
    description: 'Detectando duración y resolución para ajustar el flujo.',
  },
  transcription: {
    action: 'Transcribiendo audio',
    description: 'Convirtiendo audio en texto con referencias temporales.',
  },
  'insight-extraction': {
    action: 'Analizando el contenido',
    description: 'Detectando los segmentos más relevantes del discurso.',
  },
  'planning-overlays': {
    action: 'Proponiendo animaciones',
    description: 'Construyendo la propuesta visual inicial por momentos clave.',
  },
  'planning-scenes': {
    action: 'Planificando escenas personalizadas',
    description: 'Generando scene graph nativo para render sin plantillas cerradas.',
  },
  'review-ready': {
    action: 'Esperando tu revisión',
    description: 'Selecciona, ajusta o añade animaciones antes de renderizar.',
  },
  'refining-overlays': {
    action: 'Aplicando tus ajustes',
    description: 'Actualizando la propuesta según tus instrucciones.',
  },
  'render-queued': {
    action: 'Preparando render final',
    description: 'Validando el plan final antes de exportar.',
  },
  rendering: {
    action: 'Renderizando video final',
    description: 'Componiendo el video final con las animaciones aprobadas.',
  },
  completed: {
    action: 'Proceso completado',
    description: 'El video final ya se puede descargar y previsualizar.',
  },
  failed: {
    action: 'Proceso detenido por error',
    description: 'El flujo se detuvo y requiere revisar el error mostrado.',
  },
  'render-failed': {
    action: 'Error durante el render',
    description: 'Falló la exportación final. Puedes ajustar y volver a intentarlo.',
  },
};

const PHASE_LOCAL_PROGRESS = {
  queued: 0.35,
  'analyze-queued': 0.5,
  'input-download': 0.7,
  'video-metadata': 0.72,
  transcription: 0.74,
  'insight-extraction': 0.76,
  'planning-overlays': 0.82,
  'planning-scenes': 0.9,
  'review-ready': 1,
  'refining-overlays': 0.56,
  'render-queued': 0.46,
  rendering: 0.75,
  completed: 1,
  failed: 1,
  'render-failed': 1,
};

const DESKTOP_POINTS = [
  {x: 56, y: 138},
  {x: 168, y: 72},
  {x: 280, y: 138},
  {x: 392, y: 72},
  {x: 504, y: 138},
  {x: 616, y: 72},
  {x: 728, y: 138},
  {x: 840, y: 72},
  {x: 952, y: 138},
  {x: 1064, y: 72},
  {x: 1176, y: 138},
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const unique = (values) => [...new Set(values)];

const formatClock = (sec) => {
  const total = Math.max(0, Math.floor(Number(sec || 0)));
  const mm = Math.floor(total / 60)
    .toString()
    .padStart(2, '0');
  const ss = (total % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
};

const formatTime = (sec) => {
  const n = Number(sec || 0);
  return `${n.toFixed(2)}s`;
};

const toPrettyLabel = (value) => {
  return String(value || '')
    .split(/[-_]/g)
    .map((piece) => (piece ? piece[0].toUpperCase() + piece.slice(1) : piece))
    .join(' ');
};

const phaseIndex = (phaseId) => PHASE_BY_ID.get(phaseId)?.index ?? 0;

const getToolkit = (job) => {
  const incoming = job?.visualToolkit;
  if (!incoming) {
    return TOOLKIT_FALLBACK;
  }

  return {
    enter: Array.isArray(incoming.enter) && incoming.enter.length > 0 ? incoming.enter : TOOLKIT_FALLBACK.enter,
    exit: Array.isArray(incoming.exit) && incoming.exit.length > 0 ? incoming.exit : TOOLKIT_FALLBACK.exit,
    effects: Array.isArray(incoming.effects) && incoming.effects.length > 0 ? incoming.effects : TOOLKIT_FALLBACK.effects,
    stylePacks:
      Array.isArray(incoming.stylePacks) && incoming.stylePacks.length > 0 ? incoming.stylePacks : TOOLKIT_FALLBACK.stylePacks,
    typographyPresets:
      Array.isArray(incoming.typographyPresets) && incoming.typographyPresets.length > 0
        ? incoming.typographyPresets
        : TOOLKIT_FALLBACK.typographyPresets,
    energyLevels:
      Array.isArray(incoming.energyLevels) && incoming.energyLevels.length > 0
        ? incoming.energyLevels
        : TOOLKIT_FALLBACK.energyLevels,
    positions: Array.isArray(incoming.positions) && incoming.positions.length > 0 ? incoming.positions : TOOLKIT_FALLBACK.positions,
    intents: Array.isArray(incoming.intents) && incoming.intents.length > 0 ? incoming.intents : TOOLKIT_FALLBACK.intents,
    layouts: Array.isArray(incoming.layouts) && incoming.layouts.length > 0 ? incoming.layouts : TOOLKIT_FALLBACK.layouts,
  };
};

const normalizeHexColor = (value, fallback) => {
  if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim())) {
    return value.trim().toLowerCase();
  }
  return fallback;
};

const toEffectsArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[\s,|+]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const createSelect = ({field, options, selectedValue, disabled}) => {
  const select = document.createElement('select');
  select.dataset.field = field;
  select.disabled = disabled;

  for (const option of options) {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.label;
    if (option.value === selectedValue) {
      opt.selected = true;
    }
    select.appendChild(opt);
  }

  return select;
};

const createColorInput = ({field, value, disabled}) => {
  const input = document.createElement('input');
  input.type = 'color';
  input.dataset.field = field;
  input.disabled = disabled;
  input.value = normalizeHexColor(value, '#2f6bff');
  return input;
};

const createTextInput = ({field, value, disabled, placeholder = ''}) => {
  const input = document.createElement('input');
  input.type = 'text';
  input.dataset.field = field;
  input.disabled = disabled;
  input.value = String(value || '');
  input.placeholder = placeholder;
  return input;
};

const createNumberInput = ({field, value, disabled, min = 0, step = 0.1}) => {
  const input = document.createElement('input');
  input.type = 'number';
  input.dataset.field = field;
  input.disabled = disabled;
  input.min = String(min);
  input.step = String(step);
  input.value = Number.isFinite(Number(value)) ? String(Number(value)) : '';
  return input;
};

const createField = ({label, control}) => {
  const field = document.createElement('div');
  field.className = 'overlay-field';

  const caption = document.createElement('label');
  caption.textContent = label;

  field.appendChild(caption);
  field.appendChild(control);

  return field;
};

const pickElementText = (elements, type) => {
  const found = (elements || []).find((entry) => String(entry?.type || '').toLowerCase() === type);
  if (!found) {
    return '';
  }
  return String(found.text || found.value || found.label || '').trim();
};

const deriveEditableCopy = (event) => {
  const payload = event?.payload || {};
  const spec = payload.animationSpec || {};
  const elements = Array.isArray(spec.elements) ? spec.elements : [];

  const title =
    payload.title ||
    payload.text ||
    pickElementText(elements, 'title') ||
    pickElementText(elements, 'metric-left-label') ||
    'Nuevo mensaje';

  const subtitle =
    payload.subtitle ||
    payload.caption ||
    pickElementText(elements, 'subtitle') ||
    pickElementText(elements, 'metric-right-label') ||
    '';

  return {
    title: String(title || '').trim(),
    subtitle: String(subtitle || '').trim(),
  };
};

const overlayTypeLabel = (layout) => LAYOUT_LABELS[layout] || toPrettyLabel(layout);
const overlayGoalLabel = (intent) => INTENT_LABELS[intent] || toPrettyLabel(intent);

const appendChat = (role, text) => {
  const entry = document.createElement('div');
  entry.className = `chat-item ${role}`;
  entry.textContent = text;
  chatLog.appendChild(entry);
  chatLog.scrollTop = chatLog.scrollHeight;
};

const scrollToPhaseAnchor = (phaseId) => {
  const phase = PHASE_BY_ID.get(phaseId);
  if (!phase || !phase.anchorId) {
    return;
  }

  const target = document.querySelector(`[data-anchor="${phase.anchorId}"]`) || document.getElementById(phase.anchorId);
  if (target) {
    target.scrollIntoView({behavior: 'smooth', block: 'start'});
  }
};

const buildThreadPath = (points) => {
  if (!Array.isArray(points) || points.length === 0) {
    return '';
  }

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const c1x = prev.x + 42;
    const c1y = prev.y;
    const c2x = curr.x - 42;
    const c2y = curr.y;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${curr.x} ${curr.y}`;
  }

  return d;
};

const phaseStateLabel = (state) => {
  if (state === 'active') return 'En curso';
  if (state === 'waiting') return 'Tu accion';
  if (state === 'completed') return 'Completado';
  if (state === 'failed') return 'Error';
  if (state === 'omitted') return 'Omitido';
  return 'Pendiente';
};

const deriveCurrentPhaseFromJob = (job) => {
  const stage = String(job?.stage || '').trim();
  const status = String(job?.status || '').trim();

  if (status === 'completed') {
    return 'output_ready';
  }

  if (stage === 'render-failed') {
    return 'rendering';
  }

  if (status === 'failed' || stage === 'failed') {
    return lastStablePhaseId || 'source_validation';
  }

  const mapped = STAGE_TO_PHASE[stage];
  if (mapped) {
    return mapped;
  }

  if (status === 'review') {
    return 'review';
  }

  if (status === 'rendering') {
    return 'rendering';
  }

  return 'source_validation';
};

const getLocalPhaseRatio = ({job, stage, currentPhaseId}) => {
  if (!job) {
    return 0;
  }

  let local = PHASE_LOCAL_PROGRESS[stage] ?? 0.62;
  const pct = Number(job.progress);
  if (Number.isFinite(pct) && pct >= 0) {
    local = clamp(local * 0.7 + (pct / 100) * 0.3, 0, 1);
  }

  if (job.status === 'completed' || currentPhaseId === 'output_ready') {
    return 1;
  }

  if (stage === 'review-ready') {
    return 1;
  }

  return clamp(local, 0, 1);
};

const computePipelineRuntime = (job) => {
  if (!job) {
    const phaseStates = Object.fromEntries(PHASES.map((phase) => [phase.id, 'pending']));
    return {
      hasJob: false,
      stage: '',
      status: '',
      action: 'Esperando inicio del proceso',
      description: 'Lanza un analisis para activar el seguimiento en tiempo real.',
      currentPhaseId: 'input_received',
      currentIndex: 0,
      selectedPhaseId: 'input_received',
      localRatio: 0,
      globalRatio: 0,
      phaseStates,
      warnings: [],
      error: '',
    };
  }

  const stage = String(job.stage || '').trim();
  const status = String(job.status || '').trim();
  const currentPhaseId = deriveCurrentPhaseFromJob(job);
  const currentIndex = phaseIndex(currentPhaseId);

  if (status !== 'failed' && stage !== 'failed' && stage !== 'render-failed') {
    lastStablePhaseId = currentPhaseId;
  }

  const localRatio = getLocalPhaseRatio({job, stage, currentPhaseId});
  const phaseCount = PHASES.length;

  let globalRatio = (currentIndex + localRatio) / Math.max(1, phaseCount - 1);
  if (status === 'completed') {
    globalRatio = 1;
  }
  globalRatio = clamp(globalRatio, 0, 1);

  const isUploadSource = job?.inputSource?.type === 'upload';
  const downloadIndex = phaseIndex('source_download');
  const shouldMarkDownloadOmitted = isUploadSource && currentIndex > downloadIndex;

  const isFailure = status === 'failed' || stage === 'failed' || stage === 'render-failed';
  const isWaiting = stage === 'review-ready' && currentPhaseId === 'review';

  const phaseStates = {};
  for (let i = 0; i < PHASES.length; i += 1) {
    const phase = PHASES[i];

    if (shouldMarkDownloadOmitted && phase.id === 'source_download') {
      phaseStates[phase.id] = 'omitted';
      continue;
    }

    if (status === 'completed') {
      phaseStates[phase.id] = 'completed';
      continue;
    }

    if (isFailure) {
      if (i < currentIndex) {
        phaseStates[phase.id] = 'completed';
      } else if (i === currentIndex) {
        phaseStates[phase.id] = 'failed';
      } else {
        phaseStates[phase.id] = 'pending';
      }
      continue;
    }

    if (i < currentIndex) {
      phaseStates[phase.id] = 'completed';
    } else if (i === currentIndex) {
      phaseStates[phase.id] = isWaiting ? 'waiting' : 'active';
    } else {
      phaseStates[phase.id] = 'pending';
    }
  }

  const copy = STAGE_COPY[stage] || {
    action: 'Procesando pipeline',
    description: 'El sistema esta avanzando por las fases de produccion.',
  };

  return {
    hasJob: true,
    stage,
    status,
    action: copy.action,
    description: copy.description,
    currentPhaseId,
    currentIndex,
    selectedPhaseId: currentPhaseId,
    localRatio,
    globalRatio,
    phaseStates,
    warnings: Array.isArray(job.warnings) ? job.warnings : [],
    error: String(job.error || ''),
  };
};

const renderPipelineDesktop = (runtime) => {
  const d = buildThreadPath(DESKTOP_POINTS);
  pipelinePathBase.setAttribute('d', d);
  pipelinePathProgress.setAttribute('d', d);

  const length = pipelinePathBase.getTotalLength();
  pipelinePathProgress.style.strokeDasharray = String(length);
  pipelinePathProgress.style.strokeDashoffset = String(length * (1 - runtime.globalRatio));

  const pulsePoint = pipelinePathBase.getPointAtLength(length * runtime.globalRatio);
  pipelinePulse.setAttribute('cx', String(pulsePoint.x));
  pipelinePulse.setAttribute('cy', String(pulsePoint.y));

  pipelineNodes.innerHTML = '';

  PHASES.forEach((phase, index) => {
    const point = DESKTOP_POINTS[index];
    const state = runtime.phaseStates[phase.id] || 'pending';
    const isSelected = runtime.selectedPhaseId === phase.id;

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('thread-node', state);
    if (isSelected) {
      group.classList.add('selected');
    }
    group.setAttribute('tabindex', '0');
    group.setAttribute('role', 'button');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.classList.add('thread-node-circle');
    circle.setAttribute('cx', String(point.x));
    circle.setAttribute('cy', String(point.y));
    circle.setAttribute('r', '15');

    const number = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    number.classList.add('thread-node-number');
    number.setAttribute('x', String(point.x));
    number.setAttribute('y', String(point.y + 0.5));
    number.textContent = String(index + 1);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.classList.add('thread-node-label');
    label.setAttribute('x', String(point.x));
    label.setAttribute('y', String(index % 2 === 0 ? point.y + 35 : point.y - 30));
    label.textContent = phase.label;

    const onSelect = () => handlePhaseSelection(phase.id, runtime.currentPhaseId);
    group.addEventListener('click', onSelect);
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect();
      }
    });

    group.appendChild(circle);
    group.appendChild(number);
    group.appendChild(label);

    pipelineNodes.appendChild(group);
  });
};

const renderPipelineMobile = (runtime) => {
  pipelineMobileList.innerHTML = '';

  PHASES.forEach((phase, index) => {
    const state = runtime.phaseStates[phase.id] || 'pending';
    const item = document.createElement('li');
    item.className = `mobile-phase-item ${state}`;

    const title = document.createElement('div');
    title.className = 'mobile-phase-item-title';
    title.textContent = `${index + 1}. ${phase.label}`;

    const stateText = document.createElement('div');
    stateText.className = 'mobile-phase-item-state';
    stateText.textContent = phaseStateLabel(state);

    item.appendChild(title);
    item.appendChild(stateText);

    item.addEventListener('click', () => handlePhaseSelection(phase.id, runtime.currentPhaseId));

    pipelineMobileList.appendChild(item);
  });

  pipelineMobileFill.style.height = `${(runtime.globalRatio * 100).toFixed(1)}%`;
  pipelineMobilePulse.style.top = `${(runtime.globalRatio * 100).toFixed(1)}%`;
};

const renderPipelineDetail = (runtime) => {
  const selected = PHASE_BY_ID.get(runtime.selectedPhaseId) || PHASES[0];
  const selectedState = runtime.phaseStates[selected.id] || 'pending';

  pipelineGlobalProgress.textContent = `${Math.round(runtime.globalRatio * 100)}% completado`;

  pipelinePhaseChip.className = `phase-chip ${selectedState}`;
  pipelinePhaseChip.textContent = phaseStateLabel(selectedState);

  pipelinePhaseStep.textContent = `Paso ${selected.index + 1}/${PHASES.length}`;
  pipelinePhaseTitle.textContent = selected.label;
  pipelinePhaseSummary.textContent = selected.summary;

  if (runtime.selectedPhaseId === runtime.currentPhaseId) {
    pipelinePhaseAction.textContent = runtime.action;
  } else {
    pipelinePhaseAction.textContent = `${selected.summary} (vista fijada)`;
  }

  pipelineInput.textContent = selected.input;
  pipelineOutput.textContent = selected.output;

  const localProgress = runtime.selectedPhaseId === runtime.currentPhaseId ? runtime.localRatio : selectedState === 'completed' || selectedState === 'omitted' ? 1 : selectedState === 'pending' ? 0 : 0.5;
  pipelineLocalProgressBar.style.width = `${Math.round(localProgress * 100)}%`;
  pipelineLocalProgressText.textContent = `Progreso de fase: ${Math.round(localProgress * 100)}%`;

  pipelineWarning.textContent = runtime.warnings.length > 0 ? `Avisos: ${runtime.warnings.join(' | ')}` : '';
  pipelineError.textContent = runtime.error ? `Error: ${runtime.error}` : '';
};

const renderPipeline = (job) => {
  const runtime = computePipelineRuntime(job);

  if (autoFollowPhase || !pinnedPhaseId || !PHASE_BY_ID.has(pinnedPhaseId)) {
    runtime.selectedPhaseId = runtime.currentPhaseId;
  } else {
    runtime.selectedPhaseId = pinnedPhaseId;
  }

  renderPipelineDesktop(runtime);
  renderPipelineMobile(runtime);
  renderPipelineDetail(runtime);

  return runtime;
};

function handlePhaseSelection(phaseId, currentPhaseId) {
  if (phaseId === currentPhaseId) {
    autoFollowPhase = true;
    pinnedPhaseId = null;
  } else {
    autoFollowPhase = false;
    pinnedPhaseId = phaseId;
  }

  scrollToPhaseAnchor(phaseId);

  if (latestJob) {
    renderPipeline(latestJob);
  } else {
    renderPipeline(null);
  }
}

const canInteractWithAi = (job) => {
  return job.status === 'review' && job.stage === 'review-ready' && Array.isArray(job.overlayPlan);
};

const refreshOverlayTitles = () => {
  const cards = [...visualEditor.querySelectorAll('.overlay-card')];
  cards.forEach((card, index) => {
    const title = card.querySelector('.overlay-title');
    if (!title) {
      return;
    }
    const isNew = card.dataset.isNew === '1';
    title.textContent = `Animacion ${index + 1}${isNew ? ' (nueva)' : ''}`;
  });
};

const buildOverlayCard = ({event, index, toolkit, editable, isNew = false}) => {
  const payload = event.payload || {};
  const motion = payload.motion || {};
  const design = payload.design || {};
  const animationSpec = payload.animationSpec || {};
  const selectedEffects = unique(toEffectsArray(motion.effects));
  const stylePackKey = String(payload.stylePack || toolkit.stylePacks[0] || 'clean');
  const fallbackPalette = STYLE_PACK_COLOR_FALLBACK[stylePackKey] || STYLE_PACK_COLOR_FALLBACK.clean;
  const copy = deriveEditableCopy(event);

  const card = document.createElement('div');
  card.className = 'overlay-card';
  card.dataset.eventId = String(event.id || `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  card.dataset.isNew = isNew ? '1' : '0';

  const head = document.createElement('div');
  head.className = 'overlay-head';

  const left = document.createElement('div');
  left.className = 'overlay-head-left';

  const include = document.createElement('input');
  include.type = 'checkbox';
  include.className = 'overlay-toggle';
  include.dataset.field = 'enabled';
  include.checked = true;
  include.disabled = !editable;

  const title = document.createElement('div');
  title.className = 'overlay-title';
  title.textContent = `Animacion ${index + 1}${isNew ? ' (nueva)' : ''}`;

  left.appendChild(include);
  left.appendChild(title);

  const time = document.createElement('div');
  time.className = 'overlay-time';

  const startInput = createNumberInput({
    field: 'startSec',
    disabled: !editable,
    min: 0,
    step: 0.1,
    value: Number(event.startSec || 0),
  });

  const durationInput = createNumberInput({
    field: 'durationSec',
    disabled: !editable,
    min: 0.5,
    step: 0.1,
    value: Number(event.durationSec || 3),
  });

  const updateTimeBadge = () => {
    const start = Number(startInput.value || 0);
    const duration = Number(durationInput.value || 0);
    time.textContent = `${formatTime(start)} - ${formatTime(start + Math.max(0, duration))}`;
  };
  updateTimeBadge();
  startInput.addEventListener('input', updateTimeBadge);
  durationInput.addEventListener('input', updateTimeBadge);

  head.appendChild(left);
  head.appendChild(time);

  const context = document.createElement('div');
  context.className = 'overlay-context';
  const reasoning = String(event.reasoning || '').trim();
  context.textContent = reasoning || 'Propuesta creada para reforzar una parte importante del video.';

  const grid = document.createElement('div');
  grid.className = 'overlay-grid';

  const titleInput = createTextInput({
    field: 'title',
    disabled: !editable,
    value: copy.title,
    placeholder: 'Mensaje principal',
  });

  const subtitleInput = createTextInput({
    field: 'subtitle',
    disabled: !editable,
    value: copy.subtitle,
    placeholder: 'Mensaje secundario',
  });

  const styleSelect = createSelect({
    field: 'stylePack',
    disabled: !editable,
    selectedValue: String(payload.stylePack || toolkit.stylePacks[0]),
    options: toolkit.stylePacks.map((value) => ({value, label: toPrettyLabel(value)})),
  });

  const enterSelect = createSelect({
    field: 'enter',
    disabled: !editable,
    selectedValue: String(motion.enter || toolkit.enter[0]),
    options: toolkit.enter.map((value) => ({value, label: value})),
  });

  const exitSelect = createSelect({
    field: 'exit',
    disabled: !editable,
    selectedValue: String(motion.exit || toolkit.exit[0]),
    options: toolkit.exit.map((value) => ({value, label: value})),
  });

  const typographySelect = createSelect({
    field: 'typography',
    disabled: !editable,
    selectedValue: String(design.typography || toolkit.typographyPresets[0]),
    options: toolkit.typographyPresets.map((value) => ({value, label: value})),
  });

  const energySelect = createSelect({
    field: 'energy',
    disabled: !editable,
    selectedValue: String(design.energy || toolkit.energyLevels[1] || toolkit.energyLevels[0]),
    options: toolkit.energyLevels.map((value) => ({value, label: value})),
  });

  const positionSelect = createSelect({
    field: 'position',
    disabled: !editable,
    selectedValue: String(design.position || toolkit.positions[1] || toolkit.positions[0]),
    options: toolkit.positions.map((value) => ({value, label: toPrettyLabel(value)})),
  });

  const intentSelect = createSelect({
    field: 'intent',
    disabled: !editable,
    selectedValue: String(animationSpec.intent || toolkit.intents[0]),
    options: toolkit.intents.map((value) => ({value, label: overlayGoalLabel(value)})),
  });

  const layoutSelect = createSelect({
    field: 'layout',
    disabled: !editable,
    selectedValue: String(animationSpec.layout || toolkit.layouts[0]),
    options: toolkit.layouts.map((value) => ({value, label: overlayTypeLabel(value)})),
  });

  const primaryColorInput = createColorInput({
    field: 'primaryColor',
    disabled: !editable,
    value: design.primaryColor || fallbackPalette.primary,
  });

  const accentColorInput = createColorInput({
    field: 'accentColor',
    disabled: !editable,
    value: design.accentColor || fallbackPalette.accent,
  });

  const textColorInput = createColorInput({
    field: 'textColor',
    disabled: !editable,
    value: design.textColor || fallbackPalette.text,
  });

  grid.appendChild(createField({label: 'Mensaje principal', control: titleInput}));
  grid.appendChild(createField({label: 'Mensaje secundario', control: subtitleInput}));
  grid.appendChild(createField({label: 'Inicio (segundos)', control: startInput}));
  grid.appendChild(createField({label: 'Duracion (segundos)', control: durationInput}));
  grid.appendChild(createField({label: 'Tipo de animacion', control: layoutSelect}));
  grid.appendChild(createField({label: 'Objetivo', control: intentSelect}));
  grid.appendChild(createField({label: 'Paleta', control: styleSelect}));
  grid.appendChild(createField({label: 'Entrada', control: enterSelect}));
  grid.appendChild(createField({label: 'Salida', control: exitSelect}));
  grid.appendChild(createField({label: 'Tipografia', control: typographySelect}));
  grid.appendChild(createField({label: 'Energia', control: energySelect}));
  grid.appendChild(createField({label: 'Posicion', control: positionSelect}));
  grid.appendChild(createField({label: 'Color principal', control: primaryColorInput}));
  grid.appendChild(createField({label: 'Color acento', control: accentColorInput}));
  grid.appendChild(createField({label: 'Color texto', control: textColorInput}));

  const effectsWrap = document.createElement('div');
  effectsWrap.className = 'effects-wrap';

  const effectsCaption = document.createElement('label');
  effectsCaption.style.marginBottom = '8px';
  effectsCaption.style.fontSize = '12px';
  effectsCaption.style.color = 'var(--muted)';
  effectsCaption.textContent = 'Efectos';
  effectsWrap.appendChild(effectsCaption);

  const effectsList = document.createElement('div');
  effectsList.className = 'effects-list';

  for (const effect of toolkit.effects) {
    const chip = document.createElement('label');
    chip.className = 'effect-chip';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = effect;
    checkbox.dataset.field = 'effect';
    checkbox.checked = selectedEffects.includes(effect);
    checkbox.disabled = !editable;

    const text = document.createElement('span');
    text.textContent = effect;

    chip.appendChild(checkbox);
    chip.appendChild(text);
    effectsList.appendChild(chip);
  }

  effectsWrap.appendChild(effectsList);

  card.appendChild(head);
  card.appendChild(context);
  card.appendChild(grid);
  card.appendChild(effectsWrap);

  include.addEventListener('change', () => {
    card.style.opacity = include.checked ? '1' : '0.58';
  });

  return card;
};

const renderVisualEditor = (job, editable) => {
  visualEditor.innerHTML = '';

  if (!Array.isArray(job.overlayPlan) || job.overlayPlan.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'caption';
    empty.textContent = 'No hay animaciones propuestas todavia. Puedes anadir una manualmente.';
    visualEditor.appendChild(empty);
    return;
  }

  const toolkit = getToolkit(job);

  for (let index = 0; index < job.overlayPlan.length; index += 1) {
    const event = job.overlayPlan[index];
    const card = buildOverlayCard({
      event,
      index,
      toolkit,
      editable,
      isNew: false,
    });
    visualEditor.appendChild(card);
  }

  refreshOverlayTitles();
};

const collectVisualOverrides = () => {
  const cards = [...visualEditor.querySelectorAll('.overlay-card')];

  return cards.map((card) => {
    const id = String(card.dataset.eventId || '');
    const isNew = card.dataset.isNew === '1';
    const enabled = card.querySelector('[data-field="enabled"]')?.checked !== false;

    const stylePack = card.querySelector('[data-field="stylePack"]')?.value || null;
    const enter = card.querySelector('[data-field="enter"]')?.value || null;
    const exit = card.querySelector('[data-field="exit"]')?.value || null;
    const intent = card.querySelector('[data-field="intent"]')?.value || null;
    const layout = card.querySelector('[data-field="layout"]')?.value || null;
    const typography = card.querySelector('[data-field="typography"]')?.value || null;
    const energy = card.querySelector('[data-field="energy"]')?.value || null;
    const position = card.querySelector('[data-field="position"]')?.value || null;
    const primaryColor = normalizeHexColor(card.querySelector('[data-field="primaryColor"]')?.value || '', null);
    const accentColor = normalizeHexColor(card.querySelector('[data-field="accentColor"]')?.value || '', null);
    const textColor = normalizeHexColor(card.querySelector('[data-field="textColor"]')?.value || '', null);
    const effects = [...card.querySelectorAll('[data-field="effect"]:checked')].map((input) => input.value);

    const startSec = Number(card.querySelector('[data-field="startSec"]')?.value || 0);
    const durationSec = Number(card.querySelector('[data-field="durationSec"]')?.value || 3);
    const title = String(card.querySelector('[data-field="title"]')?.value || '').trim() || null;
    const subtitle = String(card.querySelector('[data-field="subtitle"]')?.value || '').trim() || null;

    return {
      id,
      isNew,
      enabled,
      stylePack,
      enter,
      exit,
      effects,
      intent,
      layout,
      typography,
      energy,
      position,
      primaryColor,
      accentColor,
      textColor,
      startSec,
      durationSec,
      title,
      subtitle,
    };
  });
};

const renderInsights = (job) => {
  insightsList.innerHTML = '';

  const insights = Array.isArray(job.analysisInsights) ? job.analysisInsights : [];
  if (insights.length === 0) {
    insightsPanel.hidden = true;
    return;
  }

  insightsPanel.hidden = false;

  for (const insight of insights) {
    const card = document.createElement('article');
    card.className = 'insight-card';

    const time = document.createElement('div');
    time.className = 'insight-time';
    time.textContent = `Min ${formatClock(insight.timeSec)}`;

    const topic = document.createElement('h3');
    topic.className = 'insight-topic';
    topic.textContent = insight.topic || 'Momento relevante detectado';

    const why = document.createElement('p');
    why.className = 'insight-text';
    const sentenceTopic = insight.topic || 'un punto relevante';
    why.textContent = `En ${formatClock(insight.timeSec)} hablas sobre "${sentenceTopic}". Conviene reforzarlo porque ${insight.whyImportant || 'es clave para la narrativa'}.`;

    const impact = document.createElement('div');
    impact.className = 'insight-impact';
    impact.textContent = `Resultado esperado: ${insight.expectedImpact || 'mejor claridad y retencion en este tramo.'}`;

    const anim = document.createElement('div');
    anim.className = 'insight-anim';
    anim.textContent = `Animacion sugerida: ${insight.animationDescription || 'refuerzo visual de apoyo.'}`;

    card.appendChild(time);
    card.appendChild(topic);
    card.appendChild(why);
    card.appendChild(impact);
    card.appendChild(anim);

    insightsList.appendChild(card);
  }
};

const resetWorkspace = () => {
  latestJob = null;
  currentJobId = null;
  pinnedPhaseId = null;
  autoFollowPhase = true;
  lastStablePhaseId = null;

  transcriptPanel.hidden = true;
  transcriptPreviewEl.textContent = '';

  insightsPanel.hidden = true;
  insightsList.innerHTML = '';

  aiPanel.hidden = true;
  chatLog.innerHTML = '';
  refineInput.value = '';
  visualEditor.innerHTML = '';

  resultPanel.hidden = true;
  downloadLink.hidden = true;
  downloadLink.removeAttribute('href');
  resultVideo.hidden = true;
  resultVideo.removeAttribute('src');

  addOverlayBtn.disabled = true;
  applyVisualBtn.disabled = true;
  refineBtn.disabled = true;
  renderBtn.disabled = true;

  renderPipeline(null);
};

const updateUI = (job) => {
  latestJob = job;

  renderPipeline(job);

  if (job.transcript?.preview) {
    transcriptPanel.hidden = false;
    transcriptPreviewEl.textContent = `${job.transcript.preview}\n\nTranscripcion: ${job.transcript.source} | Palabras detectadas: ${job.transcript.wordsCount}`;
  }

  renderInsights(job);

  const canEdit = canInteractWithAi(job);
  const allowAiPanel = canEdit || job.status === 'rendering' || job.stage === 'render-queued' || Array.isArray(job.overlayPlan);

  aiPanel.hidden = !allowAiPanel;

  addOverlayBtn.disabled = !canEdit;
  applyVisualBtn.disabled = !canEdit;
  refineBtn.disabled = !canEdit;
  renderBtn.disabled = !canEdit;

  if (allowAiPanel) {
    renderVisualEditor(job, canEdit);
  }

  if (job.output?.downloadUrl) {
    resultPanel.hidden = false;
    downloadLink.hidden = false;
    downloadLink.href = job.output.downloadUrl;
    downloadLink.textContent = 'Descargar video final (.mp4)';

    resultVideo.hidden = false;
    resultVideo.src = job.output.downloadUrl;
  }

  if (job.status === 'review' && chatLog.childElementCount === 0 && Array.isArray(job.overlayPlan)) {
    const insightsCount = Array.isArray(job.analysisInsights) ? job.analysisInsights.length : 0;
    appendChat(
      'assistant',
      `Listo. Te propuse ${insightsCount} momentos del video. Selecciona los que quieres, ajusta detalles o anade nuevos antes de generar.`,
    );
  }
};

const shouldStopPolling = (job) => {
  return job.status === 'completed' || job.status === 'failed' || job.status === 'review';
};

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
};

const fetchJson = async (url, options = {}) => {
  let res = null;
  try {
    res = await fetch(url, options);
  } catch (error) {
    const message = `No se pudo conectar con el backend (${error.message}).`;
    const wrapped = new Error(message);
    wrapped.cause = error;
    throw wrapped;
  }

  const resTextClone = res.clone();
  let payload = null;
  let rawText = '';

  try {
    payload = await res.json();
  } catch {
    payload = null;
    try {
      rawText = await resTextClone.text();
    } catch {
      rawText = '';
    }
  }

  if (!res.ok) {
    const isApiRoute = typeof url === 'string' && url.startsWith('/api/');
    const notFoundStaticPage = /not_found|page could not be found/i.test(rawText);
    let message = payload?.error || '';

    if (!message && isApiRoute && res.status === 404 && notFoundStaticPage) {
      message =
        'Este despliegue no tiene backend API. En Vercel debes desplegar tambien el servidor (no solo /public).';
    }

    if (!message) {
      message = `La solicitud fallo (HTTP ${res.status}).`;
    }

    const error = new Error(message);
    error.status = res.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

const uploadToVercelBlob = async (file) => {
  const mod = await import('https://esm.sh/@vercel/blob/client');
  const {upload} = mod;

  const safeName = String(file?.name || 'video.mp4').replace(/\s+/g, '-').toLowerCase();
  const pathname = `${Date.now()}-${safeName}`;

  const blob = await upload(pathname, file, {
    access: 'public',
    handleUploadUrl: '/api/blob/upload',
  });

  return blob;
};

const checkBackendAvailability = async () => {
  try {
    await fetchJson('/api/health');
  } catch (error) {
    pipelineError.textContent = `Error: ${error.message}`;
  }
};

const startPolling = (jobId) => {
  stopPolling();

  const poll = async () => {
    if (currentJobId !== jobId) {
      stopPolling();
      return;
    }

    const job = await fetchJson(`/api/jobs/${jobId}`);
    updateUI(job);

    if (shouldStopPolling(job)) {
      stopPolling();
      submitBtn.disabled = false;
    }
  };

  poll().catch((error) => {
    pipelineError.textContent = `Error: ${error.message}`;
    submitBtn.disabled = false;
  });

  pollTimer = setInterval(() => {
    poll().catch((error) => {
      pipelineError.textContent = `Error: ${error.message}`;
      stopPolling();
      submitBtn.disabled = false;
    });
  }, 2500);
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  stopPolling();

  transcriptPanel.hidden = true;
  transcriptPreviewEl.textContent = '';
  insightsPanel.hidden = true;
  insightsList.innerHTML = '';
  aiPanel.hidden = true;
  resultPanel.hidden = true;
  chatLog.innerHTML = '';
  visualEditor.innerHTML = '';
  refineInput.value = '';

  const hasFile = Boolean(fileInput.files && fileInput.files.length > 0);
  const youtubeUrl = String(youtubeInput.value || '').trim();

  if (!hasFile && !youtubeUrl) {
    renderPipeline(null);
    pipelineError.textContent = 'Error: Sube un video local o pega un enlace de YouTube.';
    return;
  }

  const tempSourceType = hasFile ? 'blob' : 'youtube';
  renderPipeline({
    status: 'queued',
    stage: 'analyze-queued',
    progress: 0,
    warnings: [],
    error: '',
    inputSource: {type: tempSourceType},
  });

  submitBtn.disabled = true;
  submitBtn.textContent = hasFile ? 'Subiendo video...' : 'Analizando...';

  try {
    let payload = null;

    if (hasFile) {
      const file = fileInput.files[0];
      const blob = await uploadToVercelBlob(file);

      payload = await fetchJson('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({blobUrl: blob.url}),
      });
    } else {
      const formData = new FormData();
      formData.set('youtubeUrl', youtubeUrl);

      payload = await fetchJson('/api/jobs', {
        method: 'POST',
        body: formData,
      });
    }

    currentJobId = payload.jobId;
    startPolling(payload.jobId);
  } catch (error) {
    pipelineError.textContent = `Error: ${error.message}`;
    submitBtn.disabled = false;
  } finally {
    submitBtn.textContent = 'Analizar y proponer animaciones';
  }
});

addOverlayBtn.addEventListener('click', () => {
  if (!latestJob || !canInteractWithAi(latestJob)) {
    pipelineError.textContent = 'Error: Primero completa el analisis y espera la propuesta.';
    return;
  }

  const toolkit = getToolkit(latestJob);
  const durationSec = Number(latestJob.video?.durationSec || 30);
  const startSec = Math.max(0, Math.min(Math.max(0, durationSec - 1), durationSec * 0.55));

  const event = {
    id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    startSec,
    durationSec: 3,
    payload: {
      stylePack: toolkit.stylePacks[0] || 'clean',
      motion: {
        enter: toolkit.enter[0] || 'spring-pop',
        exit: toolkit.exit[0] || 'fade',
        effects: [],
      },
      design: {
        typography: toolkit.typographyPresets[0] || 'display-bold',
        energy: toolkit.energyLevels[1] || toolkit.energyLevels[0] || 'balanced',
        position: toolkit.positions[1] || toolkit.positions[0] || 'center',
      },
      animationSpec: {
        intent: toolkit.intents[2] || toolkit.intents[0] || 'explanation',
        layout: toolkit.layouts[3] || toolkit.layouts[0] || 'quote-focus',
      },
      title: 'Nuevo mensaje',
      subtitle: 'Refuerzo visual anadido manualmente',
    },
    reasoning: 'Anadida manualmente por el usuario.',
    confidence: 0.6,
  };

  const cards = [...visualEditor.querySelectorAll('.overlay-card')];
  const card = buildOverlayCard({
    event,
    index: cards.length,
    toolkit,
    editable: true,
    isNew: true,
  });

  visualEditor.appendChild(card);
  refreshOverlayTitles();
  appendChat('assistant', 'Animacion nueva anadida. Ajusta texto y tiempos antes de aplicar cambios.');
});

applyVisualBtn.addEventListener('click', async () => {
  if (!currentJobId || !latestJob) {
    pipelineError.textContent = 'Error: Primero debes analizar un video.';
    return;
  }

  if (!canInteractWithAi(latestJob)) {
    pipelineError.textContent = 'Error: El editor visual esta activo solo en la fase de revision.';
    return;
  }

  const overrides = collectVisualOverrides();
  if (overrides.length === 0) {
    pipelineError.textContent = 'Error: Anade al menos una animacion antes de aplicar cambios.';
    return;
  }

  pipelineError.textContent = '';
  applyVisualBtn.disabled = true;
  refineBtn.disabled = true;
  renderBtn.disabled = true;
  addOverlayBtn.disabled = true;

  try {
    const job = await fetchJson(`/api/jobs/${currentJobId}/visual-overrides`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({overrides}),
    });

    updateUI(job);
    appendChat('assistant', 'Cambios aplicados. La propuesta visual ya esta actualizada.');
  } catch (error) {
    if (error.payload?.job) {
      updateUI(error.payload.job);
    }
    pipelineError.textContent = `Error: ${error.message}`;
  }
});

refineBtn.addEventListener('click', async () => {
  if (!currentJobId) {
    pipelineError.textContent = 'Error: Primero debes analizar un video.';
    return;
  }

  const instruction = refineInput.value.trim();
  if (!instruction) {
    pipelineError.textContent = 'Error: Escribe una instruccion para ajustar la propuesta.';
    return;
  }

  pipelineError.textContent = '';
  appendChat('user', instruction);
  refineInput.value = '';

  refineBtn.disabled = true;
  renderBtn.disabled = true;
  applyVisualBtn.disabled = true;
  addOverlayBtn.disabled = true;

  try {
    const job = await fetchJson(`/api/jobs/${currentJobId}/refine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({instruction}),
    });

    updateUI(job);
    appendChat('assistant', `Propuesta actualizada. Ahora tienes ${Array.isArray(job.overlayPlan) ? job.overlayPlan.length : 0} animaciones.`);
  } catch (error) {
    if (error.payload?.job) {
      updateUI(error.payload.job);
    }
    pipelineError.textContent = `Error: ${error.message}`;
  }
});

renderBtn.addEventListener('click', async () => {
  if (!currentJobId) {
    pipelineError.textContent = 'Error: Primero debes analizar un video.';
    return;
  }

  pipelineError.textContent = '';
  refineBtn.disabled = true;
  renderBtn.disabled = true;
  applyVisualBtn.disabled = true;
  addOverlayBtn.disabled = true;
  submitBtn.disabled = true;

  try {
    const job = await fetchJson(`/api/jobs/${currentJobId}/render`, {
      method: 'POST',
    });

    updateUI(job);
    appendChat('assistant', 'Render iniciado. Te aviso cuando el video final este listo para descargar.');
    startPolling(currentJobId);
  } catch (error) {
    pipelineError.textContent = `Error: ${error.message}`;
    submitBtn.disabled = false;
  }
});

resetWorkspace();
checkBackendAvailability();

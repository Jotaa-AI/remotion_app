import OpenAI from 'openai';
import {v4 as uuid} from 'uuid';
import {config} from './config.js';
import {OverlayPlanSchema} from './schemas.js';

const hasOpenAi = Boolean(config.openAiApiKey);
const openai = hasOpenAi ? new OpenAI({apiKey: config.openAiApiKey}) : null;

const REMOTION_TOOLKIT = {
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

export const REMOTION_VISUAL_TOOLKIT = REMOTION_TOOLKIT;

const TEMPLATE_DEFAULTS = {
  'lower-third': {
    stylePack: 'clean',
    motion: {enter: 'tilt-in', exit: 'fade', effects: ['float', 'glow']},
    design: {typography: 'display-bold', energy: 'balanced', position: 'bottom'},
  },
  subscribe: {
    stylePack: 'retro-red',
    motion: {enter: 'stamp', exit: 'fade', effects: ['pulse', 'glow', 'float', 'saturate']},
    design: {typography: 'display-bold', energy: 'high', position: 'center'},
  },
  'subscribe-sticker': {
    stylePack: 'comic-blue',
    motion: {enter: 'whip-left', exit: 'shrink', effects: ['wiggle', 'pulse', 'glow', 'saturate']},
    design: {typography: 'impact', energy: 'high', position: 'center'},
  },
  'stat-compare': {
    stylePack: 'comic-blue',
    motion: {enter: 'slide-left', exit: 'fade', effects: ['pulse', 'float', 'glow']},
    design: {typography: 'clean-sans', energy: 'balanced', position: 'center'},
  },
  'text-pop': {
    stylePack: 'comic-blue',
    motion: {enter: 'stamp', exit: 'fade', effects: ['pulse', 'glow', 'shake', 'saturate']},
    design: {typography: 'impact', energy: 'high', position: 'center'},
  },
  'cta-banner': {
    stylePack: 'clean',
    motion: {enter: 'slide-up', exit: 'swipe-right', effects: ['float', 'pulse', 'glow']},
    design: {typography: 'display-bold', energy: 'balanced', position: 'bottom'},
  },
};

const findWordTime = (words, candidates, fallback) => {
  const lowerCandidates = candidates.map((candidate) => candidate.toLowerCase());
  const found = words.find((entry) => lowerCandidates.some((term) => entry.word.toLowerCase().includes(term)));
  return found ? Number(found.start || fallback) : fallback;
};

const hasSubscribeIntent = (event) => {
  const payloadText = JSON.stringify(event.payload || {}).toLowerCase();
  const reasoning = String(event.reasoning || '').toLowerCase();
  return /suscrib|subscribe|subscr|canal/.test(`${payloadText} ${reasoning}`);
};

const toNormalizedHex = (value) => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(normalized)) {
    return normalized;
  }
  return null;
};

const normalizeEnum = (value, allowed, fallback) => {
  const key = String(value || '').trim().toLowerCase();
  if (allowed.includes(key)) {
    return key;
  }
  return fallback;
};

const ENERGY_MOTION_PROFILE = {
  calm: {
    pulseAmp: 0.015,
    floatPx: 4,
    wiggleDeg: 1.1,
    shakePx: 1.1,
    enterWindow: 0.34,
    exitWindow: 0.2,
  },
  balanced: {
    pulseAmp: 0.04,
    floatPx: 8,
    wiggleDeg: 2.2,
    shakePx: 2,
    enterWindow: 0.26,
    exitWindow: 0.22,
  },
  high: {
    pulseAmp: 0.075,
    floatPx: 12,
    wiggleDeg: 3.4,
    shakePx: 3.1,
    enterWindow: 0.2,
    exitWindow: 0.24,
  },
};

const applyEnergyProfile = (motion, energy) => {
  const key = normalizeEnum(energy, REMOTION_TOOLKIT.energyLevels, 'balanced');
  return {
    ...motion,
    ...ENERGY_MOTION_PROFILE[key],
  };
};

const clipText = (text, maxLength) => {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
};

const pickTemplateFromInsight = (insight) => {
  const byTemplate = String(insight?.templateSuggestion || '').toLowerCase();
  if (Object.prototype.hasOwnProperty.call(TEMPLATE_DEFAULTS, byTemplate)) {
    return byTemplate;
  }

  const digest = `${insight?.topic || ''} ${insight?.transcriptSnippet || ''} ${insight?.animationDescription || ''}`.toLowerCase();
  if (/suscrib|subscribe|canal/.test(digest)) return 'subscribe-sticker';
  if (/vs|versus|contra|compar|métrica|metrica|dato|\d/.test(digest)) return 'stat-compare';
  if (/comenta|sigueme|sígueme|descarga|link|cta/.test(digest)) return 'cta-banner';
  if (/importante|clave|tip|truco|error|ojo/.test(digest)) return 'text-pop';
  return 'lower-third';
};

const parseCompareValuesFromText = (text) => {
  const raw = String(text || '').toLowerCase();
  const match = raw.match(/(\d+(?:[.,]\d+)?\s*[kKmM]?)\s*(?:vs|versus|contra)\s*(\d+(?:[.,]\d+)?\s*[kKmM]?)/);
  if (!match) {
    return null;
  }

  return {
    leftValue: String(match[1]).replace(/\s+/g, ''),
    rightValue: String(match[2]).replace(/\s+/g, ''),
  };
};

const getDurationByTemplate = (template) => {
  if (template === 'stat-compare') return 4.8;
  if (template === 'subscribe' || template === 'subscribe-sticker') return 3.8;
  if (template === 'cta-banner') return 4.2;
  if (template === 'lower-third') return 3.4;
  return 3;
};

const getIntentByTemplate = (template) => {
  if (template === 'stat-compare') return 'proof';
  if (template === 'subscribe' || template === 'subscribe-sticker') return 'cta';
  if (template === 'cta-banner') return 'cta';
  if (template === 'text-pop') return 'explanation';
  if (template === 'lower-third') return 'hook';
  return 'transition';
};

const getLayoutByIntent = (intent) => {
  if (intent === 'proof') return 'split-bars';
  if (intent === 'cta') return 'cta-ribbon';
  if (intent === 'explanation' || intent === 'objection') return 'quote-focus';
  if (intent === 'summary') return 'data-pill';
  if (intent === 'hook') return 'headline-card';
  return 'sticker-burst';
};

const upsertElement = (elements, type, patch) => {
  const normalized = Array.isArray(elements) ? [...elements] : [];
  const index = normalized.findIndex((entry) => String(entry?.type || '').toLowerCase() === type);
  const current = index >= 0 ? normalized[index] : {type};
  const next = {
    ...current,
    ...patch,
    type,
  };
  if (index >= 0) {
    normalized[index] = next;
  } else {
    normalized.push(next);
  }
  return normalized;
};

const clipWords = (value, maxWords) => {
  const words = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  if (words.length <= maxWords) {
    return words.join(' ');
  }
  return `${words.slice(0, maxWords).join(' ')}…`;
};

const normalizeAnimationSpec = ({spec, template, payload, reasoning}) => {
  const incoming = spec || {};
  const templateIntent = getIntentByTemplate(template);
  const rawIntent = String(incoming.intent || templateIntent).toLowerCase();
  const intent = REMOTION_TOOLKIT.intents.includes(rawIntent) ? rawIntent : templateIntent;
  const rawLayout = String(incoming.layout || getLayoutByIntent(intent)).toLowerCase();
  const layout = REMOTION_TOOLKIT.layouts.includes(rawLayout) ? rawLayout : getLayoutByIntent(intent);
  const emphasis = normalizeEnum(incoming.emphasis, REMOTION_TOOLKIT.energyLevels, payload?.design?.energy || 'balanced');

  let elements = Array.isArray(incoming.elements) ? incoming.elements.slice(0, 12) : [];
  const title = clipWords(payload?.title || payload?.text || payload?.kicker || 'Momento clave', 8);
  const subtitle = clipWords(payload?.subtitle || payload?.caption || reasoning || 'Refuerzo visual generado por IA.', 14);
  const badge = clipWords(payload?.kicker || payload?.chip || payload?.eyebrow || intent.toUpperCase(), 4);

  elements = upsertElement(elements, 'title', {text: title});
  elements = upsertElement(elements, 'subtitle', {text: subtitle});
  elements = upsertElement(elements, 'badge', {text: badge});
  elements = upsertElement(elements, 'cta', {text: clipWords(payload?.buttonText || 'Seguir +', 3)});

  if (template === 'stat-compare') {
    const leftLabel = clipWords(payload?.leftLabel || 'Valor A', 3);
    const rightLabel = clipWords(payload?.rightLabel || 'Valor B', 3);
    elements = upsertElement(elements, 'metric-left-label', {text: leftLabel});
    elements = upsertElement(elements, 'metric-right-label', {text: rightLabel});
    elements = upsertElement(elements, 'metric-left-value', {value: String(payload?.leftValue ?? '10k')});
    elements = upsertElement(elements, 'metric-right-value', {value: String(payload?.rightValue ?? '20k')});
  }

  return {
    intent,
    layout,
    emphasis,
    elements,
  };
};

const normalizePayloadByTemplate = (template, payload) => {
  const safePayload = payload || {};

  if (template === 'stat-compare') {
    return {
      ...safePayload,
      leftValue: safePayload.leftValue ?? safePayload.stat1 ?? safePayload.valueA ?? safePayload.a ?? 0,
      rightValue: safePayload.rightValue ?? safePayload.stat2 ?? safePayload.valueB ?? safePayload.b ?? 0,
      leftLabel: safePayload.leftLabel ?? safePayload.label1 ?? safePayload.seriesA ?? 'A',
      rightLabel: safePayload.rightLabel ?? safePayload.label2 ?? safePayload.seriesB ?? 'B',
      title: safePayload.title ?? safePayload.description ?? 'Comparativa',
    };
  }

  if (template === 'lower-third') {
    return {
      ...safePayload,
      title: safePayload.title ?? safePayload.text ?? 'Headline principal',
      subtitle: safePayload.subtitle ?? safePayload.caption ?? 'Insight estrategico',
      kicker: safePayload.kicker ?? 'HIGHLIGHT',
    };
  }

  if (template === 'subscribe') {
    return {
      ...safePayload,
      title: safePayload.title ?? safePayload.text ?? 'Suscribete para mas contenido',
      subtitle: safePayload.subtitle ?? safePayload.caption ?? 'Nuevos videos cada semana',
      eyebrow: safePayload.eyebrow ?? 'Creator Growth Trigger',
    };
  }

  if (template === 'subscribe-sticker') {
    return {
      ...safePayload,
      text: safePayload.text ?? safePayload.title ?? 'suscribiros a mi canal',
      badge: safePayload.badge ?? 'you',
      caption: safePayload.caption ?? '<subscribe />',
    };
  }

  if (template === 'text-pop') {
    return {
      ...safePayload,
      text: safePayload.text ?? safePayload.title ?? 'Punto clave',
      chip: safePayload.chip ?? 'IMPORTANT',
    };
  }

  if (template === 'cta-banner') {
    return {
      ...safePayload,
      text: safePayload.text ?? safePayload.title ?? 'Sigue para mas contenido',
      subtitle: safePayload.subtitle ?? safePayload.caption ?? 'Comenta, guarda y comparte este video',
      buttonText: safePayload.buttonText ?? 'Follow +',
    };
  }

  return safePayload;
};

const normalizeDesignPayload = (incomingDesign, defaults) => {
  const design = incomingDesign || {};

  return {
    typography: normalizeEnum(design.typography, REMOTION_TOOLKIT.typographyPresets, defaults.typography),
    energy: normalizeEnum(design.energy, REMOTION_TOOLKIT.energyLevels, defaults.energy),
    position: normalizeEnum(design.position, REMOTION_TOOLKIT.positions, defaults.position),
    primaryColor: toNormalizedHex(design.primaryColor),
    accentColor: toNormalizedHex(design.accentColor),
    textColor: toNormalizedHex(design.textColor),
  };
};

const upgradeTemplateByIntent = (event) => {
  if (event.template === 'subscribe-sticker') {
    return event;
  }

  if (hasSubscribeIntent(event)) {
    return {
      ...event,
      template: 'subscribe-sticker',
    };
  }

  return event;
};

const withToolkitDefaults = (events) => {
  return events.map((event) => {
    const upgradedEvent = upgradeTemplateByIntent(event);
    const defaults = TEMPLATE_DEFAULTS[upgradedEvent.template] || TEMPLATE_DEFAULTS['text-pop'];
    const payload = normalizePayloadByTemplate(upgradedEvent.template, upgradedEvent.payload || {});
    const design = normalizeDesignPayload(payload.design, defaults.design || TEMPLATE_DEFAULTS['text-pop'].design);
    const motion = applyEnergyProfile(
      {
        ...defaults.motion,
        ...(payload.motion || {}),
      },
      design.energy,
    );
    const animationSpec = normalizeAnimationSpec({
      spec: payload.animationSpec,
      template: upgradedEvent.template,
      payload: {
        ...payload,
        design,
      },
      reasoning: upgradedEvent.reasoning,
    });

    return {
      ...upgradedEvent,
      id: upgradedEvent.id || uuid(),
      payload: {
        ...payload,
        stylePack: payload.stylePack || defaults.stylePack,
        design,
        motion,
        animationSpec,
      },
    };
  });
};

export const applyOverlayToolkitDefaults = (events) => withToolkitDefaults(events || []);

const heuristicPlan = ({brief, transcriptText, words, durationSec}) => {
  const fullText = `${brief || ''} ${transcriptText || ''}`.toLowerCase();
  const events = [];

  events.push({
    id: uuid(),
    template: 'lower-third',
    startSec: 0.4,
    durationSec: Math.min(4, Math.max(2.5, durationSec * 0.12)),
    payload: {
      title: 'Contenido destacado',
      subtitle: 'Resumen visual inteligente',
      kicker: 'HOOK',
    },
    confidence: 0.6,
    reasoning: 'Plantilla inicial para branding.',
  });

  const compareRegex = /(\d+[kKmM]?)\s*(vs|versus|contra)\s*(\d+[kKmM]?)/;
  const compareMatch = fullText.match(compareRegex);
  if (compareMatch) {
    const start = findWordTime(words, ['vs', 'versus', 'contra'], durationSec * 0.35);
    events.push({
      id: uuid(),
      template: 'stat-compare',
      startSec: start,
      durationSec: 5,
      payload: {
        leftLabel: 'Metrica A',
        rightLabel: 'Metrica B',
        leftValue: compareMatch[1],
        rightValue: compareMatch[3],
        title: 'Comparativa clave',
      },
      confidence: 0.72,
      reasoning: 'Se detectó patrón comparativo numérico.',
    });
  }

  if (/suscrib|subscribe|subscr/i.test(fullText)) {
    const start = findWordTime(words, ['suscrib', 'subscribe'], Math.max(2, durationSec - 8));
    events.push({
      id: uuid(),
      template: 'subscribe-sticker',
      startSec: start,
      durationSec: 4,
      payload: {
        text: 'suscribiros a mi canal',
        badge: 'you',
        caption: '<subscribe />',
      },
      confidence: 0.88,
      reasoning: 'Se detectó llamada a suscripción y se prioriza formato sticker dinámico.',
    });
  }

  if (/importante|clave|tip|truco|ojo/i.test(fullText)) {
    const start = findWordTime(words, ['importante', 'clave', 'tip', 'truco', 'ojo'], durationSec * 0.55);
    events.push({
      id: uuid(),
      template: 'text-pop',
      startSec: start,
      durationSec: 3,
      payload: {
        text: 'Punto clave',
        chip: 'IMPORTANT',
      },
      confidence: 0.65,
      reasoning: 'Se detectó palabra gatillo informativa.',
    });
  }

  if (/comenta|comentario|sígueme|sigueme|descarga|link/i.test(fullText)) {
    events.push({
      id: uuid(),
      template: 'cta-banner',
      startSec: Math.max(2, durationSec - 6),
      durationSec: 4,
      payload: {
        text: 'Deja tu comentario y comparte',
        subtitle: 'Guardar este video aumenta tu retencion',
        buttonText: 'Seguir +',
      },
      confidence: 0.7,
      reasoning: 'Se detectó CTA de engagement.',
    });
  }

  return {events: withToolkitDefaults(events)};
};

const buildPlanFromInsights = ({insights, durationSec}) => {
  if (!Array.isArray(insights) || insights.length === 0) {
    return {events: []};
  }

  const safeDuration = Math.max(1, Number(durationSec || 0));
  const maxStart = Math.max(0, safeDuration - 0.6);
  const events = insights.slice(0, 10).map((insight) => {
    const template = pickTemplateFromInsight(insight);
    const startSec = Math.max(0, Math.min(maxStart, Number(insight?.timeSec || 0)));
    const durationByTemplate = getDurationByTemplate(template);
    const durationSecForEvent = Math.min(8, Math.max(2.4, durationByTemplate));
    const topic = clipText(insight?.topic || 'Momento clave', 64);
    const snippet = clipText(insight?.transcriptSnippet || '', 100);
    const impact = clipText(insight?.expectedImpact || 'Mejor claridad y retención.', 120);
    const role = String(insight?.narrativeRole || 'highlight').toUpperCase();
    const compareValues = parseCompareValuesFromText(`${topic} ${snippet}`);

    const basePayload =
      template === 'stat-compare'
        ? {
            title: clipText(topic, 34) || 'Comparativa clave',
            leftLabel: 'Valor A',
            rightLabel: 'Valor B',
            leftValue: compareValues?.leftValue || '10k',
            rightValue: compareValues?.rightValue || '20k',
          }
        : template === 'subscribe' || template === 'subscribe-sticker'
          ? {
              text: clipText(topic, 42) || 'Suscribete para mas contenido',
              title: clipText(topic, 42) || 'Suscribete para mas contenido',
              subtitle: clipText(impact, 56),
            }
          : template === 'cta-banner'
            ? {
                text: clipText(topic, 44) || 'Sigue para mas contenido',
                subtitle: clipText(impact, 72),
                buttonText: 'Seguir +',
              }
            : template === 'text-pop'
              ? {
                  text: clipText(topic, 34) || 'Punto clave',
                  chip: role,
                }
              : {
                  title: clipText(topic, 50) || 'Momento importante',
                  subtitle: clipText(impact, 76),
                  kicker: role,
                };

    return {
      id: uuid(),
      template,
      startSec,
      durationSec: durationSecForEvent,
      payload: basePayload,
      reasoning: `${insight?.whyImportant || 'Momento con valor narrativo.'} Impacto esperado: ${impact}`,
      confidence: Number(insight?.confidence || 0.62),
    };
  });

  return {events: withToolkitDefaults(events)};
};

const llmPlan = async ({brief, transcriptText, durationSec, analysisInsights}) => {
  const system = [
    'Eres un director senior de motion graphics para contenido de YouTube.',
    'Tu objetivo es elegir overlays estratégicos y la mejor estrategia de animación de Remotion para cada uno.',
    'Debes devolver SOLO JSON válido con formato: {"events":[...]}.',
    'Plantillas permitidas: lower-third, subscribe, subscribe-sticker, stat-compare, text-pop, cta-banner.',
    `Toolbox de animación disponible (payload.motion): enter=${REMOTION_TOOLKIT.enter.join(', ')}; exit=${REMOTION_TOOLKIT.exit.join(', ')}; effects=${REMOTION_TOOLKIT.effects.join(', ')}.`,
    `Paletas visuales disponibles (payload.stylePack): ${REMOTION_TOOLKIT.stylePacks.join(', ')}.`,
    `Animation intents: ${REMOTION_TOOLKIT.intents.join(', ')}.`,
    `Animation layouts: ${REMOTION_TOOLKIT.layouts.join(', ')}.`,
    'Cada evento debe incluir: template, startSec, durationSec, payload, reasoning, confidence.',
    'En payload incluye siempre motion {enter, exit, effects}, stylePack, design {typography, energy, position} y animationSpec {intent, layout, emphasis, elements}.',
    'Diseña overlays premium: alto contraste, capas, energia visual y legibilidad.',
    'Si hay llamada a suscripción, prioriza template subscribe-sticker con estilo visual expresivo.',
    'Máximo 8 eventos. Evita solapes fuertes y conserva claridad visual.',
    `No salgas de la duración total del video (${durationSec.toFixed(2)} segundos).`,
  ].join(' ');

  const user = [
    `Brief del usuario: ${brief || 'Sin brief adicional.'}`,
    `Transcripción completa: ${transcriptText || 'Sin transcripción.'}`,
    `Insights estratégicos previos: ${JSON.stringify((analysisInsights || []).slice(0, 10))}`,
    `Duración del video: ${durationSec.toFixed(2)} segundos.`,
    'Prioriza momentos de hook inicial, comparativas numéricas, frases clave y llamada final a la acción.',
  ].join('\n');

  const response = await openai.chat.completions.create({
    model: config.llmModel,
    temperature: 0.2,
    response_format: {type: 'json_object'},
    messages: [
      {role: 'system', content: system},
      {role: 'user', content: user},
    ],
  });

  const json = response.choices?.[0]?.message?.content;
  if (!json) {
    throw new Error('El LLM no devolvió contenido JSON.');
  }

  return JSON.parse(json);
};

const llmRefinePlan = async ({brief, transcriptText, durationSec, currentEvents, instruction}) => {
  const system = [
    'Eres un editor senior de motion graphics.',
    'Recibirás un plan existente y una instrucción de ajuste del usuario.',
    'Debes devolver SOLO JSON con formato {"events":[...]}.',
    'Plantillas permitidas: lower-third, subscribe, subscribe-sticker, stat-compare, text-pop, cta-banner.',
    `Toolbox Remotion motion enter: ${REMOTION_TOOLKIT.enter.join(', ')}.`,
    `Toolbox Remotion motion exit: ${REMOTION_TOOLKIT.exit.join(', ')}.`,
    `Toolbox Remotion effects: ${REMOTION_TOOLKIT.effects.join(', ')}.`,
    `Style packs: ${REMOTION_TOOLKIT.stylePacks.join(', ')}.`,
    `Typographies: ${REMOTION_TOOLKIT.typographyPresets.join(', ')}.`,
    `Energy levels: ${REMOTION_TOOLKIT.energyLevels.join(', ')}.`,
    `Positions: ${REMOTION_TOOLKIT.positions.join(', ')}.`,
    `Animation intents: ${REMOTION_TOOLKIT.intents.join(', ')}.`,
    `Animation layouts: ${REMOTION_TOOLKIT.layouts.join(', ')}.`,
    'En payload incluye motion, stylePack, design y animationSpec en cada evento.',
    'Mantener look premium: contraste, composicion por capas y lectura clara.',
    'Mantén overlays en sitios estratégicos y evita solape excesivo.',
    `No excedas la duración de video (${durationSec.toFixed(2)} segundos).`,
    'Máximo 10 eventos.',
  ].join(' ');

  const user = [
    `Brief original: ${brief || 'Sin brief.'}`,
    `Instrucción de ajuste del usuario: ${instruction}`,
    `Duración del video: ${durationSec.toFixed(2)} segundos.`,
    `Plan actual (JSON): ${JSON.stringify(currentEvents || [])}`,
    `Transcripción: ${transcriptText || 'Sin transcripción.'}`,
  ].join('\n');

  const response = await openai.chat.completions.create({
    model: config.llmModel,
    temperature: 0.2,
    response_format: {type: 'json_object'},
    messages: [
      {role: 'system', content: system},
      {role: 'user', content: user},
    ],
  });

  const json = response.choices?.[0]?.message?.content;
  if (!json) {
    throw new Error('El LLM no devolvió JSON de refinamiento.');
  }

  return JSON.parse(json);
};

const heuristicRefine = ({currentEvents, instruction, durationSec, brief, transcriptText, words}) => {
  const lowerInstruction = (instruction || '').toLowerCase();

  if (!currentEvents || currentEvents.length === 0) {
    return heuristicPlan({brief: `${brief || ''} ${instruction || ''}`, transcriptText, words, durationSec});
  }

  let events = currentEvents.map((event) => ({
    ...event,
    payload: {
      ...(event.payload || {}),
      motion: {...(event.payload?.motion || {})},
    },
  }));

  if (/quita|elimina|menos|reduce/.test(lowerInstruction) && events.length > 1) {
    const keepCount = Math.max(1, Math.ceil(events.length * 0.6));
    events = events.slice(0, keepCount);
  }

  if (/sin\s+suscrib|quita\s+suscrib|elimina\s+suscrib/.test(lowerInstruction)) {
    events = events.filter((event) => !['subscribe', 'subscribe-sticker'].includes(event.template));
  }

  if (/sin\s+compar|quita\s+compar|elimina\s+compar/.test(lowerInstruction)) {
    events = events.filter((event) => event.template !== 'stat-compare');
  }

  if (/mas\s+dinam|más\s+dinam|más\s+movimiento|mas\s+movimiento/.test(lowerInstruction)) {
    events = events.map((event) => ({
      ...event,
      payload: {
        ...(event.payload || {}),
        design: {
          ...((event.payload || {}).design || {}),
          energy: 'high',
        },
        motion: {
          ...(event.payload?.motion || {}),
          effects: ['pulse', 'wiggle', 'glow', 'saturate'],
          enter: event.template === 'subscribe-sticker' ? 'whip-left' : 'stamp',
          exit: event.template === 'cta-banner' ? 'swipe-right' : 'fade',
        },
      },
    }));
  }

  if (/mas\s+calm|más\s+calm|suave|menos\s+energia|menos\s+energía/.test(lowerInstruction)) {
    events = events.map((event) => ({
      ...event,
      payload: {
        ...(event.payload || {}),
        design: {
          ...((event.payload || {}).design || {}),
          energy: 'calm',
        },
        motion: {
          ...(event.payload?.motion || {}),
          effects: ['float', 'glow'],
          enter: event.template === 'lower-third' ? 'slide-up' : 'spring-pop',
          exit: 'fade',
        },
      },
    }));
  }

  if (/mas|más|añade|agrega/.test(lowerInstruction) && events.length < 10) {
    events.push({
      id: uuid(),
      template: 'text-pop',
      startSec: durationSec * 0.5,
      durationSec: 3,
      payload: {
        text: 'Punto clave',
      },
      reasoning: 'Ajuste manual solicitado por el usuario.',
      confidence: 0.55,
    });
  }

  if (/suscrib|subscribe/.test(lowerInstruction)) {
    const hasSubscribe = events.some((event) => ['subscribe', 'subscribe-sticker'].includes(event.template));
    if (!hasSubscribe) {
      events.push({
        id: uuid(),
        template: 'subscribe-sticker',
        startSec: Math.max(2, durationSec - 6),
        durationSec: 4,
        payload: {
          text: 'suscribiros a mi canal',
          badge: 'you',
          caption: '<subscribe />',
        },
        reasoning: 'Ajuste manual solicitado por el usuario.',
        confidence: 0.7,
      });
    }
  }

  return {events: withToolkitDefaults(events)};
};

const parsePlanOrFallback = (candidate, fallbackFactory) => {
  const parsed = OverlayPlanSchema.safeParse(candidate);
  if (parsed.success) {
    return {
      events: withToolkitDefaults(parsed.data.events),
    };
  }
  return fallbackFactory();
};

const ensureStrategicCoverage = ({events, brief, transcriptText, words, durationSec, instruction}) => {
  const fullText = `${brief || ''} ${instruction || ''} ${transcriptText || ''}`.toLowerCase();
  const needsSubscribe = /suscrib|subscribe|subscr/.test(fullText);
  const prefersSticker = /sticker|comic|cartoon|doodle|pegatina/.test(fullText);
  let coveredEvents = [...events];

  if (prefersSticker) {
    coveredEvents = withToolkitDefaults(
      coveredEvents.map((event) => {
        if (event.template === 'subscribe' || hasSubscribeIntent(event)) {
          return {
            ...event,
            template: 'subscribe-sticker',
            payload: normalizePayloadByTemplate('subscribe-sticker', event.payload || {}),
          };
        }
        return event;
      }),
    );
  }

  if (!needsSubscribe) {
    return {events: coveredEvents};
  }

  const hasSubscribeEvent = coveredEvents.some(
    (event) => ['subscribe', 'subscribe-sticker'].includes(event.template) || hasSubscribeIntent(event),
  );
  if (hasSubscribeEvent) {
    return {events: coveredEvents};
  }

  // Si no hay slot libre para agregar overlays en videos cortos, reciclamos un evento CTA/texto.
  const replaceIndex = coveredEvents.findIndex((event) => ['cta-banner', 'text-pop'].includes(event.template));
  if (replaceIndex >= 0) {
    const base = coveredEvents[replaceIndex];
    const replaced = [...coveredEvents];
    replaced[replaceIndex] = {
      ...base,
      template: 'subscribe-sticker',
      payload: normalizePayloadByTemplate('subscribe-sticker', {
        ...(base.payload || {}),
        text: 'suscribiros a mi canal',
        badge: 'you',
        caption: '<subscribe />',
      }),
      reasoning: `${base.reasoning || ''} Cobertura estratégica forzada por intención explícita de suscripción.`.trim(),
      confidence: Math.max(0.7, Number(base.confidence || 0.6)),
    };
    return {events: withToolkitDefaults(replaced)};
  }

  const suggestedStart = findWordTime(words || [], ['suscrib', 'subscribe'], Math.max(2, durationSec - 7));
  const appended = withToolkitDefaults([
    ...coveredEvents,
    {
      id: uuid(),
      template: 'subscribe-sticker',
      startSec: suggestedStart,
      durationSec: 4,
      payload: {
        text: 'suscribiros a mi canal',
        badge: 'you',
        caption: '<subscribe />',
      },
      reasoning: 'Cobertura estratégica forzada por intención explícita de suscripción.',
      confidence: 0.82,
    },
  ]);

  return {events: appended};
};

const enrichWithInsightsCoverage = ({events, analysisInsights, durationSec}) => {
  if (!Array.isArray(analysisInsights) || analysisInsights.length === 0) {
    return {events};
  }

  const desiredCount = Math.min(8, Math.max(3, Math.min(analysisInsights.length, 6)));
  if (events.length >= desiredCount) {
    return {events};
  }

  const insightDerived = buildPlanFromInsights({insights: analysisInsights, durationSec}).events;
  const existingTimeBuckets = new Set(events.map((event) => Math.round(Number(event.startSec || 0))));
  const missing = insightDerived.filter((event) => !existingTimeBuckets.has(Math.round(Number(event.startSec || 0))));
  const merged = [...events, ...missing].slice(0, desiredCount);
  return {events: withToolkitDefaults(merged)};
};

export const planOverlayEvents = async ({brief, transcriptText, words, durationSec, analysisInsights}) => {
  const fallbackFactory = () => {
    const byInsights = buildPlanFromInsights({insights: analysisInsights, durationSec});
    if (byInsights.events.length > 0) {
      return byInsights;
    }
    return heuristicPlan({brief, transcriptText, words, durationSec});
  };

  let candidate;

  if (hasOpenAi) {
    try {
      candidate = await llmPlan({brief, transcriptText, durationSec, analysisInsights});
    } catch {
      candidate = fallbackFactory();
    }
  } else {
    candidate = fallbackFactory();
  }

  const plan = parsePlanOrFallback(candidate, fallbackFactory);
  const withInsights = enrichWithInsightsCoverage({
    events: plan.events,
    analysisInsights,
    durationSec,
  });

  return ensureStrategicCoverage({
    ...withInsights,
    brief,
    transcriptText,
    words,
    durationSec,
  });
};

export const refineOverlayEvents = async ({brief, transcriptText, words, durationSec, currentEvents, instruction}) => {
  const fallbackFactory = () =>
    heuristicRefine({
      currentEvents,
      instruction,
      durationSec,
      brief,
      transcriptText,
      words,
    });

  let candidate;

  if (hasOpenAi) {
    try {
      candidate = await llmRefinePlan({
        brief,
        transcriptText,
        durationSec,
        currentEvents,
        instruction,
      });
    } catch {
      candidate = fallbackFactory();
    }
  } else {
    candidate = fallbackFactory();
  }

  const plan = parsePlanOrFallback(candidate, fallbackFactory);
  return ensureStrategicCoverage({
    ...plan,
    brief,
    transcriptText,
    words,
    durationSec,
    instruction,
  });
};

import OpenAI from 'openai';
import {v4 as uuid} from 'uuid';
import {config} from '../server/config.js';
import {ScenePlanSchema} from './scene-schema.js';

const hasOpenAi = Boolean(config.openAiApiKey);
const openai = hasOpenAi ? new OpenAI({apiKey: config.openAiApiKey}) : null;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const clipText = (value, max = 120) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
};

const parseRole = (insight) => {
  const role = String(insight?.narrativeRole || '').toLowerCase();
  if (['hook', 'proof', 'explanation', 'objection', 'cta', 'transition', 'summary'].includes(role)) {
    return role;
  }
  return 'explanation';
};

const parseEnergy = (insight, intent) => {
  const explicit = String(insight?.energy || insight?.tone || '').toLowerCase();
  if (['calm', 'balanced', 'high'].includes(explicit)) return explicit;
  if (intent === 'hook' || intent === 'cta') return 'high';
  if (intent === 'proof' || intent === 'objection') return 'balanced';
  return 'calm';
};

const pickStylePack = ({intent, energy}) => {
  if (intent === 'cta') return 'retro-red';
  if (intent === 'proof' || intent === 'objection') return 'comic-blue';
  if (energy === 'high') return 'comic-blue';
  return 'clean';
};

const extractCopy = (insight, intent) => {
  const title = clipText(insight?.topic || insight?.transcriptSnippet || 'Momento importante', 72);
  const subtitle = clipText(insight?.expectedImpact || insight?.whyImportant || '', 120);

  if (intent === 'proof') {
    return {
      title: title || 'Dato clave',
      subtitle: subtitle || 'Comparativa rápida para reforzar la credibilidad.',
      metricA: clipText(insight?.metricA || insight?.beforeValue || 'Antes', 24),
      metricB: clipText(insight?.metricB || insight?.afterValue || 'Después', 24),
    };
  }

  return {
    title: title || 'Punto clave',
    subtitle,
  };
};

const getTiming = ({insight, index, safeDuration, intent}) => {
  const maxStart = Math.max(0, safeDuration - 0.8);
  const baseStart = Number(insight?.timeSec ?? index * 5.4);
  const startSec = clamp(baseStart, 0, maxStart);

  const intentDuration =
    intent === 'proof' ? 5.2 : intent === 'objection' ? 4.8 : intent === 'summary' ? 4.4 : intent === 'cta' ? 4.2 : 3.8;

  const durationSec = clamp(intentDuration, 2.2, 7.2);
  return {startSec, durationSec};
};

const createSceneByIntent = ({insight, index, safeDuration}) => {
  const intent = parseRole(insight);
  const energy = parseEnergy(insight, intent);
  const stylePack = pickStylePack({intent, energy});
  const copy = extractCopy(insight, intent);
  const timing = getTiming({insight, index, safeDuration, intent});

  const commonTextLayer = {
    id: uuid(),
    type: 'text',
    text: copy.title,
    style: {
      x: 0.5,
      y: copy.subtitle ? 0.24 : 0.2,
      opacity: 1,
      rotationDeg: 0,
      zIndex: 25,
      fontSize: copy.subtitle ? 64 : 72,
      fontWeight: 800,
      color: '#f8fafc',
      align: 'center',
      maxWidth: 0.88,
      shadow: true,
    },
    enter: {kind: intent === 'hook' ? 'pop' : 'slide', fromSec: 0, durationSec: 0.45, easing: 'spring', params: {px: 34}},
    loop: {kind: 'scale', fromSec: 0.5, durationSec: 1.2, easing: 'linear', params: {hz: energy === 'high' ? 1.4 : 0.8, amp: energy === 'high' ? 0.02 : 0.01}},
    exit: {kind: 'fade', fromSec: 0, durationSec: 0.28, easing: 'ease-in'},
  };

  const subtitleLayer = copy.subtitle
    ? {
        id: uuid(),
        type: 'text',
        text: copy.subtitle,
        style: {
          x: 0.5,
          y: 0.34,
          opacity: 0.96,
          rotationDeg: 0,
          zIndex: 26,
          fontSize: 34,
          fontWeight: 560,
          color: '#dbeafe',
          align: 'center',
          maxWidth: 0.84,
          shadow: false,
        },
        enter: {kind: 'fade', fromSec: 0.12, durationSec: 0.35, easing: 'ease-out'},
        exit: {kind: 'fade', fromSec: 0, durationSec: 0.24, easing: 'ease-in'},
      }
    : null;

  const layers = [];

  if (intent === 'proof') {
    layers.push(
      {
        id: uuid(),
        type: 'shape',
        shape: 'rect',
        style: {
          x: 0.5,
          y: 0.5,
          w: 0.94,
          h: 0.5,
          opacity: 0.82,
          rotationDeg: 0,
          zIndex: 5,
          fill: '#0b1326',
          borderRadius: 26,
          blur: 0,
        },
      },
      {
        id: uuid(),
        type: 'shape',
        shape: 'rect',
        style: {
          x: 0.34,
          y: 0.62,
          w: 0.28,
          h: 0.18,
          opacity: 0.94,
          rotationDeg: 0,
          zIndex: 10,
          fill: '#1e3a8a',
          borderRadius: 22,
          blur: 0,
        },
      },
      {
        id: uuid(),
        type: 'shape',
        shape: 'rect',
        style: {
          x: 0.66,
          y: 0.62,
          w: 0.28,
          h: 0.18,
          opacity: 0.96,
          rotationDeg: 0,
          zIndex: 10,
          fill: '#7c3aed',
          borderRadius: 22,
          blur: 0,
        },
      },
      {
        id: uuid(),
        type: 'metric',
        label: copy.metricA,
        value: '•',
        style: {x: 0.34, y: 0.62, opacity: 1, rotationDeg: 0, zIndex: 30, color: '#e2e8f0', accent: '#93c5fd'},
        enter: {kind: 'slide', fromSec: 0, durationSec: 0.35, easing: 'ease-out', params: {px: -28}},
      },
      {
        id: uuid(),
        type: 'metric',
        label: copy.metricB,
        value: '•',
        style: {x: 0.66, y: 0.62, opacity: 1, rotationDeg: 0, zIndex: 31, color: '#f5d0fe', accent: '#f472b6'},
        enter: {kind: 'slide', fromSec: 0.08, durationSec: 0.35, easing: 'ease-out', params: {px: 28}},
      },
    );
  } else if (intent === 'cta') {
    layers.push(
      {
        id: uuid(),
        type: 'shape',
        shape: 'pill',
        style: {
          x: 0.5,
          y: 0.86,
          w: 0.76,
          h: 0.18,
          opacity: 0.95,
          rotationDeg: 0,
          zIndex: 8,
          fill: '#b91c1c',
          borderRadius: 999,
          blur: 0,
        },
        enter: {kind: 'pop', fromSec: 0, durationSec: 0.32, easing: 'spring'},
      },
      {
        id: uuid(),
        type: 'text',
        text: 'ACTÚA AHORA',
        style: {
          x: 0.5,
          y: 0.86,
          opacity: 1,
          rotationDeg: 0,
          zIndex: 20,
          fontSize: 44,
          fontWeight: 900,
          color: '#fff7ed',
          align: 'center',
          maxWidth: 0.7,
          shadow: true,
        },
        loop: {kind: 'scale', fromSec: 0.35, durationSec: 0.9, easing: 'linear', params: {hz: 1.8, amp: 0.028}},
      },
    );
  } else if (intent === 'objection') {
    layers.push(
      {
        id: uuid(),
        type: 'shape',
        shape: 'rect',
        style: {
          x: 0.5,
          y: 0.5,
          w: 0.9,
          h: 0.46,
          opacity: 0.8,
          rotationDeg: 0,
          zIndex: 6,
          fill: '#111827',
          borderRadius: 20,
          blur: 0,
        },
      },
      {
        id: uuid(),
        type: 'shape',
        shape: 'pill',
        style: {
          x: 0.19,
          y: 0.5,
          w: 0.05,
          h: 0.46,
          opacity: 0.95,
          rotationDeg: 0,
          zIndex: 9,
          fill: '#f59e0b',
          borderRadius: 999,
          blur: 0,
        },
      },
    );
  } else if (intent === 'summary') {
    layers.push(
      {
        id: uuid(),
        type: 'shape',
        shape: 'pill',
        style: {
          x: 0.5,
          y: 0.82,
          w: 0.86,
          h: 0.2,
          opacity: 0.9,
          rotationDeg: 0,
          zIndex: 8,
          fill: '#0f172a',
          borderRadius: 999,
          blur: 0,
        },
      },
    );
  } else {
    layers.push(
      {
        id: uuid(),
        type: 'shape',
        shape: 'rect',
        style: {
          x: 0.5,
          y: 0.27,
          w: 0.92,
          h: 0.28,
          opacity: 0.82,
          rotationDeg: 0,
          zIndex: 8,
          fill: '#0f172a',
          borderRadius: 28,
          blur: 0,
        },
      },
      {
        id: uuid(),
        type: 'shape',
        shape: 'circle',
        style: {
          x: 0.12,
          y: 0.25,
          w: 0.06,
          h: 0.06,
          opacity: 0.95,
          rotationDeg: 0,
          zIndex: 9,
          fill: '#22d3ee',
          borderRadius: 999,
          blur: 0,
        },
        loop: {kind: 'scale', fromSec: 0.4, durationSec: 1, easing: 'linear', params: {hz: 1.2, amp: 0.07}},
      },
    );
  }

  layers.push(commonTextLayer);
  if (subtitleLayer) layers.push(subtitleLayer);

  return {
    id: uuid(),
    startSec: Number(timing.startSec.toFixed(2)),
    durationSec: Number(timing.durationSec.toFixed(2)),
    intent,
    stylePack,
    energy,
    rationale: clipText(insight?.whyImportant || insight?.expectedImpact || `Escena ${intent} para reforzar el discurso.`, 180),
    layers,
  };
};

const heuristicScenes = ({durationSec, analysisInsights}) => {
  const safeDuration = Math.max(1, Number(durationSec || 0));
  const insights = Array.isArray(analysisInsights) ? analysisInsights.slice(0, 10) : [];

  if (insights.length === 0) {
    return {
      scenes: [
        {
          id: uuid(),
          startSec: 0.4,
          durationSec: Math.min(4, Math.max(2.6, safeDuration * 0.14)),
          intent: 'hook',
          stylePack: 'clean',
          energy: 'balanced',
          rationale: 'Escena inicial para abrir con claridad visual y fijar contexto.',
          layers: [
            {
              id: uuid(),
              type: 'shape',
              shape: 'rect',
              style: {
                x: 0.5,
                y: 0.26,
                w: 0.92,
                h: 0.26,
                opacity: 0.88,
                rotationDeg: 0,
                zIndex: 8,
                fill: '#0f172a',
                borderRadius: 28,
                blur: 0,
              },
            },
            {
              id: uuid(),
              type: 'text',
              text: 'Momento clave del vídeo',
              style: {
                x: 0.5,
                y: 0.24,
                opacity: 1,
                rotationDeg: 0,
                zIndex: 20,
                fontSize: 68,
                fontWeight: 850,
                color: '#f8fafc',
                align: 'center',
                maxWidth: 0.88,
                shadow: true,
              },
              enter: {kind: 'pop', fromSec: 0, durationSec: 0.42, easing: 'spring'},
              loop: {kind: 'scale', fromSec: 0.5, durationSec: 1.1, easing: 'linear', params: {hz: 1, amp: 0.016}},
              exit: {kind: 'fade', fromSec: 0, durationSec: 0.25, easing: 'ease-in'},
            },
          ],
        },
      ],
    };
  }

  return {
    scenes: insights.map((insight, index) => createSceneByIntent({insight, index, safeDuration})),
  };
};

const llmPlanScenes = async ({brief, transcriptText, analysisInsights, durationSec}) => {
  const system = [
    'Eres director senior de motion design narrativo.',
    'Devuelve SOLO JSON válido con formato {"scenes":[...]}.',
    'Cada scene debe tener: id,startSec,durationSec,intent,stylePack,energy,rationale,layers[].',
    'Tipos de layer permitidos: text, shape, metric. shape: rect,circle,pill.',
    'Diseña escenas 100% personalizadas por contenido: evita estructura repetida entre escenas.',
    'Alinea cada escena con el significado del tramo y su energía narrativo-emocional.',
    'No uses lenguaje genérico tipo "momento importante" si puedes extraer copy del guion.',
    'Máximo 10 scenes. Máximo 8 layers por scene.',
    `Duración máxima del video: ${durationSec.toFixed(2)} segundos.`,
  ].join(' ');

  const user = [
    `Brief: ${brief || 'Sin brief adicional.'}`,
    `Transcripción: ${(transcriptText || '').slice(0, 12000)}`,
    `Insights: ${JSON.stringify((analysisInsights || []).slice(0, 10))}`,
    'Necesito legibilidad alta, ritmo claro y decisiones visuales justificadas por escena.',
  ].join('\n\n');

  const response = await openai.chat.completions.create({
    model: config.llmModel,
    temperature: 0.25,
    response_format: {type: 'json_object'},
    messages: [
      {role: 'system', content: system},
      {role: 'user', content: user},
    ],
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('El modelo no devolvió JSON de escenas.');
  }

  return JSON.parse(content);
};

export const planSceneGraph = async ({brief, transcriptText, durationSec, analysisInsights}) => {
  const fallback = () => heuristicScenes({durationSec, analysisInsights});

  let candidate;
  if (hasOpenAi) {
    try {
      candidate = await llmPlanScenes({brief, transcriptText, analysisInsights, durationSec});
    } catch {
      candidate = fallback();
    }
  } else {
    candidate = fallback();
  }

  const parsed = ScenePlanSchema.safeParse(candidate);
  if (!parsed.success) {
    return fallback();
  }

  return parsed.data;
};

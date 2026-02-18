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

const heuristicScenes = ({durationSec, analysisInsights}) => {
  const safeDuration = Math.max(1, Number(durationSec || 0));
  const maxStart = Math.max(0, safeDuration - 0.6);
  const insights = Array.isArray(analysisInsights) ? analysisInsights.slice(0, 8) : [];

  if (insights.length === 0) {
    return {
      scenes: [
        {
          id: uuid(),
          startSec: 0.4,
          durationSec: Math.min(4, Math.max(2.5, safeDuration * 0.15)),
          intent: 'hook',
          stylePack: 'clean',
          layers: [
            {
              id: uuid(),
              type: 'shape',
              shape: 'pill',
              style: {
                x: 0.5,
                y: 0.82,
                w: 0.84,
                h: 0.2,
                opacity: 0.86,
                rotationDeg: 0,
                zIndex: 5,
                fill: '#0f172a',
                borderRadius: 40,
                blur: 0,
              },
            },
            {
              id: uuid(),
              type: 'text',
              text: 'Momento clave del vídeo',
              style: {
                x: 0.5,
                y: 0.82,
                opacity: 1,
                rotationDeg: 0,
                zIndex: 20,
                fontSize: 60,
                fontWeight: 800,
                color: '#f8fafc',
                align: 'center',
                maxWidth: 0.82,
                shadow: true,
              },
              enter: {kind: 'pop', fromSec: 0, durationSec: 0.45, easing: 'spring'},
            },
          ],
        },
      ],
    };
  }

  const scenes = insights.map((insight, index) => {
    const title = clipText(insight.topic || insight.transcriptSnippet || 'Momento importante', 84);
    const subtitle = clipText(insight.expectedImpact || insight.whyImportant || '', 120);
    const startSec = clamp(Number(insight.timeSec || index * 6), 0, maxStart);
    const duration = clamp(parseRole(insight) === 'proof' ? 4.8 : 3.8, 2.4, 8);
    const intent = parseRole(insight);

    return {
      id: uuid(),
      startSec,
      durationSec: duration,
      intent,
      stylePack: intent === 'cta' ? 'retro-red' : intent === 'proof' ? 'comic-blue' : 'clean',
      layers: [
        {
          id: uuid(),
          type: 'shape',
          shape: 'pill',
          style: {
            x: 0.5,
            y: subtitle ? 0.82 : 0.85,
            w: 0.86,
            h: subtitle ? 0.24 : 0.18,
            opacity: 0.86,
            rotationDeg: 0,
            zIndex: 5,
            fill: '#0f172a',
            borderRadius: 44,
            blur: 0,
          },
        },
        {
          id: uuid(),
          type: 'text',
          text: title,
          style: {
            x: 0.5,
            y: subtitle ? 0.78 : 0.85,
            opacity: 1,
            rotationDeg: 0,
            zIndex: 20,
            fontSize: subtitle ? 54 : 60,
            fontWeight: 800,
            color: '#f8fafc',
            align: 'center',
            maxWidth: 0.84,
            shadow: true,
          },
          enter: {kind: 'pop', fromSec: 0, durationSec: 0.45, easing: 'spring'},
        },
        ...(subtitle
          ? [
              {
                id: uuid(),
                type: 'text',
                text: subtitle,
                style: {
                  x: 0.5,
                  y: 0.88,
                  opacity: 0.97,
                  rotationDeg: 0,
                  zIndex: 21,
                  fontSize: 30,
                  fontWeight: 600,
                  color: '#cbd5e1',
                  align: 'center',
                  maxWidth: 0.84,
                  shadow: false,
                },
                enter: {kind: 'fade', fromSec: 0.1, durationSec: 0.35, easing: 'ease-out'},
              },
            ]
          : []),
      ],
    };
  });

  return {scenes};
};

const llmPlanScenes = async ({brief, transcriptText, analysisInsights, durationSec}) => {
  const system = [
    'Eres director de motion graphics para video social.',
    'Devuelve SOLO JSON válido con formato {"scenes":[...]}.',
    'Cada scene debe tener: id,startSec,durationSec,intent,stylePack,layers[].',
    'Tipos de layer permitidos: text, shape, metric.',
    'shape permitido: rect,circle,pill.',
    'NO uses plantillas. Debes construir escenas por capas.',
    'Máximo 10 scenes. Máximo 8 layers por scene.',
    `Duración máxima del video: ${durationSec.toFixed(2)} segundos.`,
  ].join(' ');

  const user = [
    `Brief: ${brief || 'Sin brief adicional.'}`,
    `Transcripción: ${(transcriptText || '').slice(0, 10000)}`,
    `Insights: ${JSON.stringify((analysisInsights || []).slice(0, 10))}`,
    'Prioriza claridad visual, legibilidad y timing narrativo.',
  ].join('\n\n');

  const response = await openai.chat.completions.create({
    model: config.llmModel,
    temperature: 0.2,
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

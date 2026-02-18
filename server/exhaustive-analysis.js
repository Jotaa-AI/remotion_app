import OpenAI from 'openai';
import {v4 as uuid} from 'uuid';
import {config} from './config.js';
import {AnalysisInsightsSchema} from './schemas.js';

const hasOpenAi = Boolean(config.openAiApiKey);
const openai = hasOpenAi ? new OpenAI({apiKey: config.openAiApiKey}) : null;

const templates = ['lower-third', 'subscribe', 'subscribe-sticker', 'stat-compare', 'text-pop', 'cta-banner'];

const normalizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const formatTime = (sec) => {
  const total = Math.max(0, Math.floor(Number(sec || 0)));
  const mins = Math.floor(total / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (total % 60).toString().padStart(2, '0');
  return `${mins}:${seconds}`;
};

const segmentWords = ({words = [], durationSec = 0, segmentSec = 20}) => {
  if (!Array.isArray(words) || words.length === 0) {
    return [];
  }

  const safeDuration = Math.max(1, Number(durationSec || 0));
  const size = Math.max(10, Number(segmentSec || 20));
  const count = Math.max(1, Math.ceil(safeDuration / size));

  const buckets = Array.from({length: count}, (_, index) => ({
    index,
    startSec: index * size,
    endSec: Math.min(safeDuration, (index + 1) * size),
    words: [],
  }));

  for (const item of words) {
    const start = Number(item.start || 0);
    const bucketIndex = Math.max(0, Math.min(count - 1, Math.floor(start / size)));
    buckets[bucketIndex].words.push(item.word || '');
  }

  return buckets
    .map((bucket) => ({
      ...bucket,
      text: normalizeText(bucket.words.join(' ')),
    }))
    .filter((bucket) => bucket.text.length > 0);
};

const summarizeSegmentsForPrompt = ({segments, maxSegments = 80}) => {
  return segments
    .slice(0, maxSegments)
    .map((segment) => {
      const snippet = segment.text
        .split(' ')
        .slice(0, 30)
        .join(' ')
        .trim();
      return `[${formatTime(segment.startSec)}-${formatTime(segment.endSec)}] ${snippet}`;
    })
    .join('\n');
};

const scoreSegment = (text) => {
  const t = text.toLowerCase();
  let score = 0;

  if (/\d/.test(t)) score += 2;
  if (/vs|versus|contra|compar|resultado|crecim|métrica|dato/.test(t)) score += 3;
  if (/suscrib|subscribe|cta|comenta|sígueme|sigueme|link|descarga/.test(t)) score += 4;
  if (/importante|clave|atención|ojo|tip|truco|error/.test(t)) score += 3;
  if (t.split(' ').length > 10) score += 1;

  return score;
};

const pickNarrativeRole = (text) => {
  const t = String(text || '').toLowerCase();

  if (/suscrib|subscribe|cta|comenta|sígueme|sigueme|link|descarga/.test(t)) return 'cta';
  if (/vs|versus|contra|compar|resultado|crecim|métrica|dato|\d/.test(t)) return 'proof';
  if (/importante|clave|tip|truco|error|ojo/.test(t)) return 'explanation';
  if (/pero|aunque|sin embargo|duda|objec/.test(t)) return 'objection';
  if (/resumen|conclusion|final/.test(t)) return 'summary';
  if (/hola|bienvenidos|hoy veremos|empezamos|arranc/.test(t)) return 'hook';
  return 'transition';
};

const chooseTemplate = (text) => {
  const t = text.toLowerCase();

  if (/suscrib|subscribe|canal/.test(t)) return 'subscribe-sticker';
  if (/vs|versus|contra|compar|métrica|dato|resultado|\d/.test(t)) return 'stat-compare';
  if (/comenta|sígueme|sigueme|link|descarga|cta/.test(t)) return 'cta-banner';
  if (/importante|clave|tip|truco|error|ojo/.test(t)) return 'text-pop';
  return 'lower-third';
};

const heuristicInsights = ({brief, transcriptText, words, durationSec}) => {
  const segments = segmentWords({words, durationSec, segmentSec: 18});
  const sorted = segments
    .map((segment) => ({
      ...segment,
      score: scoreSegment(segment.text),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .sort((a, b) => a.startSec - b.startSec);

  const baseInsights = sorted.map((segment) => {
    const template = chooseTemplate(segment.text);
    const role = pickNarrativeRole(segment.text);
    const expectedImpact =
      role === 'cta'
        ? 'Mayor tasa de clic/seguimiento al reforzar la acción justo en contexto.'
        : role === 'proof'
          ? 'Mejor comprensión de datos y más credibilidad en el argumento.'
          : role === 'hook'
            ? 'Subida de retención inicial en los primeros segundos del video.'
            : role === 'objection'
              ? 'Reducción de abandono al aclarar dudas en el punto de fricción.'
              : role === 'summary'
                ? 'Cierre más claro que facilita la recordación del mensaje final.'
                : 'Incremento de claridad narrativa y ritmo visual en el segmento.';

    return {
      id: uuid(),
      timeSec: Number(segment.startSec.toFixed(2)),
      topic: `Momento relevante cerca de ${formatTime(segment.startSec)}`,
      transcriptSnippet: segment.text.split(' ').slice(0, 22).join(' '),
      narrativeRole: role,
      whyImportant: 'Este tramo contiene señales semánticas relevantes para retención o comprensión.',
      expectedImpact,
      animationDescription:
        template === 'stat-compare'
          ? 'Añadir una comparativa animada con barras para resaltar la diferencia numérica de forma inmediata.'
          : template === 'subscribe-sticker'
            ? 'Añadir un sticker dinámico de suscripción con entrada enérgica para reforzar la llamada a la acción.'
            : template === 'cta-banner'
              ? 'Añadir un banner de CTA en zona segura superior para convertir al cierre del bloque.'
              : template === 'text-pop'
                ? 'Añadir un texto impactante con entrada tipo stamp para fijar la idea principal.'
                : 'Añadir un lower-third para contextualizar el punto mencionado.',
      templateSuggestion: template,
      confidence: Math.min(0.95, 0.45 + segment.score * 0.08),
    };
  });

  if (baseInsights.length > 0) {
    return {insights: baseInsights};
  }

  const fallbackText = normalizeText(brief || transcriptText || 'Sin contenido detectado.');
  return {
    insights: [
      {
        id: uuid(),
        timeSec: 0,
        topic: 'Introducción del contenido',
        transcriptSnippet: fallbackText.slice(0, 160),
        narrativeRole: 'hook',
        whyImportant: 'Conviene introducir una guía visual desde el inicio para mejorar comprensión.',
        expectedImpact: 'Mejor retención en la apertura del video.',
        animationDescription: 'Usar lower-third inicial con mensaje de contexto.',
        templateSuggestion: 'lower-third',
        confidence: 0.5,
      },
    ],
  };
};

const llmInsights = async ({brief, transcriptText, words, durationSec}) => {
  const segments = segmentWords({words, durationSec, segmentSec: 15});
  const digest = summarizeSegmentsForPrompt({segments, maxSegments: 90});

  const system = [
    'Eres Lead Motion Editor para YouTube.',
    'Debes analizar exhaustivamente el timeline de un video y proponer oportunidades de animación visual.',
    'Responde SOLO JSON válido con forma {"insights":[...]}',
    'Cada insight debe incluir: timeSec, topic, transcriptSnippet, narrativeRole, whyImportant, expectedImpact, animationDescription, templateSuggestion, confidence.',
    `templateSuggestion permitido: ${templates.join(', ')}.`,
    'narrativeRole permitido: hook, proof, explanation, objection, cta, transition, summary.',
    'Redacta en español claro y orientado a decisión de edición.',
    'No inventes contenido fuera del timeline dado.',
    'Máximo 12 insights.',
  ].join(' ');

  const user = [
    `Brief del usuario: ${brief || 'Sin brief.'}`,
    `Duración del video: ${durationSec.toFixed(2)} segundos.`,
    `Transcripción completa: ${normalizeText(transcriptText).slice(0, 12000) || 'No disponible.'}`,
    `Resumen por tramos temporales:\n${digest || 'No disponible.'}`,
    'Objetivo: devolver propuestas tipo "En el minuto mm:ss hablas de X, conviene añadir animación Y por motivo Z".',
  ].join('\n\n');

  const response = await openai.chat.completions.create({
    model: config.llmModel,
    temperature: 0.15,
    response_format: {type: 'json_object'},
    messages: [
      {role: 'system', content: system},
      {role: 'user', content: user},
    ],
  });

  const json = response.choices?.[0]?.message?.content;
  if (!json) {
    throw new Error('LLM no devolvió insights.');
  }

  return JSON.parse(json);
};

const sanitizeInsights = (candidate) => {
  const parsed = AnalysisInsightsSchema.safeParse(candidate);
  if (!parsed.success) {
    return null;
  }

  const normalized = parsed.data.insights
    .map((item) => ({
      ...item,
      id: item.id || uuid(),
      topic: normalizeText(item.topic),
      narrativeRole: item.narrativeRole || pickNarrativeRole(item.topic || item.transcriptSnippet || ''),
      transcriptSnippet: normalizeText(item.transcriptSnippet || ''),
      whyImportant: normalizeText(item.whyImportant),
      expectedImpact: normalizeText(item.expectedImpact || 'Mejora de claridad y retención en este tramo.'),
      animationDescription: normalizeText(item.animationDescription),
    }))
    .sort((a, b) => a.timeSec - b.timeSec)
    .slice(0, 12);

  return {insights: normalized};
};

export const buildExhaustiveAnalysisInsights = async ({brief, transcriptText, words, durationSec}) => {
  const fallback = () => heuristicInsights({brief, transcriptText, words, durationSec});

  if (!hasOpenAi) {
    return fallback();
  }

  try {
    const candidate = await llmInsights({brief, transcriptText, words, durationSec});
    const sanitized = sanitizeInsights(candidate);
    if (sanitized) {
      return sanitized;
    }
    return fallback();
  } catch {
    return fallback();
  }
};

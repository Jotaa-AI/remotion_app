import {z} from 'zod';

export const OverlayTemplate = z.enum([
  'lower-third',
  'subscribe',
  'subscribe-sticker',
  'stat-compare',
  'text-pop',
  'cta-banner',
]);

export const AnimationIntent = z.enum(['hook', 'proof', 'explanation', 'objection', 'cta', 'transition', 'summary']);
export const AnimationLayout = z.enum(['headline-card', 'split-bars', 'sticker-burst', 'quote-focus', 'cta-ribbon', 'data-pill']);
export const AnimationEmphasis = z.enum(['calm', 'balanced', 'high']);

export const AnimationElementSchema = z
  .object({
    type: z.string().min(2).max(80),
    text: z.string().max(600).optional(),
    value: z.union([z.string().max(120), z.number()]).optional(),
    label: z.string().max(200).optional(),
  })
  .passthrough();

export const AnimationSpecSchema = z.object({
  intent: AnimationIntent,
  layout: AnimationLayout,
  emphasis: AnimationEmphasis,
  elements: z.array(AnimationElementSchema).max(24),
});

export const OverlayDesignSchema = z
  .object({
    typography: z.enum(['display-bold', 'clean-sans', 'editorial', 'impact']).optional(),
    energy: AnimationEmphasis.optional(),
    position: z.enum(['top', 'center', 'bottom']).optional(),
    primaryColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional()
      .nullable(),
    accentColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional()
      .nullable(),
    textColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional()
      .nullable(),
  })
  .passthrough();

export const OverlayMotionSchema = z
  .object({
    enter: z.string().max(80).optional(),
    exit: z.string().max(80).optional(),
    effects: z.array(z.string().max(80)).max(12).optional(),
    pulseAmp: z.number().optional(),
    floatPx: z.number().optional(),
    wiggleDeg: z.number().optional(),
    shakePx: z.number().optional(),
    enterWindow: z.number().optional(),
    exitWindow: z.number().optional(),
  })
  .passthrough();

export const OverlayPayloadSchema = z
  .object({
    stylePack: z.string().max(80).optional(),
    motion: OverlayMotionSchema.optional(),
    design: OverlayDesignSchema.optional(),
    animationSpec: AnimationSpecSchema.optional(),
  })
  .passthrough();

export const OverlayEventSchema = z.object({
  id: z.string().optional(),
  template: OverlayTemplate,
  startSec: z.number().min(0),
  durationSec: z.number().min(0.4).max(12),
  payload: OverlayPayloadSchema.default({}),
  reasoning: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const OverlayPlanSchema = z.object({
  events: z.array(OverlayEventSchema).max(20),
});

export const AnalysisInsightSchema = z.object({
  id: z.string().optional(),
  timeSec: z.number().min(0),
  topic: z.string().min(2).max(200),
  transcriptSnippet: z.string().min(1).max(500).optional(),
  narrativeRole: z
    .enum(['hook', 'proof', 'explanation', 'objection', 'cta', 'transition', 'summary'])
    .optional(),
  whyImportant: z.string().min(8).max(600),
  expectedImpact: z.string().min(8).max(500).optional(),
  animationDescription: z.string().min(8).max(600),
  templateSuggestion: OverlayTemplate.optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const AnalysisInsightsSchema = z.object({
  insights: z.array(AnalysisInsightSchema).max(20),
});

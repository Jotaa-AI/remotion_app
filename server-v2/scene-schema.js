import {z} from 'zod';

export const Easing = z.enum(['linear', 'ease-in', 'ease-out', 'ease-in-out', 'spring']);

export const AnimationSchema = z
  .object({
    kind: z.enum(['fade', 'slide', 'scale', 'rotate', 'pop']),
    fromSec: z.number().min(0).default(0),
    durationSec: z.number().min(0.05).max(4).default(0.6),
    easing: Easing.default('ease-out'),
    params: z.record(z.any()).optional(),
  })
  .strict();

export const BaseStyleSchema = z
  .object({
    x: z.number().min(0).max(1).default(0.5),
    y: z.number().min(0).max(1).default(0.5),
    w: z.number().min(0.01).max(1).optional(),
    h: z.number().min(0.01).max(1).optional(),
    opacity: z.number().min(0).max(1).default(1),
    rotationDeg: z.number().min(-360).max(360).default(0),
    zIndex: z.number().int().min(0).max(200).default(10),
  })
  .strict();

export const TextLayerSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal('text'),
    text: z.string().min(1).max(180),
    style: BaseStyleSchema.extend({
      fontSize: z.number().min(14).max(180).default(56),
      fontWeight: z.number().int().min(300).max(900).default(700),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#ffffff'),
      align: z.enum(['left', 'center', 'right']).default('center'),
      maxWidth: z.number().min(0.1).max(1).default(0.8),
      shadow: z.boolean().default(true),
    }),
    enter: AnimationSchema.optional(),
    loop: AnimationSchema.optional(),
    exit: AnimationSchema.optional(),
  })
  .strict();

export const ShapeLayerSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal('shape'),
    shape: z.enum(['rect', 'circle', 'pill']),
    style: BaseStyleSchema.extend({
      fill: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#2f6bff'),
      borderRadius: z.number().min(0).max(200).default(20),
      blur: z.number().min(0).max(40).default(0),
    }),
    enter: AnimationSchema.optional(),
    loop: AnimationSchema.optional(),
    exit: AnimationSchema.optional(),
  })
  .strict();

export const MetricLayerSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal('metric'),
    label: z.string().min(1).max(50),
    value: z.union([z.number(), z.string()]),
    style: BaseStyleSchema.extend({
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#ffffff'),
      accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#22d3ee'),
    }),
    enter: AnimationSchema.optional(),
    loop: AnimationSchema.optional(),
    exit: AnimationSchema.optional(),
  })
  .strict();

export const LayerSchema = z.discriminatedUnion('type', [TextLayerSchema, ShapeLayerSchema, MetricLayerSchema]);

export const SceneSchema = z
  .object({
    id: z.string().min(1),
    startSec: z.number().min(0),
    durationSec: z.number().min(0.4).max(20),
    intent: z.enum(['hook', 'proof', 'explanation', 'objection', 'cta', 'transition', 'summary']).default('explanation'),
    stylePack: z.enum(['clean', 'comic-blue', 'retro-red']).default('clean'),
    energy: z.enum(['calm', 'balanced', 'high']).default('balanced'),
    rationale: z.string().min(1).max(220).optional(),
    layers: z.array(LayerSchema).min(1).max(20),
  })
  .strict();

export const ScenePlanSchema = z
  .object({
    scenes: z.array(SceneSchema).min(1).max(20),
  })
  .strict();

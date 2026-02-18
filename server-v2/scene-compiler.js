import {ScenePlanSchema} from './scene-schema.js';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const mergeByZIndex = (layers) => [...layers].sort((a, b) => (a.style?.zIndex || 0) - (b.style?.zIndex || 0));

export const compileScenePlan = ({plan, durationSec}) => {
  const parsed = ScenePlanSchema.parse(plan);
  const maxStart = Math.max(0, Number(durationSec || 0) - 0.5);

  const scenes = parsed.scenes
    .map((scene) => {
      const startSec = clamp(scene.startSec, 0, maxStart);
      const duration = clamp(scene.durationSec, 0.4, Math.min(20, Number(durationSec || 20)));
      const safeLayers = mergeByZIndex(scene.layers).map((layer, idx) => ({
        ...layer,
        id: layer.id || `${scene.id}-layer-${idx + 1}`,
      }));

      return {
        ...scene,
        startSec: Number(startSec.toFixed(2)),
        durationSec: Number(duration.toFixed(2)),
        layers: safeLayers,
      };
    })
    .sort((a, b) => a.startSec - b.startSec)
    .slice(0, 20);

  return {scenes};
};

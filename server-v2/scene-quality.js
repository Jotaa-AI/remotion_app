import {compileScenePlan} from './scene-compiler.js';
import {eventsToScenes} from './event-to-scene.js';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const findSpeechWindowForScene = ({scene, words = [], durationSec = 0}) => {
  if (!Array.isArray(words) || words.length === 0) {
    return {
      startSec: scene.startSec,
      endSec: Math.min(durationSec || scene.startSec + scene.durationSec, scene.startSec + scene.durationSec),
    };
  }

  const sceneStart = Number(scene.startSec || 0);
  const sceneEnd = sceneStart + Number(scene.durationSec || 0);

  const nearby = words.filter((w) => {
    const ws = Number(w?.start || 0);
    return ws >= sceneStart - 0.8 && ws <= sceneEnd + 3.5;
  });

  if (nearby.length === 0) {
    return {
      startSec: sceneStart,
      endSec: sceneEnd,
    };
  }

  const startSec = Math.max(0, Number(nearby[0]?.start || sceneStart));
  const endSec = Number(nearby[nearby.length - 1]?.end || sceneEnd);

  return {
    startSec,
    endSec,
  };
};

const alignSceneDurationToSpeech = ({scene, words = [], durationSec = 0}) => {
  const safeDuration = Math.max(1, Number(durationSec || 0));
  const maxSceneEnd = Math.max(0.6, safeDuration - 0.1);

  const speech = findSpeechWindowForScene({scene, words, durationSec: safeDuration});

  const adjustedStart = clamp(Number(scene.startSec || 0), 0, maxSceneEnd - 0.5);
  const speechEnd = clamp(Number(speech.endSec || adjustedStart + scene.durationSec), adjustedStart + 0.5, maxSceneEnd);

  const desiredDuration = clamp(speechEnd - adjustedStart + 0.25, 0.6, 8);

  return {
    ...scene,
    startSec: Number(adjustedStart.toFixed(2)),
    durationSec: Number(desiredDuration.toFixed(2)),
  };
};

const scoreScene = (scene) => {
  const layers = Array.isArray(scene?.layers) ? scene.layers : [];
  const textLayers = layers.filter((l) => l.type === 'text');
  const loopLayers = layers.filter((l) => l.loop);

  let score = 1;

  if (layers.length > 8) score -= 0.25;
  if (textLayers.length > 3) score -= 0.2;
  if (loopLayers.length > 2) score -= 0.2;

  for (const layer of textLayers) {
    if (String(layer?.text || '').length > 120) score -= 0.08;
    if ((layer?.style?.fontSize || 0) < 24) score -= 0.08;
    if ((layer?.style?.maxWidth || 1) > 0.9) score -= 0.05;
  }

  return clamp(Number(score.toFixed(3)), 0, 1);
};

const antiClutterScene = (scene) => {
  const layers = Array.isArray(scene?.layers) ? scene.layers : [];

  const limitedByCount = layers.slice(0, 8);
  const safeLoop = [];
  let loopCount = 0;

  for (const layer of limitedByCount) {
    const next = {...layer};

    if (next.loop) {
      loopCount += 1;
      if (loopCount > 2) {
        delete next.loop;
      } else {
        const amp = Number(next.loop?.params?.amp || 0.02);
        next.loop = {
          ...next.loop,
          params: {
            ...(next.loop.params || {}),
            amp: clamp(amp, 0.004, 0.03),
          },
        };
      }
    }

    safeLoop.push(next);
  }

  return {
    ...scene,
    layers: safeLoop,
  };
};

export const validateAndOptimizeScenes = ({scenePlan, durationSec, fallbackEvents = [], words = []}) => {
  const warnings = [];

  let compiled;
  try {
    compiled = compileScenePlan({plan: {scenes: scenePlan || []}, durationSec});
  } catch {
    warnings.push('scene-plan-invalid-schema');
    const fallbackScenes = eventsToScenes({events: fallbackEvents});
    compiled = compileScenePlan({plan: {scenes: fallbackScenes}, durationSec});
    warnings.push('scene-plan-fallback-from-events');
  }

  const optimizedScenes = compiled.scenes
    .map((scene) => antiClutterScene(scene))
    .map((scene) => alignSceneDurationToSpeech({scene, words, durationSec}));

  const scores = optimizedScenes.map((scene) => ({
    sceneId: scene.id,
    score: scoreScene(scene),
    layerCount: scene.layers.length,
  }));

  const avgScore = scores.length > 0 ? scores.reduce((acc, s) => acc + s.score, 0) / scores.length : 0;

  let finalScenes = optimizedScenes;
  if (avgScore < 0.55 && Array.isArray(fallbackEvents) && fallbackEvents.length > 0) {
    warnings.push('scene-plan-low-quality-fallback');
    const fallbackScenes = eventsToScenes({events: fallbackEvents});
    finalScenes = compileScenePlan({plan: {scenes: fallbackScenes}, durationSec}).scenes
      .map((scene) => antiClutterScene(scene))
      .map((scene) => alignSceneDurationToSpeech({scene, words, durationSec}));
  }

  return {
    scenes: finalScenes,
    quality: {
      averageScore: Number(avgScore.toFixed(3)),
      sceneScores: scores,
      warnings,
    },
  };
};

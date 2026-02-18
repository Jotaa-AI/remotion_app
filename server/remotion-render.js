import path from 'path';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {config} from './config.js';
import {eventsToScenes} from '../server-v2/event-to-scene.js';
import {compileScenePlan} from '../server-v2/scene-compiler.js';

let bundleLocationPromise;

const getBundleLocation = () => {
  if (!bundleLocationPromise) {
    bundleLocationPromise = bundle({
      entryPoint: config.remotionEntry,
      webpackOverride: (webpackConfig) => webpackConfig,
    });
  }
  return bundleLocationPromise;
};

export const renderCompositedVideo = async ({
  jobId,
  videoUrl,
  width,
  height,
  durationSec,
  events,
  scenes,
  onRenderProgress,
}) => {
  const serveUrl = await getBundleLocation();

  const durationInFrames = Math.max(1, Math.ceil(durationSec * config.fps));
  const useSceneGraph = config.useSceneGraph === true;

  let compositionId = 'SmartOverlay';
  let inputProps = {
    videoUrl,
    events,
    width,
    height,
    fps: config.fps,
    durationInFrames,
  };

  if (useSceneGraph) {
    const baseScenes = Array.isArray(scenes) && scenes.length > 0 ? scenes : eventsToScenes({events: events || []});
    const compiled = compileScenePlan({
      plan: {scenes: baseScenes},
      durationSec,
    });

    compositionId = 'SceneGraphOverlay';
    inputProps = {
      videoUrl,
      scenes: compiled.scenes,
      width,
      height,
      fps: config.fps,
      durationInFrames,
    };
  }

  const composition = await selectComposition({
    serveUrl,
    id: compositionId,
    inputProps,
  });

  const outputPath = path.join(config.rendersDir, `${jobId}-final.mp4`);

  await renderMedia({
    serveUrl,
    composition,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps,
    overwrite: true,
    crf: 18,
    concurrency: 2,
    onProgress: ({progress}) => {
      if (typeof onRenderProgress === 'function') {
        onRenderProgress(progress);
      }
    },
  });

  return outputPath;
};

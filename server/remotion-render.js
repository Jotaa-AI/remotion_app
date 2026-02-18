import path from 'path';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {config} from './config.js';

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
  onRenderProgress,
}) => {
  const serveUrl = await getBundleLocation();

  const inputProps = {
    videoUrl,
    events,
    width,
    height,
    fps: config.fps,
    durationInFrames: Math.max(1, Math.ceil(durationSec * config.fps)),
  };

  const composition = await selectComposition({
    serveUrl,
    id: 'SmartOverlay',
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

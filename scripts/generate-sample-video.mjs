import path from 'path';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';

const root = process.cwd();
const entry = path.join(root, 'remotion', 'index.jsx');
const out = path.join(root, 'data', 'uploads', 'sample-input.mp4');

const serveUrl = await bundle({entryPoint: entry});
const inputProps = {
  videoUrl: '',
  events: [
    {
      id: 'sample',
      template: 'text-pop',
      startSec: 0.4,
      durationSec: 2.2,
      payload: {text: 'Video de prueba MVP'},
    },
  ],
  width: 1280,
  height: 720,
  fps: 30,
  durationInFrames: 150,
};

const composition = await selectComposition({
  serveUrl,
  id: 'SmartOverlay',
  inputProps,
});

await renderMedia({
  serveUrl,
  composition,
  codec: 'h264',
  outputLocation: out,
  inputProps,
  overwrite: true,
  crf: 23,
  concurrency: 1,
});

console.log(out);

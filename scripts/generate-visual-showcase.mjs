import path from 'path';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';

const root = process.cwd();
const entry = path.join(root, 'remotion', 'index.jsx');
const out = path.join(root, 'data', 'renders', 'preview-all-templates.mp4');

const serveUrl = await bundle({entryPoint: entry});

const inputProps = {
  videoUrl: '',
  events: [
    {
      id: 'lower-third',
      template: 'lower-third',
      startSec: 0.3,
      durationSec: 2.8,
      payload: {
        title: 'Hook inicial potente',
        subtitle: 'Planteas el problema y captas atencion',
        kicker: 'HOOK',
        stylePack: 'clean',
        design: {
          typography: 'display-bold',
          energy: 'balanced',
          position: 'bottom',
          primaryColor: '#3158ff',
          accentColor: '#12b9ff',
          textColor: '#f8fafc',
        },
        animationSpec: {
          intent: 'hook',
          layout: 'headline-card',
          emphasis: 'balanced',
          elements: [
            {type: 'title', text: 'Hook inicial potente'},
            {type: 'subtitle', text: 'Planteas el problema y captas atencion'},
            {type: 'badge', text: 'HOOK'},
          ],
        },
      },
    },
    {
      id: 'subscribe',
      template: 'subscribe',
      startSec: 3.4,
      durationSec: 3,
      payload: {
        title: 'Suscribete',
        subtitle: 'Nuevos casos cada semana',
        stylePack: 'retro-red',
        design: {
          typography: 'impact',
          energy: 'high',
          position: 'center',
          primaryColor: '#ff2448',
          accentColor: '#ff8ba7',
          textColor: '#fff5ef',
        },
        animationSpec: {
          intent: 'cta',
          layout: 'cta-ribbon',
          emphasis: 'high',
          elements: [
            {type: 'title', text: 'Suscribete'},
            {type: 'subtitle', text: 'Nuevos casos cada semana'},
            {type: 'cta', text: 'Unirme +'},
          ],
        },
      },
    },
    {
      id: 'subscribe-sticker',
      template: 'subscribe-sticker',
      startSec: 6.9,
      durationSec: 3,
      payload: {
        text: 'suscribiros a mi canal',
        badge: 'you',
        caption: '<subscribe />',
        stylePack: 'comic-blue',
        design: {
          typography: 'impact',
          energy: 'high',
          position: 'top',
          primaryColor: '#2f7dff',
          accentColor: '#21d2ff',
          textColor: '#f8fbff',
        },
        animationSpec: {
          intent: 'cta',
          layout: 'sticker-burst',
          emphasis: 'high',
          elements: [
            {type: 'title', text: 'suscribiros a mi canal'},
            {type: 'subtitle', text: '<subscribe />'},
            {type: 'badge', text: 'you'},
          ],
        },
      },
    },
    {
      id: 'stat-compare',
      template: 'stat-compare',
      startSec: 10.4,
      durationSec: 3.2,
      payload: {
        title: 'Resultados de campana',
        leftLabel: 'Antes',
        rightLabel: 'Despues',
        leftValue: '12k',
        rightValue: '38k',
        stylePack: 'comic-blue',
        design: {
          typography: 'clean-sans',
          energy: 'balanced',
          position: 'center',
          primaryColor: '#2665ff',
          accentColor: '#1fb0ff',
          textColor: '#f8fbff',
        },
        animationSpec: {
          intent: 'proof',
          layout: 'split-bars',
          emphasis: 'balanced',
          elements: [
            {type: 'title', text: 'Resultados de campana'},
            {type: 'metric-left-label', text: 'Antes'},
            {type: 'metric-left-value', value: '12k'},
            {type: 'metric-right-label', text: 'Despues'},
            {type: 'metric-right-value', value: '38k'},
          ],
        },
      },
    },
    {
      id: 'text-pop',
      template: 'text-pop',
      startSec: 14.1,
      durationSec: 2.6,
      payload: {
        text: 'Retencion +42%',
        chip: 'KEY INSIGHT',
        stylePack: 'comic-blue',
        design: {
          typography: 'impact',
          energy: 'high',
          position: 'center',
          primaryColor: '#2f88ff',
          accentColor: '#00d0ff',
          textColor: '#f5fbff',
        },
        animationSpec: {
          intent: 'explanation',
          layout: 'quote-focus',
          emphasis: 'high',
          elements: [
            {type: 'title', text: 'Retencion +42%'},
            {type: 'subtitle', text: 'El punto con mayor impacto de este bloque'},
            {type: 'badge', text: 'KEY INSIGHT'},
          ],
        },
      },
    },
    {
      id: 'cta-banner',
      template: 'cta-banner',
      startSec: 17.2,
      durationSec: 3,
      payload: {
        text: 'Comenta y comparte',
        subtitle: 'Asi priorizamos nuevos tutoriales',
        buttonText: 'Seguir +',
        stylePack: 'clean',
        design: {
          typography: 'display-bold',
          energy: 'balanced',
          position: 'bottom',
          primaryColor: '#2f57ff',
          accentColor: '#26c8ff',
          textColor: '#f8fbff',
        },
        animationSpec: {
          intent: 'summary',
          layout: 'data-pill',
          emphasis: 'balanced',
          elements: [
            {type: 'title', text: 'Comenta y comparte'},
            {type: 'subtitle', text: 'Asi priorizamos nuevos tutoriales'},
          ],
        },
      },
    },
  ],
  width: 1280,
  height: 720,
  fps: 30,
  durationInFrames: Math.ceil(21 * 30),
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
  crf: 19,
  concurrency: 2,
});

console.log(out);

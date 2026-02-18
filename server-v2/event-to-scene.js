import {v4 as uuid} from 'uuid';

const clampText = (value, max = 160) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
};

const pickPrimaryText = (event) => {
  const p = event?.payload || {};
  return (
    p.title ||
    p.text ||
    p.subtitle ||
    p.caption ||
    (Array.isArray(p?.animationSpec?.elements)
      ? p.animationSpec.elements.find((e) => String(e?.type || '').toLowerCase() === 'title')?.text
      : '') ||
    'Momento clave'
  );
};

const pickSecondaryText = (event) => {
  const p = event?.payload || {};
  return (
    p.subtitle ||
    p.caption ||
    (Array.isArray(p?.animationSpec?.elements)
      ? p.animationSpec.elements.find((e) => String(e?.type || '').toLowerCase() === 'subtitle')?.text
      : '') ||
    ''
  );
};

export const eventsToScenes = ({events = []}) => {
  return (events || []).slice(0, 20).map((event, index) => {
    const title = clampText(pickPrimaryText(event), 84);
    const subtitle = clampText(pickSecondaryText(event), 120);
    const stylePack = event?.payload?.stylePack || 'clean';

    const layers = [
      {
        id: `${event.id || uuid()}-bg`,
        type: 'shape',
        shape: 'pill',
        style: {
          x: 0.5,
          y: 0.82,
          w: 0.86,
          h: subtitle ? 0.24 : 0.18,
          opacity: 0.86,
          rotationDeg: 0,
          zIndex: 5,
          fill: '#0f172a',
          borderRadius: 40,
          blur: 0,
        },
      },
      {
        id: `${event.id || uuid()}-title`,
        type: 'text',
        text: title,
        style: {
          x: 0.5,
          y: subtitle ? 0.78 : 0.82,
          opacity: 1,
          rotationDeg: 0,
          zIndex: 20,
          fontSize: subtitle ? 54 : 60,
          fontWeight: 800,
          color: '#f8fafc',
          align: 'center',
          maxWidth: 0.82,
          shadow: true,
        },
        enter: {
          kind: 'pop',
          fromSec: 0,
          durationSec: 0.45,
          easing: 'spring',
        },
      },
    ];

    if (subtitle) {
      layers.push({
        id: `${event.id || uuid()}-subtitle`,
        type: 'text',
        text: subtitle,
        style: {
          x: 0.5,
          y: 0.87,
          opacity: 0.96,
          rotationDeg: 0,
          zIndex: 21,
          fontSize: 30,
          fontWeight: 600,
          color: '#cbd5e1',
          align: 'center',
          maxWidth: 0.84,
          shadow: false,
        },
        enter: {
          kind: 'fade',
          fromSec: 0.1,
          durationSec: 0.35,
          easing: 'ease-out',
        },
      });
    }

    return {
      id: event.id || `scene-${index + 1}`,
      startSec: Number(event.startSec || 0),
      durationSec: Number(event.durationSec || 3),
      intent: event?.payload?.animationSpec?.intent || 'explanation',
      stylePack,
      layers,
    };
  });
};

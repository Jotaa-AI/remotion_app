import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

const clampInterpolation = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};

const STYLE_PACKS = {
  clean: {
    bg: '#0f172a',
    text: '#f8fafc',
    accent: '#22d3ee',
    subtitle: '#cbd5e1',
  },
  'comic-blue': {
    bg: '#1e3a8a',
    text: '#eff6ff',
    accent: '#60a5fa',
    subtitle: '#dbeafe',
  },
  'retro-red': {
    bg: '#7f1d1d',
    text: '#fff7ed',
    accent: '#fb7185',
    subtitle: '#fed7aa',
  },
};

const unit = (n) => `${Math.round(n * 100)}%`;

const animProgress = ({anim, frame, fps, durationInFrames, mode}) => {
  if (!anim) return null;
  const animFrames = Math.max(1, Math.floor((anim.durationSec || 0.6) * fps));
  const offset = Math.max(0, Math.floor((anim.fromSec || 0) * fps));

  let localFrame = 0;
  if (mode === 'enter' || mode === 'loop') {
    localFrame = Math.max(0, frame - offset);
  } else {
    const start = Math.max(0, durationInFrames - animFrames - offset);
    localFrame = Math.max(0, frame - start);
  }

  const linear = interpolate(localFrame, [0, animFrames], [0, 1], clampInterpolation);
  if (anim.easing === 'spring') {
    return spring({frame: localFrame, fps, config: {damping: 12}});
  }
  return linear;
};

const applyAnimStyle = ({anim, progress, baseStyle = {}, mode}) => {
  if (!anim || progress === null) return baseStyle;

  const t = mode === 'exit' ? 1 - progress : progress;
  const current = {...baseStyle};

  if (anim.kind === 'fade') {
    current.opacity = (current.opacity ?? 1) * t;
    return current;
  }

  if (anim.kind === 'scale' || anim.kind === 'pop') {
    const minScale = Number(anim.params?.fromScale ?? 0.85);
    const scale = minScale + (1 - minScale) * t;
    current.transform = `${current.transform || ''} scale(${scale})`.trim();
    current.opacity = (current.opacity ?? 1) * Math.max(0.3, t);
    return current;
  }

  if (anim.kind === 'slide') {
    const distance = Number(anim.params?.px || 40);
    const dx = (1 - t) * distance;
    current.transform = `${current.transform || ''} translateX(${dx}px)`.trim();
    current.opacity = (current.opacity ?? 1) * Math.max(0.35, t);
    return current;
  }

  if (anim.kind === 'rotate') {
    const deg = (1 - t) * Number(anim.params?.deg || 12);
    current.transform = `${current.transform || ''} rotate(${deg}deg)`.trim();
    current.opacity = (current.opacity ?? 1) * Math.max(0.35, t);
    return current;
  }

  return current;
};

const applyLoopStyle = ({anim, frame, fps, baseStyle}) => {
  if (!anim) return baseStyle;
  const pulseHz = Number(anim.params?.hz || 1.1);
  const amp = Number(anim.params?.amp || 0.04);
  const wave = Math.sin((frame / fps) * Math.PI * 2 * pulseHz);
  const scale = 1 + wave * amp;
  return {
    ...baseStyle,
    transform: `${baseStyle.transform || ''} scale(${scale.toFixed(3)})`.trim(),
  };
};

const Layer = ({layer, stylePack}) => {
  const frame = useCurrentFrame();
  const {fps, width, height, durationInFrames} = useVideoConfig();
  const s = layer.style || {};
  const palette = STYLE_PACKS[stylePack] || STYLE_PACKS.clean;

  const base = {
    position: 'absolute',
    left: unit(s.x ?? 0.5),
    top: unit(s.y ?? 0.5),
    transform: `translate(-50%, -50%) rotate(${s.rotationDeg || 0}deg)`,
    opacity: s.opacity ?? 1,
    zIndex: s.zIndex || 10,
  };

  let content = null;
  if (layer.type === 'text') {
    content = (
      <div
        style={{
          ...base,
          width: s.maxWidth ? width * s.maxWidth : undefined,
          color: s.color || palette.text,
          textAlign: s.align,
          fontSize: s.fontSize,
          fontWeight: s.fontWeight,
          textShadow: s.shadow ? '0 6px 20px rgba(0,0,0,0.35)' : 'none',
          lineHeight: 1.08,
        }}
      >
        {layer.text}
      </div>
    );
  }

  if (layer.type === 'shape') {
    const w = (s.w || 0.3) * width;
    const h = (s.h || 0.16) * height;
    content = (
      <div
        style={{
          ...base,
          width: w,
          height: layer.shape === 'circle' ? w : h,
          borderRadius: layer.shape === 'pill' ? 999 : layer.shape === 'circle' ? '50%' : s.borderRadius,
          background: s.fill || palette.bg,
          filter: s.blur ? `blur(${s.blur}px)` : 'none',
          boxShadow: `0 16px 34px rgba(2,6,23,0.34)`,
        }}
      />
    );
  }

  if (layer.type === 'metric') {
    content = (
      <div style={{...base, color: s.color || palette.text, minWidth: 220, textAlign: 'center'}}>
        <div style={{fontSize: 24, opacity: 0.9}}>{layer.label}</div>
        <div style={{fontSize: 62, fontWeight: 800, color: s.accent || palette.accent}}>{String(layer.value)}</div>
      </div>
    );
  }

  const enter = animProgress({anim: layer.enter, frame, fps, durationInFrames, mode: 'enter'});
  const exit = animProgress({anim: layer.exit, frame, fps, durationInFrames, mode: 'exit'});

  let finalStyle = content?.props?.style || {};
  finalStyle = applyAnimStyle({anim: layer.enter, progress: enter, baseStyle: finalStyle, mode: 'enter'});
  finalStyle = applyLoopStyle({anim: layer.loop, frame, fps, baseStyle: finalStyle});
  finalStyle = applyAnimStyle({anim: layer.exit, progress: exit, baseStyle: finalStyle, mode: 'exit'});

  return React.cloneElement(content, {style: finalStyle});
};

export const PrimitiveRenderer = ({scene}) => {
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {scene.layers.map((layer) => (
        <Layer key={layer.id} layer={layer} stylePack={scene.stylePack} />
      ))}
    </AbsoluteFill>
  );
};

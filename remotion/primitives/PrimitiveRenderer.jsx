import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

const clampInterpolation = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};

const getAnimStyle = ({anim, frame, fps, baseStyle = {}, direction = 'enter'}) => {
  if (!anim) return baseStyle;
  const from = Math.max(0, Math.floor((anim.fromSec || 0) * fps));
  const d = Math.max(1, Math.floor((anim.durationSec || 0.6) * fps));
  const localFrame = Math.max(0, frame - from);
  const tLinear = interpolate(localFrame, [0, d], [0, 1], clampInterpolation);
  const t = anim.easing === 'spring' ? spring({frame: localFrame, fps, config: {damping: 12}}) : tLinear;

  if (anim.kind === 'fade') return {...baseStyle, opacity: t};
  if (anim.kind === 'scale' || anim.kind === 'pop') return {...baseStyle, transform: `${baseStyle.transform || ''} scale(${0.8 + 0.2 * t})`, opacity: t};
  if (anim.kind === 'slide') {
    const distance = Number(anim.params?.px || 40);
    const dx = direction === 'enter' ? (1 - t) * distance : 0;
    return {...baseStyle, transform: `${baseStyle.transform || ''} translateX(${dx}px)`, opacity: t};
  }
  if (anim.kind === 'rotate') return {...baseStyle, transform: `${baseStyle.transform || ''} rotate(${(1 - t) * 12}deg)`, opacity: t};
  return baseStyle;
};

const unit = (n) => `${Math.round(n * 100)}%`;

const Layer = ({layer}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const s = layer.style || {};

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
          color: s.color,
          textAlign: s.align,
          fontSize: s.fontSize,
          fontWeight: s.fontWeight,
          textShadow: s.shadow ? '0 6px 20px rgba(0,0,0,0.35)' : 'none',
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
          background: s.fill,
          filter: s.blur ? `blur(${s.blur}px)` : 'none',
        }}
      />
    );
  }

  if (layer.type === 'metric') {
    content = (
      <div style={{...base, color: s.color, minWidth: 220, textAlign: 'center'}}>
        <div style={{fontSize: 24, opacity: 0.9}}>{layer.label}</div>
        <div style={{fontSize: 62, fontWeight: 800, color: s.accent}}>{String(layer.value)}</div>
      </div>
    );
  }

  const entered = getAnimStyle({anim: layer.enter, frame, fps, baseStyle: content?.props?.style || {}, direction: 'enter'});
  return React.cloneElement(content, {style: entered});
};

export const PrimitiveRenderer = ({scene}) => {
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {scene.layers.map((layer) => (
        <Layer key={layer.id} layer={layer} />
      ))}
    </AbsoluteFill>
  );
};

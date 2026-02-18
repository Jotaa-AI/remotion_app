import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {getMotionStyle, resolvePositionStyle, resolveStylePack, resolveTypographyPreset} from './motion-toolkit.js';

const clampInterpolation = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
};

export const CtaBanner = ({payload, durationInFrames}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const motionStyle = getMotionStyle({
    frame,
    fps,
    durationInFrames,
    motion: payload.motion || {
      enter: 'slide-up',
      effects: ['float', 'pulse', 'glow'],
      exit: 'swipe-right',
    },
  });
  const palette = resolveStylePack(payload.stylePack, 'clean', payload.design || {});
  const typography = resolveTypographyPreset(payload.design, 'display-bold');
  const placement = resolvePositionStyle(payload.design, 'bottom');

  const progressFill = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0.12, 1], clampInterpolation);
  const title = payload.text || payload.title || 'Sigue para mas contenido';
  const subtitle = payload.subtitle || 'Comenta, guarda y comparte este video';
  const buttonText = payload.buttonText || 'Follow +';

  const fillPaddingTop = placement.justifyContent === 'flex-start' ? 42 : 0;
  const fillPaddingBottom = placement.justifyContent === 'flex-end' ? 42 : 0;

  return (
    <AbsoluteFill
      style={{
        justifyContent: placement.justifyContent,
        alignItems: 'center',
        padding: '0 48px',
        paddingTop: fillPaddingTop,
        paddingBottom: fillPaddingBottom,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '92%',
          maxWidth: 1560,
          borderRadius: 24,
          color: palette.secondary,
          fontFamily: typography.family,
          overflow: 'hidden',
          border: `1px solid ${palette.accentSoft}7a`,
          background: `radial-gradient(circle at 10% 0%, ${palette.accentSoft}36 0%, transparent 34%), linear-gradient(126deg, ${palette.ink}ef 0%, ${palette.primaryDeep}ea 54%, ${palette.primary}d2 100%)`,
          boxShadow: '0 24px 56px rgba(2, 8, 23, 0.48)',
          ...motionStyle,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            height: 6,
            width: `${(progressFill * 100).toFixed(2)}%`,
            background: `linear-gradient(90deg, ${palette.accentSoft} 0%, ${palette.accent} 72%, ${palette.secondary} 100%)`,
          }}
        />

        <div
          style={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 18,
            alignItems: 'center',
            padding: '20px 24px 22px',
          }}
        >
          <div style={{display: 'grid', gap: 5}}>
            <div style={{fontSize: Math.round(40 * typography.scale), lineHeight: 1, fontWeight: typography.titleWeight}}>
              {title}
            </div>
            <div style={{fontSize: Math.round(22 * typography.scale), fontWeight: typography.bodyWeight, color: `${palette.secondary}e6`}}>
              {subtitle}
            </div>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              borderRadius: 999,
              background: `linear-gradient(130deg, ${palette.accent} 0%, ${palette.primary} 100%)`,
              color: palette.secondary,
              border: `1px solid ${palette.secondary}72`,
              boxShadow: `0 12px 30px ${palette.glow}`,
              padding: '12px 18px',
              fontSize: Math.round(28 * typography.scale),
              fontWeight: typography.capsWeight,
            }}
          >
            <span>{buttonText}</span>
            <span style={{fontSize: 34, lineHeight: 1}}>&rarr;</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

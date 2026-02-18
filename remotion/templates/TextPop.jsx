import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {getMotionStyle, resolvePositionStyle, resolveStylePack, resolveTypographyPreset} from './motion-toolkit.js';

const clampInterpolation = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
};

export const TextPop = ({payload, durationInFrames}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const motionStyle = getMotionStyle({
    frame,
    fps,
    durationInFrames,
    motion: payload.motion || {
      enter: 'stamp',
      effects: ['pulse', 'glow', 'shake', 'saturate'],
      exit: 'fade',
    },
  });
  const palette = resolveStylePack(payload.stylePack, 'comic-blue', payload.design || {});
  const typography = resolveTypographyPreset(payload.design, 'impact');
  const placement = resolvePositionStyle(payload.design, 'center');

  const rays = Array.from({length: 10}, (_, index) => index);
  const raySpread = interpolate(frame, [0, Math.min(durationInFrames, 12)], [0.8, 1], clampInterpolation);
  const textShift = interpolate(frame, [0, Math.min(durationInFrames, 12)], [14, 0], clampInterpolation);

  const text = payload.text || 'Punto clave';
  const chip = payload.chip || 'IMPORTANT';

  const fillPaddingTop = placement.justifyContent === 'flex-start' ? 28 : 0;
  const fillPaddingBottom = placement.justifyContent === 'flex-end' ? 28 : 0;

  return (
    <AbsoluteFill
      style={{
        justifyContent: placement.justifyContent,
        alignItems: 'center',
        padding: 38,
        paddingTop: fillPaddingTop,
        paddingBottom: fillPaddingBottom,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '82%',
          maxWidth: 1360,
          minHeight: 290,
          ...motionStyle,
          fontFamily: typography.family,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 34,
            background: `linear-gradient(130deg, ${palette.secondary}f4 0%, ${palette.accentSoft}cf 54%, ${palette.accent}8f 100%)`,
            border: `2px solid ${palette.ink}`,
            boxShadow: '0 24px 52px rgba(2, 8, 23, 0.34)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'repeating-linear-gradient(118deg, rgba(255,255,255,0) 0 16px, rgba(255,255,255,0.22) 16px 18px, rgba(255,255,255,0) 18px 32px)',
              opacity: 0.4,
            }}
          />
        </div>

        <div style={{position: 'absolute', inset: 0, display: 'grid', placeItems: 'center'}}>
          {rays.map((ray) => {
            const rotate = ray * (180 / rays.length) + frame * 0.2;
            return (
              <div
                key={ray}
                style={{
                  position: 'absolute',
                  width: 760,
                  height: 4,
                  borderRadius: 999,
                  background: `${palette.accent}66`,
                  transform: `rotate(${rotate}deg) scaleX(${raySpread})`,
                }}
              />
            );
          })}
        </div>

        <div
          style={{
            position: 'relative',
            display: 'grid',
            gap: 14,
            justifyItems: 'center',
            textAlign: 'center',
            padding: '34px 42px',
          }}
        >
          <div
            style={{
              fontSize: Math.round(15 * typography.scale),
              fontWeight: typography.capsWeight,
              letterSpacing: 1.8,
              textTransform: 'uppercase',
              color: palette.secondary,
              background: palette.ink,
              borderRadius: 999,
              border: `1px solid ${palette.accent}`,
              padding: '7px 13px',
              boxShadow: `0 0 16px ${palette.glow}`,
            }}
          >
            {chip}
          </div>

          <div
            style={{
              position: 'relative',
              transform: `translateY(${textShift}px)`,
              fontSize: Math.round(96 * typography.scale),
              lineHeight: 0.95,
              fontWeight: typography.titleWeight,
              color: palette.ink,
              letterSpacing: typography.tracking,
              textShadow: `6px 6px 0 ${palette.secondary}, 12px 12px 0 ${palette.accentSoft}`,
              WebkitTextStroke: `1px ${palette.ink}`,
              maxWidth: '96%',
            }}
          >
            {text}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

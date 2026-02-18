import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {getMotionStyle, resolvePositionStyle, resolveStylePack, resolveTypographyPreset} from './motion-toolkit.js';

const clampInterpolation = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
};

export const LowerThird = ({payload, durationInFrames}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const motionStyle = getMotionStyle({
    frame,
    fps,
    durationInFrames,
    motion: payload.motion || {
      enter: 'tilt-in',
      exit: 'fade',
      effects: ['float', 'glow'],
    },
  });
  const palette = resolveStylePack(payload.stylePack, 'clean', payload.design || {});
  const typography = resolveTypographyPreset(payload.design, 'display-bold');
  const placement = resolvePositionStyle(payload.design, 'bottom');

  const reveal = interpolate(frame, [0, Math.min(durationInFrames, 16)], [0, 1], clampInterpolation);
  const shimmerX = interpolate(frame, [0, durationInFrames], [-320, 980], clampInterpolation);
  const topGlow = interpolate(frame, [0, Math.min(durationInFrames, 24)], [0.15, 0.42], clampInterpolation);

  const title = payload.title || 'Headline principal del video';
  const subtitle = payload.subtitle || 'Insight estrategico en tiempo real';
  const kicker = payload.kicker || 'HIGHLIGHT';

  const basePaddingTop = placement.justifyContent === 'flex-start' ? 56 : 0;
  const basePaddingBottom = placement.justifyContent === 'flex-end' ? 58 : 0;

  return (
    <AbsoluteFill
      style={{
        justifyContent: placement.justifyContent,
        padding: `0 56px ${basePaddingBottom}px`,
        paddingTop: basePaddingTop,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '74%',
          maxWidth: 1440,
          minHeight: 208,
          color: palette.secondary,
          fontFamily: typography.family,
          ...motionStyle,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 28,
            overflow: 'hidden',
            background: `linear-gradient(116deg, ${palette.ink}ee 0%, ${palette.primaryDeep}f0 52%, ${palette.primary}d8 100%)`,
            border: `1px solid ${palette.accentSoft}70`,
            boxShadow: `0 26px 60px rgba(2, 8, 23, 0.48), 0 0 36px ${palette.glow}`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: -120,
              top: -160,
              width: 360,
              height: 320,
              borderRadius: '56% 44% 64% 36% / 52% 42% 58% 48%',
              background: `${palette.accentSoft}40`,
              transform: `scale(${0.9 + reveal * 0.12})`,
              filter: 'blur(6px)',
            }}
          />

          <div
            style={{
              position: 'absolute',
              right: -80,
              bottom: -120,
              width: 300,
              height: 260,
              borderRadius: '58% 42% 40% 60% / 52% 50% 50% 48%',
              background: `${palette.accent}3a`,
              transform: `scale(${0.84 + reveal * 0.14})`,
            }}
          />

          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              height: 6,
              background: `linear-gradient(90deg, ${palette.accent}00 0%, ${palette.accent}cc 44%, ${palette.accent}00 100%)`,
              opacity: topGlow,
            }}
          />

          <div
            style={{
              position: 'absolute',
              top: 0,
              left: shimmerX,
              width: 130,
              height: '100%',
              transform: 'skewX(-20deg)',
              background: `linear-gradient(180deg, ${palette.secondary}08 0%, ${palette.secondary}26 52%, ${palette.secondary}08 100%)`,
              filter: 'blur(1px)',
            }}
          />
        </div>

        <div
          style={{
            position: 'relative',
            display: 'grid',
            gap: 12,
            padding: '26px 30px 28px 30px',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              width: 'fit-content',
              fontSize: Math.round(15 * typography.scale),
              fontWeight: typography.capsWeight,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: palette.secondary,
              background: `${palette.ink}78`,
              border: `1px solid ${palette.accentSoft}76`,
              borderRadius: 999,
              padding: '7px 14px',
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: palette.accent,
                boxShadow: `0 0 12px ${palette.accent}`,
              }}
            />
            {kicker}
          </div>

          <div
            style={{
              fontSize: Math.round(62 * typography.scale),
              lineHeight: 1,
              fontWeight: typography.titleWeight,
              letterSpacing: typography.tracking,
              maxWidth: '96%',
              textShadow: '0 8px 24px rgba(15, 23, 42, 0.4)',
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize: Math.round(30 * typography.scale),
              lineHeight: 1.16,
              fontWeight: typography.bodyWeight,
              opacity: 0.95,
              maxWidth: '88%',
              color: `${palette.secondary}ed`,
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

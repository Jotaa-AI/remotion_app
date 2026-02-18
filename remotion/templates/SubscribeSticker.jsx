import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {getMotionStyle, resolvePositionStyle, resolveStylePack, resolveTypographyPreset} from './motion-toolkit.js';

const clampInterpolation = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
};

export const SubscribeSticker = ({payload, durationInFrames}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const motionStyle = getMotionStyle({
    frame,
    fps,
    durationInFrames,
    motion: payload.motion || {
      enter: 'whip-left',
      effects: ['wiggle', 'pulse', 'glow', 'saturate'],
      exit: 'shrink',
    },
  });
  const palette = resolveStylePack(payload.stylePack, 'comic-blue', payload.design || {});
  const typography = resolveTypographyPreset(payload.design, 'impact');
  const placement = resolvePositionStyle(payload.design, 'center');

  const cardTilt = interpolate(frame, [0, Math.min(durationInFrames, 18)], [-10, -3], clampInterpolation);
  const burstScale = interpolate(frame, [0, Math.min(durationInFrames, 16)], [0.6, 1], clampInterpolation);
  const stickerLift = interpolate(frame, [0, Math.min(durationInFrames, 14)], [16, 0], clampInterpolation);

  const message = payload.text || payload.title || 'suscribiros a mi canal';
  const badgeText = payload.badge || 'you';
  const caption = payload.caption || '<subscribe />';

  const fillPaddingTop = placement.justifyContent === 'flex-start' ? 24 : 0;
  const fillPaddingBottom = placement.justifyContent === 'flex-end' ? 24 : 0;

  return (
    <AbsoluteFill
      style={{
        justifyContent: placement.justifyContent,
        alignItems: 'center',
        padding: 24,
        paddingTop: fillPaddingTop,
        paddingBottom: fillPaddingBottom,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '82%',
          maxWidth: 1080,
          minHeight: 280,
          ...motionStyle,
          fontFamily: typography.family,
          color: palette.ink,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '10%',
            top: '2%',
            width: 300,
            height: 300,
            background: palette.accent,
            clipPath:
              'polygon(50% 0%, 63% 30%, 98% 35%, 72% 58%, 79% 94%, 50% 76%, 21% 94%, 28% 58%, 2% 35%, 37% 30%)',
            transform: `rotate(-9deg) scale(${burstScale})`,
            opacity: 0.82,
            filter: 'drop-shadow(0 12px 24px rgba(15, 23, 42, 0.24))',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: '18%',
            top: '14%',
            width: 210,
            height: 140,
            borderRadius: '58% 42% 44% 56% / 42% 62% 38% 58%',
            background: `${palette.primary}d9`,
            border: `4px solid ${palette.ink}`,
            transform: `rotate(-15deg) translateY(${stickerLift * 0.2}px)`,
          }}
        />

        <div
          style={{
            position: 'absolute',
            right: '8%',
            bottom: '8%',
            width: 150,
            height: 150,
            borderRadius: 999,
            background: `radial-gradient(circle, ${palette.secondary}98 0%, ${palette.secondary}00 70%)`,
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: '14%',
            top: '30%',
            width: '74%',
            transform: `rotate(${cardTilt}deg) translateY(${stickerLift}px)`,
          }}
        >
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              background: palette.secondary,
              border: `6px solid ${palette.ink}`,
              borderRadius: 20,
              padding: '18px 22px 16px',
              boxShadow: '0 18px 42px rgba(15, 23, 42, 0.4)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `repeating-radial-gradient(circle at 12% 18%, ${palette.accentSoft}66 0 2px, transparent 2px 12px)`,
                opacity: 0.42,
              }}
            />

            <div style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 10}}>
              <div
                style={{
                  backgroundColor: palette.primary,
                  color: palette.secondary,
                  borderRadius: 10,
                  padding: '4px 10px',
                  fontSize: Math.round(21 * typography.scale),
                  fontWeight: typography.capsWeight,
                  textTransform: 'lowercase',
                  border: `2px solid ${palette.ink}`,
                  boxShadow: `0 3px 0 ${palette.ink}`,
                }}
              >
                {badgeText}
              </div>

              <div
                style={{
                  fontSize: Math.round(44 * typography.scale),
                  fontWeight: typography.titleWeight,
                  lineHeight: 1.02,
                  letterSpacing: typography.tracking,
                  color: palette.ink,
                }}
              >
                {message}
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: palette.ink,
                color: palette.secondary,
                borderRadius: 10,
                padding: '3px 11px',
                fontSize: Math.round(20 * typography.scale),
                fontWeight: typography.bodyWeight,
              }}
            >
              {caption}
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              right: -22,
              top: -16,
              transform: 'rotate(12deg)',
              background: `${palette.accentSoft}ee`,
              color: palette.ink,
              border: `3px solid ${palette.ink}`,
              borderRadius: 12,
              fontSize: Math.round(15 * typography.scale),
              fontWeight: typography.capsWeight,
              padding: '5px 10px',
              boxShadow: '0 8px 18px rgba(15, 23, 42, 0.25)',
            }}
          >
            new drop
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

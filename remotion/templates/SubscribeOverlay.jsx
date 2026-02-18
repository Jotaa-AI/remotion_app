import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {getMotionStyle, resolvePositionStyle, resolveStylePack, resolveTypographyPreset} from './motion-toolkit.js';

const clampInterpolation = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
};

export const SubscribeOverlay = ({payload, durationInFrames}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const motionStyle = getMotionStyle({
    frame,
    fps,
    durationInFrames,
    motion: payload.motion || {
      enter: 'stamp',
      effects: ['pulse', 'glow', 'float', 'saturate'],
      exit: 'fade',
    },
  });
  const palette = resolveStylePack(payload.stylePack, 'retro-red', payload.design || {});
  const typography = resolveTypographyPreset(payload.design, 'display-bold');
  const placement = resolvePositionStyle(payload.design, 'center');

  const ringPhaseA = frame % 68;
  const ringPhaseB = (frame + 28) % 68;

  const ringAScale = interpolate(ringPhaseA, [0, 68], [0.78, 1.45], clampInterpolation);
  const ringBScale = interpolate(ringPhaseB, [0, 68], [0.78, 1.45], clampInterpolation);
  const ringAOpacity = interpolate(ringPhaseA, [0, 68], [0.42, 0], clampInterpolation);
  const ringBOpacity = interpolate(ringPhaseB, [0, 68], [0.36, 0], clampInterpolation);

  const title = payload.title || 'Suscribete para mas contenido';
  const subtitle = payload.subtitle || 'Nuevos videos cada semana';
  const eyebrow = payload.eyebrow || 'Creator Growth Trigger';

  const fillPaddingTop = placement.justifyContent === 'flex-start' ? 42 : 0;
  const fillPaddingBottom = placement.justifyContent === 'flex-end' ? 42 : 0;

  return (
    <AbsoluteFill
      style={{
        justifyContent: placement.justifyContent,
        alignItems: 'center',
        paddingTop: fillPaddingTop,
        paddingBottom: fillPaddingBottom,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '88%',
          maxWidth: 1140,
          minHeight: 320,
          ...motionStyle,
          fontFamily: typography.family,
          color: palette.secondary,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 520,
            height: 520,
            borderRadius: 999,
            border: `2px solid ${palette.accentSoft}a0`,
            transform: `scale(${ringAScale})`,
            opacity: ringAOpacity,
            boxShadow: `0 0 40px ${palette.glow}`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 520,
            height: 520,
            borderRadius: 999,
            border: `2px solid ${palette.secondary}88`,
            transform: `scale(${ringBScale})`,
            opacity: ringBOpacity,
          }}
        />

        <div
          style={{
            position: 'absolute',
            width: 780,
            height: 320,
            borderRadius: 46,
            background: `radial-gradient(circle at 14% 18%, ${palette.accentSoft}30 0%, transparent 48%), linear-gradient(130deg, ${palette.ink}ea 0%, ${palette.primaryDeep}ea 52%, ${palette.primary}dc 100%)`,
            border: `1px solid ${palette.accentSoft}86`,
            boxShadow: '0 30px 72px rgba(2, 8, 23, 0.5)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: -110,
              top: 42,
              width: 240,
              height: 240,
              borderRadius: 999,
              background: `${palette.accent}40`,
              filter: 'blur(6px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: -60,
              bottom: -100,
              width: 260,
              height: 260,
              borderRadius: 999,
              background: `${palette.secondary}14`,
            }}
          />
        </div>

        <div
          style={{
            position: 'relative',
            display: 'grid',
            gap: 20,
            justifyItems: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: Math.round(14 * typography.scale),
              letterSpacing: 1.7,
              textTransform: 'uppercase',
              fontWeight: typography.capsWeight,
              padding: '7px 13px',
              borderRadius: 999,
              background: `${palette.ink}86`,
              border: `1px solid ${palette.accentSoft}8a`,
            }}
          >
            {eyebrow}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              borderRadius: 22,
              border: `2px solid ${palette.secondary}98`,
              background: `linear-gradient(130deg, ${palette.primary} 0%, ${palette.primaryDeep} 100%)`,
              padding: '18px 30px',
              boxShadow: '0 18px 45px rgba(0,0,0,0.38)',
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                background: palette.secondary,
                display: 'grid',
                placeItems: 'center',
                border: `1px solid ${palette.ink}18`,
              }}
            >
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderTop: '10px solid transparent',
                  borderBottom: '10px solid transparent',
                  borderLeft: `16px solid ${palette.primary}`,
                  marginLeft: 4,
                }}
              />
            </div>

            <div style={{fontSize: Math.round(60 * typography.scale), lineHeight: 1, fontWeight: typography.titleWeight}}>
              {title}
            </div>
          </div>

          <div
            style={{
              fontSize: Math.round(30 * typography.scale),
              lineHeight: 1.16,
              fontWeight: typography.bodyWeight,
              maxWidth: 700,
              color: `${palette.secondary}f2`,
              textShadow: '0 6px 20px rgba(2, 8, 23, 0.32)',
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

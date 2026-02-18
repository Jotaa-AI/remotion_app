import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {getMotionStyle, resolvePositionStyle, resolveStylePack, resolveTypographyPreset} from './motion-toolkit.js';

const clampInterpolation = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
};

const parseNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return 0;
  }

  const normalized = value.toLowerCase().replace(/,/g, '').trim();
  if (normalized.endsWith('k')) {
    const parsed = Number(normalized.slice(0, -1));
    return Number.isFinite(parsed) ? parsed * 1000 : 0;
  }
  if (normalized.endsWith('m')) {
    const parsed = Number(normalized.slice(0, -1));
    return Number.isFinite(parsed) ? parsed * 1000000 : 0;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCompact = (value) => {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  return new Intl.NumberFormat('es-ES', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
};

export const StatCompare = ({payload, durationInFrames}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const motionStyle = getMotionStyle({
    frame,
    fps,
    durationInFrames,
    motion: payload.motion || {
      enter: 'slide-left',
      effects: ['pulse', 'float', 'glow'],
      exit: 'fade',
    },
  });
  const palette = resolveStylePack(payload.stylePack, 'comic-blue', payload.design || {});
  const typography = resolveTypographyPreset(payload.design, 'clean-sans');
  const placement = resolvePositionStyle(payload.design, 'center');

  const left = parseNumber(payload.leftValue || 0);
  const right = parseNumber(payload.rightValue || 0);
  const max = Math.max(left, right, 1);
  const grow = interpolate(frame, [0, Math.min(24, durationInFrames - 1)], [0, 1], clampInterpolation);

  const leftHeight = Math.max(22, (left / max) * 320 * grow);
  const rightHeight = Math.max(22, (right / max) * 320 * grow);
  const leadLabel = left === right ? 'Empate tecnico' : left > right ? 'Gana A' : 'Gana B';
  const delta = Math.abs(left - right);

  const fillPaddingTop = placement.justifyContent === 'flex-start' ? 48 : 0;
  const fillPaddingBottom = placement.justifyContent === 'flex-end' ? 48 : 0;

  return (
    <AbsoluteFill
      style={{
        justifyContent: placement.justifyContent,
        alignItems: 'center',
        padding: 60,
        paddingTop: fillPaddingTop,
        paddingBottom: fillPaddingBottom,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '78%',
          maxWidth: 1380,
          minHeight: 470,
          color: palette.secondary,
          fontFamily: typography.family,
          borderRadius: 30,
          overflow: 'hidden',
          border: `1px solid ${palette.accentSoft}70`,
          background: `radial-gradient(circle at 16% 0%, ${palette.accentSoft}1f 0%, transparent 36%), linear-gradient(130deg, ${palette.ink}ea 0%, ${palette.primaryDeep}e8 58%, ${palette.primary}cc 100%)`,
          boxShadow: '0 30px 72px rgba(2, 8, 23, 0.52)',
          ...motionStyle,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '72px 34px 90px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            pointerEvents: 'none',
          }}
        >
          {[0, 1, 2, 3].map((line) => (
            <div
              key={line}
              style={{
                height: 1,
                background: `linear-gradient(90deg, ${palette.secondary}08 0%, ${palette.secondary}2f 46%, ${palette.secondary}08 100%)`,
              }}
            />
          ))}
        </div>

        <div
          style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '24px 30px 0',
          }}
        >
          <div style={{fontSize: Math.round(44 * typography.scale), fontWeight: typography.titleWeight, lineHeight: 1}}>
            {payload.title || 'Comparativa clave'}
          </div>
          <div
            style={{
              fontSize: Math.round(17 * typography.scale),
              fontWeight: typography.capsWeight,
              borderRadius: 999,
              border: `1px solid ${palette.accentSoft}86`,
              background: `${palette.ink}88`,
              padding: '7px 14px',
              letterSpacing: 0.2,
            }}
          >
            {leadLabel} {delta > 0 ? `(${formatCompact(delta)} dif.)` : ''}
          </div>
        </div>

        <div
          style={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 30,
            padding: '22px 34px 28px',
            alignItems: 'end',
          }}
        >
          <div style={{display: 'grid', gap: 12}}>
            <div style={{fontSize: Math.round(24 * typography.scale), fontWeight: typography.capsWeight, color: `${palette.secondary}f0`}}>
              {payload.leftLabel || 'Metrica A'}
            </div>
            <div
              style={{
                height: 330,
                borderRadius: 18,
                border: `1px solid ${palette.accentSoft}3d`,
                padding: 10,
                display: 'flex',
                alignItems: 'flex-end',
                background: `${palette.ink}52`,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: leftHeight,
                  borderRadius: '12px 12px 8px 8px',
                  background: `linear-gradient(180deg, ${palette.accent} 0%, ${palette.primary} 78%, ${palette.primaryDeep} 100%)`,
                  boxShadow: `0 10px 22px ${palette.glow}`,
                  border: `1px solid ${palette.secondary}38`,
                }}
              />
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
              <span style={{fontSize: Math.round(34 * typography.scale), fontWeight: typography.titleWeight}}>
                {payload.leftValue || formatCompact(left)}
              </span>
              <span style={{fontSize: Math.round(18 * typography.scale), opacity: 0.86}}>{left > right ? 'liderando' : ''}</span>
            </div>
          </div>

          <div style={{display: 'grid', gap: 12}}>
            <div style={{fontSize: Math.round(24 * typography.scale), fontWeight: typography.capsWeight, color: `${palette.secondary}f0`}}>
              {payload.rightLabel || 'Metrica B'}
            </div>
            <div
              style={{
                height: 330,
                borderRadius: 18,
                border: `1px solid ${palette.accentSoft}3d`,
                padding: 10,
                display: 'flex',
                alignItems: 'flex-end',
                background: `${palette.ink}52`,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: rightHeight,
                  borderRadius: '12px 12px 8px 8px',
                  background: 'linear-gradient(180deg, #fb7185 0%, #f97316 76%, #ea580c 100%)',
                  boxShadow: '0 10px 20px rgba(251, 113, 133, 0.35)',
                  border: `1px solid ${palette.secondary}38`,
                }}
              />
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
              <span style={{fontSize: Math.round(34 * typography.scale), fontWeight: typography.titleWeight}}>
                {payload.rightValue || formatCompact(right)}
              </span>
              <span style={{fontSize: Math.round(18 * typography.scale), opacity: 0.86}}>{right > left ? 'liderando' : ''}</span>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

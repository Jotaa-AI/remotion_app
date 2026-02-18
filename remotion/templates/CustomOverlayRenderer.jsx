import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {getMotionStyle, resolvePositionStyle, resolveStylePack, resolveTypographyPreset} from './motion-toolkit.js';

const clampInterpolation = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
};

const ALLOWED_INTENTS = ['hook', 'proof', 'explanation', 'objection', 'cta', 'transition', 'summary'];
const ALLOWED_LAYOUTS = ['headline-card', 'split-bars', 'sticker-burst', 'quote-focus', 'cta-ribbon', 'data-pill'];

const parseMetric = (value) => {
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
    return String(value || '');
  }
  return new Intl.NumberFormat('es-ES', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
};

const toText = (value, fallback = '') => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text || fallback;
};

const pickFromElements = (elements, type, fallback = '') => {
  const found = (elements || []).find((entry) => String(entry?.type || '').toLowerCase() === type);
  if (!found) {
    return fallback;
  }
  return toText(found.text ?? found.value ?? found.label, fallback);
};

const pickLayoutByIntent = (intent) => {
  if (intent === 'proof') return 'split-bars';
  if (intent === 'cta') return 'cta-ribbon';
  if (intent === 'explanation' || intent === 'objection') return 'quote-focus';
  if (intent === 'summary') return 'data-pill';
  if (intent === 'hook') return 'headline-card';
  return 'sticker-burst';
};

const pickIntentByTemplate = (template) => {
  if (template === 'stat-compare') return 'proof';
  if (template === 'cta-banner') return 'cta';
  if (template === 'subscribe' || template === 'subscribe-sticker') return 'cta';
  if (template === 'text-pop') return 'explanation';
  if (template === 'lower-third') return 'hook';
  return 'transition';
};

const normalizeSpec = ({spec, payload, template}) => {
  const baseSpec = spec || {};
  const rawIntent = String(baseSpec.intent || pickIntentByTemplate(template)).toLowerCase();
  const intent = ALLOWED_INTENTS.includes(rawIntent) ? rawIntent : 'transition';
  const rawLayout = String(baseSpec.layout || pickLayoutByIntent(intent)).toLowerCase();
  const layout = ALLOWED_LAYOUTS.includes(rawLayout) ? rawLayout : pickLayoutByIntent(intent);
  const emphasis = String(baseSpec.emphasis || payload?.design?.energy || 'balanced').toLowerCase();

  const fallbackTitle = toText(payload?.title || payload?.text, 'Momento clave');
  const fallbackSubtitle = toText(payload?.subtitle || payload?.caption, 'Refuerzo visual generado por IA');
  const fallbackLabelA = toText(payload?.leftLabel, 'Valor A');
  const fallbackLabelB = toText(payload?.rightLabel, 'Valor B');
  const fallbackValueA = toText(payload?.leftValue, '10k');
  const fallbackValueB = toText(payload?.rightValue, '20k');

  const elements = Array.isArray(baseSpec.elements) ? baseSpec.elements : [];
  const title = pickFromElements(elements, 'title', fallbackTitle);
  const subtitle = pickFromElements(elements, 'subtitle', fallbackSubtitle);
  const badge = pickFromElements(elements, 'badge', toText(payload?.kicker || payload?.chip || payload?.eyebrow, intent.toUpperCase()));
  const cta = pickFromElements(elements, 'cta', toText(payload?.buttonText, 'Seguir +'));
  const leftLabel = pickFromElements(elements, 'metric-left-label', fallbackLabelA);
  const rightLabel = pickFromElements(elements, 'metric-right-label', fallbackLabelB);
  const leftValueRaw = pickFromElements(elements, 'metric-left-value', fallbackValueA);
  const rightValueRaw = pickFromElements(elements, 'metric-right-value', fallbackValueB);
  const leftValue = parseMetric(leftValueRaw);
  const rightValue = parseMetric(rightValueRaw);

  return {
    intent,
    layout,
    emphasis,
    title,
    subtitle,
    badge,
    cta,
    leftLabel,
    rightLabel,
    leftValue,
    rightValue,
    leftValueDisplay: toText(leftValueRaw, formatCompact(leftValue)),
    rightValueDisplay: toText(rightValueRaw, formatCompact(rightValue)),
  };
};

const renderHeadlineCard = ({spec, palette, typography, frame, durationInFrames}) => {
  const sheen = interpolate(frame, [0, durationInFrames], [-240, 1080], clampInterpolation);
  return (
    <div
      style={{
        position: 'relative',
        width: '78%',
        maxWidth: 1460,
        borderRadius: 30,
        overflow: 'hidden',
        border: `1px solid ${palette.accentSoft}8a`,
        boxShadow: `0 24px 58px rgba(2, 8, 23, 0.48), 0 0 26px ${palette.glow}`,
        background: `radial-gradient(circle at 14% 10%, ${palette.accentSoft}2f 0%, transparent 48%), linear-gradient(126deg, ${palette.ink}e8 0%, ${palette.primaryDeep}e6 56%, ${palette.primary}cf 100%)`,
        color: palette.secondary,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: sheen,
          width: 140,
          height: '100%',
          transform: 'skewX(-20deg)',
          background: `linear-gradient(180deg, ${palette.secondary}06 0%, ${palette.secondary}2a 52%, ${palette.secondary}06 100%)`,
        }}
      />
      <div style={{position: 'relative', padding: '26px 30px 30px'}}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            borderRadius: 999,
            border: `1px solid ${palette.accentSoft}88`,
            background: `${palette.ink}88`,
            padding: '6px 12px',
            fontSize: Math.round(14 * typography.scale),
            letterSpacing: 1.2,
            fontWeight: typography.capsWeight,
            textTransform: 'uppercase',
          }}
        >
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: 999,
              background: palette.accent,
              boxShadow: `0 0 10px ${palette.accent}`,
            }}
          />
          {spec.badge}
        </div>

        <div
          style={{
            marginTop: 10,
            fontSize: Math.round(74 * typography.scale),
            fontWeight: typography.titleWeight,
            letterSpacing: typography.tracking,
            lineHeight: 0.95,
            textShadow: '0 8px 24px rgba(15,23,42,0.4)',
          }}
        >
          {spec.title}
        </div>

        <div
          style={{
            marginTop: 8,
            fontSize: Math.round(32 * typography.scale),
            fontWeight: typography.bodyWeight,
            lineHeight: 1.15,
            color: `${palette.secondary}ec`,
          }}
        >
          {spec.subtitle}
        </div>
      </div>
    </div>
  );
};

const renderSplitBars = ({spec, palette, typography, frame, durationInFrames}) => {
  const max = Math.max(1, spec.leftValue, spec.rightValue);
  const grow = interpolate(frame, [0, Math.min(durationInFrames, 20)], [0, 1], clampInterpolation);
  const leftHeight = Math.max(26, (spec.leftValue / max) * 270 * grow);
  const rightHeight = Math.max(26, (spec.rightValue / max) * 270 * grow);
  const delta = Math.abs(spec.rightValue - spec.leftValue);

  return (
    <div
      style={{
        width: '76%',
        maxWidth: 1360,
        borderRadius: 30,
        overflow: 'hidden',
        border: `1px solid ${palette.accentSoft}74`,
        boxShadow: '0 28px 70px rgba(2,8,23,0.5)',
        background: `linear-gradient(124deg, ${palette.ink}ea 0%, ${palette.primaryDeep}e6 54%, ${palette.primary}cf 100%)`,
        color: palette.secondary,
        padding: '24px 30px 28px',
      }}
    >
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{fontSize: Math.round(44 * typography.scale), fontWeight: typography.titleWeight, lineHeight: 1}}>
          {spec.title}
        </div>
        <div
          style={{
            fontSize: Math.round(16 * typography.scale),
            borderRadius: 999,
            border: `1px solid ${palette.accentSoft}7e`,
            padding: '7px 13px',
            background: `${palette.ink}82`,
            fontWeight: typography.capsWeight,
          }}
        >
          {`Dif ${formatCompact(delta)}`}
        </div>
      </div>

      <div style={{marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24}}>
        <div>
          <div style={{fontSize: Math.round(22 * typography.scale), fontWeight: typography.capsWeight}}>{spec.leftLabel}</div>
          <div
            style={{
              marginTop: 10,
              height: 290,
              borderRadius: 16,
              background: `${palette.ink}52`,
              border: `1px solid ${palette.accentSoft}30`,
              display: 'flex',
              alignItems: 'flex-end',
              padding: 10,
            }}
          >
            <div
              style={{
                width: '100%',
                height: leftHeight,
                borderRadius: '10px 10px 8px 8px',
                background: `linear-gradient(180deg, ${palette.accent} 0%, ${palette.primary} 80%, ${palette.primaryDeep} 100%)`,
                boxShadow: `0 10px 24px ${palette.glow}`,
              }}
            />
          </div>
          <div style={{marginTop: 10, fontSize: Math.round(34 * typography.scale), fontWeight: typography.titleWeight}}>
            {spec.leftValueDisplay}
          </div>
        </div>

        <div>
          <div style={{fontSize: Math.round(22 * typography.scale), fontWeight: typography.capsWeight}}>{spec.rightLabel}</div>
          <div
            style={{
              marginTop: 10,
              height: 290,
              borderRadius: 16,
              background: `${palette.ink}52`,
              border: `1px solid ${palette.accentSoft}30`,
              display: 'flex',
              alignItems: 'flex-end',
              padding: 10,
            }}
          >
            <div
              style={{
                width: '100%',
                height: rightHeight,
                borderRadius: '10px 10px 8px 8px',
                background: 'linear-gradient(180deg, #fb7185 0%, #f97316 78%, #ea580c 100%)',
                boxShadow: '0 10px 20px rgba(251,113,133,0.34)',
              }}
            />
          </div>
          <div style={{marginTop: 10, fontSize: Math.round(34 * typography.scale), fontWeight: typography.titleWeight}}>
            {spec.rightValueDisplay}
          </div>
        </div>
      </div>
    </div>
  );
};

const renderStickerBurst = ({spec, palette, typography, frame, durationInFrames}) => {
  const tilt = interpolate(frame, [0, Math.min(durationInFrames, 18)], [-10, -3], clampInterpolation);
  return (
    <div style={{position: 'relative', width: '82%', maxWidth: 1100, minHeight: 260}}>
      <div
        style={{
          position: 'absolute',
          left: '10%',
          top: '0%',
          width: 300,
          height: 300,
          background: palette.accent,
          clipPath: 'polygon(50% 0%, 63% 30%, 98% 35%, 72% 58%, 79% 94%, 50% 76%, 21% 94%, 28% 58%, 2% 35%, 37% 30%)',
          opacity: 0.8,
          transform: 'rotate(-8deg)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '14%',
          top: '30%',
          width: '74%',
          transform: `rotate(${tilt}deg)`,
        }}
      >
        <div
          style={{
            position: 'relative',
            borderRadius: 20,
            border: `6px solid ${palette.ink}`,
            background: palette.secondary,
            boxShadow: '0 18px 40px rgba(15,23,42,0.4)',
            padding: '16px 20px 14px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `repeating-radial-gradient(circle at 12% 18%, ${palette.accentSoft}66 0 2px, transparent 2px 12px)`,
              opacity: 0.4,
            }}
          />
          <div style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 10}}>
            <div
              style={{
                borderRadius: 10,
                background: palette.primary,
                color: palette.secondary,
                border: `2px solid ${palette.ink}`,
                fontSize: Math.round(20 * typography.scale),
                fontWeight: typography.capsWeight,
                padding: '4px 10px',
              }}
            >
              {spec.badge.toLowerCase()}
            </div>
            <div
              style={{
                fontSize: Math.round(50 * typography.scale),
                fontWeight: typography.titleWeight,
                letterSpacing: typography.tracking,
                color: palette.ink,
                lineHeight: 1.02,
              }}
            >
              {spec.title}
            </div>
          </div>
          <div
            style={{
              marginTop: 10,
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: 10,
              background: palette.ink,
              color: palette.secondary,
              padding: '3px 10px',
              fontSize: Math.round(20 * typography.scale),
              fontWeight: typography.bodyWeight,
            }}
          >
            {spec.subtitle}
          </div>
        </div>
      </div>
    </div>
  );
};

const renderQuoteFocus = ({spec, palette, typography}) => {
  return (
    <div
      style={{
        width: '78%',
        maxWidth: 1360,
        borderRadius: 30,
        border: `1px solid ${palette.accentSoft}88`,
        boxShadow: `0 24px 50px rgba(2,8,23,0.4), 0 0 22px ${palette.glow}`,
        background: `linear-gradient(128deg, ${palette.secondary}f2 0%, ${palette.accentSoft}c2 55%, ${palette.accent}82 100%)`,
        color: palette.ink,
        padding: '32px 34px',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          borderRadius: 999,
          padding: '6px 12px',
          border: `1px solid ${palette.ink}26`,
          background: `${palette.secondary}bb`,
          fontSize: Math.round(14 * typography.scale),
          fontWeight: typography.capsWeight,
          textTransform: 'uppercase',
          letterSpacing: 1.1,
        }}
      >
        {spec.badge}
      </div>
      <div
        style={{
          marginTop: 12,
          fontSize: Math.round(86 * typography.scale),
          lineHeight: 0.95,
          fontWeight: typography.titleWeight,
          letterSpacing: typography.tracking,
          textShadow: `6px 6px 0 ${palette.secondary}, 11px 11px 0 ${palette.accentSoft}`,
        }}
      >
        {spec.title}
      </div>
      <div style={{marginTop: 10, fontSize: Math.round(30 * typography.scale), fontWeight: typography.bodyWeight, lineHeight: 1.14}}>
        {spec.subtitle}
      </div>
    </div>
  );
};

const renderCtaRibbon = ({spec, palette, typography, frame, durationInFrames}) => {
  const fill = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0.1, 1], clampInterpolation);
  return (
    <div
      style={{
        width: '92%',
        maxWidth: 1580,
        borderRadius: 24,
        overflow: 'hidden',
        border: `1px solid ${palette.accentSoft}7c`,
        background: `linear-gradient(126deg, ${palette.ink}ec 0%, ${palette.primaryDeep}e8 54%, ${palette.primary}d4 100%)`,
        color: palette.secondary,
        boxShadow: '0 24px 56px rgba(2,8,23,0.5)',
      }}
    >
      <div
        style={{
          height: 6,
          width: `${(fill * 100).toFixed(2)}%`,
          background: `linear-gradient(90deg, ${palette.accentSoft} 0%, ${palette.accent} 72%, ${palette.secondary} 100%)`,
        }}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          alignItems: 'center',
          gap: 18,
          padding: '16px 22px 20px',
        }}
      >
        <div>
          <div style={{fontSize: Math.round(50 * typography.scale), fontWeight: typography.titleWeight, lineHeight: 1}}>
            {spec.title}
          </div>
          <div style={{marginTop: 7, fontSize: Math.round(26 * typography.scale), fontWeight: typography.bodyWeight}}>
            {spec.subtitle}
          </div>
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            borderRadius: 999,
            background: `linear-gradient(130deg, ${palette.accent} 0%, ${palette.primary} 100%)`,
            border: `1px solid ${palette.secondary}7a`,
            padding: '12px 18px',
            fontSize: Math.round(30 * typography.scale),
            fontWeight: typography.capsWeight,
          }}
        >
          <span>{spec.cta}</span>
          <span style={{fontSize: Math.round(38 * typography.scale), lineHeight: 1}}>&rarr;</span>
        </div>
      </div>
    </div>
  );
};

const renderDataPill = ({spec, palette, typography}) => {
  return (
    <div
      style={{
        width: '70%',
        maxWidth: 1120,
        borderRadius: 999,
        border: `1px solid ${palette.accentSoft}7c`,
        background: `linear-gradient(128deg, ${palette.ink}ea 0%, ${palette.primaryDeep}e2 56%, ${palette.primary}cc 100%)`,
        color: palette.secondary,
        boxShadow: `0 20px 44px rgba(2,8,23,0.45), 0 0 24px ${palette.glow}`,
        padding: '18px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: 999,
          background: palette.accent,
          boxShadow: `0 0 14px ${palette.accent}`,
          flexShrink: 0,
        }}
      />
      <div style={{fontSize: Math.round(42 * typography.scale), fontWeight: typography.titleWeight, lineHeight: 1}}>
        {spec.title}
      </div>
      <div style={{fontSize: Math.round(24 * typography.scale), fontWeight: typography.bodyWeight, opacity: 0.94}}>
        {spec.subtitle}
      </div>
    </div>
  );
};

export const CustomOverlayRenderer = ({event, payload, durationInFrames}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const motionStyle = getMotionStyle({
    frame,
    fps,
    durationInFrames,
    motion: payload.motion || {},
  });

  const spec = normalizeSpec({
    spec: payload.animationSpec || {},
    payload,
    template: event.template,
  });
  const palette = resolveStylePack(payload.stylePack, 'clean', payload.design || {});
  const typography = resolveTypographyPreset(payload.design, 'display-bold');
  const placement = resolvePositionStyle(payload.design, 'center');

  const topPad = placement.justifyContent === 'flex-start' ? 44 : 0;
  const bottomPad = placement.justifyContent === 'flex-end' ? 44 : 0;

  let content = null;
  if (spec.layout === 'split-bars') {
    content = renderSplitBars({spec, palette, typography, frame, durationInFrames});
  } else if (spec.layout === 'sticker-burst') {
    content = renderStickerBurst({spec, palette, typography, frame, durationInFrames});
  } else if (spec.layout === 'quote-focus') {
    content = renderQuoteFocus({spec, palette, typography});
  } else if (spec.layout === 'cta-ribbon') {
    content = renderCtaRibbon({spec, palette, typography, frame, durationInFrames});
  } else if (spec.layout === 'data-pill') {
    content = renderDataPill({spec, palette, typography});
  } else {
    content = renderHeadlineCard({spec, palette, typography, frame, durationInFrames});
  }

  return (
    <AbsoluteFill
      style={{
        justifyContent: placement.justifyContent,
        alignItems: 'center',
        padding: '0 40px',
        paddingTop: topPad,
        paddingBottom: bottomPad,
        pointerEvents: 'none',
      }}
    >
      <div style={{...motionStyle}}>{content}</div>
    </AbsoluteFill>
  );
};

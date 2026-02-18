import {Easing, interpolate, spring} from 'remotion';

const clampInterpolation = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
};

const SPRING_PRESETS = {
  'spring-pop': {damping: 14, stiffness: 180, mass: 0.8},
  'slide-up': {damping: 18, stiffness: 140, mass: 0.85},
  'slide-left': {damping: 18, stiffness: 140, mass: 0.85},
  'whip-left': {damping: 11, stiffness: 220, mass: 0.7},
  stamp: {damping: 12, stiffness: 250, mass: 0.68},
  'tilt-in': {damping: 16, stiffness: 170, mass: 0.75},
};

const EXIT_EASING = {
  fade: Easing.out(Easing.ease),
  shrink: Easing.in(Easing.cubic),
  'slide-down': Easing.in(Easing.bezier(0.55, 0.05, 0.67, 0.19)),
  'swipe-right': Easing.in(Easing.bezier(0.33, 0, 0.9, 0.43)),
};

const ENTRY_EASING = {
  'spring-pop': Easing.bezier(0.16, 1, 0.3, 1),
  'slide-up': Easing.out(Easing.cubic),
  'slide-left': Easing.out(Easing.cubic),
  'whip-left': Easing.bezier(0.07, 1.04, 0.29, 1),
  stamp: Easing.bezier(0.2, 1.2, 0.31, 1),
  'tilt-in': Easing.bezier(0.12, 0.97, 0.2, 1),
};

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeHex = (value) => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(normalized)) {
    return normalized;
  }
  return null;
};

const clampColor = (value) => Math.max(0, Math.min(255, Math.round(value)));

const hexToRgb = (hex) => {
  const normalized = normalizeHex(hex);
  if (!normalized) {
    return null;
  }
  const raw = normalized.slice(1);
  return {
    r: Number.parseInt(raw.slice(0, 2), 16),
    g: Number.parseInt(raw.slice(2, 4), 16),
    b: Number.parseInt(raw.slice(4, 6), 16),
  };
};

const rgbToHex = ({r, g, b}) => {
  return `#${clampColor(r).toString(16).padStart(2, '0')}${clampColor(g).toString(16).padStart(2, '0')}${clampColor(b)
    .toString(16)
    .padStart(2, '0')}`;
};

const mixHex = (colorA, colorB, weight = 0.5) => {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  if (!a || !b) {
    return normalizeHex(colorA) || normalizeHex(colorB) || '#000000';
  }
  const w = Math.max(0, Math.min(1, Number(weight || 0.5)));
  return rgbToHex({
    r: a.r + (b.r - a.r) * w,
    g: a.g + (b.g - a.g) * w,
    b: a.b + (b.b - a.b) * w,
  });
};

const withAlpha = (hex, alpha = 1) => {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return `rgba(0, 0, 0, ${alpha})`;
  }
  const safeAlpha = Math.max(0, Math.min(1, Number(alpha || 1)));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${safeAlpha})`;
};

const normalizeEffects = (effects) => {
  if (!effects) {
    return new Set();
  }

  if (Array.isArray(effects)) {
    return new Set(
      effects
        .map((item) => String(item).trim().toLowerCase())
        .filter(Boolean),
    );
  }

  return new Set(
    String(effects)
      .split(/[\s,|+]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
};

const getBaseTransform = ({preset, progress}) => {
  switch (preset) {
    case 'slide-up':
      return {
        translateX: 0,
        translateY: interpolate(progress, [0, 1], [100, 0], clampInterpolation),
        rotateDeg: 0,
        skewXDeg: 0,
        scale: interpolate(progress, [0, 1], [0.93, 1], clampInterpolation),
      };
    case 'slide-left':
      return {
        translateX: interpolate(progress, [0, 1], [-210, 0], clampInterpolation),
        translateY: 0,
        rotateDeg: interpolate(progress, [0, 1], [-2, 0], clampInterpolation),
        skewXDeg: 0,
        scale: interpolate(progress, [0, 1], [0.95, 1], clampInterpolation),
      };
    case 'whip-left':
      return {
        translateX: interpolate(progress, [0, 1], [-320, 0], clampInterpolation),
        translateY: interpolate(progress, [0, 1], [-18, 0], clampInterpolation),
        rotateDeg: interpolate(progress, [0, 1], [-15, 0], clampInterpolation),
        skewXDeg: interpolate(progress, [0, 1], [12, 0], clampInterpolation),
        scale: interpolate(progress, [0, 1], [0.9, 1], clampInterpolation),
      };
    case 'stamp':
      return {
        translateX: 0,
        translateY: interpolate(progress, [0, 1], [32, 0], clampInterpolation),
        rotateDeg: interpolate(progress, [0, 1], [-9, 0], clampInterpolation),
        skewXDeg: 0,
        scale: interpolate(progress, [0, 1], [1.24, 1], clampInterpolation),
      };
    case 'tilt-in':
      return {
        translateX: interpolate(progress, [0, 1], [130, 0], clampInterpolation),
        translateY: interpolate(progress, [0, 1], [-24, 0], clampInterpolation),
        rotateDeg: interpolate(progress, [0, 1], [9, 0], clampInterpolation),
        skewXDeg: interpolate(progress, [0, 1], [-9, 0], clampInterpolation),
        scale: interpolate(progress, [0, 1], [0.92, 1], clampInterpolation),
      };
    case 'spring-pop':
    default:
      return {
        translateX: 0,
        translateY: interpolate(progress, [0, 1], [40, 0], clampInterpolation),
        rotateDeg: 0,
        skewXDeg: 0,
        scale: interpolate(progress, [0, 1], [0.8, 1], clampInterpolation),
      };
  }
};

const getExitTransform = ({preset, progress}) => {
  if (preset === 'shrink') {
    return {
      scale: interpolate(progress, [0, 1], [1, 0.72], clampInterpolation),
      translateX: 0,
      translateY: 0,
      rotateDeg: 0,
      opacity: interpolate(progress, [0, 1], [1, 0], clampInterpolation),
    };
  }

  if (preset === 'slide-down') {
    return {
      scale: 1,
      translateX: 0,
      translateY: interpolate(progress, [0, 1], [0, 90], clampInterpolation),
      rotateDeg: interpolate(progress, [0, 1], [0, 4], clampInterpolation),
      opacity: interpolate(progress, [0, 1], [1, 0], clampInterpolation),
    };
  }

  if (preset === 'swipe-right') {
    return {
      scale: 1,
      translateX: interpolate(progress, [0, 1], [0, 180], clampInterpolation),
      translateY: 0,
      rotateDeg: interpolate(progress, [0, 1], [0, 8], clampInterpolation),
      opacity: interpolate(progress, [0, 1], [1, 0], clampInterpolation),
    };
  }

  return {
    scale: 1,
    translateX: 0,
    translateY: 0,
    rotateDeg: 0,
    opacity: interpolate(progress, [0, 1], [1, 0], clampInterpolation),
  };
};

export const getMotionStyle = ({frame, fps, durationInFrames, motion = {}}) => {
  const enterPreset = String(motion.enter || 'spring-pop').toLowerCase();
  const exitPreset = String(motion.exit || 'fade').toLowerCase();
  const effects = normalizeEffects(motion.effects || motion.emphasis);

  const enterFrames = Math.max(8, Math.floor(durationInFrames * toNumber(motion.enterWindow, 0.26)));
  const exitFrames = Math.max(8, Math.floor(durationInFrames * toNumber(motion.exitWindow, 0.22)));

  const springConfig = SPRING_PRESETS[enterPreset] || SPRING_PRESETS['spring-pop'];
  const springProgress = spring({
    frame: Math.max(0, Math.min(frame, enterFrames)),
    fps,
    config: springConfig,
    durationInFrames: enterFrames,
  });

  const easeProgress = interpolate(frame, [0, enterFrames], [0, 1], {
    ...clampInterpolation,
    easing: ENTRY_EASING[enterPreset] || Easing.out(Easing.cubic),
  });

  const entranceProgress = Math.min(1, springProgress * 0.7 + easeProgress * 0.3);
  const entry = getBaseTransform({preset: enterPreset, progress: entranceProgress});

  const oscillationTime = frame / Math.max(1, fps);
  const wiggleDeg = effects.has('wiggle') ? Math.sin(oscillationTime * 11) * toNumber(motion.wiggleDeg, 2.6) : 0;
  const floatPx = effects.has('float') ? Math.sin(oscillationTime * 4.2) * toNumber(motion.floatPx, 9) : 0;
  const shakePx = effects.has('shake') ? Math.sin(frame * 1.75) * toNumber(motion.shakePx, 2.5) : 0;
  const pulseScale = effects.has('pulse') ? 1 + Math.sin(oscillationTime * 7.8) * toNumber(motion.pulseAmp, 0.045) : 1;

  const exitStart = Math.max(0, durationInFrames - exitFrames);
  const exitProgress = interpolate(frame, [exitStart, durationInFrames], [0, 1], {
    ...clampInterpolation,
    easing: EXIT_EASING[exitPreset] || Easing.in(Easing.ease),
  });
  const exit = getExitTransform({preset: exitPreset, progress: exitProgress});

  const baseOpacity = interpolate(frame, [0, 6], [0, 1], clampInterpolation);
  const opacity = baseOpacity * exit.opacity;

  const scale = entry.scale * pulseScale * exit.scale;
  const translateX = entry.translateX + shakePx + exit.translateX;
  const translateY = entry.translateY + floatPx + exit.translateY;
  const rotateDeg = entry.rotateDeg + wiggleDeg + exit.rotateDeg;
  const skewXDeg = entry.skewXDeg;

  const filters = [];
  if (effects.has('glow')) {
    filters.push(`drop-shadow(0 0 18px rgba(46, 132, 255, 0.28))`);
  }
  if (effects.has('saturate')) {
    filters.push('saturate(1.22)');
  }
  const filter = filters.length ? filters.join(' ') : undefined;

  return {
    opacity: Number(opacity.toFixed(4)),
    transform: `translate(${translateX.toFixed(2)}px, ${translateY.toFixed(2)}px) rotate(${rotateDeg.toFixed(2)}deg) skewX(${skewXDeg.toFixed(2)}deg) scale(${scale.toFixed(4)})`,
    filter,
  };
};

export const resolveStylePack = (pack, fallback = 'clean', design = {}) => {
  const key = String(pack || fallback).toLowerCase();
  let palette;

  if (key === 'comic-blue') {
    palette = {
      primary: '#2f88ff',
      primaryDeep: '#1e55d6',
      secondary: '#f8fafc',
      ink: '#0f172a',
      accent: '#0ea5e9',
      accentSoft: '#93c5fd',
      glow: 'rgba(14,165,233,0.38)',
    };
  } else if (key === 'retro-red') {
    palette = {
      primary: '#ef4444',
      primaryDeep: '#be123c',
      secondary: '#fff7ed',
      ink: '#3f1d1d',
      accent: '#fb7185',
      accentSoft: '#fecdd3',
      glow: 'rgba(251,113,133,0.34)',
    };
  } else {
    palette = {
      primary: '#2f6bff',
      primaryDeep: '#1d3ab8',
      secondary: '#f8fafc',
      ink: '#0f172a',
      accent: '#22d3ee',
      accentSoft: '#bae6fd',
      glow: 'rgba(34,211,238,0.3)',
    };
  }

  const primaryOverride = normalizeHex(design?.primaryColor);
  const accentOverride = normalizeHex(design?.accentColor);
  const textOverride = normalizeHex(design?.textColor);

  const primary = primaryOverride || palette.primary;
  const accent = accentOverride || palette.accent;
  const secondary = textOverride || palette.secondary;

  return {
    ...palette,
    primary,
    primaryDeep: mixHex(primary, '#0f172a', 0.42),
    accent,
    accentSoft: mixHex(accent, '#ffffff', 0.56),
    secondary,
    glow: withAlpha(accent, 0.34),
  };
};

export const resolveTypographyPreset = (design = {}, fallback = 'display-bold') => {
  const key = String(design?.typography || fallback).toLowerCase();

  if (key === 'clean-sans') {
    return {
      key,
      family: '"Manrope", "Segoe UI", "Avenir Next", sans-serif',
      titleWeight: 770,
      bodyWeight: 560,
      capsWeight: 720,
      scale: 0.94,
      tracking: -0.2,
    };
  }

  if (key === 'editorial') {
    return {
      key,
      family: '"Georgia", "Times New Roman", serif',
      titleWeight: 690,
      bodyWeight: 500,
      capsWeight: 640,
      scale: 0.92,
      tracking: 0,
    };
  }

  if (key === 'impact') {
    return {
      key,
      family: '"Arial Black", "Impact", "Space Grotesk", sans-serif',
      titleWeight: 880,
      bodyWeight: 650,
      capsWeight: 780,
      scale: 1.02,
      tracking: -0.8,
    };
  }

  return {
    key: 'display-bold',
    family: '"Space Grotesk", "Manrope", "Avenir Next", sans-serif',
    titleWeight: 830,
    bodyWeight: 560,
    capsWeight: 760,
    scale: 1,
    tracking: -0.4,
  };
};

export const resolvePositionStyle = (design = {}, fallback = 'center') => {
  const key = String(design?.position || fallback).toLowerCase();
  if (key === 'top') {
    return {
      justifyContent: 'flex-start',
      paddingTop: 42,
    };
  }
  if (key === 'bottom') {
    return {
      justifyContent: 'flex-end',
      paddingBottom: 42,
    };
  }
  return {
    justifyContent: 'center',
  };
};

export const remotionToolkitReference = {
  enter: ['spring-pop', 'slide-up', 'slide-left', 'whip-left', 'stamp', 'tilt-in'],
  exit: ['fade', 'shrink', 'slide-down', 'swipe-right'],
  effects: ['wiggle', 'float', 'pulse', 'shake', 'glow', 'saturate'],
  typographyPresets: ['display-bold', 'clean-sans', 'editorial', 'impact'],
  energyLevels: ['calm', 'balanced', 'high'],
  positions: ['top', 'center', 'bottom'],
};

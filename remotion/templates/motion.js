import {interpolate, spring} from 'remotion';

export const getMotion = ({frame, fps, durationInFrames}) => {
  const entrance = spring({
    frame,
    fps,
    config: {
      damping: 200,
      stiffness: 200,
      mass: 0.6,
    },
  });

  const fadeIn = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fadeOutStart = Math.max(0, durationInFrames - 10);
  const fadeOut = interpolate(frame, [fadeOutStart, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return {
    scale: 0.9 + entrance * 0.1,
    opacity: Math.min(fadeIn, fadeOut),
  };
};

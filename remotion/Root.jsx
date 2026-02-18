import React from 'react';
import {Composition} from 'remotion';
import {SmartOverlayComposition} from './SmartOverlayComposition.jsx';
import {SceneGraphComposition} from './SceneGraphComposition.jsx';

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="SmartOverlay"
        component={SmartOverlayComposition}
        fps={30}
        width={1920}
        height={1080}
        durationInFrames={300}
        defaultProps={{
          videoUrl: '',
          events: [],
          width: 1920,
          height: 1080,
          fps: 30,
          durationInFrames: 300,
        }}
        calculateMetadata={({props}) => {
          return {
            fps: props.fps || 30,
            width: props.width || 1920,
            height: props.height || 1080,
            durationInFrames: props.durationInFrames || 300,
          };
        }}
      />

      <Composition
        id="SceneGraphOverlay"
        component={SceneGraphComposition}
        fps={30}
        width={1920}
        height={1080}
        durationInFrames={300}
        defaultProps={{
          videoUrl: '',
          scenes: [],
          fps: 30,
          durationInFrames: 300,
        }}
        calculateMetadata={({props}) => {
          return {
            fps: props.fps || 30,
            width: props.width || 1920,
            height: props.height || 1080,
            durationInFrames: props.durationInFrames || 300,
          };
        }}
      />
    </>
  );
};

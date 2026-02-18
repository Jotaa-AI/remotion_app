import React from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence} from 'remotion';
import {PrimitiveRenderer} from './primitives/PrimitiveRenderer.jsx';

export const SceneGraphComposition = ({videoUrl, scenes, fps}) => {
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {videoUrl ? <OffthreadVideo src={videoUrl} style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : null}

      {(scenes || []).map((scene) => {
        const startFrame = Math.max(0, Math.floor(scene.startSec * fps));
        const durationInFrames = Math.max(1, Math.floor(scene.durationSec * fps));

        return (
          <Sequence key={scene.id} from={startFrame} durationInFrames={durationInFrames}>
            <PrimitiveRenderer scene={scene} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

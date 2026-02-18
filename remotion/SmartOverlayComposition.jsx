import React from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence} from 'remotion';
import {CustomOverlayRenderer} from './templates/CustomOverlayRenderer.jsx';

export const SmartOverlayComposition = ({videoUrl, events, width, height, fps}) => {
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {videoUrl ? (
        <OffthreadVideo
          src={videoUrl}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : null}

      {(events || []).map((event) => {
        const startFrame = Math.max(0, Math.floor(event.startSec * fps));
        const durationInFrames = Math.max(1, Math.floor(event.durationSec * fps));

        return (
          <Sequence key={event.id} from={startFrame} durationInFrames={durationInFrames}>
            <CustomOverlayRenderer
              event={event}
              payload={event.payload || {}}
              durationInFrames={durationInFrames}
              width={width}
              height={height}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

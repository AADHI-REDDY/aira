import { useRef } from 'react';
import { useAudioVisualizer } from '../hooks/useAudioVisualizer.js';

export default function VoiceVisualizer({ active, stream }) {
  const canvasRef = useRef(null);
  useAudioVisualizer(active, canvasRef, stream);

  return (
    <div className={`visualizer ${active ? 'active' : ''}`}>
      <canvas ref={canvasRef} width="280" height="56" aria-hidden="true" />
      {!active ? <div className="visualizer-idle" /> : null}
    </div>
  );
}

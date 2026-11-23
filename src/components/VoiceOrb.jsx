import { useEffect, useRef } from 'react';

export default function VoiceOrb({ active, stream, compact = false, onClick }) {
  const wrapRef = useRef(null);
  const audioRef = useRef({ ctx: null, analyser: null, source: null, stream: null, raf: 0 });

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;
    let cancelled = false;
    let analyser = null;
    const data = new Uint8Array(32);
    let t = 0;

    const loop = () => {
      audioRef.current.raf = requestAnimationFrame(loop);
      t += 0.016;
      let intensity = 0.12 + Math.sin(t) * 0.04;
      if (analyser) {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i += 1) sum += data[i];
        intensity = Math.min(1, Math.max(intensity, (sum / data.length) / 140));
      }
      wrap.style.setProperty('--level', String(active ? intensity : 0.14 + Math.sin(t) * 0.03));
    };

    async function connectMic() {
      if (!active) return;
      try {
        const media = stream || await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          if (!stream) media.getTracks().forEach((track) => track.stop());
          return;
        }
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        const source = ctx.createMediaStreamSource(media);
        source.connect(analyser);
        audioRef.current = { ctx, analyser, source, stream: media, raf: audioRef.current.raf };
      } catch {
        // mic errors handled elsewhere
      }
    }

    loop();
    connectMic();

    return () => {
      cancelled = true;
      cancelAnimationFrame(audioRef.current.raf);
      audioRef.current.source?.disconnect();
      if (!stream) audioRef.current.stream?.getTracks().forEach((track) => track.stop());
      audioRef.current.ctx?.close?.();
      audioRef.current = { ctx: null, analyser: null, source: null, stream: null, raf: 0 };
    };
  }, [active, stream]);

  return (
    <button
      type="button"
      ref={wrapRef}
      className={`orb-wrap ${compact ? 'compact' : ''} ${active ? 'live' : ''}`}
      onClick={onClick}
      aria-label={active ? 'Stop listening' : 'Start with voice'}
      style={{ '--level': 0.14 }}
    >
      <span className="orb-halo" />
      <span className="orb-ring r1" />
      <span className="orb-ring r2" />
      <span className="orb-ring r3" />
      <span className="orb-sphere">
        <span className="orb-fill" />
        <span className="orb-spec" />
        <span className="orb-rim" />
      </span>
      <span className="orb-cursor" aria-hidden="true" />
    </button>
  );
}

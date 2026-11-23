import { useEffect, useRef } from 'react';

export function useAudioVisualizer(active, canvasRef, externalStream) {
  const audioRef = useRef({
    ctx: null,
    analyser: null,
    source: null,
    stream: null,
    raf: 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function start() {
      const canvas = canvasRef.current;
      if (!canvas || !active) return;

      try {
        const stream = externalStream
          || await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (cancelled) {
          if (!externalStream) stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        audioRef.current = { ctx, analyser, source, stream, raf: 0 };
        const data = new Uint8Array(analyser.frequencyBinCount);
        const drawCtx = canvas.getContext('2d');

        const draw = () => {
          audioRef.current.raf = requestAnimationFrame(draw);
          analyser.getByteFrequencyData(data);
          const { width, height } = canvas;
          drawCtx.clearRect(0, 0, width, height);
          const bars = 16;
          const gap = 4;
          const barWidth = (width - gap * (bars - 1)) / bars;
          for (let i = 0; i < bars; i += 1) {
            const value = data[i] / 255;
            const barHeight = Math.max(6, value * height);
            const x = i * (barWidth + gap);
            const y = (height - barHeight) / 2;
            drawCtx.fillStyle = `rgba(47, 184, 166, ${0.35 + value * 0.65})`;
            if (drawCtx.roundRect) {
              drawCtx.beginPath();
              drawCtx.roundRect(x, y, barWidth, barHeight, 4);
              drawCtx.fill();
            } else {
              drawCtx.fillRect(x, y, barWidth, barHeight);
            }
          }
        };
        draw();
      } catch {
        // Permission errors are handled by speech recognition.
      }
    }

    function stop() {
      const current = audioRef.current;
      if (current.raf) cancelAnimationFrame(current.raf);
      current.source?.disconnect();
      if (!externalStream) current.stream?.getTracks().forEach((track) => track.stop());
      current.ctx?.close?.();
      audioRef.current = { ctx: null, analyser: null, source: null, stream: null, raf: 0 };
      const canvas = canvasRef.current;
      if (canvas) {
        const drawCtx = canvas.getContext('2d');
        drawCtx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    if (active) start();
    else stop();

    return () => {
      cancelled = true;
      stop();
    };
  }, [active, canvasRef, externalStream]);
}

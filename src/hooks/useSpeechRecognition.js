import { useCallback, useEffect, useRef, useState } from 'react';
import { getSpeechRecognitionLang } from '../constants/languages.js';
import { ERROR_MESSAGES, mapSpeechError } from '../utils/errors.js';
import { cleanTranscript, pickRecorderMimeType, transcribeWithWhisper } from '../services/speech/whisperTranscribe.js';

function getRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function rmsFromTimeDomain(data) {
  let sum = 0;
  for (let i = 0; i < data.length; i += 1) {
    const v = (data[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / data.length);
}

const AUDIO_CONSTRAINTS = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
  },
  video: false,
};

export function useSpeechRecognition(languageId, apiKey) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState('');
  const [mediaStream, setMediaStream] = useState(null);
  const recognitionRef = useRef(null);
  const resultHandlerRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const bufferRef = useRef('');
  const silenceTimerRef = useRef(0);

  useEffect(() => {
    setSupported(Boolean(getRecognitionCtor()) || typeof MediaRecorder !== 'undefined');
  }, []);

  const startBrowserRecognition = useCallback((onResult) => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      setError(ERROR_MESSAGES.SPEECH_UNSUPPORTED);
      return;
    }

    resultHandlerRef.current = onResult;
    bufferRef.current = '';
    try {
      recognitionRef.current?.abort();
    } catch {
      // ignore
    }

    const recognition = new Ctor();
    recognition.lang = getSpeechRecognitionLang(languageId === 'en' ? 'en' : languageId);
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 3;

    const commit = () => {
      const text = cleanTranscript(bufferRef.current);
      bufferRef.current = '';
      if (text) {
        setInterimText('');
        resultHandlerRef.current?.(text);
      }
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    };

    const bumpSilence = () => {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = window.setTimeout(commit, 1600);
    };

    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const best = [...Array(result.length)].reduce((winner, _, index) => {
          const option = result[index];
          if (!winner || (option.confidence || 0) > (winner.confidence || 0)) return option;
          return winner;
        }, result[0]);
        const transcript = best?.transcript || '';
        if (result.isFinal) {
          bufferRef.current = `${bufferRef.current} ${transcript}`.trim();
          bumpSilence();
        } else {
          interim += transcript;
        }
      }
      setInterimText(cleanTranscript(`${bufferRef.current} ${interim}`));
    };
    recognition.onerror = (event) => {
      if (event.error === 'no-speech' && bufferRef.current) {
        commit();
        return;
      }
      setListening(false);
      setError(mapSpeechError(event.error));
    };
    recognition.onend = () => {
      window.clearTimeout(silenceTimerRef.current);
      const leftover = cleanTranscript(bufferRef.current);
      bufferRef.current = '';
      setListening(false);
      if (leftover) resultHandlerRef.current?.(leftover);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setError(ERROR_MESSAGES.GENERIC);
      setListening(false);
    }
  }, [languageId]);

  const startWhisperRecording = useCallback(async (onResult) => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError(ERROR_MESSAGES.SPEECH_UNSUPPORTED);
      return;
    }

    resultHandlerRef.current = onResult;
    setError('');
    setInterimText('Listening… speak clearly, then pause');

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
    } catch {
      setError(ERROR_MESSAGES.MIC_PERMISSION);
      return;
    }

    streamRef.current = stream;
    setMediaStream(stream);
    setListening(true);

    const mimeType = pickRecorderMimeType();
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 })
      : new MediaRecorder(stream);
    const chunks = [];
    recorderRef.current = recorder;

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    let heardSpeech = false;
    let silenceMs = 0;
    let last = performance.now();
    let startedAt = performance.now();
    let raf = 0;

    const cleanupAudio = () => {
      cancelAnimationFrame(raf);
      try {
        source.disconnect();
      } catch {
        // ignore
      }
      audioCtx.close().catch(() => {});
    };

    const watch = (now) => {
      analyser.getByteTimeDomainData(samples);
      const level = rmsFromTimeDomain(samples);
      const dt = now - last;
      last = now;
      if (level > 0.038) {
        heardSpeech = true;
        silenceMs = 0;
      } else if (heardSpeech) {
        silenceMs += dt;
        const heldLongEnough = now - startedAt > 900;
        if (heldLongEnough && silenceMs > 2000 && recorder.state === 'recording') {
          cleanupAudio();
          recorder.stop();
          return;
        }
      }
      raf = requestAnimationFrame(watch);
    };
    raf = requestAnimationFrame(watch);
    const maxTimer = setTimeout(() => {
      if (recorder.state === 'recording') {
        cleanupAudio();
        recorder.stop();
      }
    }, 20000);

    recorder.ondataavailable = (event) => {
      if (event.data?.size) chunks.push(event.data);
    };

    recorder.onstop = async () => {
      clearTimeout(maxTimer);
      cleanupAudio();
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setMediaStream(null);
      setListening(false);
      recorderRef.current = null;

      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      if (!blob.size || blob.size < 2500) {
        setInterimText('');
        setError(ERROR_MESSAGES.NO_SPEECH);
        return;
      }

      setInterimText('Transcribing…');
      try {
        const result = await transcribeWithWhisper(blob, apiKey, languageId);
        setInterimText('');
        if (!result.text) {
          setError(ERROR_MESSAGES.NO_SPEECH);
          return;
        }
        resultHandlerRef.current?.(result.text, result);
      } catch (err) {
        setInterimText('');
        setError(err.message || ERROR_MESSAGES.NO_SPEECH);
      }
    };

    recorder.start(250);
  }, [apiKey, languageId]);

  const stop = useCallback(() => {
    window.clearTimeout(silenceTimerRef.current);
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    try {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    } catch {
      // ignore
    }
    setListening(false);
  }, []);

  const start = useCallback((onResult) => {
    setError('');
    setInterimText('');
    if ((apiKey || '').trim()) {
      startWhisperRecording(onResult);
      return;
    }
    startBrowserRecognition(onResult);
  }, [apiKey, startWhisperRecording, startBrowserRecognition]);

  useEffect(() => () => {
    window.clearTimeout(silenceTimerRef.current);
    try {
      recognitionRef.current?.abort();
    } catch {
      // ignore
    }
    try {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    } catch {
      // ignore
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  return { supported, listening, interimText, error, setError, start, stop, mediaStream };
}

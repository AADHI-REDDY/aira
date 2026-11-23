import { useCallback, useEffect, useRef, useState } from 'react';
import { getLanguage, getTtsCode } from '../constants/languages.js';
import { ERROR_MESSAGES } from '../utils/errors.js';
import { openaiBase } from '../services/tools/endpoints.js';

function listVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}

function matchingVoice(voices, languageId, preferredURI) {
  if (preferredURI) {
    const preferred = voices.find((voice) => voice.voiceURI === preferredURI);
    if (preferred) return preferred;
  }
  const lang = getLanguage(languageId);
  const prefix = lang.ttsLangPrefix.toLowerCase();
  const bcp = lang.bcp47.toLowerCase();
  return (
    voices.find((voice) => voice.lang.toLowerCase() === bcp) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith(`${prefix}-`)) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix)) ||
    null
  );
}

function forSpeech(text) {
  return (text || '')
    .replace(/[*#_>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

function splitChunks(text, size = 140) {
  const parts = [];
  let rest = text;
  while (rest.length) {
    if (rest.length <= size) {
      parts.push(rest);
      break;
    }
    let cut = rest.lastIndexOf(' ', size);
    if (cut < 30) cut = size;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  return parts.filter(Boolean);
}

async function fetchOpenAiTtsBlob(text, openaiKey) {
  const response = await fetch(`${openaiBase()}/v1/audio/speech`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: 'alloy',
      speed: 1.15,
    }),
  });
  if (!response.ok) throw new Error(`OpenAI TTS ${response.status}`);
  const blob = await response.blob();
  if (!blob || blob.size < 200) throw new Error('Empty OpenAI TTS audio');
  return blob;
}

async function fetchTtsBlob(text, ttsCode) {
  const query = new URLSearchParams({
    ie: 'UTF-8',
    q: text,
    tl: ttsCode,
    total: '1',
    idx: '0',
    textlen: String(text.length),
  });

  const urls = [
    `/gtts/translate_tts?client=tw-ob&${query.toString()}`,
    `/gtts-api/translate_tts?client=gtx&${query.toString()}`,
  ];

  let lastError;
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        lastError = new Error(`TTS HTTP ${response.status}`);
        continue;
      }
      const blob = await response.blob();
      if (!blob || blob.size < 200) {
        lastError = new Error('Empty TTS audio');
        continue;
      }
      return blob;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('TTS unavailable');
}

export function useSpeechSynthesis(openaiKey = '') {
  const [voices, setVoices] = useState([]);
  const [speaking, setSpeaking] = useState(false);
  const [spokenChars, setSpokenChars] = useState(0);
  const [spokenFull, setSpokenFull] = useState('');
  const [error, setError] = useState('');
  const queueRef = useRef(0);
  const audioRef = useRef(null);
  const flowRef = useRef(0);

  useEffect(() => {
    if (!window.speechSynthesis) return undefined;
    const refresh = () => setVoices(listVoices());
    refresh();
    window.speechSynthesis.addEventListener('voiceschanged', refresh);
    const poll = window.setInterval(refresh, 400);
    window.setTimeout(() => window.clearInterval(poll), 2500);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', refresh);
      window.clearInterval(poll);
    };
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    queueRef.current += 1;
    flowRef.current += 1;
    stopAudio();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
    setSpokenChars(0);
  }, [stopAudio]);

  const startFlow = useCallback((fullText, durationMs, token) => {
    const flowId = flowRef.current + 1;
    flowRef.current = flowId;
    setSpokenFull(fullText);
    setSpokenChars(0);
    const start = performance.now();
    const tick = () => {
      if (queueRef.current !== token || flowRef.current !== flowId) return;
      const t = Math.min(1, (performance.now() - start) / Math.max(durationMs, 400));
      setSpokenChars(Math.floor(t * fullText.length));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  const playOnline = useCallback((text, languageId, token) => {
    const ttsCode = getTtsCode(languageId === 'auto' ? 'en' : languageId);
    const parts = splitChunks(text);
    let index = 0;
    setSpeaking(true);
    setSpokenFull(parts.join(' '));
    setSpokenChars(0);

    const playNext = async () => {
      if (queueRef.current !== token) return;
      if (index >= parts.length) {
        setSpeaking(false);
        return;
      }
      try {
        const key = (openaiKey || '').trim();
        let blob;
        if (key.startsWith('sk-')) {
          try {
            blob = await fetchOpenAiTtsBlob(parts[index], key);
          } catch {
            blob = await fetchTtsBlob(parts[index], ttsCode);
          }
        } else {
          blob = await fetchTtsBlob(parts[index], ttsCode);
        }
        index += 1;
        if (queueRef.current !== token) return;
        const objectUrl = URL.createObjectURL(blob);
        const audio = new Audio(objectUrl);
        audio.playbackRate = 1.35;
        audio.preservesPitch = true;
        audioRef.current = audio;
        const chunk = parts[index - 1] || '';
        const prior = parts.slice(0, index - 1).join(' ');
        const base = prior ? `${prior} `.length : 0;
        audio.ontimeupdate = () => {
          if (queueRef.current !== token || !audio.duration) return;
          const t = Math.min(1, audio.currentTime / audio.duration);
          setSpokenChars(base + Math.floor(t * chunk.length));
        };
        audio.onended = () => {
          URL.revokeObjectURL(objectUrl);
          playNext();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          if (queueRef.current !== token) return;
          setSpeaking(false);
          setError(ERROR_MESSAGES.TTS_FAILURE);
        };
        await audio.play();
      } catch {
        if (queueRef.current !== token) return;
        setSpeaking(false);
        setError(ERROR_MESSAGES.TTS_FAILURE);
      }
    };

    playNext();
  }, [openaiKey, startFlow]);

  const speak = useCallback((text, languageId, voiceURI) => {
    const spoken = forSpeech(text);
    setError('');
    if (!spoken) return;

    const token = queueRef.current + 1;
    queueRef.current = token;
    stopAudio();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
    setSpokenFull(spoken);
    setSpokenChars(0);

    const langId = languageId === 'auto' ? 'en' : languageId;
    const prefix = getLanguage(langId).ttsLangPrefix;
    const voice = matchingVoice(listVoices(), langId, voiceURI);

    window.setTimeout(() => {
      if (queueRef.current !== token) return;

      if (prefix !== 'en') {
        playOnline(spoken, langId, token);
        return;
      }

      if (!window.speechSynthesis) {
        playOnline(spoken, langId, token);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(spoken);
      utterance.lang = getLanguage(langId).bcp47;
      if (voice) utterance.voice = voice;
      utterance.rate = Number(window.__airaSpeechRate) || 1.25;
      utterance.volume = 1;
      utterance.onstart = () => {
        if (queueRef.current === token) {
          setSpeaking(true);
          startFlow(spoken, (spoken.length / 13) * 1000 / 1.25, token);
        }
      };
      utterance.onboundary = (event) => {
        if (queueRef.current !== token) return;
        const next = (event.charIndex || 0) + (event.charLength || 1);
        setSpokenChars(Math.min(spoken.length, next));
      };
      utterance.onend = () => {
        if (queueRef.current === token) {
          setSpokenChars(spoken.length);
          setSpeaking(false);
        }
      };
      utterance.onerror = (event) => {
        if (event.error === 'interrupted' || event.error === 'canceled') return;
        playOnline(spoken, langId, token);
      };

      window.speechSynthesis.speak(utterance);
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    }, 80);
  }, [playOnline, stopAudio, startFlow]);

  return { voices, speaking, spokenChars, spokenFull, error, speak, cancel };
}

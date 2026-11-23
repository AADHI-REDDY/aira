import { englishMarkerCount, latinRatio } from '../language/detectLanguage.js';

function groqBaseUrl() {
  return import.meta.env.DEV ? '/groq-api' : 'https://api.groq.com';
}

const WHISPER_TO_ID = {
  en: 'en',
  hi: 'hi',
  te: 'te',
  ta: 'ta',
};

const MODELS = ['whisper-large-v3', 'whisper-large-v3-turbo'];

function languageHint(languageId) {
  if (languageId === 'en') return 'en';
  if (languageId === 'hi') return 'hi';
  if (languageId === 'te') return 'te';
  if (languageId === 'ta') return 'ta';
  return '';
}

function whisperPrompt(languageId) {
  if (languageId === 'en') {
    return 'Accurate transcript of Indian English conversational speech.';
  }
  if (languageId === 'hi') {
    return 'हिन्दी में सही ट्रांसक्रिप्ट।';
  }
  if (languageId === 'te') {
    return 'తెలుగులో సరిగ్గా ట్రాన్స్క్రైబ్ చేయండి.';
  }
  if (languageId === 'ta') {
    return 'தமிழில் சரியான எழுத்துப்பெயர்ப்பு.';
  }
  return 'Accurate transcript. Speaker may mix English, Hindi, Telugu, Tamil, Hinglish, or Tanglish. Keep the original words.';
}

export function cleanTranscript(text) {
  return (text || '')
    .replace(/\s+/g, ' ')
    .replace(/^[,.\s]+|[,.\s]+$/g, '')
    .trim();
}

async function requestWhisper(blob, apiKey, extra = {}) {
  const extension = (blob.type || '').includes('mp4') ? 'mp4' : 'webm';
  const file = new File([blob], `speech.${extension}`, { type: blob.type || 'audio/webm' });
  const body = new FormData();
  body.append('file', file);
  body.append('model', extra.model || MODELS[0]);
  body.append('response_format', 'verbose_json');
  body.append('temperature', '0');
  body.append('prompt', extra.prompt || whisperPrompt(extra.languageId || 'auto'));
  if (extra.language) body.append('language', extra.language);

  const response = await fetch(`${groqBaseUrl()}/openai/v1/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body,
  });

  const raw = await response.text();
  if (!response.ok) {
    let message = `Whisper request failed (${response.status})`;
    try {
      message = JSON.parse(raw)?.error?.message || message;
    } catch {
      // keep status message
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const data = JSON.parse(raw);
  const fromSegments = Array.isArray(data.segments)
    ? data.segments.map((seg) => seg.text || '').join(' ')
    : '';
  const text = cleanTranscript(fromSegments || data.text || '');
  const whisperLang = (data.language || extra.language || '').slice(0, 2).toLowerCase();
  return {
    text,
    whisperLanguageId: WHISPER_TO_ID[whisperLang] || null,
    whisperLanguage: data.language || extra.language || '',
  };
}

/**
 * Groq Whisper transcribes speech. Language is only forced when the user picked one.
 */
export async function transcribeWithWhisper(blob, apiKey, languageId = 'auto') {
  const key = (apiKey || '').trim();
  if (!key) {
    throw new Error('A Groq API key is required for voice transcription.');
  }

  const forced = languageHint(languageId);
  let first;
  let lastError;

  for (const model of MODELS) {
    try {
      first = await requestWhisper(blob, apiKey, {
        model,
        language: forced,
        languageId,
      });
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!first) throw lastError || new Error('Speech was not detected. Please try again.');

  if (!first.text) {
    throw new Error('Speech was not detected. Please try again.');
  }

  if (forced) return first;

  const firstLatin = latinRatio(first.text);
  const firstEnglish = englishMarkerCount(first.text);
  const maybeWrongIndic = first.whisperLanguageId && first.whisperLanguageId !== 'en' && firstLatin >= 0.65;

  if (maybeWrongIndic || (first.whisperLanguageId !== 'en' && firstEnglish >= 2 && firstLatin >= 0.6)) {
    try {
      const englishPass = await requestWhisper(blob, apiKey, {
        model: MODELS[0],
        language: 'en',
        languageId: 'en',
      });
      if (
        englishPass.text
        && latinRatio(englishPass.text) >= 0.6
        && englishMarkerCount(englishPass.text) >= Math.max(1, firstEnglish)
      ) {
        return { ...englishPass, whisperLanguageId: 'en', whisperLanguage: 'en' };
      }
    } catch {
      // keep the first transcript
    }
  }

  return first;
}

export function pickRecorderMimeType() {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
  ];
  if (typeof MediaRecorder === 'undefined') return '';
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

import { getLanguageLabel } from '../../constants/languages.js';
import { shouldSkipTranslation } from '../language/detectLanguage.js';
import { ERROR_MESSAGES, mapAiError } from '../../utils/errors.js';
import { generateWithGemini } from './geminiProvider.js';
import { generateWithOpenAI } from './openaiProvider.js';
import { generateWithGroq } from './groqProvider.js';
import { updateMemoryFromTurn } from '../storage/memoryStore.js';
import { gatherLiveContext } from '../tools/gatherLiveContext.js';
import { resolveToolKeys } from '../tools/endpoints.js';
import { formatSessionBlock } from '../assistant/contextService.js';

function resolveApiKey(settings) {
  const pasted = (settings.apiKey || '').trim();
  if (pasted) return pasted;
  const provider = inferProvider(settings, '');
  if (provider === 'openai') return (import.meta.env.VITE_OPENAI_API_KEY || '').trim();
  if (provider === 'groq') return (import.meta.env.VITE_GROQ_API_KEY || '').trim();
  return (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
}

function inferProvider(settings, apiKey) {
  if ((settings.backendUrl || '').trim()) return settings.provider;
  if (apiKey.startsWith('gsk_')) return 'groq';
  if (apiKey.startsWith('AIza')) return 'gemini';
  if (apiKey.startsWith('sk-')) return 'openai';
  return settings.provider || 'groq';
}

async function callBackend(backendUrl, payload) {
  const response = await fetch(backendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Backend request failed (${response.status})`);
  }
  const data = await response.json();
  const text = data.text || data.reply || data.message;
  if (!text) throw new Error('Backend returned an empty response');
  return text;
}

/**
 * UI talks only to this module. Providers and a future backend stay behind this API.
 */
export async function generateReply({
  userText,
  resolvedUserText,
  history,
  detectedLanguageId,
  settings,
  runtime,
  session,
}) {
  const targetLanguage = settings.responseLanguage || 'en';
  const skipTranslation = shouldSkipTranslation(detectedLanguageId, targetLanguage);
  const apiKey = resolveApiKey(settings);
  const backendUrl = (settings.backendUrl || import.meta.env.VITE_AI_BACKEND_URL || '').trim();
  const provider = inferProvider({ ...settings, backendUrl }, apiKey);

  const ask = (resolvedUserText || userText || '').trim();
  const memory = updateMemoryFromTurn(userText, history || []);
  const clock = new Date().toLocaleString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
  const toolKeys = resolveToolKeys(settings);
  const toolContext = await gatherLiveContext({
    userText: ask,
    history: history || [],
    memory,
    settings,
  });
  const payload = {
    userText,
    resolvedUserText: ask,
    history: (history || []).map((msg) => ({ role: msg.role, text: msg.text })),
    targetLanguage,
    targetLanguageLabel: getLanguageLabel(targetLanguage === 'auto' ? detectedLanguageId : targetLanguage),
    inputLanguageLabel: getLanguageLabel(detectedLanguageId),
    sessionBlock: formatSessionBlock(session),
    skipTranslation,
    detectedLanguageId,
    provider,
    model: settings.model,
    memory,
    toolContext,
    clock,
    toolKeys,
    runtime,
  };

  if (!backendUrl && !apiKey) {
    return {
      text: 'Online assistant needs a Groq API key in Settings. Offline mode will come later.',
      warning: ERROR_MESSAGES.MISSING_API_KEY,
      usedFallback: false,
      source: 'online',
    };
  }

  try {
    let text;
    if (backendUrl) {
      text = await callBackend(backendUrl, payload);
    } else if (provider === 'openai') {
      text = await generateWithOpenAI({ ...payload, apiKey });
    } else if (provider === 'groq') {
      text = await generateWithGroq({ ...payload, apiKey });
    } else {
      text = await generateWithGemini({ ...payload, apiKey });
    }
    return { text, source: backendUrl ? 'backend' : provider, usedFallback: false };
  } catch (error) {
    return {
      text: `I could not finish this online request. ${mapAiError(error)}`,
      warning: mapAiError(error),
      usedFallback: false,
      source: 'online',
      error: error.message,
    };
  }
}

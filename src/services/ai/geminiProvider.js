import { buildSystemPrompt, sanitizeHistory } from './conversationContext.js';

const FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
];

function geminiBaseUrl() {
  return import.meta.env.DEV
    ? '/gemini-api'
    : 'https://generativelanguage.googleapis.com';
}

function buildContents(history, userText) {
  const turns = [];

  const push = (role, text) => {
    const cleaned = (text || '').trim();
    if (!cleaned) return;
    if (turns.length && turns[turns.length - 1].role === role) {
      turns[turns.length - 1].parts[0].text += `\n${cleaned}`;
      return;
    }
    turns.push({ role, parts: [{ text: cleaned }] });
  };

  (sanitizeHistory(history, userText) || []).forEach((msg) => {
    push(msg.role === 'assistant' ? 'model' : 'user', msg.text);
  });
  push('user', userText);

  if (turns[0]?.role === 'model') turns.shift();
  if (!turns.length) push('user', userText);
  return turns;
}

function parseGeminiError(status, body) {
  let message = `Gemini request failed (${status})`;
  try {
    const json = JSON.parse(body);
    message = json?.error?.message || message;
  } catch {
    if (body) message = `${message}: ${body.slice(0, 180)}`;
  }
  const error = new Error(message);
  error.status = status;
  error.details = message;
  if (/api key/i.test(message) || status === 403 || status === 401) {
    error.code = 'INVALID_KEY';
  } else if (status === 404 || /not found/i.test(message)) {
    error.code = 'MODEL';
  } else {
    error.code = 'GEMINI';
  }
  return error;
}

async function requestGemini(modelId, apiKey, body) {
  const url = `${geminiBaseUrl()}/v1beta/models/${modelId}:generateContent`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw parseGeminiError(response.status, raw);
  }

  const data = JSON.parse(raw);
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim();

  if (!text) {
    const block = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason;
    const error = new Error(block ? `Gemini returned no text (${block})` : 'Gemini returned an empty response');
    error.code = 'GEMINI';
    throw error;
  }
  return text;
}

export async function generateWithGemini({
  apiKey,
  model,
  userText,
  history,
  targetLanguageLabel,
  skipTranslation,
  memory,
  toolContext,
  clock,
  inputLanguageLabel,
  sessionBlock,
  resolvedUserText,
}) {
  const key = (apiKey || '').trim();
  if (!key) {
    const error = new Error('Missing Gemini API key');
    error.code = 'INVALID_KEY';
    throw error;
  }

  const body = {
    systemInstruction: { parts: [{ text: buildSystemPrompt({
      targetLanguageLabel,
      inputLanguageLabel,
      skipTranslation,
      memory,
      toolContext,
      clock,
      sessionBlock,
    }) }] },
    contents: buildContents(history, resolvedUserText || userText),
    generationConfig: { temperature: 0.5, maxOutputTokens: 700 },
  };

  const models = [];
  if (model) models.push(model.trim());
  FALLBACK_MODELS.forEach((id) => {
    if (!models.includes(id)) models.push(id);
  });

  let lastError;
  for (const modelId of models) {
    try {
      return await requestGemini(modelId, key, body);
    } catch (error) {
      lastError = error;
      if (error.code === 'INVALID_KEY') throw error;
      if (error.code !== 'MODEL' && error.status !== 404) throw error;
    }
  }
  throw lastError;
}

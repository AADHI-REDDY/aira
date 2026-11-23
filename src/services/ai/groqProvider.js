import { buildSystemPrompt, sanitizeHistory } from './conversationContext.js';
import { groqToolSchemas, parseToolArgs, executeTool } from '../assistant/toolRegistry.js';

const FALLBACK_MODELS = [
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'allam-2-7b',
];

const RETIRED_MODELS = new Set([
  'gemma2-9b-it',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'llama-3.1-70b-versatile',
]);

function groqBaseUrl() {
  return import.meta.env.DEV ? '/groq-api' : 'https://api.groq.com';
}

function parseError(status, body) {
  let message = `Groq request failed (${status})`;
  try {
    const json = JSON.parse(body);
    message = json?.error?.message || message;
  } catch {
    if (body) message = `${message}: ${body.slice(0, 180)}`;
  }
  const error = new Error(message);
  error.status = status;
  error.details = message;
  error.provider = 'groq';
  if (/api key|unauthorized|invalid/i.test(message) || status === 401 || status === 403) {
    error.code = 'INVALID_KEY';
  } else if (status === 404 || /model/i.test(message)) {
    error.code = 'MODEL';
  } else if (/tool/i.test(message)) {
    error.code = 'TOOLS';
  } else {
    error.code = 'GROQ';
  }
  return error;
}

async function requestGroq(model, apiKey, messages, useTools) {
  const response = await fetch(`${groqBaseUrl()}/openai/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 700,
      ...(useTools ? { tools: groqToolSchemas(), tool_choice: 'auto' } : {}),
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw parseError(response.status, raw);
  }
  const data = JSON.parse(raw);
  const message = data?.choices?.[0]?.message;
  if (!message) {
    const error = new Error('Groq returned an empty response');
    error.code = 'GROQ';
    throw error;
  }
  return message;
}

async function completeWithTools(modelId, key, messages, toolKeys, allowTools, runtime) {
  const thread = [...messages];
  for (let round = 0; round < 3; round += 1) {
    const message = await requestGroq(modelId, key, thread, allowTools);
    const calls = message.tool_calls || [];
    if (allowTools && calls.length) {
      thread.push({
        role: 'assistant',
        content: message.content || '',
        tool_calls: calls,
      });
      for (const call of calls) {
        const args = parseToolArgs(call.function?.arguments);
        const result = await executeTool(call.function?.name, args, { keys: toolKeys, runtime });
        thread.push({
          role: 'tool',
          tool_call_id: call.id,
          content: result,
        });
      }
      continue;
    }
    const text = (message.content || '').trim();
    if (text) return text;
    const error = new Error('Groq returned an empty response');
    error.code = 'GROQ';
    throw error;
  }
  const error = new Error('Groq tool loop did not finish');
  error.code = 'GROQ';
  throw error;
}

export async function generateWithGroq({
  apiKey,
  model,
  userText,
  history,
  targetLanguageLabel,
  skipTranslation,
  memory,
  toolContext,
  clock,
  toolKeys,
  runtime,
  inputLanguageLabel,
  sessionBlock,
  resolvedUserText,
}) {
  const key = (apiKey || '').trim();
  if (!key) {
    const error = new Error('Missing Groq API key');
    error.code = 'INVALID_KEY';
    throw error;
  }

  const prior = sanitizeHistory(history, userText);
  const ask = (resolvedUserText || userText || '').trim();
  const messages = [
    { role: 'system', content: buildSystemPrompt({
      targetLanguageLabel,
      inputLanguageLabel,
      skipTranslation,
      memory,
      toolContext,
      clock,
      sessionBlock,
    }) },
    ...prior.map((msg) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.text,
    })),
    { role: 'user', content: ask },
  ];

  const models = [];
  if (model && !RETIRED_MODELS.has(model.trim())) models.push(model.trim());
  FALLBACK_MODELS.forEach((id) => {
    if (!models.includes(id)) models.push(id);
  });

  const keys = toolKeys || {};
  let lastError;
  for (const modelId of models) {
    try {
      return await completeWithTools(modelId, key, messages, keys, true, runtime);
    } catch (error) {
      lastError = error;
      if (error.code === 'INVALID_KEY') throw error;
      if (error.code === 'TOOLS' || error.status === 400) {
        try {
          return await completeWithTools(modelId, key, messages, keys, false, runtime);
        } catch (retryError) {
          lastError = retryError;
          if (retryError.code === 'INVALID_KEY') throw retryError;
          if (retryError.code !== 'MODEL' && retryError.status !== 404) throw retryError;
        }
        continue;
      }
      if (error.code !== 'MODEL' && error.status !== 404) throw error;
    }
  }
  throw lastError;
}

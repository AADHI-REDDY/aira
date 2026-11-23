import { buildSystemPrompt, sanitizeHistory } from './conversationContext.js';

export async function generateWithOpenAI({
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

  const response = await fetch(`${import.meta.env.DEV ? '/openai-api' : 'https://api.openai.com'}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages,
      temperature: 0.5,
      max_tokens: 700,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(`OpenAI request failed (${response.status})`);
    error.status = response.status;
    error.details = body.slice(0, 300);
    throw error;
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('OpenAI returned an empty response');
  }
  return text;
}

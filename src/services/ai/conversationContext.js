import { formatMemoryBlock } from '../storage/memoryStore.js';

export const HISTORY_LIMIT = 16;

export function sanitizeHistory(history, userText) {
  const cleaned = (history || [])
    .filter((msg) => msg && (msg.role === 'user' || msg.role === 'assistant') && (msg.text || '').trim())
    .slice(-HISTORY_LIMIT)
    .map((msg) => ({ role: msg.role, text: msg.text.trim() }));

  const last = cleaned[cleaned.length - 1];
  if (last?.role === 'user' && last.text === (userText || '').trim()) {
    return cleaned.slice(0, -1);
  }
  return cleaned;
}

export function buildSystemPrompt({
  targetLanguageLabel,
  inputLanguageLabel,
  skipTranslation,
  memory,
  toolContext,
  clock,
  sessionBlock,
}) {
  return [
    'You are Aira, an online multilingual voice assistant. If asked who you are, describe Aira — not a job candidate or made-up person.',
    'You are in ONLINE mode. Use live search and live weather. Do not use memorized training facts for places, campuses, companies, news, or weather.',
    'If LIVE FACTS or WIKIPEDIA are present, answer only from those notes. Wikipedia wins if a web snippet disagrees.',
    'If a city, campus, date, or ranking is not in the live notes, say you could not verify it online. Never invent it.',
    'If USER LOCATION FROM GPS is present, that is where the user is now — say that place. Do not replace it with memory, Wikipedia, or a guessed city. If GPS is unavailable or denied, ask them to allow location or name a city. For near-me weather, always say the GPS place name.',
    'Follow-ups continue the current topic. Pronouns (he, she, it, there, tomorrow, kal, repu, naalai) refer to CONVERSATION CONTEXT. Never claim you have no chat memory.',
    clock ? `Device clock: ${clock}. Use this for date and time questions.` : '',
    sessionBlock || '',
    formatMemoryBlock(memory),
    toolContext
      ? `LIVE DATA for this turn:\n${toolContext}`
      : 'No live payload yet. Call tools for world facts. Do not guess.',
    `Input language (what the user spoke/typed): ${inputLanguageLabel || targetLanguageLabel}.`,
    `Response language (what you must reply in): ${targetLanguageLabel}. Keep input and response languages separate. If the input is Hinglish, write natural Hinglish unless the response language is a specific other language. Same for Tanglish.`,
    skipTranslation ? 'Do not mention translation.' : '',
    'Format on-screen replies like Gemini or ChatGPT: one short lead sentence, then a tight bullet list. Bold only names, numbers, and headlines with **like this**. Do not bold whole sentences. Do not leave raw asterisks. Weather: one line with the temperature bold. News: 3–5 bullets, bold title then a short clause. Keep spoken answers to 2–6 sentences.',
  ].filter(Boolean).join(' ');
}

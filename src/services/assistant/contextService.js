const KEY = 'mva.session.v1';

export const LANGUAGE_NAMES = [
  'english', 'hindi', 'telugu', 'tamil', 'hinglish', 'tanglish',
  'en', 'hi', 'te', 'ta',
];

const LANGUAGE_NAME_RE = new RegExp(`^(${LANGUAGE_NAMES.join('|')})$`, 'i');

export const LANGUAGE_SWITCH_RE = /^(?:please\s+)?(?:speak|reply|answer|talk|use|switch(?:\s+to)?)\s+(?:in\s+)?(english|hindi|telugu|tamil|hinglish|tanglish)\b/i;

export function isLanguageName(value) {
  return LANGUAGE_NAME_RE.test(String(value || '').trim());
}

export function isLanguageSwitch(text) {
  return LANGUAGE_SWITCH_RE.test(String(text || '').trim());
}

export function languageIdFromName(name) {
  const map = {
    english: 'en', hindi: 'hi', telugu: 'te', tamil: 'ta',
    hinglish: 'hinglish', tanglish: 'tanglish',
  };
  return map[String(name || '').toLowerCase()] || '';
}

export function emptySession() {
  return {
    topic: '',
    city: '',
    entity: '',
    lastQuery: '',
    lastIntent: '',
    lastTool: '',
    timerMs: 0,
    reminderNote: '',
    inputLanguageId: 'en',
    responseLanguageId: 'en',
    updatedAt: null,
  };
}

export function loadSession() {
  try {
    if (typeof sessionStorage === 'undefined') return emptySession();
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return emptySession();
    return { ...emptySession(), ...JSON.parse(raw) };
  } catch {
    return emptySession();
  }
}

export function saveSession(session) {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

export function resetSession() {
  const next = emptySession();
  saveSession(next);
  return next;
}

export function extractCity(text) {
  const raw = String(text || '').trim();
  if (!raw || isLanguageSwitch(raw)) return '';
  const live = raw.match(/live weather for\s+([^:]+):/i);
  if (live) {
    const city = live[1].split(',')[0].trim();
    return isLanguageName(city) ? '' : city;
  }
  const weatherScoped = raw.match(
    /\b(?:weather|rain|raining|forecast|temperature|mausam|vanilai)\b[\s\S]{0,48}?\b(?:in|at|near)\s+([A-Za-z][\p{L}\s.'-]{1,28})/iu,
  );
  const named = weatherScoped
    || (/\b(weather|rain|forecast)\b/i.test(raw)
      ? raw.match(/\b(?:in|at|near)\s+([A-Za-z][\p{L}\s.'-]{1,28})\??$/iu)
      : null);
  const city = named ? named[1].replace(/[?.!]+$/g, '').trim() : '';
  if (!city || /^(me|here|there|tomorrow|today)$/i.test(city) || isLanguageName(city)) return '';
  return city;
}

export function extractEntity(text) {
  const raw = String(text || '').trim();
  if (isLanguageSwitch(raw)) return '';
  const who = raw.match(/\bwho(?:'s| is)\s+(?:the\s+)?(.+?)\??$/i);
  if (who) return who[1].replace(/\s+/g, ' ').trim();
  const named = raw.match(/\b(?:he|she|they)\s+is\s+(?:the\s+)?(.+?)\.?$/i);
  if (named) return named[1].replace(/\s+/g, ' ').trim();
  return '';
}

export function updateSession(session, patch) {
  const next = {
    ...emptySession(),
    ...session,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  saveSession(next);
  return next;
}

export function formatSessionBlock(session) {
  if (!session?.topic && !session?.entity && !session?.city && !session?.responseLanguageId) return '';
  const bits = [
    session.lastIntent ? `Last intent: ${session.lastIntent}.` : '',
    session.topic ? `Active task: ${session.topic}.` : '',
    session.city ? `Active place: ${session.city}.` : '',
    session.entity ? `Active person/topic: ${session.entity}.` : '',
    session.inputLanguageId ? `Input language id: ${session.inputLanguageId}.` : '',
    session.responseLanguageId ? `Response language id: ${session.responseLanguageId}. Do not treat this as a city.` : '',
    session.lastQuery ? `Last user request: ${session.lastQuery}.` : '',
    session.timerMs ? `Last timer length ms: ${session.timerMs}.` : '',
  ].filter(Boolean);
  return `CONVERSATION CONTEXT (pronouns and follow-ups only; language names are not places): ${bits.join(' ')}`;
}

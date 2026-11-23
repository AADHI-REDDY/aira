import { extractCity, extractEntity, isLanguageSwitch, languageIdFromName } from './contextService.js';
import { asksCurrentLocation } from '../tools/weather.js';
import { parseDuration } from '../skills/assistantSkills.js';

const TOMORROW = /\b(tomorrow|kal\b|repu|reppu|naalai|naale|రేపు|कल|நாளை)\b/i;
const DEICTIC = /^(what about|how about|and (what about|tomorrow|there)|there\??|that (one|city|place)|same (there|for)|aur\b|inka\b|appud\b|akkada|वहाँ|అక్కడ|அங்கே)\b/i;
const TIMER_CHANGE = /^(make it|change it(?: to)?|set it to|instead)\b/i;
const PRONOUN = /\b(he|she|him|her|his|they|them|their|uska|unki|atanu|aame|avan|aval)\b/i;

export function splitTasks(text) {
  const raw = (text || '').trim();
  if (!raw) return [];
  const parts = raw
    .split(/\s+(?:and then|and also|, and then|, and)\s+|\s+and (?=(?:remind me|set a timer|remember|search|check (?:the )?weather|what(?:'s| is) the weather))/i)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : [raw];
}

export function classifyIntent(text, session = {}) {
  const t = (text || '').trim();
  if (!t) return { name: 'unknown', confidence: 0 };

  if (/^(stop|quiet|silence|pause|stop talking)\b/i.test(t)) return { name: 'stop', confidence: 0.99 };
  if (isLanguageSwitch(t)) {
    const match = t.match(/(english|hindi|telugu|tamil|hinglish|tanglish)\b/i);
    return {
      name: 'language',
      confidence: 0.99,
      languageId: languageIdFromName(match?.[1]),
    };
  }
  if (asksCurrentLocation(t)) {
    return { name: 'location', confidence: 0.95 };
  }
  if (/\b(timer|alarm)\b/i.test(t) || (session.topic === 'timer' && TIMER_CHANGE.test(t))) {
    return { name: 'timer', confidence: 0.9, ms: parseDuration(t) };
  }
  if (/\bremind me\b/i.test(t)) return { name: 'reminder', confidence: 0.9 };
  if (/\b(weather|rain|forecast|mausam|vanilai|వాతావరణం|मौसम|வானிலை)\b/i.test(t)
    || (session.topic === 'weather' && (TOMORROW.test(t) || DEICTIC.test(t)))) {
    return { name: 'weather', confidence: 0.88, city: extractCity(t) || session.city || '' };
  }
  if (/\b(news|headline)\b/i.test(t)) return { name: 'news', confidence: 0.85 };
  if (/\b(search|look up|wikipedia|who is|what happened)\b/i.test(t)
    || /\b(?:he|she|they)\s+is\s+/i.test(t)
    || (session.entity && PRONOUN.test(t) && !isLanguageSwitch(t))) {
    return { name: 'search', confidence: 0.8, entity: extractEntity(t) || session.entity || '' };
  }
  if (/\btranslate\b/i.test(t)) return { name: 'translate', confidence: 0.85 };
  if (/\b(what time|current time|^time\??$)\b/i.test(t)) return { name: 'time', confidence: 0.9 };
  if (/\b(calculate|what is \d|times|divided by)\b/i.test(t)) return { name: 'calc', confidence: 0.85 };
  if (/^remember /i.test(t)) return { name: 'memory', confidence: 0.85 };
  if (/\b(note|to-?do)\b/i.test(t)) return { name: 'note', confidence: 0.7 };
  return { name: 'chat', confidence: 0.4 };
}

export function isFollowUp(text, session = {}) {
  const t = (text || '').trim();
  if (!t || !session.topic) return false;
  if (isLanguageSwitch(t) || asksCurrentLocation(t)) return false;
  if (t.split(/\s+/).length > 14 && extractCity(t)) return false;
  if (session.topic === 'timer' && TIMER_CHANGE.test(t)) return true;
  if (session.topic === 'weather' && (TOMORROW.test(t) || DEICTIC.test(t) || extractCity(t))) {
    if (/\b(weather|rain|forecast)\b/i.test(t) && extractCity(t) && !TOMORROW.test(t) && t.length > 28) return false;
    return TOMORROW.test(t) || DEICTIC.test(t) || (extractCity(t) && t.split(/\s+/).length <= 8);
  }
  if (session.entity && PRONOUN.test(t) && t.split(/\s+/).length <= 12) return true;
  if (DEICTIC.test(t) || /^(what about|how about)\b/i.test(t)) return true;
  return false;
}

export function resolveFollowUp(text, session = {}) {
  const original = (text || '').trim();
  if (!original || !isFollowUp(original, session)) return original;

  const city = extractCity(original) || session.city || '';
  const place = city ? `in ${city}` : (session.topic === 'weather' ? 'near me' : '');

  if (session.topic === 'weather') {
    if (TOMORROW.test(original)) return `What is the weather tomorrow ${place}`.trim();
    if (city && !/\b(weather|rain)\b/i.test(original)) return `What is the weather ${place}?`;
    if (DEICTIC.test(original)) return `What is the weather ${place}?`.replace(/\s\?/, '?');
    return `What is the weather ${original.replace(/^(what about|how about)\s+/i, '')} ${place}`.replace(/\s+/g, ' ').trim();
  }

  if (session.topic === 'timer') {
    const ms = parseDuration(original);
    if (ms) return `Set a timer for ${Math.round(ms / 60000)} minutes`;
  }

  if (session.entity && PRONOUN.test(original)) {
    return `${original} (about ${session.entity})`;
  }

  if (session.lastQuery) {
    return `${original} — continue from: ${session.lastQuery}`;
  }
  return original;
}

export function sessionPatchFromTurn(userText, intent, skill) {
  const patch = { lastQuery: userText, lastIntent: intent?.name || skill?.type || '' };
  if (intent.name === 'language' || skill?.type === 'speech') {
    if (intent.languageId || skill?.languageId) {
      patch.responseLanguageId = intent.languageId || skill.languageId;
    }
    return patch;
  }
  if (intent.name === 'weather' || skill?.type === 'weather') {
    patch.topic = 'weather';
    patch.lastTool = 'get_weather';
    const city = extractCity(userText) || intent.city;
    if (city) patch.city = city;
  }
  if (intent.name === 'timer' || skill?.type === 'timer') {
    patch.topic = 'timer';
    patch.lastTool = 'set_timer';
    if (skill?.ms) patch.timerMs = skill.ms;
  }
  if (intent.name === 'reminder' || skill?.type === 'reminder') {
    patch.topic = 'reminder';
    patch.reminderNote = skill?.note || '';
  }
  if (intent.name === 'search' || intent.name === 'news') {
    patch.topic = intent.name;
    patch.lastTool = intent.name === 'news' ? 'get_news' : 'web_search';
    const entity = extractEntity(userText) || intent.entity;
    if (entity) patch.entity = entity;
  }
  if (intent.name === 'calc' || skill?.type === 'calc') patch.topic = 'calc';
  if (intent.name === 'translate') patch.topic = 'translate';
  return patch;
}

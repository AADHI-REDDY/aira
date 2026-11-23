import { LANGUAGE_SWITCH_RE, languageIdFromName } from '../assistant/contextService.js';

const SAFE_MATH = /^[\d\s+\-*/().%]+$/;

function toExpr(raw) {
  return String(raw || '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/\b(times|multiplied by|x)\b/gi, '*')
    .replace(/\bplus\b/gi, '+')
    .replace(/\bminus\b/gi, '-')
    .replace(/\b(divided by|over)\b/gi, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

function indiaNow() {
  return new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function parseDuration(text) {
  const t = text.toLowerCase();
  let ms = 0;
  const hours = t.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?)/);
  const mins = t.match(/(\d+(?:\.\d+)?)\s*(minutes?|mins?|min)/);
  const secs = t.match(/(\d+(?:\.\d+)?)\s*(seconds?|secs?|sec)/);
  if (hours) ms += Number(hours[1]) * 3600000;
  if (mins) ms += Number(mins[1]) * 60000;
  if (secs) ms += Number(secs[1]) * 1000;
  if (!ms) {
    const bare = t.match(/\b(\d+)\b/);
    if (bare && /timer|remind|alarm|make it|change it|set it/i.test(t)) ms = Number(bare[1]) * 60000;
  }
  return ms;
}

export const SKILL_CHIPS = [
  { id: 'weather', label: 'Weather', prompt: 'What’s the weather near me?' },
  { id: 'timer', label: 'Timer', prompt: 'Set a timer for 1 minute' },
  { id: 'remind', label: 'Remind', prompt: 'Remind me to stretch in 10 minutes' },
  { id: 'search', label: 'Search', prompt: 'Search the latest news in India' },
  { id: 'translate', label: 'Translate', prompt: 'Translate good morning to Hindi' },
  { id: 'calc', label: 'Calculate', prompt: 'What is 48 times 25?' },
  { id: 'time', label: 'Time', prompt: 'What time is it?' },
  { id: 'remember', label: 'Remember', prompt: 'Remember that I prefer short answers' },
  { id: 'stop', label: 'Stop talking', prompt: 'Stop talking' },
];

export function matchSkill(text, context = {}) {
  const t = (text || '').trim();
  if (!t) return null;

  if (context.topic === 'timer' && /^(make it|change it(?: to)?|set it to|instead)\b/i.test(t)) {
    const ms = parseDuration(t);
    if (!ms || ms < 1000) return { type: 'ask', reply: 'For how long should I set the timer?' };
    return { type: 'timer', ms, reply: `Timer updated to ${describe(ms)}.` };
  }

  if (/^(stop|quiet|silence|cancel speech|stop talking|pause)\b/i.test(t)) {
    return { type: 'stop', reply: 'Okay, I’ll stop talking.' };
  }

  if (/^(don'?t speak|do not speak|mute replies)\b/i.test(t)) {
    return { type: 'speech', action: 'mute', reply: 'I will stay quiet unless you ask me to speak.' };
  }
  if (/^(start speaking|speak replies|unmute)\b/i.test(t)) {
    return { type: 'speech', action: 'unmute', reply: 'I will speak my replies again.' };
  }
  if (/^speak slower\b/i.test(t)) {
    return { type: 'speech', action: 'slower', reply: 'I will speak a little slower.' };
  }
  if (/^speak faster\b/i.test(t)) {
    return { type: 'speech', action: 'faster', reply: 'I will speak a little faster.' };
  }
  if (/^repeat( that)?\b/i.test(t)) {
    return { type: 'speech', action: 'repeat', reply: 'Repeating the last answer.' };
  }
  const switchLang = t.match(LANGUAGE_SWITCH_RE);
  if (switchLang) {
    const languageId = languageIdFromName(switchLang[1]);
    return { type: 'speech', action: 'language', languageId, reply: `I will reply in ${switchLang[1]}.` };
  }

  if (/\b(what(?:'s| is) the time|what time is it|current time|tell me the time)\b/i.test(t)
    || /^(time|date|today(?:'s date)?)\??$/i.test(t)) {
    return { type: 'time', reply: `It’s ${indiaNow()} in India.` };
  }

  if (/^remember (that )?/i.test(t)) {
    const note = t.replace(/^remember (that )?/i, '').trim() || 'that';
    return { type: 'remember', reply: `I’ll remember ${note}.` };
  }

  if (/\b(set |start )?(a )?timer\b|\balarm\b/i.test(t)) {
    const ms = parseDuration(t);
    if (!ms || ms < 1000) return { type: 'ask', reply: 'For how long should I set the timer?' };
    return { type: 'timer', ms, reply: `Timer set for ${describe(ms)}.` };
  }

  if (/\bremind me\b/i.test(t)) {
    const ms = parseDuration(t);
    const note = t.replace(/^remind me (to |that )?/i, '').replace(/\s+(in|after|for)\s+.+$/i, '').trim() || 'your reminder';
    if (!ms || ms < 1000) return { type: 'ask', reply: 'When should I remind you?' };
    return { type: 'reminder', ms, note, reply: `I’ll remind you to ${note} in ${describe(ms)}.` };
  }

  if (/\b(translate|in hindi|in telugu|in tamil)\b/i.test(t)) {
    return null;
  }

  const calc = t.match(/(?:what is|calculate|compute|equals?)\s+(.+?)\??$/i)
    || (/^[\d(][\d\s+\-*/().%x×÷a-z]+$/i.test(t) ? [t, t] : null);
  if (calc) {
    const expr = toExpr(calc[1]);
    if (SAFE_MATH.test(expr) && /\d/.test(expr)) {
      try {
        const value = Function(`"use strict"; return (${expr})`)();
        if (typeof value === 'number' && Number.isFinite(value)) {
          return { type: 'calc', reply: `${expr.replace(/\*/g, ' × ').replace(/\//g, ' ÷ ')} = ${value}` };
        }
      } catch {
        // let the online assistant handle it
      }
    }
  }

  return null;
}

function describe(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} second${s === 1 ? '' : 's'}`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'}`;
  const h = Math.round(m / 60);
  return `${h} hour${h === 1 ? '' : 's'}`;
}

export function formatRemain(ms) {
  const remain = Math.max(0, ms);
  const s = Math.ceil(remain / 1000);
  const mm = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

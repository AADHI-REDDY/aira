import { SKILL_CHIPS } from './assistantSkills.js';

const STARTERS = SKILL_CHIPS.filter((chip) => chip.id !== 'stop');

function clip(label, max = 34) {
  const text = String(label || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function cityFrom(text) {
  const live = String(text || '').match(/live weather for\s+([^:]+):/i);
  if (live) return live[1].split(',')[0].trim();
  const match = String(text || '').match(/\bin\s+([A-Za-z][\p{L}\s.'-]{1,28})\??$/iu);
  const name = match ? match[1].replace(/[?.!]+$/, '').trim() : '';
  if (/^(me|here|there|vijayawada)$/i.test(name)) return '';
  return name;
}

function titlesFrom(text) {
  const bold = [...String(text || '').matchAll(/\*\*([^*]{3,52})\*\*/g)].map((m) => m[1].trim());
  if (bold.length) return bold;
  const bullets = String(text || '')
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter((line) => line.length > 8 && line.length < 80);
  return bullets
    .map((line) => line.split(/\s+[–—-]\s+/)[0].replace(/\*\*/g, '').trim())
    .filter(Boolean);
}

export function suggestChips(messages = [], activeSkills = []) {
  const lastUser = [...messages].reverse().find((msg) => msg.role === 'user');
  const lastAi = [...messages].reverse().find((msg) => msg.role === 'assistant');
  if (!lastUser && !lastAi) {
    return STARTERS.map((chip) => ({ ...chip, kind: 'starter' }));
  }

  const user = lastUser?.text || '';
  const ai = lastAi?.text || '';
  const blob = `${user}\n${ai}`.toLowerCase();
  const chips = [];

  const add = (id, label, prompt = label) => {
    if (chips.length >= 7) return;
    const next = { id, label: clip(label), prompt, kind: 'follow' };
    if (chips.some((chip) => chip.prompt.toLowerCase() === next.prompt.toLowerCase())) return;
    chips.push(next);
  };

  titlesFrom(ai).slice(0, 3).forEach((title, index) => {
    add(`topic-${index}`, `More on ${title}`, `Tell me more about ${title}`);
  });

  if (/weather|°c|humidity|forecast|overcast|raining|temperature/i.test(blob)) {
    const city = cityFrom(ai) || cityFrom(user);
    if (city) {
      add('rain', `Rain tomorrow in ${city}?`, `Will it rain tomorrow in ${city}?`);
      add('hourly', `Hourly in ${city}`, `What is the hourly weather today in ${city}?`);
    } else {
      add('rain', 'Will it rain near me tomorrow?', 'Will it rain near me tomorrow?');
      add('hourly', 'Hourly weather near me', 'What is the hourly weather near me?');
    }
  }

  if (/news|headline|stories circulating|latest/i.test(blob)) {
    add('sports', 'Sports news in India', 'Search the latest sports news in India');
    add('world', 'World headlines', 'Search the latest world news');
  }

  if (/timer|remind|I’ll remind|timer set/i.test(blob) || activeSkills.length) {
    add('timer5', '5 minute timer', 'Set a timer for 5 minutes');
    add('remind-water', 'Remind me to drink water', 'Remind me to drink water in 20 minutes');
  }

  if (/=|\btimes\b|calculate|×|÷/i.test(blob)) {
    add('pct', '18% of 2500', 'What is 18% of 2500?');
    add('split', 'Divide 1440 by 12', 'What is 1440 divided by 12?');
  }

  if (/translat|hindi|telugu|tamil|good morning/i.test(blob)) {
    add('te', 'Say that in Telugu', 'Translate that last message to Telugu');
    add('hi', 'Say that in Hindi', 'Translate that last message to Hindi');
  }

  if (/time is it|in india\./i.test(blob)) {
    add('date', 'What’s today’s date?', 'What is today’s date?');
    add('ny', 'Time in New York', 'What time is it in New York?');
  }

  add('simpler', 'Explain more simply', 'Explain that more simply in two sentences');
  add('one-line', 'One-line summary', 'Summarize that in one sentence');

  STARTERS.forEach((chip) => {
    if (chips.length >= 7) return;
    add(chip.id, chip.label, chip.prompt);
  });

  return chips.slice(0, 7);
}

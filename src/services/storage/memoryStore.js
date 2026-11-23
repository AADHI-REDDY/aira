const KEY = 'mva.memory.v1';

const EMPTY = {
  name: '',
  location: '',
  notes: [],
  updatedAt: null,
};

export function loadMemory() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw);
    return { ...EMPTY, ...parsed, notes: Array.isArray(parsed.notes) ? parsed.notes.slice(-8) : [] };
  } catch {
    return { ...EMPTY };
  }
}

export function saveMemory(memory) {
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    // ignore
  }
}

export function clearMemory() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

const NOT_A_PLACE = /\b(what|when|where|why|who|how|is|are|the|today|tomorrow|yesterday|date|time|weather|rain|please|help|turn|on|off|issue|say|will|chat)\b/i;

function looksLikePlace(text) {
  const t = (text || '').trim();
  if (!t || t.length > 40) return false;
  if (/[?!.]/.test(t)) return false;
  if (/\d/.test(t)) return false;
  const words = t.split(/\s+/);
  if (words.length > 3) return false;
  if (NOT_A_PLACE.test(t)) return false;
  return /^[\p{L}\s.'-]+$/u.test(t);
}

export function updateMemoryFromTurn(userText, history = []) {
  const memory = loadMemory();
  const text = (userText || '').trim();
  const blob = `${(history || []).slice(-6).map((msg) => msg.text).join(' ')} ${text}`;

  const nameMatch = text.match(/\b(?:my name is|i am|i'm)\s+([A-Za-z][A-Za-z\s]{1,30})/i);
  if (nameMatch) memory.name = nameMatch[1].replace(/\b(from|in|and)\b.*$/i, '').trim();

  const liveMatch = text.match(/\b(?:i live in|i'm in|i am in|from)\s+([A-Za-z][\p{L}\s.'-]{1,40})/iu);
  if (liveMatch) memory.location = liveMatch[1].trim();

  const forPlace = text.match(/\b(?:in|at|near)\s+([A-Za-z][\p{L}\s.'-]{1,40})$/iu);
  if (forPlace && looksLikePlace(forPlace[1]) && /\b(weather|rain|raining|temperature|forecast|climate|mausam)\b/i.test(blob)) {
    memory.location = forPlace[1].trim();
  }

  if (
    looksLikePlace(text)
    && /\b(weather|rain|raining|temperature|forecast|city|zip|vijayawada|climate|mausam)\b/i.test(blob)
  ) {
    memory.location = text.replace(/\b(weather|in|for|at)\b/gi, ' ').replace(/\s+/g, ' ').trim() || text;
  }

  if (text.length > 12 && text.length < 80 && /\b(i like|i prefer|remember)\b/i.test(text)) {
    memory.notes = [...memory.notes.filter((note) => note !== text), text].slice(-8);
  }

  memory.updatedAt = new Date().toISOString();
  saveMemory(memory);
  return memory;
}

export function formatMemoryBlock(memory) {
  if (!memory) return '';
  const lines = [];
  if (memory.name) lines.push(`User's name: ${memory.name}.`);
  if (memory.location) lines.push(`User's place / last location: ${memory.location}.`);
  if (memory.notes?.length) lines.push(`Other notes: ${memory.notes.join('; ')}.`);
  if (!lines.length) return 'No long-term facts saved yet.';
  return `Long-term memory (keep using unless the user changes it): ${lines.join(' ')}`;
}

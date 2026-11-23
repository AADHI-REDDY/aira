const KEY = 'mva.notes.v1';

export function loadNotes() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(-40) : [];
  } catch {
    return [];
  }
}

export function saveNotes(notes) {
  try {
    localStorage.setItem(KEY, JSON.stringify(notes.slice(-40)));
  } catch {
    // ignore
  }
}

export function addNote(text) {
  const note = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text: String(text || '').trim(),
    createdAt: new Date().toISOString(),
  };
  if (!note.text) return null;
  const next = [...loadNotes(), note];
  saveNotes(next);
  return note;
}

export function clearNotes() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

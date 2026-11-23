const KEY = 'mva.conversation.v1';

export function loadConversation() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveConversation(messages) {
  try {
    localStorage.setItem(KEY, JSON.stringify(messages.slice(-80)));
  } catch {
    // Quota or private mode — conversation still works in memory.
  }
}

export function clearConversation() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

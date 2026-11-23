function redact(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/gsk_[A-Za-z0-9]+/g, 'gsk_***')
    .replace(/sk-[A-Za-z0-9]+/g, 'sk-***')
    .replace(/AIza[A-Za-z0-9_\-]+/g, 'AIza***');
}

export function assistantLog(event, detail = {}) {
  if (!import.meta.env.DEV && import.meta.env.VITE_DEBUG_ASSISTANT !== '1') return;
  const safe = {};
  Object.entries(detail).forEach(([key, value]) => {
    if (/key|secret|password|token/i.test(key)) return;
    safe[key] = typeof value === 'string' ? redact(value).slice(0, 240) : value;
  });
  console.debug(`[aira:${event}]`, safe);
}

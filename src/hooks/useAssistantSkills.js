import { useCallback, useEffect, useRef, useState } from 'react';
import { formatRemain } from '../services/skills/assistantSkills.js';

function ping(title, body) {
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  } catch {
    // ignore
  }
}

export function useAssistantSkills({ onAlarm } = {}) {
  const [timers, setTimers] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [, setTick] = useState(0);
  const onAlarmRef = useRef(onAlarm);
  onAlarmRef.current = onAlarm;

  useEffect(() => {
    const seen = new Set();
    const id = window.setInterval(() => {
      const now = Date.now();
      setTimers((list) => {
        const due = list.filter((item) => item.endsAt <= now);
        due.forEach((item) => {
          if (seen.has(item.id)) return;
          seen.add(item.id);
          ping('Aira timer', item.label || 'Time’s up.');
          onAlarmRef.current?.({ kind: 'timer', text: 'Time’s up. Your timer finished.' });
        });
        return list.filter((item) => item.endsAt > now);
      });
      setReminders((list) => {
        const due = list.filter((item) => item.at <= now);
        due.forEach((item) => {
          if (seen.has(item.id)) return;
          seen.add(item.id);
          ping('Aira reminder', item.note);
          onAlarmRef.current?.({ kind: 'reminder', text: `Reminder: ${item.note}` });
        });
        return list.filter((item) => item.at > now);
      });
      setTick((n) => n + 1);
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  const startTimer = useCallback((ms, label = 'Timer') => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    const item = { id: `${Date.now()}-${Math.random()}`, endsAt: Date.now() + ms, label };
    setTimers((list) => [...list, item]);
    return item;
  }, []);

  const addReminder = useCallback((ms, note) => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    const item = { id: `${Date.now()}-${Math.random()}`, at: Date.now() + ms, note };
    setReminders((list) => [...list, item]);
    return item;
  }, []);

  const active = [
    ...timers.map((item) => ({
      id: item.id,
      kind: 'Timer',
      text: `${item.label} ${formatRemain(item.endsAt - Date.now())}`,
    })),
    ...reminders.map((item) => ({
      id: item.id,
      kind: 'Reminder',
      text: `${item.note} · ${formatRemain(item.at - Date.now())}`,
    })),
  ];

  return { startTimer, addReminder, active };
}

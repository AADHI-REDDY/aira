import { fetchWeather, requestDeviceCoords } from '../tools/weather.js';
import { fetchSearch } from '../tools/webSearch.js';
import { addNote, loadNotes } from '../storage/notesStore.js';
import { loadMemory, saveMemory } from '../storage/memoryStore.js';
import { assistantLog } from './assistantLogger.js';

function fn(name, description, properties, required = []) {
  return {
    type: 'function',
    function: {
      name,
      description,
      parameters: {
        type: 'object',
        properties,
        ...(required.length ? { required } : {}),
      },
    },
  };
}

function describeMs(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} second${s === 1 ? '' : 's'}`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'}`;
  return `${Math.round(m / 60)} hour${Math.round(m / 60) === 1 ? '' : 's'}`;
}

export const TOOLS = [
  {
    name: 'get_weather',
    availability: 'online',
    schema: fn('get_weather', 'Live weather. Omit city to use device GPS. Never invent a city.', {
      city: { type: 'string', description: 'City the user named' },
      lat: { type: 'number' },
      lon: { type: 'number' },
    }),
    async execute(args, ctx) {
      let { lat, lon } = args;
      if ((lat == null || lon == null) && !args.city) {
        const device = await requestDeviceCoords();
        if (device.ok) {
          lat = device.lat;
          lon = device.lon;
        }
      }
      const weather = await fetchWeather({
        place: args.city || '',
        lat,
        lon,
        apiKey: ctx.keys?.weather,
      });
      return weather.summary || JSON.stringify(weather);
    },
  },
  {
    name: 'web_search',
    availability: 'online',
    schema: fn('web_search', 'Search Wikipedia and the live web for current facts, people, places, and news.', {
      query: { type: 'string', description: 'Search query' },
    }, ['query']),
    async execute(args, ctx) {
      const search = await fetchSearch({
        query: args.query || '',
        tavilyKey: ctx.keys?.tavily,
        googleCseKey: ctx.keys?.googleCseKey,
        googleCseId: ctx.keys?.googleCseId,
      });
      return search.notes || JSON.stringify(search);
    },
  },
  {
    name: 'get_news',
    availability: 'online',
    schema: fn('get_news', 'Latest news. Always search live sources; do not use training memory.', {
      topic: { type: 'string', description: 'News topic, country, or category' },
    }, ['topic']),
    async execute(args, ctx) {
      const query = `latest news ${args.topic || ''}`.trim();
      const search = await fetchSearch({
        query,
        tavilyKey: ctx.keys?.tavily,
        googleCseKey: ctx.keys?.googleCseKey,
        googleCseId: ctx.keys?.googleCseId,
      });
      return search.notes || JSON.stringify(search);
    },
  },
  {
    name: 'get_time',
    availability: 'local',
    schema: fn('get_time', 'Current date and time on the user device (India timezone).', {}),
    async execute() {
      const now = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `Device clock: ${now} (India).`;
    },
  },
  {
    name: 'calculate',
    availability: 'local',
    schema: fn('calculate', 'Evaluate a simple numeric expression using + - * / % and parentheses.', {
      expression: { type: 'string' },
    }, ['expression']),
    async execute(args) {
      const expr = String(args.expression || '')
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/\b(times|multiplied by|x)\b/gi, '*')
        .replace(/\bplus\b/gi, '+')
        .replace(/\bminus\b/gi, '-')
        .replace(/\b(divided by|over)\b/gi, '/')
        .trim();
      if (!/^[\d\s+\-*/().%]+$/.test(expr) || !/\d/.test(expr)) {
        return JSON.stringify({ ok: false, reason: 'Only numbers and + − × ÷ are allowed.' });
      }
      try {
        const value = Function(`"use strict"; return (${expr})`)();
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          return JSON.stringify({ ok: false, reason: 'That calculation did not work.' });
        }
        return `${expr} = ${value}`;
      } catch {
        return JSON.stringify({ ok: false, reason: 'That calculation did not work.' });
      }
    },
  },
  {
    name: 'set_timer',
    availability: 'local',
    schema: fn('set_timer', 'Start a countdown timer in the browser. Duration in milliseconds.', {
      milliseconds: { type: 'number' },
      label: { type: 'string' },
    }, ['milliseconds']),
    async execute(args, ctx) {
      const ms = Number(args.milliseconds);
      if (!Number.isFinite(ms) || ms < 1000) {
        return JSON.stringify({ ok: false, reason: 'Ask how long the timer should run.' });
      }
      ctx.runtime?.startTimer?.(ms, args.label || 'Timer');
      return `Timer set for ${describeMs(ms)}.`;
    },
  },
  {
    name: 'set_reminder',
    availability: 'local',
    schema: fn('set_reminder', 'Browser reminder after a delay. Not guaranteed if the tab is closed.', {
      milliseconds: { type: 'number' },
      note: { type: 'string' },
    }, ['milliseconds']),
    async execute(args, ctx) {
      const ms = Number(args.milliseconds);
      const note = String(args.note || 'your reminder').trim();
      if (!Number.isFinite(ms) || ms < 1000) {
        return JSON.stringify({ ok: false, reason: 'Ask when to remind the user.' });
      }
      ctx.runtime?.addReminder?.(ms, note);
      return `Reminder set: ${note} in ${describeMs(ms)}. Browser notifications only work while this tab can run.`;
    },
  },
  {
    name: 'remember_fact',
    availability: 'local',
    schema: fn('remember_fact', 'Store a user preference or fact in local memory.', {
      fact: { type: 'string' },
    }, ['fact']),
    async execute(args) {
      const fact = String(args.fact || '').trim();
      if (!fact) return JSON.stringify({ ok: false, reason: 'Nothing to remember.' });
      const memory = loadMemory();
      memory.notes = [...(memory.notes || []).filter((item) => item !== fact), fact].slice(-8);
      memory.updatedAt = new Date().toISOString();
      saveMemory(memory);
      return `Remembered: ${fact}`;
    },
  },
  {
    name: 'add_note',
    availability: 'local',
    schema: fn('add_note', 'Save a short local note on this device.', {
      text: { type: 'string' },
    }, ['text']),
    async execute(args) {
      const note = addNote(args.text);
      if (!note) return JSON.stringify({ ok: false, reason: 'Empty note.' });
      return `Note saved: ${note.text}`;
    },
  },
  {
    name: 'list_notes',
    availability: 'local',
    schema: fn('list_notes', 'List notes saved on this device.', {}),
    async execute() {
      const notes = loadNotes();
      if (!notes.length) return 'No notes saved yet.';
      return notes.map((note, index) => `${index + 1}. ${note.text}`).join('\n');
    },
  },
];

export function groqToolSchemas() {
  return TOOLS.map((tool) => tool.schema);
}

export async function executeTool(name, args = {}, ctx = {}) {
  const tool = TOOLS.find((item) => item.name === name);
  if (!tool) return `Unknown tool: ${name}`;
  assistantLog('tool', { name, availability: tool.availability });
  try {
    return await tool.execute(args || {}, ctx);
  } catch (error) {
    assistantLog('tool-error', { name, message: error.message });
    return JSON.stringify({ ok: false, reason: error.message || 'Tool failed.' });
  }
}

export function parseToolArgs(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

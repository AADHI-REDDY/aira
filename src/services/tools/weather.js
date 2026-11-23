import { nominatimBase, owmBase } from './endpoints.js';
import { isLanguageName, isLanguageSwitch } from '../assistant/contextService.js';

const NOT_A_PLACE = /\b(what|when|where|why|who|how|is|are|am|the|a|an|today|tomorrow|yesterday|date|time|weather|rain|raining|please|help|turn|on|off|issue|say|will|chat|last|this|that|it|in|for|at|near|me|here|there|location|city|english|hindi|telugu|tamil|hinglish|tanglish)\b/i;

export function weatherQuery(text, history = []) {
  const t = (text || '').trim();
  if (!t || isLanguageSwitch(t)) return false;
  if (/\b(date|time)\b/i.test(t) && !/\b(weather|rain|raining|temperature|forecast)\b/i.test(t)) {
    return false;
  }
  if (/\b(weather|rain|raining|rainfall|humidity|temperature|forecast|climate|mausam|vanilai)\b/i.test(t)
    || /मौसम|వాతావరణం|வானிலை/.test(t)) {
    return true;
  }
  const prev = (history || []).slice(-4).map((msg) => msg.text).join(' ');
  if (/^(is it raining|and there|there\??)$/i.test(t) && /\b(weather|rain)\b/i.test(prev)) {
    return true;
  }
  return false;
}

function stripTail(text) {
  return (text || '').replace(/[?.,!;:"']+$/g, '').trim();
}

function looksLikePlace(text) {
  const t = stripTail(text);
  if (!t || t.length > 40) return false;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 3) return false;
  if (NOT_A_PLACE.test(t) || isLanguageName(t)) return false;
  return /^[\p{L}\s.'-]+$/u.test(t);
}

function cityFromText(text) {
  const cleaned = stripTail(text);
  if (/^(?:please\s+)?(?:speak|reply|answer|talk|use|switch(?:\s+to)?)\s+(?:in\s+)?(english|hindi|telugu|tamil|hinglish|tanglish)\b/i.test(cleaned)) {
    return '';
  }
  const patterns = [
    /\b(?:weather|rain|raining|forecast|temperature)\b[\s\S]{0,48}?\b(?:in|at|near)\s+([A-Za-z][\p{L}\s.'-]{1,40})$/iu,
  ];
  if (/\b(weather|rain|forecast|temperature)\b/i.test(cleaned)) {
    patterns.push(/\b(?:in|at|near)\s+([A-Za-z][\p{L}\s.'-]{1,40})$/iu);
  }
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match && looksLikePlace(match[1])) return stripTail(match[1]);
  }
  return '';
}

export function namedPlaceInQuery(text) {
  return cityFromText(text);
}

export function asksCurrentLocation(text) {
  const t = String(text || '').trim();
  if (!t || isLanguageSwitch(t)) return false;
  return /where\s+(?:am\s+i|i(?:'m| am)(?:\s+now)?|are\s+we)\b/i.test(t)
    || /\b(?:my|the)\s+(?:current\s+)?location\b/i.test(t)
    || /\b(locate me|current location|where i am now)\b/i.test(t);
}

export function wantsDeviceLocation(text) {
  const t = (text || '').trim();
  if (asksCurrentLocation(t)) return true;
  if (/\b(near me|around me|my location|current location)\b/i.test(t)) return true;
  return weatherQuery(t) && !cityFromText(t);
}

export async function fetchDeviceLocation(apiKey) {
  const device = await requestDeviceCoords();
  if (!device.ok) {
    return { ok: false, reason: device.reason || 'unavailable' };
  }
  const place = await reverseGeocode(device.lat, device.lon, apiKey);
  return {
    ok: Boolean(place),
    lat: device.lat,
    lon: device.lon,
    place: place || '',
    reason: place ? undefined : 'Could not name this GPS point.',
  };
}

export function requestDeviceCoords() {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ ok: false, reason: 'unavailable' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        ok: true,
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
      }),
      (err) => resolve({
        ok: false,
        reason: err?.code === 1 ? 'denied' : 'unavailable',
      }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  });
}

async function reverseGeocode(lat, lon, apiKey) {
  if (apiKey) {
    try {
      const url = `${owmBase()}/geo/1.0/reverse?${new URLSearchParams({
        lat: String(lat),
        lon: String(lon),
        limit: '1',
        appid: apiKey,
      }).toString()}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const hit = Array.isArray(data) ? data[0] : null;
        if (hit?.name) {
          return [hit.name, hit.state, hit.country].filter(Boolean).join(', ');
        }
      }
    } catch {
      // fall through
    }
  }
  try {
    const url = `${nominatimBase()}/reverse?${new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      format: 'json',
    }).toString()}`;
    const response = await fetch(url);
    if (!response.ok) return '';
    const data = await response.json();
    return data.address?.city || data.address?.town || data.address?.village || data.address?.state || '';
  } catch {
    return '';
  }
}

export function resolvePlace(userText, history = [], memory = {}) {
  const fromText = cityFromText(userText);
  if (fromText) return fromText;
  if (memory?.location && looksLikePlace(memory.location)) return stripTail(memory.location);
  for (const msg of [...history].reverse()) {
    if (msg.role !== 'user') continue;
    const fromHistory = cityFromText(msg.text);
    if (fromHistory) return fromHistory;
  }
  return '';
}

async function geocodeNominatim(place) {
  const url = `${nominatimBase()}/search?${new URLSearchParams({
    q: place,
    format: 'json',
    limit: '1',
  }).toString()}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = await response.json();
  const hit = Array.isArray(data) ? data[0] : null;
  if (!hit) return null;
  return {
    name: hit.display_name?.split(',')[0] || place,
    lat: hit.lat,
    lon: hit.lon,
  };
}

async function geocodeOpenWeather(place, apiKey) {
  const url = `${owmBase()}/geo/1.0/direct?${new URLSearchParams({
    q: place,
    limit: '1',
    appid: apiKey,
  }).toString()}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = await response.json();
  const hit = Array.isArray(data) ? data[0] : null;
  if (!hit) return null;
  return {
    name: [hit.name, hit.state, hit.country].filter(Boolean).join(', '),
    lat: hit.lat,
    lon: hit.lon,
  };
}

function packWeather(placeName, data) {
  const raining = /rain|drizzle|thunder/i.test(data.weather?.[0]?.main || '');
  const tempC = data.main?.temp;
  const humidity = data.main?.humidity;
  const description = data.weather?.[0]?.description || '';
  return {
    ok: true,
    source: 'OpenWeatherMap',
    place: placeName,
    description,
    tempC,
    feelsLikeC: data.main?.feels_like,
    humidity,
    windKmh: data.wind?.speed != null ? Math.round(data.wind.speed * 3.6) : null,
    raining,
    summary: `Live weather for ${placeName}: ${Math.round(tempC)}°C, ${description}, humidity ${humidity}%, raining: ${raining ? 'yes' : 'no'}.`,
  };
}

export async function fetchWeather({ place, lat, lon, apiKey }) {
  if (lat != null && lon != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lon))) {
    if (!apiKey) {
      return {
        ok: false,
        reason: 'OpenWeather API key missing. Add VITE_OPENWEATHER_API_KEY or paste it in Settings.',
      };
    }
    const geoLabel = (await reverseGeocode(lat, lon, apiKey)) || place || '';
    const url = `${owmBase()}/data/2.5/weather?${new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      units: 'metric',
      appid: apiKey,
    }).toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      return { ok: false, reason: `Weather request failed (${response.status}).`, place: geoLabel || 'your location' };
    }
    const data = await response.json();
    return packWeather(geoLabel || data.name || 'your location', data);
  }

  if (!place) {
    return {
      ok: false,
      needCity: true,
      reason: 'No city given and device location is not available. Ask which city. Do not guess Vijayawada or any other city.',
    };
  }

  if (apiKey) {
    const byName = `${owmBase()}/data/2.5/weather?${new URLSearchParams({
      q: place,
      units: 'metric',
      appid: apiKey,
    }).toString()}`;
    try {
      const response = await fetch(byName);
      if (response.ok) {
        const data = await response.json();
        const label = data.name || place;
        return packWeather(label, data);
      }
    } catch {
      // try geocode next
    }
  }

  let geo = null;
  if (apiKey) {
    try {
      geo = await geocodeOpenWeather(place, apiKey);
    } catch {
      geo = null;
    }
  }
  if (!geo) {
    try {
      geo = await geocodeNominatim(place);
    } catch {
      geo = null;
    }
  }
  if (!geo) {
    return { ok: false, reason: `Could not find the city "${place}". Ask for a valid city name.` };
  }

  if (!apiKey) {
    return {
      ok: false,
      reason: 'OpenWeather API key missing. Add VITE_OPENWEATHER_API_KEY or paste it in Settings.',
      place: geo.name,
    };
  }

  const url = `${owmBase()}/data/2.5/weather?${new URLSearchParams({
    lat: String(geo.lat),
    lon: String(geo.lon),
    units: 'metric',
    appid: apiKey,
  }).toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    return { ok: false, reason: `Weather request failed (${response.status}).`, place: geo.name };
  }
  const data = await response.json();
  return packWeather(geo.name, data);
}

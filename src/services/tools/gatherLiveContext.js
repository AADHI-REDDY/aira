import { resolveToolKeys } from './endpoints.js';
import { asksCurrentLocation, fetchDeviceLocation, fetchWeather, namedPlaceInQuery, resolvePlace, wantsDeviceLocation, weatherQuery } from './weather.js';
import { fetchSearch, searchQuery } from './webSearch.js';
import { loadMemory, saveMemory } from '../storage/memoryStore.js';

function rememberPlace(place) {
  const name = String(place || '').split(',')[0].trim();
  if (!name) return;
  const memory = loadMemory();
  memory.location = name;
  memory.updatedAt = new Date().toISOString();
  saveMemory(memory);
}

export async function gatherLiveContext({ userText, history, memory, settings }) {
  const keys = resolveToolKeys(settings);
  const blocks = [];
  const named = namedPlaceInQuery(userText);
  const useGps = !named && wantsDeviceLocation(userText);
  let device = null;

  if (asksCurrentLocation(userText) || (weatherQuery(userText, history) && useGps)) {
    device = await fetchDeviceLocation(keys.weather);
  }

  if (asksCurrentLocation(userText)) {
    if (device?.ok && device.place) {
      rememberPlace(device.place);
      blocks.push(`USER LOCATION FROM GPS: ${device.place}. Say this exact place name in the reply. Do not guess another city.`);
    } else {
      const why = device?.reason === 'denied' ? 'The user denied location access.' : 'GPS is unavailable.';
      blocks.push(`${why} Ask them to allow location or name their city. Do not guess Vijayawada, Tadepalle, or any other city.`);
    }
  }

  if (weatherQuery(userText, history)) {
    let weather;

    if (useGps) {
      if (device?.ok && device.lat != null) {
        weather = await fetchWeather({
          lat: device.lat,
          lon: device.lon,
          place: device.place,
          apiKey: keys.weather,
        });
        if (weather.ok && weather.place) rememberPlace(weather.place);
      } else {
        weather = {
          ok: false,
          needCity: true,
          reason: device?.reason === 'denied'
            ? 'The user denied location access. Ask which city to check. Do not guess Vijayawada or any other city.'
            : 'Could not read GPS. Ask which city to check. Do not guess a city.',
        };
      }
    } else {
      const place = named || resolvePlace(userText, history, memory);
      weather = await fetchWeather({ place, apiKey: keys.weather });
    }

    blocks.push(`WEATHER: ${JSON.stringify(weather)}`);
    if (weather.summary) blocks.push(`SAY THIS WEATHER: ${weather.summary}`);
    if (weather.place) blocks.push(`Always name this place in the reply: ${weather.place}.`);
    if (weather.needCity) {
      blocks.push('ASK the user for a city. Never fill in Vijayawada or another default.');
    }
  }

  if (searchQuery(userText, history)) {
    const search = await fetchSearch({
      query: userText,
      tavilyKey: keys.tavily,
      googleCseKey: keys.googleCseKey,
      googleCseId: keys.googleCseId,
    });
    blocks.push(`SEARCH: ${JSON.stringify({
      ok: search.ok,
      source: search.source,
      reason: search.reason,
    })}`);
    if (search.notes) {
      blocks.push(`LIVE FACTS (answer only from this; do not add extra cities or campuses):\n${search.notes}`);
    }
  }

  return blocks.join('\n');
}

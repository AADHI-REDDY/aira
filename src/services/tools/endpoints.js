function isDev() {
  return import.meta.env.DEV;
}

export function owmBase() {
  return isDev() ? '/owm-api' : 'https://api.openweathermap.org';
}

export function nominatimBase() {
  return isDev() ? '/nominatim' : 'https://nominatim.openstreetmap.org';
}

export function tavilyBase() {
  return isDev() ? '/tavily-api' : 'https://api.tavily.com';
}

export function ddgBase() {
  return isDev() ? '/ddg-api' : 'https://api.duckduckgo.com';
}

export function googleApiBase() {
  return isDev() ? '/google-cse' : 'https://www.googleapis.com';
}

export function openaiBase() {
  return isDev() ? '/openai-api' : 'https://api.openai.com';
}

export function wikiBase() {
  return isDev() ? '/wiki-api' : 'https://en.wikipedia.org';
}

export function resolveToolKeys(settings = {}) {
  return {
    weather: (settings.weatherApiKey || import.meta.env.VITE_OPENWEATHER_API_KEY || '').trim(),
    tavily: (settings.searchApiKey || import.meta.env.VITE_TAVILY_API_KEY || '').trim(),
    googleCseKey: (settings.googleCseKey || import.meta.env.VITE_GOOGLE_CSE_KEY || '').trim(),
    googleCseId: (settings.googleCseId || import.meta.env.VITE_GOOGLE_CSE_ID || '').trim(),
    openai: (settings.openaiTtsKey || settings.apiKey || import.meta.env.VITE_OPENAI_API_KEY || '').trim(),
  };
}

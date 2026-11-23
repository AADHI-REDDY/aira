const KEY = 'mva.settings.v1';

export const DEFAULT_SETTINGS = {
  responseLanguage: 'auto',
  recognitionLanguage: 'auto',
  assistantMode: 'online',
  voiceURI: '',
  provider: 'groq',
  apiKey: '',
  model: '',
  backendUrl: '',
  speakReplies: true,
  speechRate: 1.25,
  weatherApiKey: '',
  searchApiKey: '',
  googleCseKey: '',
  googleCseId: '',
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return {
        ...DEFAULT_SETTINGS,
        apiKey:
          import.meta.env.VITE_GROQ_API_KEY ||
          import.meta.env.VITE_GEMINI_API_KEY ||
          '',
        backendUrl: import.meta.env.VITE_AI_BACKEND_URL || '',
        weatherApiKey: import.meta.env.VITE_OPENWEATHER_API_KEY || '',
        searchApiKey: import.meta.env.VITE_TAVILY_API_KEY || '',
        googleCseKey: import.meta.env.VITE_GOOGLE_CSE_KEY || '',
        googleCseId: import.meta.env.VITE_GOOGLE_CSE_ID || '',
      };
    }
    const parsed = JSON.parse(raw);
    const apiKey = (parsed.apiKey || '').trim() || (import.meta.env.VITE_GROQ_API_KEY || '').trim();
    const weatherApiKey = (parsed.weatherApiKey || '').trim() || (import.meta.env.VITE_OPENWEATHER_API_KEY || '').trim();
    const searchApiKey = (parsed.searchApiKey || '').trim() || (import.meta.env.VITE_TAVILY_API_KEY || '').trim();
    const googleCseKey = (parsed.googleCseKey || '').trim() || (import.meta.env.VITE_GOOGLE_CSE_KEY || '').trim();
    const googleCseId = (parsed.googleCseId || '').trim() || (import.meta.env.VITE_GOOGLE_CSE_ID || '').trim();
    const provider = apiKey.startsWith('gsk_') ? 'groq' : (parsed.provider || 'groq');
    const retired = new Set([
      'gemma2-9b-it',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'llama-3.1-70b-versatile',
    ]);
    const model = retired.has((parsed.model || '').trim()) ? '' : (parsed.model || '');
    const firstOnline = parsed.assistantMode == null;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      apiKey,
      provider,
      model,
      weatherApiKey,
      searchApiKey,
      googleCseKey,
      googleCseId,
      assistantMode: 'online',
      responseLanguage: firstOnline ? 'auto' : (parsed.responseLanguage || 'auto'),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

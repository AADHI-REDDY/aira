/**
 * App language options vs BCP-47 codes used by SpeechRecognition / SpeechSynthesis.
 * Internal ids such as "hinglish" and "tanglish" are never passed to Web Speech APIs.
 */
export const LANGUAGES = [
  {
    id: 'auto',
    label: 'Auto detect',
    nativeLabel: 'Auto',
    bcp47: 'en-IN',
    speechLang: 'en-IN',
    ttsLangPrefix: 'en',
    ttsCode: 'en',
  },
  {
    id: 'en',
    label: 'English',
    nativeLabel: 'English',
    bcp47: 'en-US',
    speechLang: 'en-IN',
    ttsLangPrefix: 'en',
    ttsCode: 'en',
  },
  {
    id: 'hi',
    label: 'Hindi',
    nativeLabel: 'हिन्दी',
    bcp47: 'hi-IN',
    speechLang: 'hi-IN',
    ttsLangPrefix: 'hi',
    ttsCode: 'hi',
  },
  {
    id: 'te',
    label: 'Telugu',
    nativeLabel: 'తెలుగు',
    bcp47: 'te-IN',
    speechLang: 'te-IN',
    ttsLangPrefix: 'te',
    ttsCode: 'te',
  },
  {
    id: 'ta',
    label: 'Tamil',
    nativeLabel: 'தமிழ்',
    bcp47: 'ta-IN',
    speechLang: 'ta-IN',
    ttsLangPrefix: 'ta',
    ttsCode: 'ta',
  },
  {
    id: 'hinglish',
    label: 'Hinglish',
    nativeLabel: 'Hinglish',
    bcp47: 'hi-IN',
    speechLang: 'en-IN',
    ttsLangPrefix: 'hi',
    ttsCode: 'hi',
  },
  {
    id: 'tanglish',
    label: 'Tanglish',
    nativeLabel: 'Tanglish',
    bcp47: 'ta-IN',
    speechLang: 'en-IN',
    ttsLangPrefix: 'ta',
    ttsCode: 'ta',
  },
];

export const LANGUAGE_BY_ID = Object.fromEntries(LANGUAGES.map((lang) => [lang.id, lang]));

export function getLanguage(id) {
  return LANGUAGE_BY_ID[id] || LANGUAGE_BY_ID.auto || LANGUAGE_BY_ID.en;
}

export function getSpeechRecognitionLang(languageId) {
  return getLanguage(languageId).speechLang;
}

export function getTtsLang(languageId) {
  return getLanguage(languageId).bcp47;
}

export function getTtsCode(languageId) {
  return getLanguage(languageId).ttsCode || 'en';
}

export function getLanguageLabel(id) {
  return getLanguage(id).label;
}

/** Prepared for later. Not offered in Settings until STT + TTS + replies are verified. */
export const FUTURE_LANGUAGES = [
  { id: 'kn', label: 'Kannada', bcp47: 'kn-IN' },
  { id: 'ml', label: 'Malayalam', bcp47: 'ml-IN' },
  { id: 'bn', label: 'Bengali', bcp47: 'bn-IN' },
  { id: 'mr', label: 'Marathi', bcp47: 'mr-IN' },
  { id: 'gu', label: 'Gujarati', bcp47: 'gu-IN' },
  { id: 'pa', label: 'Punjabi', bcp47: 'pa-IN' },
  { id: 'ur', label: 'Urdu', bcp47: 'ur-IN' },
  { id: 'es', label: 'Spanish', bcp47: 'es-ES' },
  { id: 'fr', label: 'French', bcp47: 'fr-FR' },
  { id: 'de', label: 'German', bcp47: 'de-DE' },
];

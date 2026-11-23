export const ERROR_MESSAGES = {
  MIC_PERMISSION: 'Microphone permission is required.',
  MIC_UNAVAILABLE: 'Microphone is unavailable.',
  SPEECH_UNSUPPORTED: 'This browser does not support speech recognition. Try Google Chrome.',
  NO_SPEECH: 'Speech was not detected. Please try again.',
  AI_UNAVAILABLE: 'Unable to connect to the AI service.',
  NETWORK: 'Network failure. Check your internet connection.',
  MISSING_API_KEY: 'Missing API key. Add a Groq key in Settings to use the online assistant.',
  INVALID_API_KEY: 'The API key is invalid. Paste a valid Groq key (gsk_...) in Settings.',
  INVALID_GROQ_KEY: 'The Groq API key is invalid. Create a new key at console.groq.com/keys and paste it again.',
  TTS_FAILURE: 'Text-to-speech could not play this response.',
  GENERIC: 'Something went wrong. Please try again.',
};

export function mapAiError(error) {
  if (!error) return ERROR_MESSAGES.AI_UNAVAILABLE;
  if (error instanceof TypeError) return ERROR_MESSAGES.NETWORK;
  if (error.code === 'INVALID_KEY' || /api key/i.test(error.message || '')) {
    if (error.provider === 'groq' || /groq/i.test(error.message || '')) {
      return ERROR_MESSAGES.INVALID_GROQ_KEY;
    }
    return ERROR_MESSAGES.INVALID_API_KEY;
  }
  const detail = (error.details || error.message || '').replace(/\s+/g, ' ').slice(0, 180);
  return detail ? `${ERROR_MESSAGES.AI_UNAVAILABLE} ${detail}` : ERROR_MESSAGES.AI_UNAVAILABLE;
}

export function mapSpeechError(errorCode) {
  switch (errorCode) {
    case 'not-allowed':
    case 'service-not-allowed':
      return ERROR_MESSAGES.MIC_PERMISSION;
    case 'audio-capture':
      return ERROR_MESSAGES.MIC_UNAVAILABLE;
    case 'no-speech':
      return ERROR_MESSAGES.NO_SPEECH;
    case 'network':
      return ERROR_MESSAGES.NETWORK;
    default:
      return ERROR_MESSAGES.GENERIC;
  }
}

export class AppError extends Error {
  constructor(message, code = 'GENERIC') {
    super(message);
    this.code = code;
  }
}

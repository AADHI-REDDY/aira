const TELUGU = /[\u0C00-\u0C7F]/g;
const TAMIL = /[\u0B80-\u0BFF]/g;
const DEVANAGARI = /[\u0900-\u097F]/g;
const LATIN = /[A-Za-z]/g;

const ENGLISH_MARKERS = new Set([
  'the', 'a', 'an', 'is', 'are', 'am', 'was', 'were', 'what', 'when', 'where',
  'why', 'who', 'how', 'to', 'of', 'in', 'on', 'for', 'and', 'or', 'it', 'this',
  'that', 'please', 'time', 'date', 'today', 'weather', 'joke', 'hello', 'hi',
  'can', 'you', 'tell', 'me', 'turn', 'off', 'with', 'from', 'have', 'has',
  'do', 'does', 'did', 'will', 'would', 'should', 'could', 'about', 'assistant',
]);

const HINGLISH_HINTS = new Set([
  'kya', 'kyun', 'kyu', 'hain', 'nahi', 'nahin', 'acha', 'accha', 'theek',
  'thik', 'kaise', 'kaisa', 'hoon', 'hun', 'haan', 'karo', 'karna',
  'bhai', 'yaar', 'namaste', 'dhanyavad', 'shukriya', 'bilkul', 'zaroor',
  'kitna', 'kahan', 'kab', 'abhi', 'baad', 'aap', 'raha', 'rahi',
  'gaya', 'gayi', 'wala', 'wali', 'bahut', 'thoda',
]);

const TANGLISH_HINTS = new Set([
  'epdi', 'eppadi', 'enna', 'yenna', 'illa', 'illai', 'iruku', 'irukku', 'irukka',
  'pannu', 'pannunga', 'seri', 'sari', 'vanakkam', 'nandri',
  'sapdu', 'saapdu', 'poda', 'machan', 'romba', 'konjam', 'inge', 'ange',
  'naan', 'neenga', 'unga', 'vendam', 'venum', 'pannanum', 'iruken',
]);

function countMatches(text, regex) {
  return (text.match(regex) || []).length;
}

function countSetHits(words, set) {
  return words.filter((word) => set.has(word)).length;
}

function normalizeWords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function latinRatio(text) {
  const sample = text || '';
  const latin = countMatches(sample, LATIN);
  const indic = countMatches(sample, TELUGU) + countMatches(sample, TAMIL) + countMatches(sample, DEVANAGARI);
  const total = latin + indic || 1;
  return latin / total;
}

export function englishMarkerCount(text) {
  return countSetHits(normalizeWords(text), ENGLISH_MARKERS);
}

/**
 * Detects language from recognized text using script analysis and mixed-language hints.
 */
export function detectLanguage(text) {
  const sample = (text || '').trim();
  if (!sample) {
    return {
      id: 'en',
      language: 'english',
      label: 'English',
      confidence: 0,
      script: 'Latin',
      codeMixed: false,
      reason: 'empty',
    };
  }

  const telugu = countMatches(sample, TELUGU);
  const tamil = countMatches(sample, TAMIL);
  const hindi = countMatches(sample, DEVANAGARI);
  const latin = countMatches(sample, LATIN);
  const scriptTotal = telugu + tamil + hindi + latin || 1;
  const script = telugu >= tamil && telugu >= hindi && telugu >= latin
    ? 'Telugu'
    : tamil >= hindi && tamil >= latin
      ? 'Tamil'
      : hindi >= latin
        ? 'Devanagari'
        : 'Latin';

  const words = normalizeWords(sample);
  const hinglishHits = countSetHits(words, HINGLISH_HINTS);
  const tanglishHits = countSetHits(words, TANGLISH_HINTS);
  const englishHits = countSetHits(words, ENGLISH_MARKERS);
  const codeMixed = latin > 0 && (telugu + tamil + hindi > 0 || hinglishHits >= 2 || tanglishHits >= 2);

  const pack = (id, label, confidence, reason) => ({
    id,
    language: label.toLowerCase(),
    label,
    confidence,
    script,
    codeMixed,
    reason,
  });

  const teluguShare = telugu / scriptTotal;
  const tamilShare = tamil / scriptTotal;
  const hindiShare = hindi / scriptTotal;
  const latinShare = latin / scriptTotal;

  if (teluguShare >= 0.45) {
    return pack('te', 'Telugu', 0.95, 'telugu-script');
  }
  if (tamilShare >= 0.45) {
    return pack('ta', 'Tamil', 0.95, 'tamil-script');
  }
  if (hindiShare >= 0.45) {
    return pack('hi', 'Hindi', 0.95, 'devanagari-script');
  }

  if (latinShare >= 0.5) {
    if (englishHits >= 2 && englishHits >= hinglishHits && englishHits >= tanglishHits) {
      return pack('en', 'English', 0.9, 'english-markers');
    }
    if (tanglishHits >= 2 && tanglishHits > hinglishHits && tanglishHits > englishHits) {
      return pack('tanglish', 'Tanglish', 0.7, 'romanized-tamil-hints');
    }
    if (hinglishHits >= 2 && hinglishHits > englishHits) {
      return pack('hinglish', 'Hinglish', 0.7, 'romanized-hindi-hints');
    }
    return pack('en', 'English', 0.85, 'latin-script');
  }

  const ranked = [
    { id: 'te', label: 'Telugu', n: telugu },
    { id: 'ta', label: 'Tamil', n: tamil },
    { id: 'hi', label: 'Hindi', n: hindi },
    { id: 'en', label: 'English', n: latin },
  ].sort((a, b) => b.n - a.n);

  return pack(ranked[0].id, ranked[0].label, 0.4, 'weak-script-majority');
}

export function mergeVoiceDetection(text, whisper = null) {
  const fromText = detectLanguage(text);
  const latin = latinRatio(text);

  if (latin >= 0.5) {
    return fromText;
  }

  if (fromText.confidence >= 0.7) return fromText;

  if (whisper?.whisperLanguageId) {
    const labels = { en: 'English', hi: 'Hindi', te: 'Telugu', ta: 'Tamil' };
    return {
      id: whisper.whisperLanguageId,
      label: labels[whisper.whisperLanguageId] || fromText.label,
      confidence: 0.85,
      reason: 'whisper',
    };
  }
  return fromText;
}

export function shouldSkipTranslation(detectedId, targetId) {
  if (detectedId === targetId) return true;
  const pairs = new Set(['hi|hinglish', 'hinglish|hi', 'ta|tanglish', 'tanglish|ta']);
  return pairs.has(`${detectedId}|${targetId}`);
}

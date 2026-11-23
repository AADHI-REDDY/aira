import { getLanguageLabel } from '../../constants/languages.js';

function nowParts(locale) {
  const now = new Date();
  return {
    time: now.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }),
    date: now.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  };
}

const LOCALES = {
  en: 'en-US',
  hi: 'hi-IN',
  te: 'te-IN',
  ta: 'ta-IN',
  hinglish: 'en-IN',
  tanglish: 'en-IN',
};

const RESPONSES = {
  greeting: {
    en: 'Hello. How can I help you?',
    hi: 'नमस्ते। मैं आपकी कैसे मदद कर सकती हूँ?',
    te: 'నమస్కారం. నేను మీకు ఎలా సహాయం చేయగలను?',
    ta: 'வணக்கம். நான் உங்களுக்கு எப்படி உதவ முடியும்?',
    hinglish: 'Namaste! Main aapki kaise help kar sakti hoon?',
    tanglish: 'Vanakkam! Naan unga kitta eppadi help pannalaam?',
  },
  time: (lang) => {
    const { time } = nowParts(LOCALES[lang] || 'en-US');
    return {
      en: `The current time is ${time}.`,
      hi: `अभी समय ${time} है।`,
      te: `ప్రస్తుత సమయం ${time}.`,
      ta: `இப்போதைய நேரம் ${time}.`,
      hinglish: `Abhi time ${time} hai.`,
      tanglish: `Ippo time ${time}.`,
    }[lang];
  },
  date: (lang) => {
    const { date } = nowParts(LOCALES[lang] || 'en-US');
    return {
      en: `Today is ${date}.`,
      hi: `आज ${date} है।`,
      te: `ఈ రోజు ${date}.`,
      ta: `இன்று ${date}.`,
      hinglish: `Aaj ${date} hai.`,
      tanglish: `Innaikku ${date}.`,
    }[lang];
  },
  weather: {
    en: 'Live weather needs an internet weather service. I cannot fetch the current weather in offline mode.',
    hi: 'लाइव मौसम के लिए इंटरनेट सेवा चाहिए। ऑफ़लाइन मोड में वर्तमान मौसम नहीं मिल सकता।',
    te: 'ప్రత్యక్ష వాతావరణం కోసం ఇంటర్నెట్ సేవ కావాలి. ఆఫ్‌లైన్ మోడ్‌లో ప్రస్తుత వాతావరణం తీసుకురాలేను.',
    ta: 'நேரடி வானிலைக்கு இணைய சேவை தேவை. ஆஃப்லைன் முறையில் தற்போதைய வானிலையை எடுக்க முடியாது.',
    hinglish: 'Live weather ke liye internet chahiye. Offline mode mein current weather nahi mil sakta.',
    tanglish: 'Live weather ku internet venum. Offline la current weather edukka mudiyathu.',
  },
  joke: {
    en: 'Why did the computer go to the doctor? Because it had a virus.',
    hi: 'कंप्यूटर डॉक्टर के पास क्यों गया? क्योंकि उसे वायरस हो गया था।',
    te: 'కంప్యూటర్ డాక్టర్ దగ్గరికి ఎందుకు వెళ్లింది? ఎందుకంటే దానికి వైరస్ వచ్చింది.',
    ta: 'கணினி ஏன் மருத்துவரிடம் சென்றது? ஏனெனில் அதற்கு வைரஸ் இருந்தது.',
    hinglish: 'Computer doctor ke paas kyun gaya? Kyunki usko virus ho gaya tha.',
    tanglish: 'Computer doctor kita yen pochu? Virus vandhuchu.',
  },
  about: {
    en: 'I am Aira AI, a multilingual voice assistant. I can listen, reply in text and speech, and use an AI service when it is available.',
    hi: 'मैं Aira AI हूँ, एक बहुभाषी वॉइस असिस्टेंट। मैं सुन सकती हूँ, पाठ और वाणी में जवाब दे सकती हूँ, और उपलब्ध होने पर AI सेवा का उपयोग कर सकती हूँ।',
    te: 'నేను Aira AI, బహుభాషా వాయిస్ అసిస్టెంట్. వినగలను, టెక్స్ట్ మరియు స్పీచ్‌లో సమాధానం ఇవ్వగలను, AI సేవ అందుబాటులో ఉంటే ఉపయోగిస్తాను.',
    ta: 'நான் Aira AI, பலமொழி குரல் உதவியாளர். கேட்கவும், உரை மற்றும் பேச்சு மூலம் பதிலளிக்கவும், AI சேவை கிடைக்கும்போது பயன்படுத்தவும் முடியும்.',
    hinglish: 'Main Aira AI hoon, ek multilingual voice assistant. Main sun sakti hoon, text aur speech mein reply de sakti hoon.',
    tanglish: 'Naan Aira AI, multilingual voice assistant. Ketta reply text and speech la tharen.',
  },
  unknown: {
    en: 'The AI service is unavailable. I can still help with greetings, time, date, weather, jokes, basic information, and web search.',
    hi: 'AI सेवा उपलब्ध नहीं है। मैं अभिवादन, समय, तारीख, मौसम, चुटकुले, सामान्य जानकारी और वेब खोज में मदद कर सकती हूँ।',
    te: 'AI సేవ అందుబాటులో లేదు. నమస్కారం, సమయం, తేదీ, వాతావరణం, జోక్స్, సాధారణ సమాచారం మరియు వెబ్ సెర్చ్‌లో సహాయం చేయగలను.',
    ta: 'AI சேவை கிடைக்கவில்லை. வாழ்த்து, நேரம், தேதி, வானிலை, நகைச்சுவை, அடிப்படை தகவல் மற்றும் இணையத் தேடலில் உதவ முடியும்.',
    hinglish: 'AI service available nahi hai. Main greetings, time, date, weather, jokes, basic info aur web search mein help kar sakti hoon.',
    tanglish: 'AI service kidaikala. Greetings, time, date, weather, jokes, basic info, web search la help panna mudiyum.',
  },
};

function pick(lang, key, extra) {
  const table = RESPONSES[key];
  const value = typeof table === 'function' ? table(lang) : table[lang];
  return extra ? `${value} ${extra}` : value;
}

function matchCommand(text) {
  const t = text.toLowerCase();

  if (/\b(hello|hi|hey|namaste|vanakkam|namaskar|namaskaram)\b/.test(t) || /नमस्ते|வணக்கம்|నమస్కార/.test(text)) {
    return { type: 'greeting' };
  }
  if (/\b(time|samay|samayam|neram)\b/.test(t) || /समय|సమయం|நேரம்/.test(text)) {
    return { type: 'time' };
  }
  if (/\b(date|tareekh|thedi|roju)\b/.test(t) || /तारीख|తేదీ|தேதி/.test(text)) {
    return { type: 'date' };
  }
  if (/\b(weather|mausam|vanilai)\b/.test(t) || /मौसम|వాతావరణం|வானிலை/.test(text)) {
    return { type: 'weather' };
  }
  if (/\b(joke|funny|chutkula)\b/.test(t) || /चुटकुला|జోక్|நகைச்சுவை/.test(text)) {
    return { type: 'joke' };
  }
  if (/\b(who are you|what can you do|about you|your name)\b/.test(t)) {
    return { type: 'about' };
  }
  const search = t.match(/\b(?:search(?:\s+for)?|google|find)\s+(.+)/i);
  if (search) {
    return { type: 'search', query: search[1].trim() };
  }
  if (/खोजो|వెతుకు|தேடு/.test(text)) {
    return { type: 'search', query: text };
  }
  return { type: 'unknown' };
}

/**
 * Simple rule-based fallback — not an offline AI model.
 */
export function getOfflineReply(userText, targetLanguage = 'en') {
  const lang = RESPONSES.greeting[targetLanguage] ? targetLanguage : 'en';
  const command = matchCommand(userText || '');
  const languageNote = ` (${getLanguageLabel(lang)})`;

  if (command.type === 'search') {
    const query = command.query || userText;
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    return {
      text: {
        en: `Opening a web search for: ${query}`,
        hi: `इसके लिए वेब खोज खोली जा रही है: ${query}`,
        te: `వెబ్ సెర్చ్ తెరుస్తున్నాను: ${query}`,
        ta: `இணையத் தேடலைத் திறக்கிறேன்: ${query}`,
        hinglish: `Web search khol rahi hoon: ${query}`,
        tanglish: `Web search open panren: ${query}`,
      }[lang],
      source: 'offline',
      command: 'search',
      searchUrl: url,
    };
  }

  if (command.type === 'greeting') return { text: pick(lang, 'greeting'), source: 'offline', command: command.type };
  if (command.type === 'time') return { text: pick(lang, 'time'), source: 'offline', command: command.type };
  if (command.type === 'date') return { text: pick(lang, 'date'), source: 'offline', command: command.type };
  if (command.type === 'weather') return { text: pick(lang, 'weather'), source: 'offline', command: command.type };
  if (command.type === 'joke') return { text: pick(lang, 'joke'), source: 'offline', command: command.type };
  if (command.type === 'about') return { text: pick(lang, 'about'), source: 'offline', command: command.type };

  return { text: pick(lang, 'unknown') + languageNote, source: 'offline', command: 'unknown' };
}

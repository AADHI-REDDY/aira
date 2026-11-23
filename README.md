# Aira — Multilingual AI Voice Assistant

Browser app (Vite + React) for a **voice-first** assistant: English, Hindi, Telugu, Tamil, Hinglish, and Tanglish. Type is supported; voice is the main path.

This is **not** a Raspberry Pi product and **not** a custom ML model. Cloud STT/LLM/TTS need API keys. Offline LLM is not implemented.

## Architecture

```
UI (App.jsx)
  → speech hooks (Web Speech + Whisper)
  → runAssistantTurn (assistantEngine)
       → local tools (time, calc, timer, reminder, speech controls)
       → generateReply (aiClient)
            → Groq / Gemini / OpenAI  (optional backend URL)
            → toolRegistry.execute (weather, search, news, notes, …)
  → TTS (browser SpeechSynthesis / gTTS)
```

Storage today is **localStorage** (chat, settings, memory, notes). A dedicated backend for secrets and persistence is planned (Phase 3). Demo keys in `.env` are prefixed `VITE_` and are visible in the frontend — do not use production secrets that way.

## Run

```bash
npm install
npm run dev
```

Opens **http://localhost:5173/**. Use Chrome or Edge. Allow the microphone.

```bash
npm test
npm run build
```

## Environment

See `.env.example`:

- `VITE_GROQ_API_KEY` — chat + Whisper STT
- `VITE_GEMINI_API_KEY` / `VITE_OPENAI_API_KEY` — optional chat
- `VITE_OPENWEATHER_API_KEY` — live weather
- `VITE_TAVILY_API_KEY` — live search (DuckDuckGo used if empty)
- `VITE_AI_BACKEND_URL` — optional later backend

Restart `npm run dev` after changing `.env`.

## Supported languages (actually wired)

| UI id | STT / BCP-47 | Notes |
| --- | --- | --- |
| auto | Whisper + script detection | Mixed / Indian English |
| en | en-IN / en-US | |
| hi | hi-IN | Devanagari |
| te | te-IN | Telugu script |
| ta | ta-IN | Tamil script |
| hinglish | en-IN + hi TTS | Romanized Hindi hints |
| tanglish | en-IN + ta TTS | Romanized Tamil hints |

Kannada, Malayalam, and other codes exist only as **future** IDs in `FUTURE_LANGUAGES`. They are not claimed as working.

## What works

- Three-column Aira UI (Do.er-inspired; Aira avatar, not a stock face)
- Mic, interim text, Whisper, TTS, stop / mute / rate / language voice commands
- Groq tool calling via `toolRegistry` (weather, search, news, time, calc, timer, reminder, memory, notes)
- GPS weather when you allow location; asks for a city if denied
- Contextual suggestion chips
- Markdown on screen; clean text for speech

## Conversation context (Phase 2)

Follow-ups reuse the last task: “What about tomorrow?” after a weather question keeps the city; “Make it 20 minutes” updates the last timer. Input language and response language are tracked separately (including Hinglish/Tanglish). New Chat clears session context.

- No backend yet — API keys can leak from the browser demo
- Reminders/timers only while this tab can run; not guaranteed if the browser is closed
- No barge-in VAD yet (Phase 4)
- No streaming LLM tokens yet (Phase 4)
- No user accounts or database (Phase 5)
- Offline mode is local tools only (time, calc, timer, notes) — not a local LLM
- Unused leftover components (`Header.jsx`, `VoiceOrb.jsx`, …) are not in the live UI

## Layout

```
src/App.jsx
src/services/assistant/   engine + tool registry
src/services/ai/          Groq, Gemini, OpenAI
src/services/tools/       weather, search, live context
src/services/speech/      Whisper
src/hooks/                recognition, TTS, timers
src/constants/languages.js
```
"# aira" 

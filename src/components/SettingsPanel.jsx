import LanguageSelector from './LanguageSelector.jsx';
import { clearMemory, loadMemory } from '../services/storage/memoryStore.js';

export default function SettingsPanel({
  open,
  settings,
  voices,
  onChange,
  onClose,
  onClearChat,
  onTestVoice,
}) {
  if (!open) return null;

  const update = (field, value) => onChange({ ...settings, [field]: value });

  return (
    <div className="settings-backdrop" onClick={onClose} role="presentation">
      <aside className="settings-panel" onClick={(event) => event.stopPropagation()}>
        <header>
          <h2>Settings</h2>
          <button type="button" className="ghost-btn" onClick={onClose}>Close</button>
        </header>

        <LanguageSelector
          label="Preferred / recognition language"
          value={settings.recognitionLanguage}
          onChange={(value) => update('recognitionLanguage', value)}
        />
        <p className="hint">
          Auto detect records your voice and transcribes with Whisper (best for Indian English and mixed
          languages). Pick a specific language only if you always speak that one.
        </p>
        <label className="field">
          <span>Assistant mode</span>
          <select value={settings.assistantMode || 'online'} disabled>
            <option value="online">Online — live search, weather, Groq</option>
            <option value="offline">Offline — coming later</option>
          </select>
        </label>
        <p className="hint">
          Aira is online-only for now, like ChatGPT or Gemini: Wikipedia, Tavily search, and OpenWeather.
          Offline assistant comes next. Replies follow the language you just used.
        </p>
        <LanguageSelector
          label="Response language"
          value={settings.responseLanguage}
          onChange={(value) => update('responseLanguage', value)}
        />

        <label className="field">
          <span>Voice</span>
          <select value={settings.voiceURI} onChange={(event) => update('voiceURI', event.target.value)}>
            <option value="">Auto (match language)</option>
            {voices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </label>

        <label className="check-field">
          <input
            type="checkbox"
            checked={settings.speakReplies}
            onChange={(event) => update('speakReplies', event.target.checked)}
          />
          Speak replies
        </label>
        {onTestVoice ? (
          <button type="button" className="ghost-btn" onClick={onTestVoice}>
            Test speaker
          </button>
        ) : null}

        <label className="field">
          <span>AI provider</span>
          <select value={settings.provider} onChange={(event) => update('provider', event.target.value)}>
            <option value="groq">Groq</option>
            <option value="gemini">Google Gemini</option>
            <option value="openai">OpenAI</option>
          </select>
        </label>

        <label className="field">
          <span>API key (stored in this browser only)</span>
          <input
            type="password"
            value={settings.apiKey}
            onChange={(event) => update('apiKey', event.target.value.trim())}
            placeholder="Paste key for a demo. A backend is safer later."
            autoComplete="off"
          />
        </label>

        <label className="field">
          <span>Model (optional)</span>
          <input
            value={settings.model}
            onChange={(event) => update('model', event.target.value)}
            placeholder={
              settings.provider === 'openai'
                ? 'gpt-4o-mini'
                : settings.provider === 'groq'
                  ? 'openai/gpt-oss-20b'
                  : 'gemini-2.5-flash'
            }
          />
        </label>

        <label className="field">
          <span>Backend URL (optional, for later)</span>
          <input
            value={settings.backendUrl}
            onChange={(event) => update('backendUrl', event.target.value)}
            placeholder="Leave empty to use Groq"
          />
        </label>

        <label className="field">
          <span>OpenWeather key (live weather)</span>
          <input
            type="password"
            value={settings.weatherApiKey || ''}
            onChange={(event) => update('weatherApiKey', event.target.value.trim())}
            placeholder="From openweathermap.org/api"
            autoComplete="off"
          />
        </label>

        <label className="field">
          <span>Tavily search key (optional)</span>
          <input
            type="password"
            value={settings.searchApiKey || ''}
            onChange={(event) => update('searchApiKey', event.target.value.trim())}
            placeholder="From tavily.com — DuckDuckGo if empty"
            autoComplete="off"
          />
        </label>

        <label className="field">
          <span>Google CSE key (optional)</span>
          <input
            type="password"
            value={settings.googleCseKey || ''}
            onChange={(event) => update('googleCseKey', event.target.value.trim())}
            placeholder="Google Custom Search API key"
            autoComplete="off"
          />
        </label>

        <label className="field">
          <span>Google CSE id (optional)</span>
          <input
            value={settings.googleCseId || ''}
            onChange={(event) => update('googleCseId', event.target.value.trim())}
            placeholder="cx value from Programmable Search"
            autoComplete="off"
          />
        </label>

        <p className="hint">
          Groq (gsk_) is chat + Whisper. OpenWeather is live rain/temperature. Tavily or Google CSE
          is web search. OpenAI (sk-) also unlocks cloud TTS. Leave Backend URL empty.
        </p>
        {(() => {
          const memory = loadMemory();
          const bits = [memory.name && `Name: ${memory.name}`, memory.location && `Place: ${memory.location}`]
            .filter(Boolean);
          return bits.length ? <p className="hint">Remembered — {bits.join(' · ')}</p> : null;
        })()}

        <p className="hint">
          Get a Groq key at console.groq.com/keys (starts with gsk_). Gemini keys start with
          AIza. Keys pasted here stay in this browser and are not secret.
        </p>

        <button type="button" className="danger-btn" onClick={onClearChat}>
          Clear conversation
        </button>
        <button
          type="button"
          className="danger-btn"
          onClick={() => {
            clearMemory();
            onClose();
          }}
        >
          Clear memory
        </button>
      </aside>
    </div>
  );
}

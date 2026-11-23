import { useEffect, useRef, useState } from 'react';
import ChatWindow from './components/ChatWindow.jsx';
import LiveAvatar from './components/LiveAvatar.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import Sparkle from './components/Sparkle.jsx';
import { useConversation } from './hooks/useConversation.js';
import { useSpeechRecognition } from './hooks/useSpeechRecognition.js';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis.js';
import { loadSettings, saveSettings } from './services/storage/settingsStore.js';
import { mergeVoiceDetection } from './services/language/detectLanguage.js';
import { getLanguageLabel } from './constants/languages.js';
import { runAssistantTurn, resetSession } from './services/assistant/assistantEngine.js';
import { suggestChips } from './services/skills/suggestFollowUps.js';
import { useAssistantSkills } from './hooks/useAssistantSkills.js';
import { stripForSpeech } from './utils/formatReply.js';

export default function App() {
  const [settings, setSettings] = useState(() => loadSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [thinking, setThinking] = useState(false);
  const [typed, setTyped] = useState('');
  const { messages, addMessage, reset } = useConversation();
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const groqKey = (settings.apiKey || import.meta.env.VITE_GROQ_API_KEY || '').trim();
  const openaiKey = (
    (settings.apiKey || '').startsWith('sk-')
      ? settings.apiKey
      : import.meta.env.VITE_OPENAI_API_KEY || ''
  ).trim();
  const recognition = useSpeechRecognition(settings.recognitionLanguage, groqKey);
  const tts = useSpeechSynthesis(openaiKey);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const skills = useAssistantSkills({
    onAlarm: (evt) => {
      addMessage({
        role: 'assistant',
        text: evt.text,
        languageId: 'en',
        languageLabel: 'English',
        source: 'skill',
      });
      if (settingsRef.current.speakReplies) {
        tts.speak(stripForSpeech(evt.text), 'en', settingsRef.current.voiceURI);
      }
    },
  });

  useEffect(() => {
    saveSettings(settings);
    window.__airaSpeechRate = settings.speechRate || 1.25;
  }, [settings]);

  async function handleUserText(rawText, whisper = null) {
    const text = (rawText || '').trim();
    if (!text || thinking) return;
    setSearchOpen(false);

    const detection = mergeVoiceDetection(text, whisper);
    const replyLang = settings.responseLanguage === 'auto'
      ? (detection.id === 'auto' ? 'en' : detection.id)
      : settings.responseLanguage;
    const priorHistory = messagesRef.current;
    addMessage({
      role: 'user',
      text,
      languageId: detection.id,
      languageLabel: detection.label,
    });

    setThinking(true);
    tts.cancel();
    try {
      const reply = await runAssistantTurn({
        userText: text,
        history: priorHistory,
        detectedLanguageId: detection.id,
        settings: { ...settings, responseLanguage: replyLang },
        runtime: {
          startTimer: skills.startTimer,
          addReminder: skills.addReminder,
          cancelSpeech: () => tts.cancel(),
          applySpeechCommand: (skill) => {
            if (skill.action === 'mute') setSettings((prev) => ({ ...prev, speakReplies: false }));
            if (skill.action === 'unmute') setSettings((prev) => ({ ...prev, speakReplies: true }));
            if (skill.action === 'slower') {
              setSettings((prev) => ({ ...prev, speechRate: Math.max(0.7, (prev.speechRate || 1.25) - 0.15) }));
            }
            if (skill.action === 'faster') {
              setSettings((prev) => ({ ...prev, speechRate: Math.min(1.6, (prev.speechRate || 1.25) + 0.15) }));
            }
            if (skill.languageId) {
              setSettings((prev) => ({ ...prev, responseLanguage: skill.languageId }));
            }
            if (skill.action === 'repeat') {
              const last = [...messagesRef.current].reverse().find((msg) => msg.role === 'assistant');
              if (last?.text) tts.speak(stripForSpeech(last.text), replyLang, settings.voiceURI);
            }
          },
        },
      });

      addMessage({
        role: 'assistant',
        text: reply.text,
        languageId: replyLang,
        languageLabel: getLanguageLabel(replyLang),
        source: reply.usedFallback ? 'offline fallback' : reply.source,
        warning: reply.warning,
      });

      if (settings.speakReplies && reply.text && !reply.skipSpeak && !(reply.toolsUsed || []).includes('stop')) {
        tts.speak(stripForSpeech(reply.text), replyLang, settings.voiceURI);
      }
    } finally {
      setThinking(false);
    }
  }

  function toggleMic() {
    if (recognition.listening) {
      recognition.stop();
      return;
    }
    tts.cancel();
    recognition.start(handleUserText);
  }

  function submitTyped(event) {
    event.preventDefault();
    const value = typed.trim();
    if (!value) return;
    setTyped('');
    handleUserText(value);
  }

  function newChat() {
    recognition.stop();
    tts.cancel();
    reset();
    resetSession();
    setSearchOpen(false);
    setTyped('');
  }

  const recents = messages.filter((msg) => msg.role === 'user').slice().reverse();
  const filtered = recents.filter((msg) => msg.text.toLowerCase().includes(searchQuery.trim().toLowerCase()));
  const mood = recognition.listening ? 'listen' : thinking ? 'think' : tts.speaking ? 'speak' : 'idle';
  const lastReply = stripForSpeech(
    [...messages].reverse().find((msg) => msg.role === 'assistant')?.text || '',
  );
  const suggestionChips = suggestChips(messages, skills.active);

  return (
    <div className={`shell mood-${mood}`}>
      <aside className="sidebar">
        <button type="button" className="side-brand" onClick={newChat}>
          <Sparkle size={28} />
          Aira
        </button>

        <button type="button" className="new-chat" onClick={newChat}>
          <span>+</span> New Chat
        </button>

        <nav className="side-history">
          {recents.length ? recents.map((msg) => (
            <button key={msg.id} type="button" className="hist-item" title={msg.text}>
              <span className="hist-ico" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M7 4h10a2 2 0 0 1 2 2v14l-7-3-7 3V6a2 2 0 0 1 2-2z" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="hist-text">{msg.text}</span>
            </button>
          )) : (
            <p className="side-empty">Your chats will show up here.</p>
          )}
        </nav>

        <div className="side-foot">
          <button type="button" className="foot-btn" onClick={() => setSearchOpen(true)} aria-label="Search chats" title="Search">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4 4" strokeLinecap="round" />
            </svg>
          </button>
          <button type="button" className="foot-btn" onClick={() => setSettingsOpen(true)} aria-label="Settings" title="Settings">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.2.6.7 1 1.5 1.1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </button>
        </div>
      </aside>

      <main className="canvas">
        <header className="canvas-top">
          <span className="chat-title">Chat</span>
        </header>

        <div className="canvas-body">
          {searchOpen ? (
            <section className="search-modal">
              <div className="search-bar">
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search chats"
                />
                <button type="button" className="icon-ghost" onClick={() => setSearchOpen(false)}>✕</button>
              </div>
              <div className="search-results">
                {filtered.map((msg) => (
                  <button key={msg.id} type="button" className="hist-item" onClick={() => setSearchOpen(false)}>
                    {msg.text}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <div className="thread-scroll">
              <ChatWindow
                messages={messages}
                interimText={recognition.interimText}
                thinking={thinking}
              />
            </div>
          )}
          {recognition.error || tts.error ? <p className="work-error">{recognition.error || tts.error}</p> : null}
        </div>

        <div className="dock">
          <div className={`skill-row ${suggestionChips[0]?.kind === 'follow' ? 'follow' : 'starter'}`} role="list">
            {suggestionChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                role="listitem"
                title={chip.prompt}
                onClick={() => handleUserText(chip.prompt)}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <form className={`composer ${recognition.listening ? 'listening' : ''}`} onSubmit={submitTyped}>
            <button type="button" className="icon-act" onClick={newChat} aria-label="New chat" title="New chat">+</button>
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder={recognition.listening ? 'Listening…' : 'Type a message…'}
              aria-label="Message"
            />
            {tts.speaking ? (
              <button type="button" className="icon-act on" onClick={() => tts.cancel()} aria-label="Stop talking" title="Stop talking">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <rect x="7" y="7" width="10" height="10" rx="2" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                className={`icon-act ${recognition.listening ? 'on' : ''}`}
                onClick={toggleMic}
                disabled={thinking}
                aria-label="Microphone"
                title="Voice"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11h-2z" />
                </svg>
              </button>
            )}
            <button type="submit" className="send" disabled={thinking || !typed.trim()} aria-label="Send">
              +
            </button>
          </form>
        </div>
      </main>

      <aside className="persona">
        <LiveAvatar
          mood={mood}
          interimText={recognition.interimText}
          lastReply={mood === 'speak' ? (tts.spokenFull || lastReply) : lastReply}
          spokenChars={tts.spokenChars}
          onTalk={toggleMic}
        />
        {skills.active.length ? (
          <ul className="skill-live">
            {skills.active.map((item) => (
              <li key={item.id}><strong>{item.kind}</strong> {item.text}</li>
            ))}
          </ul>
        ) : null}
        <div className="persona-tools">
          <button
            type="button"
            className={recognition.listening ? 'on' : ''}
            onClick={toggleMic}
            disabled={thinking}
            aria-label="Microphone"
            title="Talk"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11h-2z" />
            </svg>
          </button>
          <button
            type="button"
            className={settings.speakReplies ? 'on' : ''}
            onClick={() => setSettings((prev) => ({ ...prev, speakReplies: !prev.speakReplies }))}
            aria-label="Voice output"
            title="Voice output"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M11 5 6 9H3v6h3l5 4V5z" strokeLinejoin="round" />
              <path d="M16 9a4 4 0 0 1 0 6" strokeLinecap="round" />
            </svg>
          </button>
          <button type="button" onClick={newChat} aria-label="New chat" title="New chat">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 8v8M8 12h8" strokeLinecap="round" />
            </svg>
          </button>
          <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Settings" title="Settings">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.2.6.7 1 1.5 1.1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </button>
        </div>
        <button type="button" className="help-btn" onClick={() => setSettingsOpen(true)} aria-label="Help">?</button>
      </aside>

      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        voices={tts.voices}
        onChange={setSettings}
        onClose={() => setSettingsOpen(false)}
        onClearChat={() => {
          tts.cancel();
          reset();
        }}
        onTestVoice={() => {
          tts.speak('Voice output is working.', 'en', settings.voiceURI);
        }}
      />
    </div>
  );
}

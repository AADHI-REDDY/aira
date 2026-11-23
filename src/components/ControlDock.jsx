export default function ControlDock({ listening, thinking, onCancel, onMic, onSettings }) {
  return (
    <div className="dock">
      <button type="button" className="dock-btn" onClick={onCancel} aria-label="Cancel">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <button
        type="button"
        className={`dock-btn mic ${listening ? 'on' : ''}`}
        onClick={onMic}
        disabled={thinking}
        aria-label={listening ? 'Stop listening' : 'Start listening'}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11h-2z" />
        </svg>
      </button>
      <button type="button" className="dock-btn" onClick={onSettings} aria-label="Settings">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v2m0 14v2M5 12H3m18 0h-2M6.2 6.2l1.4 1.4m9 9l1.4 1.4m0-11.8l-1.4 1.4m-9 9l-1.4 1.4" />
        </svg>
      </button>
    </div>
  );
}

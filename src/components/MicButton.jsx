export default function MicButton({ listening, disabled, onClick }) {
  return (
    <button
      type="button"
      className={`mic-btn ${listening ? 'listening' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={listening}
      aria-label={listening ? 'Stop listening' : 'Start listening'}
    >
      <span className="mic-icon" aria-hidden="true">
        {listening ? '■' : '●'}
      </span>
      {listening ? 'Listening' : 'Tap to speak'}
    </button>
  );
}

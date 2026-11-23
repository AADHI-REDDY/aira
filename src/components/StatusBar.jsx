export default function StatusBar({ listening, thinking, speaking, detected, error }) {
  let label = 'Ready';
  if (listening) label = 'Listening';
  else if (thinking) label = 'Thinking';
  else if (speaking) label = 'Speaking';

  return (
    <div className="status-bar">
      <span className={`pulse ${listening || thinking || speaking ? 'on' : ''}`}>{label}</span>
      {detected ? <span>Detected: {detected}</span> : null}
      {error ? <span className="error-text">{error}</span> : null}
    </div>
  );
}

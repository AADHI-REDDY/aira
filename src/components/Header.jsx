export default function Header({ onOpenSettings, status }) {
  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">College project demo</p>
        <h1>Multilingual Voice Assistant</h1>
      </div>
      <div className="header-actions">
        <span className={`status-chip ${status}`}>{status}</span>
        <button type="button" className="ghost-btn" onClick={onOpenSettings}>
          Settings
        </button>
      </div>
    </header>
  );
}

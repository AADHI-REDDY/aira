export default function HistorySidebar({ open, messages, onClose, onClear }) {
  return (
    <aside className={`history-rail ${open ? 'open' : ''}`}>
      <div className="rail-head">
        <strong>Voice Assistant</strong>
        <button type="button" className="icon-quiet" onClick={onClose} aria-label="Close history">×</button>
      </div>
      <p className="rail-label">History</p>
      <div className="rail-list">
        {messages.length === 0 ? (
          <p className="rail-empty">No conversation yet.</p>
        ) : (
          messages.map((message) => (
            <article key={message.id} className={`rail-item ${message.role}`}>
              <span>{message.role === 'user' ? 'You' : 'Assistant'}</span>
              <p>{message.text}</p>
            </article>
          ))
        )}
      </div>
      <button type="button" className="rail-clear" onClick={onClear}>Clear conversation</button>
    </aside>
  );
}

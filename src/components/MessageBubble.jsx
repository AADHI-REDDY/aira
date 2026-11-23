export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <article className={`msg ${isUser ? 'user' : 'assistant'}`}>
      <span className="msg-avatar" aria-hidden="true">{isUser ? 'You' : 'A'}</span>
      <div className="msg-body">
        <span className="msg-who">{isUser ? 'You' : 'Aira'}</span>
        <p>{message.text}</p>
        {message.warning ? <p className="bubble-warning">{message.warning}</p> : null}
      </div>
    </article>
  );
}

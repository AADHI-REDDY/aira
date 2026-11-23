import { useEffect, useRef } from 'react';
import Sparkle from './Sparkle.jsx';
import FormattedText from './FormattedText.jsx';

export default function ChatWindow({ messages, interimText, thinking }) {
  const endRef = useRef(null);

  useEffect(() => {
    const node = endRef.current;
    const scroller = node?.closest('.thread-scroll');
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }, [messages, interimText, thinking]);

  return (
    <section className="chat-stream" aria-live="polite">
      {!messages.length && !interimText && !thinking ? (
        <div className="empty-chat">
          <Sparkle size={42} />
          <h3>Hi, I’m Aira</h3>
          <p>Ask out loud or type — it gets it done.</p>
        </div>
      ) : null}
      {messages.map((message) => {
        const isUser = message.role === 'user';
        return (
          <article key={message.id} className={`msg ${isUser ? 'user' : 'assistant'}`}>
            {isUser ? null : (
              <span className="msg-avatar" aria-hidden="true">
                <Sparkle size={16} />
              </span>
            )}
            <div className="msg-body">
              {isUser ? <p>{message.text}</p> : <FormattedText text={message.text} />}
              {message.warning ? <p className="bubble-warning">{message.warning}</p> : null}
            </div>
          </article>
        );
      })}
      {interimText ? (
        <article className="msg user interim">
          <div className="msg-body"><p>{interimText}</p></div>
        </article>
      ) : null}
      {thinking ? (
        <article className="msg assistant">
          <span className="msg-avatar glow">
            <Sparkle size={18} />
          </span>
          <div className="msg-body"><span className="pulse-bar" /></div>
        </article>
      ) : null}
      <div ref={endRef} />
    </section>
  );
}

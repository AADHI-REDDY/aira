import { useEffect, useRef } from 'react';
import Sparkle from './Sparkle.jsx';

function FlowCaption({ mood, interimText, lastReply, spokenChars }) {
  const scroller = useRef(null);
  const spoken = Math.max(0, spokenChars || 0);
  const said = mood === 'speak' ? lastReply.slice(0, spoken) : '';
  const rest = mood === 'speak' ? lastReply.slice(spoken) : '';

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  }, [said, interimText, mood]);

  let body;
  if (mood === 'listen') {
    body = <span className="said">{interimText || 'Go ahead, I’m listening…'}</span>;
  } else if (mood === 'think') {
    body = <span className="said">Give me a second…</span>;
  } else if (mood === 'speak') {
    body = (
      <>
        <span className="said">{said}</span>
        <span className="flow-caret" />
        <span className="upcoming">{rest}</span>
      </>
    );
  } else {
    body = <span className="upcoming">Tap to talk</span>;
  }

  return (
    <div className="live-caption flow" ref={scroller}>
      {body}
    </div>
  );
}

export default function LiveAvatar({
  mood = 'idle',
  interimText = '',
  lastReply = '',
  spokenChars = 0,
  onTalk,
}) {
  return (
    <div className={`live-avatar mood-${mood}`}>
      <button type="button" className="portrait" onClick={onTalk} aria-label="Talk to Aira">
        <span className="ring r1" aria-hidden="true" />
        <span className="ring r2" aria-hidden="true" />
        <span className="ring r3" aria-hidden="true" />
        <span className="portrait-glow" aria-hidden="true" />
        <span className="face" aria-hidden="true">
          <span className="eye left" />
          <span className="eye right" />
          <span className="mouth" />
        </span>
        <span className="mark">
          <Sparkle size={28} />
        </span>
        <span className="bars" aria-hidden="true">
          <i /><i /><i /><i /><i />
        </span>
      </button>
      <div className="persona-id">
        <h2>Aira</h2>
        <p>Live with you</p>
        <span className={`persona-status ${mood}`}>
          {mood === 'listen' ? 'Listening' : mood === 'think' ? 'Thinking' : mood === 'speak' ? 'Speaking' : 'Ready'}
        </span>
      </div>
      <FlowCaption
        mood={mood}
        interimText={interimText}
        lastReply={lastReply}
        spokenChars={spokenChars}
      />
    </div>
  );
}

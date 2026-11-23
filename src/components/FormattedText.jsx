import { parseReplyBlocks, splitInline } from '../utils/formatReply.js';

function Inline({ text }) {
  return splitInline(text).map((part, index) => {
    if (part.type === 'strong') return <strong key={index}>{part.value}</strong>;
    if (part.type === 'code') return <code key={index}>{part.value}</code>;
    if (part.type === 'link') {
      const safe = /^https?:\/\//i.test(part.href || '');
      return safe ? (
        <a key={index} href={part.href} target="_blank" rel="noreferrer">
          {part.value}
        </a>
      ) : (
        <span key={index}>{part.value}</span>
      );
    }
    return <span key={index}>{part.value}</span>;
  });
}

export default function FormattedText({ text }) {
  const blocks = parseReplyBlocks(text);
  return (
    <div className="md">
      {blocks.map((block, index) => {
        if (block.type === 'h') {
          return <p className="md-title" key={index}><Inline text={block.text} /></p>;
        }
        if (block.type === 'list') {
          const Tag = block.ordered ? 'ol' : 'ul';
          return (
            <Tag key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}><Inline text={item} /></li>
              ))}
            </Tag>
          );
        }
        return <p key={index}><Inline text={block.text} /></p>;
      })}
    </div>
  );
}

export function stripForSpeech(raw) {
  let text = String(raw || '');
  text = text.replace(/```[\s\S]*?```/g, ' ');
  text = text.replace(/`([^`]+)`/g, '$1');
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/(^|[^\w])\*([^*\n]+)\*(?=[^\w]|$)/g, '$1$2');
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/^\s*[-*•]\s+/gm, '');
  text = text.replace(/^\s*\d+\.\s+/gm, '');
  text = text.replace(/[ \t]+\n/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

export function parseReplyBlocks(raw) {
  const lines = String(raw || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let list = null;

  const flush = () => {
    if (list) {
      blocks.push(list);
      list = null;
    }
  };

  for (const line of lines) {
    const heading = line.match(/^#{1,3}\s+(.+)\s*$/);
    const ul = line.match(/^\s*(?:[-*•]|\u2013|\u2014)\s*(.+)\s*$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.+)\s*$/);
    if (heading) {
      flush();
      blocks.push({ type: 'h', text: heading[1] });
    } else if (ul) {
      if (!list || list.ordered) {
        flush();
        list = { type: 'list', ordered: false, items: [] };
      }
      list.items.push(ul[1]);
    } else if (ol) {
      if (!list || !list.ordered) {
        flush();
        list = { type: 'list', ordered: true, items: [] };
      }
      list.items.push(ol[1]);
    } else if (!line.trim()) {
      flush();
    } else {
      flush();
      blocks.push({ type: 'p', text: line });
    }
  }
  flush();
  return blocks.length ? blocks : [{ type: 'p', text: String(raw || '') }];
}

export function splitInline(text) {
  const parts = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match;
  while ((match = re.exec(text))) {
    if (match.index > last) {
      parts.push({ type: 'text', value: text.slice(last, match.index) });
    }
    const token = match[0];
    if (token.startsWith('**')) {
      parts.push({ type: 'strong', value: token.slice(2, -2) });
    } else if (token.startsWith('`')) {
      parts.push({ type: 'code', value: token.slice(1, -1) });
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      parts.push({ type: 'link', value: link[1], href: link[2] });
    }
    last = match.index + token.length;
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
  return parts;
}

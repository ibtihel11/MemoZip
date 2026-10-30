import type { ReactNode } from 'react';

/**
 * Small, safe Markdown renderer for AI answers: headings, bold, italic, inline code, code blocks,
 * bullet and numbered lists. It builds React elements only (no HTML injection).
 */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;
  let last = 0;
  let i = 0;
  for (const match of text.matchAll(pattern)) {
    const token = match[0];
    const start = match.index ?? 0;
    if (start > last) parts.push(text.slice(last, start));
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith('**')) parts.push(<strong key={key} className="font-semibold">{token.slice(2, -2)}</strong>);
    else if (token.startsWith('`')) parts.push(<code key={key} className="rounded bg-surface2 px-1.5 py-0.5 text-[0.9em]">{token.slice(1, -1)}</code>);
    else parts.push(<em key={key}>{token.slice(1, -1)}</em>);
    last = start + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'ul' | 'ol'; items: string[] }
  | { kind: 'p'; text: string };

function parse(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
    } else if (line.trim().startsWith('```')) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) code.push(lines[i++]);
      i++;
      blocks.push({ kind: 'code', text: code.join('\n') });
    } else if (/^#{1,4}\s+/.test(line)) {
      blocks.push({ kind: 'heading', level: line.match(/^#+/)![0].length, text: line.replace(/^#{1,4}\s+/, '') });
      i++;
    } else if (/^\s*[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*•]\s+/, ''));
      blocks.push({ kind: 'ul', items });
    } else if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ''));
      blocks.push({ kind: 'ol', items });
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|\s*[-*•]\s|\s*\d+[.)]\s|\s*```)/.test(lines[i])) para.push(lines[i++]);
      blocks.push({ kind: 'p', text: para.join('\n') });
    }
  }
  return blocks;
}

export function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-4 text-[1.0625rem] leading-8">
      {parse(text).map((block, i) => {
        const key = `b${i}`;
        switch (block.kind) {
          case 'heading':
            return (
              <h3 key={key} className={block.level <= 2 ? 'pt-1 text-xl font-semibold' : 'pt-1 text-lg font-semibold'}>
                {inline(block.text, key)}
              </h3>
            );
          case 'code':
            return (
              <pre key={key} className="overflow-x-auto rounded-lg border border-border bg-surface2 p-4 text-sm leading-6">
                <code>{block.text}</code>
              </pre>
            );
          case 'ul':
            return (
              <ul key={key} className="list-disc space-y-1.5 pl-6 marker:text-accent-text">
                {block.items.map((item, j) => <li key={j}>{inline(item, `${key}-${j}`)}</li>)}
              </ul>
            );
          case 'ol':
            return (
              <ol key={key} className="list-decimal space-y-1.5 pl-6 marker:text-accent-text">
                {block.items.map((item, j) => <li key={j}>{inline(item, `${key}-${j}`)}</li>)}
              </ol>
            );
          default:
            return <p key={key} className="whitespace-pre-line">{inline(block.text, key)}</p>;
        }
      })}
    </div>
  );
}

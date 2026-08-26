import React from 'react';

/**
 * renderLiteMarkdown.jsx
 * =======================
 * Renders **bold**, bullet lists (-/*), and numbered lists (1.) from
 * AI-generated hint text as real React elements — no dangerouslySetInnerHTML,
 * so there's no HTML-injection surface. Not a full markdown parser: the AI
 * mentor prompt only ever produces this small subset (bold emphasis + simple
 * lists + paragraphs), so a small dependency-free renderer covers real
 * output without pulling in react-markdown for a handful of tags.
 */

function renderInline(text, keyPrefix) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter((p) => p.length > 0);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
    ) : (
      <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>
    )
  );
}

export function renderLiteMarkdown(text) {
  if (!text) return null;

  const blocks = [];
  let listItems = null;
  let listOrdered = false;

  const flushList = () => {
    if (listItems && listItems.length) {
      const Tag = listOrdered ? 'ol' : 'ul';
      blocks.push(
        <Tag
          key={`list-${blocks.length}`}
          className={listOrdered ? 'list-decimal pl-5 space-y-1' : 'list-disc pl-5 space-y-1'}
        >
          {listItems}
        </Tag>
      );
    }
    listItems = null;
  };

  text.split('\n').forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      return;
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)/);
    const numberedMatch = line.match(/^\d+\.\s+(.*)/);

    if (bulletMatch || numberedMatch) {
      const isOrdered = !!numberedMatch;
      if (listItems && listOrdered !== isOrdered) flushList();
      listOrdered = isOrdered;
      if (!listItems) listItems = [];
      listItems.push(
        <li key={`li-${idx}`}>{renderInline((bulletMatch || numberedMatch)[1], `li-${idx}`)}</li>
      );
      return;
    }

    flushList();
    blocks.push(<p key={`p-${idx}`}>{renderInline(line, `p-${idx}`)}</p>);
  });
  flushList();

  return blocks;
}

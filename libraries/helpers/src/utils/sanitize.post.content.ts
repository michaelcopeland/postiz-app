import DOMPurify from 'isomorphic-dompurify';
import { parseFragment } from 'parse5';

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'u',
  'a',
  'ul',
  'li',
  'h1',
  'h2',
  'h3',
  'span',
  'img',
  // article channels (WordPress) carry pictures with captions and videos
  'em',
  'figure',
  'figcaption',
  'video',
];

const ALLOWED_ATTR = [
  'dir',
  'href',
  'target',
  'rel',
  'class',
  'data-mention-id',
  'data-mention-label',
  'src',
  'alt',
  'width',
  'height',
  'poster',
  'controls',
  'preload',
  'playsinline',
];

// <img> keeps data: URIs whatever ALLOWED_URI_REGEXP says, so a picture
// or video that doesn't point to a real file is dropped
DOMPurify.addHook('uponSanitizeElement', (node, data) => {
  if (
    (data.tagName === 'img' || data.tagName === 'video') &&
    !/^https?:\/\//i.test((node as Element).getAttribute('src') || '')
  ) {
    node.parentNode?.removeChild(node);
  }
});

// ALLOWED_URI_REGEXP is checked against every attribute that is not a known
// URI-safe one, so plain values such as dir="auto", width="1920" or
// preload="none" were dropped; keep these when the value is only words or
// numbers (no ":" so it can never become a script URL)
const PLAIN_ATTR = [
  'dir',
  'target',
  'rel',
  'width',
  'height',
  'preload',
  'controls',
  'playsinline',
];
DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
  if (PLAIN_ATTR.includes(data.attrName) && /^[\w -]*$/.test(data.attrValue)) {
    data.forceKeepAttr = true;
  }
});

export const sanitizePostContent = (value: unknown): string => {
  if (typeof value !== 'string' || !value) {
    return '';
  }

  // a block tag the editor doesn't know would be dropped with its text kept,
  // gluing its line to the next one
  const paragraphs = value.replace(
    /<(\/?)(div|section|article|blockquote|pre|h[4-6])\b[^<>]*>/gi,
    '<$1p>'
  );

  return DOMPurify.sanitize(paragraphs, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|\/|#)/i,
  });
};

// The plain text a reviewer sees for a post item: the text nodes of the
// sanitised HTML, in order, entities decoded. This is what anchor offsets
// index into on both the frontend (element.textContent) and the backend.
export const postContentPlainText = (value: unknown): string => {
  const walk = (nodes: any[]): string =>
    nodes
      .map((node) =>
        node.nodeName === '#text' ? node.value : walk(node.childNodes || [])
      )
      .join('');

  return walk(parseFragment(sanitizePostContent(value)).childNodes as any[]);
};

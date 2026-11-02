import { parseFragment, serialize } from 'parse5';

// Block themes (Twenty Twenty-Four and later) only load the styles of the
// blocks a post uses, so a post sent as plain HTML shows its pictures and
// videos at their full size. Wrapping each top-level element in the block it
// is makes WordPress style it as if it was written in its own editor.

const outer = (node: any) =>
  serialize({ nodeName: '#document-fragment', childNodes: [node] } as any);

const hasChild = (node: any, tag: string): boolean =>
  (node.childNodes || []).some(
    (child: any) => child.tagName === tag || hasChild(child, tag)
  );

const addClass = (html: string, tag: string, className: string) =>
  html.replace(new RegExp(`<${tag}(\\s[^>]*)?>`), (open, attrs = '') =>
    open.includes(className)
      ? open
      : / class="/.test(attrs)
        ? open.replace(/ class="/, ` class="${className} `)
        : `<${tag}${attrs} class="${className}">`
  );

const block = (name: string, html: string, attrs?: object) =>
  `<!-- wp:${name}${attrs ? ' ' + JSON.stringify(attrs) : ''} -->\n${html}\n<!-- /wp:${name} -->`;

const caption = (html: string) =>
  addClass(html, 'figcaption', 'wp-element-caption');

const toBlock = (node: any): string => {
  const tag = node.tagName;

  if (node.nodeName === '#text') {
    return node.value.trim() ? block('paragraph', `<p>${node.value.trim()}</p>`) : '';
  }

  if (tag === 'p') {
    // a picture alone in a paragraph is a picture
    const kids = (node.childNodes || []).filter(
      (c: any) => c.nodeName !== '#text' || c.value.trim()
    );
    if (kids.length === 1 && ['img', 'video'].includes(kids[0].tagName)) {
      return toBlock(kids[0]);
    }
    return block('paragraph', outer(node));
  }

  if (/^h[1-6]$/.test(tag)) {
    const level = Number(tag[1]);
    return block(
      'heading',
      addClass(outer(node), tag, 'wp-block-heading'),
      level === 2 ? undefined : { level }
    );
  }

  if (tag === 'ul' || tag === 'ol') {
    const items = (node.childNodes || [])
      .filter((c: any) => c.tagName === 'li')
      .map((li: any) => block('list-item', outer(li)))
      .join('\n');
    const open = outer(node).match(new RegExp(`^<${tag}[^>]*>`))![0];
    return block(
      'list',
      `${addClass(open, tag, 'wp-block-list')}${items}</${tag}>`,
      tag === 'ol' ? { ordered: true } : undefined
    );
  }

  if (tag === 'video' || (tag === 'figure' && hasChild(node, 'video'))) {
    const html = tag === 'video' ? `<figure>${outer(node)}</figure>` : outer(node);
    return block('video', caption(addClass(html, 'figure', 'wp-block-video')));
  }

  if (tag === 'img' || (tag === 'figure' && hasChild(node, 'img'))) {
    const html = tag === 'img' ? `<figure>${outer(node)}</figure>` : outer(node);
    return block(
      'image',
      caption(addClass(html, 'figure', 'wp-block-image size-large')),
      { sizeSlug: 'large' }
    );
  }

  return block('html', outer(node));
};

export const toWordpressBlocks = (html: string): string =>
  (parseFragment(html || '').childNodes as any[])
    .map(toBlock)
    .filter(Boolean)
    .join('\n\n');

const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'em',
  'u',
  's',
  'code',
  'pre',
  'h1',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
  'img',
]);

const ALLOWED_ATTR = new Set(['href', 'target', 'rel', 'src', 'alt', 'title']);

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function isSafeUrl(attribute: string, value: string) {
  if (!['href', 'src'].includes(attribute)) return true;

  try {
    const parsed = new URL(value, 'https://davkawt.local');
    if (attribute === 'src') return ['http:', 'https:'].includes(parsed.protocol);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function sanitizeAttributes(rawAttributes: string) {
  const attributes: string[] = [];
  const attrPattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'<>`]+))/g;
  let match: RegExpExecArray | null;

  while ((match = attrPattern.exec(rawAttributes)) !== null) {
    const rawName = match[1];
    if (!rawName) continue;

    const name = rawName.toLowerCase();
    const value = match[3] ?? match[4] ?? match[5] ?? '';

    if (!ALLOWED_ATTR.has(name) || name.startsWith('on') || !isSafeUrl(name, value)) {
      continue;
    }

    attributes.push(`${name}="${escapeAttribute(value)}"`);
  }

  return attributes.length > 0 ? ` ${attributes.join(' ')}` : '';
}

export function sanitizeHtml(dirty: string): string {
  return dirty
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe|object|embed|svg|math|link|meta)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (tag, rawName: string, rawAttributes: string) => {
      const name = rawName.toLowerCase();
      if (!ALLOWED_TAGS.has(name)) return '';
      if (tag.startsWith('</')) return `</${name}>`;
      if (name === 'br') return '<br>';
      return `<${name}${sanitizeAttributes(rawAttributes)}>`;
    });
}

export function stripHtml(dirty: string): string {
  return sanitizeHtml(dirty)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

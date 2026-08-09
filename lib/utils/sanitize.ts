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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatAnnouncementHtml(content: string): string {
  const sanitized = sanitizeHtml(content.trim());
  if (/<(?:p|h[1-4]|ul|ol|li|blockquote|pre)\b/i.test(sanitized)) {
    return sanitized;
  }

  let text = stripHtml(content);
  const isMeetingMinutes = /minutes of meeting|agenda\s*&\s*key discussion/i.test(text);
  if (!isMeetingMinutes) {
    return `<p>${escapeHtml(text)}</p>`;
  }

  text = text
    .replace(/\s+(?=(?:Meeting|Key Focus|Action Points?|Responsibility|Timeline|Key Decisions)\s*:)/gi, '\n\n')
    .replace(/\s+(?=Agenda\s*&\s*Key Discussion Points\b)/gi, '\n\n')
    .replace(/\s+(?=\d+\.\s+[A-Z])/g, '\n\n')
    .replace(/\s*\*\s+/g, '\n* ')
    .replace(/\s+—{2,}\s+/g, '\n\n');

  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const html: string[] = [];
  let listOpen = false;

  for (const line of lines) {
    if (line.startsWith('* ')) {
      if (!listOpen) {
        html.push('<ul>');
        listOpen = true;
      }
      html.push(`<li>${escapeHtml(line.slice(2))}</li>`);
      continue;
    }
    if (listOpen) {
      html.push('</ul>');
      listOpen = false;
    }

    const escaped = escapeHtml(line);
    if (/^Minutes of Meeting/i.test(line)) {
      html.push(`<h2>${escaped}</h2>`);
    } else if (/^\d+\.\s+/.test(line) || /^(?:Agenda|Key Decisions)\b/i.test(line)) {
      html.push(`<h3>${escaped}</h3>`);
    } else {
      html.push(`<p>${escaped.replace(/^([A-Za-z &/]+:)/, '<strong>$1</strong>')}</p>`);
    }
  }
  if (listOpen) html.push('</ul>');

  return sanitizeHtml(html.join(''));
}

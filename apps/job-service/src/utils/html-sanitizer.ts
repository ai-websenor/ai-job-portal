import sanitizeHtml from 'sanitize-html';

/**
 * Allowlist-based HTML sanitizer for rich-text job/description fields.
 *
 * The employer create/update form lets users paste formatted content (bold,
 * italic, underline, lists, tables, aligned paragraphs) which is stored as
 * HTML. Because the API can be called directly (bypassing any frontend
 * sanitization), HTML MUST be sanitized server-side before persistence to
 * prevent stored XSS. This is the security boundary — never trust client HTML.
 *
 * Strategy: strip everything not on the allowlist (scripts, event handlers,
 * iframes, javascript: URLs, style/expression payloads, etc.) while keeping
 * the formatting tags employers actually need.
 */
const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    // text + structure
    'p',
    'br',
    'hr',
    'div',
    'span',
    'blockquote',
    'pre',
    'code',
    // inline formatting
    'b',
    'strong',
    'i',
    'em',
    'u',
    's',
    'strike',
    'sub',
    'sup',
    'mark',
    'small',
    // headings
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    // lists
    'ul',
    'ol',
    'li',
    // links
    'a',
    // tables
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'td',
    'th',
    'caption',
    'col',
    'colgroup',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    td: ['colspan', 'rowspan', 'style'],
    th: ['colspan', 'rowspan', 'style'],
    col: ['span', 'style'],
    table: ['style'],
    p: ['style'],
    div: ['style'],
    span: ['style'],
    h1: ['style'],
    h2: ['style'],
    h3: ['style'],
    h4: ['style'],
    h5: ['style'],
    h6: ['style'],
    li: ['style'],
  },
  // Only allow a safe subset of inline styles (alignment + basic emphasis).
  // sanitize-html drops anything not matching these regexes, blocking
  // expression()/url()/behavior payloads.
  allowedStyles: {
    '*': {
      'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
      'font-weight': [/^bold$/, /^bolder$/, /^[1-9]00$/, /^normal$/],
      'font-style': [/^italic$/, /^normal$/],
      'text-decoration': [/^underline$/, /^line-through$/, /^none$/],
      'vertical-align': [/^top$/, /^middle$/, /^bottom$/, /^baseline$/],
    },
  },
  // Only http(s) and mailto links; blocks javascript:, data:, etc.
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  // Force external links to be safe.
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow' }),
  },
};

/**
 * Sanitize a rich-text HTML string. Returns sanitized HTML, or the original
 * value unchanged when it is null/undefined (so optional fields stay optional).
 */
export function sanitizeRichText<T extends string | null | undefined>(value: T): T {
  if (value === null || value === undefined) return value;
  return sanitizeHtml(value, RICH_TEXT_OPTIONS) as T;
}

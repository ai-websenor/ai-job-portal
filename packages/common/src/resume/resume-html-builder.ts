import { generateResumeBaseStyles, ResumeStyleConfig } from './resume-base-styles';
import { GOOGLE_FONTS_URL } from './resume-pdf.constants';

export interface BuildHtmlDocumentOptions {
  /** The template HTML content (body content or full document) */
  contentHtml: string;
  /** Template CSS from the database */
  templateCss?: string;
  /** Dynamic style overrides */
  styleConfig?: ResumeStyleConfig;
  /** If true, skip base styles injection (for full documents that already include styles) */
  skipBaseStyles?: boolean;
}

/**
 * Builds a complete HTML document for resume rendering. Used by:
 * - user-service PDF generation (Puppeteer)
 * - admin-service preview endpoint
 * - Frontend preview (via the base styles + template CSS returned by the API)
 *
 * CSS layering order:
 *   1. Base styles (CSS reset, A4 sizing, fonts, page breaks)
 *   2. Template CSS (from database)
 *   3. Dynamic overrides (from styleConfig)
 *
 * Template CSS can override base styles since it loads after.
 */
export function buildResumeHtmlDocument(options: BuildHtmlDocumentOptions): string {
  const { contentHtml, templateCss, styleConfig, skipBaseStyles } = options;

  const hasHtmlTag = /<html[\s>]/i.test(contentHtml);

  // If content is already a full document and base styles should be skipped,
  // only inject template CSS if provided
  if (hasHtmlTag && skipBaseStyles) {
    if (!templateCss?.trim()) return contentHtml;
    if (/<head[\s>]/i.test(contentHtml)) {
      return contentHtml.replace(/<\/head>/i, `<style>${templateCss}</style></head>`);
    }
    return contentHtml.replace(
      /<html([^>]*)>/i,
      `<html$1><head><style>${templateCss}</style></head>`,
    );
  }

  const baseStyles = generateResumeBaseStyles(styleConfig);
  const templateStyleBlock = templateCss?.trim()
    ? `\n  <style>\n    /* === Template Styles === */\n    ${templateCss}\n  </style>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${GOOGLE_FONTS_URL}" rel="stylesheet">
  <style>
    /* === Base Resume Styles === */
    ${baseStyles}
  </style>${templateStyleBlock}
</head>
<body>
  ${contentHtml}
</body>
</html>`;
}

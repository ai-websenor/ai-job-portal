import { DEFAULT_RESUME_STYLE, GOOGLE_FONTS_URL } from './resume-pdf.constants';

/**
 * Dynamic styling configuration that can override default resume styles.
 * All fields are optional — defaults from DEFAULT_RESUME_STYLE are used.
 */
export interface ResumeStyleConfig {
  fontFamily?: string;
  fontSize?: string;
  lineHeight?: string;
  color?: string;
  accentColor?: string;
  pageMargin?: string;
}

/**
 * Generates the base CSS that must be injected into every resume HTML document —
 * both for frontend preview and backend PDF generation.
 *
 * This CSS provides:
 * 1. CSS reset (box-sizing, margin, padding normalization)
 * 2. @page rule for Puppeteer PDF (zero page margins)
 * 3. Font loading via Google Fonts
 * 4. Typography defaults
 * 5. Page break handling
 * 6. CSS custom properties for dynamic theming
 *
 * IMPORTANT: No explicit width/height on html or body.
 * Puppeteer sets the viewport to A4 dimensions (794×1123),
 * so the body naturally fills the page. Hardcoding pixel or mm
 * widths causes rounding mismatches that leave visible borders.
 */
export function generateResumeBaseStyles(config: ResumeStyleConfig = {}): string {
  const fontFamily = config.fontFamily || DEFAULT_RESUME_STYLE.fontFamily;
  const fontSize = config.fontSize || DEFAULT_RESUME_STYLE.fontSize;
  const lineHeight = config.lineHeight || DEFAULT_RESUME_STYLE.lineHeight;
  const color = config.color || DEFAULT_RESUME_STYLE.color;
  const accentColor = config.accentColor || DEFAULT_RESUME_STYLE.accentColor;
  const pageMargin = config.pageMargin || DEFAULT_RESUME_STYLE.pageMargin;

  return `
    @import url('${GOOGLE_FONTS_URL}');

    /* === Zero-margin page for Puppeteer PDF generation === */
    @page {
      margin: 0;
    }

    /* === CSS Reset for Resume === */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html {
      margin: 0 !important;
      padding: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff;
      font-family: ${fontFamily};
      font-size: ${fontSize};
      line-height: ${lineHeight};
      color: ${color};
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      overflow-wrap: break-word;
      word-wrap: break-word;
    }

    /* Ensure the template root container fills the full page height */
    body > :first-child {
      min-height: 100vh;
    }

    /* === CSS Custom Properties for Dynamic Theming === */
    :root {
      --resume-font-family: ${fontFamily};
      --resume-font-size: ${fontSize};
      --resume-line-height: ${lineHeight};
      --resume-color: ${color};
      --resume-accent-color: ${accentColor};
      --resume-page-margin: ${pageMargin};
    }

    /* === Typography Defaults === */
    h1, h2, h3, h4, h5, h6 {
      font-family: inherit;
      line-height: 1.2;
      color: inherit;
      margin-bottom: 0.3em;
    }

    p {
      margin-bottom: 0.4em;
    }

    ul, ol {
      padding-left: 1.5em;
      margin-bottom: 0.4em;
    }

    li {
      margin-bottom: 0.15em;
    }

    a {
      color: ${accentColor};
      text-decoration: none;
    }

    /* === Page Break Handling === */
    .resume-section {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .resume-section-title {
      break-after: avoid;
      page-break-after: avoid;
    }

    .resume-item {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    h1, h2, h3, h4, h5, h6 {
      break-after: avoid;
      page-break-after: avoid;
    }

    /* Prevent orphan lines */
    p {
      orphans: 3;
      widows: 3;
    }

    /* === Utility Classes for Templates === */
    .page-break {
      break-before: page;
      page-break-before: always;
    }

    .no-break {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    /* === Image Handling === */
    img {
      max-width: 100%;
      height: auto;
    }

    /* === Table Normalization === */
    table {
      border-collapse: collapse;
      width: 100%;
    }
  `;
}

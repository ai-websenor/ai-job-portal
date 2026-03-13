/**
 * A4 dimensions at 96dpi (standard CSS pixel ratio)
 * A4 physical: 210mm x 297mm
 * At 96dpi: 794px x 1123px (rounded from 793.7 x 1122.5)
 */
export const A4_DIMENSIONS = {
  WIDTH_MM: 210,
  HEIGHT_MM: 297,
  WIDTH_PX: 794,
  HEIGHT_PX: 1123,
} as const;

/**
 * Default resume styling configuration. These are defaults that can be
 * overridden per-request via the ResumeStyleConfig interface.
 */
export const DEFAULT_RESUME_STYLE = {
  fontFamily: "'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
  fontSize: '11pt',
  lineHeight: '1.4',
  color: '#1a1a1a',
  accentColor: '#2563eb',
  pageMargin: '15mm',
} as const;

/**
 * Google Fonts URL for fonts that should be available in both
 * browser preview and Puppeteer PDF generation.
 */
export const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap';

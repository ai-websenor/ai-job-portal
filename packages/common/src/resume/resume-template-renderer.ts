import Handlebars from 'handlebars';
import { normalizeResumeData } from './resume-data-normalizer';

/**
 * Register custom Handlebars helpers for resume templates.
 *
 * Available helpers:
 *   {{#ifNotEmpty value}}...{{else}}...{{/ifNotEmpty}}
 *   {{formatDate dateString}}
 *   {{joinArray arrayOfStrings ", "}}
 *   {{eq a b}}
 */

Handlebars.registerHelper('ifNotEmpty', function (this: any, value: any, options: any) {
  const hasContent = Array.isArray(value) ? value.length > 0 : value != null && value !== '';
  return hasContent ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('formatDate', function (date: any) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
});

Handlebars.registerHelper('joinArray', function (arr: any, separator: any) {
  if (!Array.isArray(arr)) return '';
  const sep = typeof separator === 'string' ? separator : ', ';
  return arr.filter(Boolean).join(sep);
});

Handlebars.registerHelper('eq', function (this: any, a: any, b: any, options: any) {
  return a === b ? options.fn(this) : options.inverse(this);
});

/**
 * Compiles and renders a Handlebars template with the given data.
 * Automatically normalizes incoming data to handle field name variations
 * (e.g. phoneNumber→phone, institutionName→institution, skills as object→array).
 * Uses `noEscape: true` so HTML in data values is preserved (template
 * authors control escaping via triple-braces when needed).
 */
export function renderResumeTemplate(templateHtml: string, data: Record<string, any>): string {
  const normalized = normalizeResumeData(data);
  const compiled = Handlebars.compile(templateHtml, { noEscape: true });
  return compiled(normalized);
}

import Handlebars from 'handlebars';
import { ITemplateRenderConfig, ITemplateStructuredData } from '../types/types';

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

export const generateFullHtml = (
  html: string,
  css: string,
  data: ITemplateStructuredData,
  renderConfig: ITemplateRenderConfig,
) => {
  const template = Handlebars.compile(html, { noEscape: true });
  const renderedHtml = template(data);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="${renderConfig.googleFontsUrl}">
      <style>
        ${renderConfig.baseStylesCss}
        ${css}
      </style>
    </head>
    <body style="margin: 0; padding: 0;">
      ${renderedHtml}
    </body>
    </html>
  `;
};

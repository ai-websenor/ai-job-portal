import Handlebars from 'handlebars';

/**
 * Validates a resume template by attempting to pre-compile it with Handlebars.
 * Use this at seed/save time to catch syntax errors early.
 */
export function validateResumeTemplate(html: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    Handlebars.precompile(html);
  } catch (e: any) {
    errors.push(`Template compilation error: ${e.message || e}`);
  }

  return { valid: errors.length === 0, errors };
}

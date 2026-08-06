import { Transform } from 'class-transformer';

const BULLET_MARKER_REGEX = /^\s*(?:[*•●▪‣⁃-]|\d+[.)])\s+/;

/**
 * Normalizes a text field that clients may send as either a string or an array
 * of bullet lines (the resume parser emits arrays). Arrays are stripped of
 * leading bullet markers and joined with newlines so the value fits the
 * underlying `text` column.
 */
export const NormalizeBulletText = () =>
  Transform(({ value }) => {
    if (!Array.isArray(value)) return value;

    return value
      .filter((line): line is string => typeof line === 'string')
      .map((line) => line.replace(BULLET_MARKER_REGEX, '').trim())
      .filter((line) => line.length > 0)
      .join('\n');
  });

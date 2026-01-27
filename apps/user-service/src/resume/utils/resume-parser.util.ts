import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';
import { Logger } from '@nestjs/common';

const logger = new Logger('ResumeParser');

export interface ParseResult {
  text: string;
  success: boolean;
  error?: string;
}

/**
 * Normalizes extracted text by cleaning up whitespace and line breaks
 */
function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n') // Collapse multiple blank lines
    .replace(/[ \t]+/g, ' ') // Collapse multiple spaces/tabs
    .replace(/^\s+|\s+$/gm, '') // Trim each line
    .trim();
}

/**
 * Parses PDF files and extracts plain text using pdf-parse v2
 */
async function parsePdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return normalizeText(result.text);
  } finally {
    await parser.destroy();
  }
}

/**
 * Parses DOCX files and extracts plain text
 */
async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return normalizeText(result.value);
}

/**
 * Parses DOC files - attempts to extract text with fallback
 * Note: DOC format is legacy and may not parse perfectly
 */
async function parseDoc(buffer: Buffer): Promise<string> {
  // DOC files are binary and harder to parse
  // mammoth only supports DOCX, so we'll try to extract any readable text
  // This is a basic fallback - for production, consider using a conversion service
  try {
    // Try mammoth first in case it's actually a DOCX with wrong extension
    const result = await mammoth.extractRawText({ buffer });
    if (result.value && result.value.trim().length > 0) {
      return normalizeText(result.value);
    }
  } catch {
    // Expected for true DOC files
  }

  // Basic text extraction fallback for DOC files
  // Extract any readable ASCII/UTF-8 text from the binary
  const text = buffer.toString('utf-8');
  const cleanText = text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ') // Remove control characters
    .replace(/[^\x20-\x7E\n\r\t\u00A0-\uFFFF]/g, ' '); // Keep printable chars

  const normalized = normalizeText(cleanText);

  // If we got very little text, it likely failed
  if (normalized.length < 50) {
    throw new Error(
      'DOC file parsing returned insufficient text - file may be corrupted or use unsupported format',
    );
  }

  return normalized;
}

/**
 * Parses a resume file and extracts plain text
 * Supports PDF, DOCX, and DOC formats
 *
 * @param buffer - The file buffer
 * @param mimeType - The MIME type of the file
 * @returns ParseResult with extracted text or error info
 */
export async function parseResumeText(buffer: Buffer, mimeType: string): Promise<ParseResult> {
  try {
    let text: string;

    switch (mimeType) {
      case 'application/pdf':
        text = await parsePdf(buffer);
        break;

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        text = await parseDocx(buffer);
        break;

      case 'application/msword':
        text = await parseDoc(buffer);
        break;

      default:
        return {
          text: '',
          success: false,
          error: `Unsupported file type: ${mimeType}`,
        };
    }

    if (!text || text.length === 0) {
      return {
        text: '',
        success: false,
        error: 'No text content extracted from file',
      };
    }

    logger.log(`Successfully parsed resume: ${text.length} characters extracted`);

    return {
      text,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
    logger.error(`Resume parsing failed: ${errorMessage}`);

    return {
      text: '',
      success: false,
      error: errorMessage,
    };
  }
}

// Base data cleanser

import { DataCleanser, CleansingOptions, CleansingRule } from './types';

export class BaseDataCleanser implements DataCleanser {
  async cleanse(text: string, options?: CleansingOptions): Promise<string> {
    let cleanedText = text;

    const opts = {
      removeHeaders: true,
      removeFooters: true,
      removePageNumbers: true,
      normalizeWhitespace: true,
      fixEncoding: true,
      removeUrls: false,
      removeEmails: false,
      ...options
    };

    // Apply cleaning steps in order
    if (opts.fixEncoding) {
      cleanedText = this.fixEncoding(cleanedText);
    }

    if (opts.removeHeaders) {
      cleanedText = this.removeHeaders(cleanedText);
    }

    if (opts.removeFooters) {
      cleanedText = this.removeFooters(cleanedText);
    }

    if (opts.removePageNumbers) {
      cleanedText = this.removePageNumbers(cleanedText);
    }

    if (opts.removeUrls) {
      cleanedText = this.removeUrls(cleanedText);
    }

    if (opts.removeEmails) {
      cleanedText = this.removeEmails(cleanedText);
    }

    if (opts.customRules && opts.customRules.length > 0) {
      cleanedText = this.applyCustomRules(cleanedText, opts.customRules);
    }

    if (opts.normalizeWhitespace) {
      cleanedText = this.normalizeWhitespace(cleanedText);
    }

    return cleanedText;
  }

  async cleanseChunks(chunks: string[], options?: CleansingOptions): Promise<string[]> {
    const cleanedChunks: string[] = [];
    
    for (const chunk of chunks) {
      const cleaned = await this.cleanse(chunk, options);
      cleanedChunks.push(cleaned);
    }

    return cleanedChunks;
  }

  protected fixEncoding(text: string): string {
    // Fix common encoding issues
    return text
      .replace(/â€™/g, "'")
      .replace(/â€œ/g, '"')
      .replace(/â€/g, '"')
      .replace(/â€"/g, '—')
      .replace(/â€"/g, '–')
      .replace(/Ã©/g, 'é')
      .replace(/Ã¨/g, 'è')
      .replace(/Ã /g, 'à')
      .replace(/Ã¢/g, 'â')
      .replace(/Ã§/g, 'ç')
      .replace(/\u0000/g, '') // Remove null characters
      .replace(/[\x00-\x1F\x7F-\x9F]/g, ''); // Remove control characters
  }

  protected removeHeaders(text: string): string {
    // Remove common header patterns
    const lines = text.split('\n');
    const cleanedLines: string[] = [];
    let inHeader = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for header patterns
      if (i < 5 && this.isHeaderLine(line)) {
        inHeader = true;
        continue;
      }

      // Check if we're out of header
      if (inHeader && line.length > 50) {
        inHeader = false;
      }

      if (!inHeader) {
        cleanedLines.push(lines[i]);
      }
    }

    return cleanedLines.join('\n');
  }

  protected removeFooters(text: string): string {
    // Remove common footer patterns
    const lines = text.split('\n');
    const cleanedLines: string[] = [];
    let footerStartIndex = lines.length;

    // Scan from bottom to find footer start
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 10); i--) {
      const line = lines[i].trim();
      
      if (this.isFooterLine(line)) {
        footerStartIndex = i;
      } else if (line.length > 50) {
        break;
      }
    }

    return lines.slice(0, footerStartIndex).join('\n');
  }

  protected removePageNumbers(text: string): string {
    // Remove standalone page numbers
    return text
      .replace(/^\s*\d+\s*$/gm, '') // Page numbers on their own line
      .replace(/^Page\s+\d+\s*$/gim, '') // "Page X" format
      .replace(/^\s*\d+\s*\/\s*\d+\s*$/gm, '') // "X/Y" format
      .replace(/^\s*-\s*\d+\s*-\s*$/gm, ''); // "- X -" format
  }

  protected removeUrls(text: string): string {
    // Remove URLs
    return text.replace(/https?:\/\/[^\s]+/g, '');
  }

  protected removeEmails(text: string): string {
    // Remove email addresses
    return text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '');
  }

  protected normalizeWhitespace(text: string): string {
    return text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n')
      .replace(/\t/g, '    ') // Convert tabs to spaces
      .replace(/ +/g, ' ') // Multiple spaces to single space
      .replace(/\n{3,}/g, '\n\n') // Multiple newlines to double newline
      .replace(/^\s+|\s+$/g, ''); // Trim start and end
  }

  protected applyCustomRules(text: string, rules: CleansingRule[]): string {
    let result = text;

    for (const rule of rules) {
      const regex = rule.pattern instanceof RegExp 
        ? rule.pattern 
        : new RegExp(rule.pattern, rule.flags || 'g');
      
      result = result.replace(regex, rule.replacement);
    }

    return result;
  }

  private isHeaderLine(line: string): boolean {
    // Common header patterns
    return /^(page|document|chapter|section)\s*\d+/i.test(line) ||
           /^(confidential|proprietary|draft)/i.test(line) ||
           /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(line) || // Date patterns
           line.length < 50 && /^[A-Z\s]+$/.test(line); // All caps short line
  }

  private isFooterLine(line: string): boolean {
    // Common footer patterns
    return /^(copyright|©|\(c\))/i.test(line) ||
           /^(page|p\.)\s*\d+/i.test(line) ||
           /confidential|proprietary/i.test(line) ||
           /all rights reserved/i.test(line);
  }
}

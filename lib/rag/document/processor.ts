// Document processor implementation

import * as crypto from 'crypto';
import { DocumentProcessor, DocumentMetadata, DocumentProcessingError, SUPPORTED_MIME_TYPES } from './types';

export class BaseDocumentProcessor implements DocumentProcessor {
  async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    const fileType = SUPPORTED_MIME_TYPES[mimeType as keyof typeof SUPPORTED_MIME_TYPES];
    
    if (!fileType) {
      throw new DocumentProcessingError(
        `Unsupported MIME type: ${mimeType}`,
        'UNSUPPORTED_MIME_TYPE'
      );
    }

    switch (fileType) {
      case 'pdf':
        return this.extractPdfText(buffer);
      
      case 'docx':
      case 'doc':
        return this.extractWordText(buffer);
      
      case 'pptx':
      case 'ppt':
        return this.extractPowerPointText(buffer);
      
      case 'txt':
      case 'md':
        return buffer.toString('utf-8');
      
      case 'html':
        return this.extractHtmlText(buffer);
      
      case 'csv':
        return this.extractCsvText(buffer);
      
      case 'json':
        return this.extractJsonText(buffer);
      
      default:
        throw new DocumentProcessingError(
          `Unsupported file type: ${fileType}`,
          'UNSUPPORTED_FILE_TYPE'
        );
    }
  }

  async extractMetadata(buffer: Buffer, mimeType: string): Promise<DocumentMetadata> {
    const fileType = SUPPORTED_MIME_TYPES[mimeType as keyof typeof SUPPORTED_MIME_TYPES];
    
    if (!fileType) {
      throw new DocumentProcessingError(
        `Unsupported MIME type: ${mimeType}`,
        'UNSUPPORTED_MIME_TYPE'
      );
    }

    // Basic metadata that applies to all files
    const basicMetadata: DocumentMetadata = {
      wordCount: 0,
      language: 'unknown',
    };

    switch (fileType) {
      case 'pdf':
        return { ...basicMetadata, ...(await this.extractPdfMetadata(buffer)) };
      
      case 'docx':
      case 'doc':
        return { ...basicMetadata, ...(await this.extractWordMetadata(buffer)) };
      
      case 'pptx':
      case 'ppt':
        return { ...basicMetadata, ...(await this.extractPowerPointMetadata(buffer)) };
      
      default:
        return basicMetadata;
    }
  }

  private async extractPdfText(buffer: Buffer): Promise<string> {
    try {
      // Dynamic import to avoid loading the library if not used
      const pdfParse = await import('pdf-parse');
      const data = await pdfParse.default(buffer);
      return data.text;
    } catch (error) {
      throw new DocumentProcessingError(
        `Failed to extract PDF text: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PDF_EXTRACTION_ERROR'
      );
    }
  }

  private async extractPdfMetadata(buffer: Buffer): Promise<DocumentMetadata> {
    try {
      const pdfParse = await import('pdf-parse');
      const data = await pdfParse.default(buffer);
      
      return {
        title: data.info?.Title,
        author: data.info?.Author,
        createdAt: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
        modifiedAt: data.info?.ModDate ? new Date(data.info.ModDate) : undefined,
        pageCount: data.numpages,
        wordCount: data.text.split(/\s+/).length,
      };
    } catch (error) {
      return {};
    }
  }

  private async extractWordText(buffer: Buffer): Promise<string> {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      throw new DocumentProcessingError(
        `Failed to extract Word text: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'WORD_EXTRACTION_ERROR'
      );
    }
  }

  private async extractWordMetadata(buffer: Buffer): Promise<DocumentMetadata> {
    // Basic implementation - could be enhanced with docx metadata extraction
    const text = await this.extractWordText(buffer);
    return {
      wordCount: text.split(/\s+/).length,
    };
  }

  private async extractPowerPointText(buffer: Buffer): Promise<string> {
    try {
      // For PPTX files, we can use node-pptx-parser or similar
      // This is a simplified implementation
      const JSZip = await import('jszip');
      const zip = await JSZip.default.loadAsync(buffer);
      
      const slideTexts: string[] = [];
      const slideFiles = Object.keys(zip.files).filter(name => 
        name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
      );

      for (const slideFile of slideFiles) {
        const slideXml = await zip.files[slideFile].async('string');
        // Extract text from XML (simplified - real implementation would parse XML properly)
        const textMatches = slideXml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || [];
        const slideText = textMatches
          .map(match => match.replace(/<[^>]+>/g, ''))
          .join(' ');
        slideTexts.push(slideText);
      }

      return slideTexts.join('\n\n');
    } catch (error) {
      throw new DocumentProcessingError(
        `Failed to extract PowerPoint text: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'POWERPOINT_EXTRACTION_ERROR'
      );
    }
  }

  private async extractPowerPointMetadata(buffer: Buffer): Promise<DocumentMetadata> {
    // Basic implementation
    const text = await this.extractPowerPointText(buffer);
    return {
      wordCount: text.split(/\s+/).length,
    };
  }

  private async extractHtmlText(buffer: Buffer): Promise<string> {
    try {
      const cheerio = await import('cheerio');
      const html = buffer.toString('utf-8');
      const $ = cheerio.load(html);
      
      // Remove script and style elements
      $('script, style').remove();
      
      // Extract text
      return $.text().trim();
    } catch (error) {
      throw new DocumentProcessingError(
        `Failed to extract HTML text: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'HTML_EXTRACTION_ERROR'
      );
    }
  }

  private async extractCsvText(buffer: Buffer): Promise<string> {
    try {
      const csvParse = await import('csv-parse/sync');
      const records = csvParse.parse(buffer, {
        columns: false,
        skip_empty_lines: true,
      });
      
      return records.map((row: string[]) => row.join(' ')).join('\n');
    } catch (error) {
      throw new DocumentProcessingError(
        `Failed to extract CSV text: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CSV_EXTRACTION_ERROR'
      );
    }
  }

  private async extractJsonText(buffer: Buffer): Promise<string> {
    try {
      const jsonData = JSON.parse(buffer.toString('utf-8'));
      return JSON.stringify(jsonData, null, 2);
    } catch (error) {
      throw new DocumentProcessingError(
        `Failed to extract JSON text: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'JSON_EXTRACTION_ERROR'
      );
    }
  }

  calculateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}

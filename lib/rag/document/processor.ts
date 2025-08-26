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
      console.log('Extracting PDF text, buffer size:', buffer.length);
      
      // Ensure buffer is valid
      if (!buffer || buffer.length === 0) {
        throw new Error('Empty or invalid buffer');
      }

      // Check if buffer is actually a PDF
      const pdfHeader = buffer.slice(0, 5).toString();
      if (!pdfHeader.startsWith('%PDF')) {
        throw new Error('Buffer does not contain a valid PDF file');
      }
      
      // Create a wrapper for pdf-parse to handle the test file issue
      const pdfParseWrapper = async (dataBuffer: Buffer) => {
        // Save the original fs module
        const fs = require('fs');
        const originalReadFileSync = fs.readFileSync;
        
        // Mock fs.readFileSync to prevent test file loading
        fs.readFileSync = function(path: string, ...args: any[]) {
          if (path.includes('test/data') || path.includes('05-versions-space.pdf')) {
            // Return empty buffer for test files
            return Buffer.from('');
          }
          return originalReadFileSync.apply(this, [path, ...args]);
        };
        
        try {
          const pdfParse = require('pdf-parse');
          const result = await pdfParse(dataBuffer, {
            // Disable some features that might cause issues
            pagerender: null,
            max: 0
          });
          return result;
        } finally {
          // Restore original fs.readFileSync
          fs.readFileSync = originalReadFileSync;
        }
      };
      
      console.log('Calling pdf-parse with buffer...');
      const data = await pdfParseWrapper(buffer);
      
      console.log('PDF parsed successfully, text length:', data.text.length);
      return data.text;
    } catch (error) {
      console.error('PDF extraction error:', error);
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

      console.log(`Found ${slideFiles.length} slides in PPTX`);

      for (const slideFile of slideFiles) {
        const slideXml = await zip.files[slideFile].async('string');
        
        // Debug: Log XML structure info only if no text is found
        const xmlPreview = slideXml.substring(0, 500);
        
        // Improved text extraction - handle different PowerPoint XML text patterns
        const textPatterns = [
          /<a:t[^>]*>([^<]+)<\/a:t>/g,  // Standard text
          /<a:t>([^<]+)<\/a:t>/g,        // Simple text without attributes
          /<t[^>]*>([^<]+)<\/t>/g,       // Alternative text tags
          /<p:txBody[^>]*>[\s\S]*?<\/p:txBody>/g, // Text body blocks
        ];
        
        // First, try to find any text nodes in the XML
        const allTextNodes = slideXml.match(/>([^<]+)</g) || [];
        const meaningfulTexts = allTextNodes
          .map(match => match.replace(/[><]/g, '').trim())
          .filter(text => text.length > 2 && !text.match(/^[\s\d]+$/));
        
        // Log debug info only when no text found
        const hasNoText = meaningfulTexts.length === 0;
        
        const extractedTexts: string[] = [];
        for (const pattern of textPatterns) {
          const matches = slideXml.match(pattern) || [];
          const texts = matches.map(match => match.replace(/<[^>]+>/g, '').trim());
          extractedTexts.push(...texts.filter(text => text.length > 0));
        }
        
        // If standard patterns fail, try to extract from text body sections
        if (extractedTexts.length === 0) {
          const textBodyMatches = slideXml.match(/<p:txBody[^>]*>([\s\S]*?)<\/p:txBody>/g) || [];
          for (const bodyMatch of textBodyMatches) {
            const bodyTexts = bodyMatch.match(/>([^<]+)</g) || [];
            const cleanTexts = bodyTexts
              .map(t => t.replace(/[><]/g, '').trim())
              .filter(t => t.length > 0 && !t.match(/^[\s\d]+$/));
            extractedTexts.push(...cleanTexts);
          }
        }
        
        if (extractedTexts.length > 0) {
          const slideText = extractedTexts.join(' ');
          slideTexts.push(slideText);
          console.log(`Slide ${slideFile}: extracted ${extractedTexts.length} text elements`);
        } else if (meaningfulTexts.length > 0) {
          // Fallback: use the meaningful texts found in raw XML
          const slideText = meaningfulTexts.join(' ');
          slideTexts.push(slideText);
          console.log(`Slide ${slideFile}: used ${meaningfulTexts.length} fallback text elements`);
        } else if (hasNoText) {
          // Log XML preview only when no text found
          console.log(`Slide ${slideFile}: No text found. XML preview:`, xmlPreview.substring(0, 300) + '...');
        }
      }

      // Also check for notes
      const notesFiles = Object.keys(zip.files).filter(name => 
        name.startsWith('ppt/notesSlides/') && name.endsWith('.xml')
      );
      
      for (const notesFile of notesFiles) {
        try {
          const notesXml = await zip.files[notesFile].async('string');
          const notesMatches = notesXml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || [];
          const notesText = notesMatches
            .map(match => match.replace(/<[^>]+>/g, '').trim())
            .filter(text => text.length > 0)
            .join(' ');
          if (notesText) {
            slideTexts.push(`Notes: ${notesText}`);
          }
        } catch (e) {
          // Ignore notes extraction errors
        }
      }

      let result = slideTexts.join('\n\n').trim();
      console.log(`Total extracted text length: ${result.length} characters`);
      
      if (result.length === 0) {
        // Check if there are any slides at all
        if (slideFiles.length === 0) {
          throw new Error('No slides found in PowerPoint file');
        }
        
        // Extract image information for better context
        const imageInfo: string[] = [];
        
        for (const slideFile of slideFiles) {
          const slideXml = await zip.files[slideFile].async('string');
          const slideNumber = slideFile.match(/slide(\d+)\.xml/)?.[1] || 'unknown';
          
          // Count images in the slide
          const imageCount = (slideXml.match(/<p:pic>/g) || []).length;
          const videoCount = (slideXml.match(/<p:video>/g) || []).length;
          const chartCount = (slideXml.match(/<c:chart>/g) || []).length;
          
          if (imageCount > 0 || videoCount > 0 || chartCount > 0) {
            const mediaTypes = [];
            if (imageCount > 0) mediaTypes.push(`${imageCount} image${imageCount > 1 ? 's' : ''}`);
            if (videoCount > 0) mediaTypes.push(`${videoCount} video${videoCount > 1 ? 's' : ''}`);
            if (chartCount > 0) mediaTypes.push(`${chartCount} chart${chartCount > 1 ? 's' : ''}`);
            
            imageInfo.push(`Slide ${slideNumber}: Contains ${mediaTypes.join(', ')}`);
          }
        }
        
        // Create a more detailed placeholder text
        const placeholderParts = [
          `PowerPoint Presentation Analysis`,
          `Total slides: ${slideFiles.length}`,
          `Content type: Visual presentation (no text content found)`,
          '',
          `Slide details:`
        ];
        
        if (imageInfo.length > 0) {
          placeholderParts.push(...imageInfo);
        } else {
          placeholderParts.push('No identifiable content in slides');
        }
        
        placeholderParts.push(
          '',
          'Note: This presentation appears to contain only visual elements without extractable text content.',
          'Consider adding speaker notes or text descriptions to improve searchability.'
        );
        
        result = placeholderParts.join('\n');
        console.warn('No text content found in PowerPoint file - generated placeholder with visual content information');
      }
      
      return result;
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

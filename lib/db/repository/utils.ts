// This file is for server-side only
import 'server-only';

/**
 * Generate a unique ID for database entries
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substr(2, 5);
  return `${timestamp}-${randomPart}`;
}

/**
 * Utility function to convert image data to data URL
 */
export function convertImageDataToDataUrl(imageData: any): string | null {
  if (!imageData) return null;
  
  try {
    // Handle various formats of image data
    if (imageData instanceof Uint8Array) {
      // SQLite stores as Uint8Array
      if (imageData.length < 100) {
        return null;
      }
      
      // Table image data is already converted to base64 string
      const base64String = Buffer.from(imageData).toString();
      return `data:image/png;base64,${base64String}`;
      
    } else if (typeof imageData === 'string') {
      // PostgreSQL stores as base64 string
      if (imageData.length < 100) {
        return null;
      }
      
      // Use as-is if already in data:image/ format
      if (imageData.startsWith('data:')) {
        return imageData;
      } else {
        // Convert regular base64 string to data URL
        return `data:image/png;base64,${imageData}`;
      }
      
    } else if (typeof imageData === 'object' && imageData !== null) {
      // Incorrectly stored case: ASCII code array or other object format
      if (Array.isArray(imageData)) {
        // ASCII code array case
        const base64String = String.fromCharCode(...imageData);
        if (base64String.length < 100) {
          return null;
        }
        return `data:image/png;base64,${base64String}`;
        
      } else if (imageData.type === 'Buffer' && imageData.data) {
        // Buffer object serialized to JSON case
        const buffer = Buffer.from(imageData.data);
        if (buffer.length < 100) {
          return null;
        }
        const base64String = buffer.toString('base64');
        return `data:image/png;base64,${base64String}`;
        
      } else {
        // Check if object has numeric keys (array-like format)
        const keys = Object.keys(imageData);
        const isNumericKeys = keys.every(key => !isNaN(parseInt(key)));
        
        if (isNumericKeys) {
          const values = keys.map(key => imageData[key]);
          const base64String = String.fromCharCode(...values);
          if (base64String.length < 100) {
            return null;
          }
          return `data:image/png;base64,${base64String}`;
        }
      }
    } else if (imageData && (imageData.type === 'Buffer' || Array.isArray(imageData))) {
      // JSON serialized buffer object case
      const buffer = Buffer.from(imageData);
      if (buffer.length < 100) {
        return null;
      }
      const base64String = buffer.toString();
      return `data:image/png;base64,${base64String}`;
    }
    
    return null;
  } catch (error) {
    console.error('Error during image data conversion:', error);
    return null;
  }
}

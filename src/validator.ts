import { DataType, FieldDefinition, DualFormat } from './types.js';

/**
 * Dedicated validation module for data type and format validation
 * Follows Single Responsibility Principle - only handles validation logic
 */
export class DataValidator {

  /**
   * Validates if a value matches the expected data type
   */
  validateType(value: unknown, type: DataType): boolean {
    if (value === null || value === undefined) {
      return true;
    }

    const stringValue = String(value);

    switch (type) {
      case DataType.TEXT:
        return true; // Text is always valid
      case DataType.NUMBER:
        return this.validateNumber(stringValue);
      case DataType.DATE:
        return this.validateDate(stringValue);
      case DataType.TIME:
        return this.validateTime(stringValue);
      case DataType.BOOLEAN:
        return this.validateBoolean(stringValue);
      default:
        return true;
    }
  }

  /**
   * Validates if a value matches the expected format for a specific data type
   */
  validateFormat(value: unknown, format: string | DualFormat, type: DataType): boolean {
    if (value === null || value === undefined) {
      return true;
    }

    const stringValue = String(value);

    switch (type) {
      case DataType.TEXT:
        return this.validateTextFormat(stringValue, format);
      case DataType.NUMBER:
        return this.validateNumber(stringValue); // Numbers don't need format-specific validation
      case DataType.DATE:
        return this.validateDate(stringValue); // Use basic date validation for now
      case DataType.TIME:
        return this.validateTime(stringValue); // Use basic time validation for now
      case DataType.BOOLEAN:
        return this.validateBoolean(stringValue); // Booleans don't need format-specific validation
      default:
        return true;
    }
  }

  /**
   * Validates number values
   */
  private validateNumber(value: string): boolean {
    // Remove common formatting characters and check if it's a valid number
    const cleaned = value.replace(/[$,\s%]/g, '');
    const parsed = parseFloat(cleaned);
    return !isNaN(parsed) && isFinite(parsed);
  }

  /**
   * Validates boolean values
   */
  private validateBoolean(value: string): boolean {
    const normalized = value.toLowerCase().trim();
    const validBooleans = ['true', 'false', 'yes', 'no', 'y', 'n', '1', '0', 'on', 'off'];
    return validBooleans.includes(normalized);
  }

  /**
   * Validates time values (HH:MM or HH:MM:SS format)
   */
  private validateTime(value: string): boolean {
    const timePattern = /^([01]?\d|2[0-3]):([0-5]?\d)(?::([0-5]?\d))?$/;
    return timePattern.test(value.trim());
  }

  /**
   * Validates text format requirements (email, URL, etc.)
   */
  private validateTextFormat(value: string, format: string | DualFormat): boolean {
    if (typeof format !== 'string') return true;
    
    const formatLower = format.toLowerCase();
    
    switch (formatLower) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'url':
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      default:
        return true;
    }
  }

  /**
   * Comprehensive date validation supporting multiple formats
   */
  private validateDate(value: string): boolean {
    const trimmed = value.trim();
    
    // Support many common date formats
    const datePatterns = [
      // Numeric formats with separators
      /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/, // DD/MM/YYYY, MM/DD/YY, etc.
      /^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/, // YYYY/MM/DD, YYYY-MM-DD, etc.
      
      // Text month formats
      /^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4}$/i, // DD MMM YYYY
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}[,\s]+\d{2,4}$/i, // MMM DD, YYYY
      /^\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{2,4}$/i, // DD MMMM YYYY
      /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}[,\s]+\d{2,4}$/i, // MMMM DD, YYYY
      
      // ISO-like formats
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO datetime (partial)
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      
      // Compact formats
      /^\d{8}$/, // YYYYMMDD
      /^\d{6}$/, // YYMMDD or DDMMYY
    ];
    
    // Check if it matches any common date pattern
    const matchesPattern = datePatterns.some(pattern => pattern.test(trimmed));
    if (!matchesPattern) {
      return false;
    }
    
    // Try multiple parsing strategies
    return this.isValidDateString(trimmed);
  }

  /**
   * Advanced date string validation with multiple parsing strategies
   */
  private isValidDateString(dateStr: string): boolean {
    // Strategy 1: Try native Date parsing (works for many formats)
    let date = new Date(dateStr);
    if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
      return true;
    }
    
    // Strategy 2: Try parsing common numeric formats manually
    // Handle DD/MM/YYYY vs MM/DD/YYYY ambiguity by checking if day > 12
    const numericMatch = dateStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (numericMatch) {
      const [, part1, part2, year] = numericMatch;
      const num1 = parseInt(part1);
      const num2 = parseInt(part2);
      const fullYear = parseInt(year) < 100 ? 2000 + parseInt(year) : parseInt(year);
      
      // Check if year is reasonable
      if (fullYear < 1900 || fullYear > 2100) return false;
      
      // Try both interpretations: DD/MM/YYYY and MM/DD/YYYY
      const date1 = new Date(fullYear, num2 - 1, num1); // DD/MM/YYYY
      const date2 = new Date(fullYear, num1 - 1, num2); // MM/DD/YYYY
      
      // If either interpretation creates a valid date, accept it
      if ((!isNaN(date1.getTime()) && date1.getDate() === num1 && date1.getMonth() === num2 - 1) ||
          (!isNaN(date2.getTime()) && date2.getDate() === num2 && date2.getMonth() === num1 - 1)) {
        return true;
      }
    }
    
    // Strategy 3: Try YYYY/MM/DD format
    const isoMatch = dateStr.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return !isNaN(date.getTime()) && 
             date.getFullYear() === parseInt(year) &&
             date.getMonth() === parseInt(month) - 1 &&
             date.getDate() === parseInt(day);
    }
    
    // Strategy 4: Handle compact formats YYYYMMDD
    const compactMatch = dateStr.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (compactMatch) {
      const [, year, month, day] = compactMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return !isNaN(date.getTime()) && 
             date.getFullYear() === parseInt(year) &&
             date.getMonth() === parseInt(month) - 1 &&
             date.getDate() === parseInt(day);
    }
    
    return false;
  }
}
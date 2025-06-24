import { DataType, FieldDefinition } from './types.js';

export class DataTypeConverter {
  
  validateType(value: unknown, field: FieldDefinition): boolean {
    if (value === null || value === undefined) {
      return true; // Null values are valid for any type
    }

    const stringValue = String(value);
    
    // Type-specific validation
    switch (field.type) {
      case DataType.TEXT:
        return this.validateTextValue(stringValue, field);
      case DataType.NUMBER:
        return this.validateNumberValue(stringValue, field);
      case DataType.DATE:
        return this.validateDateValue(stringValue, field);
      case DataType.TIME:
        return this.validateTimeValue(stringValue, field);
      case DataType.BOOLEAN:
        return this.validateBooleanValue(stringValue, field);
      default:
        return true; // Unknown types are considered valid
    }
  }
  
  convertValue(value: unknown, field: FieldDefinition): any {
    if (value === null || value === undefined) {
      return null;
    }

    const stringValue = String(value);
    
    // Type-specific conversion (no validation, just data transformation)
    switch (field.type) {
      case DataType.TEXT:
        return this.convertTextValue(stringValue, field);
      case DataType.NUMBER:
        return this.convertNumberValue(stringValue, field);
      case DataType.DATE:
        return this.convertDateValue(stringValue, field);
      case DataType.TIME:
        return this.convertTimeValue(stringValue, field);
      case DataType.BOOLEAN:
        return this.convertBooleanValue(stringValue, field);
      default:
        return stringValue;
    }
  }

  private convertTextValue(value: string, field: FieldDefinition): string {
    if (field.format && typeof field.format === 'string') {
      const format = field.format.toLowerCase();
      
      switch (format) {
        case 'title':
          return value.replace(/\w\S*/g, txt => 
            txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
          );
        case 'upper':
          return value.toUpperCase();
        case 'lower':
          return value.toLowerCase();
        default:
          return value;
      }
    }
    
    return value;
  }

  private convertNumberValue(value: string, _field: FieldDefinition): number {
    // Remove common formatting characters
    const cleaned = value.replace(/[$,\s%]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  private convertDateValue(value: string, _field: FieldDefinition): string {
    // For now, just return the string value
    // The renderer can handle date parsing and formatting
    return value;
  }

  private convertTimeValue(value: string, _field: FieldDefinition): string {
    // For now, just return the string value
    // The renderer can handle time parsing and formatting
    return value;
  }

  private convertBooleanValue(value: string, _field: FieldDefinition): boolean {
    const normalized = value.toLowerCase().trim();
    
    // Accept various boolean representations
    switch (normalized) {
      case 'true':
      case 'yes':
      case 'y':
      case '1':
      case 'on':
        return true;
      case 'false':
      case 'no':
      case 'n':
      case '0':
      case 'off':
        return false;
      default:
        // Default to false for any other value
        return false;
    }
  }

  private validateTextValue(value: string, field: FieldDefinition): boolean {
    // Text is always valid unless there are specific format requirements
    if (field.format && typeof field.format === 'string') {
      const format = field.format.toLowerCase();
      
      switch (format) {
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
    
    return true;
  }

  private validateNumberValue(value: string, _field: FieldDefinition): boolean {
    // Remove common formatting characters and check if it's a valid number
    const cleaned = value.replace(/[$,\s%]/g, '');
    const parsed = parseFloat(cleaned);
    return !isNaN(parsed) && isFinite(parsed);
  }

  private validateDateValue(value: string, _field: FieldDefinition): boolean {
    // Check if the value can be parsed as a date
    // Support common date formats: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, etc.
    const datePatterns = [
      /^\d{1,2}\/\d{1,2}\/\d{4}$/, // DD/MM/YYYY or MM/DD/YYYY
      /^\d{4}-\d{1,2}-\d{1,2}$/, // YYYY-MM-DD
      /^\d{1,2}-\d{1,2}-\d{4}$/, // DD-MM-YYYY or MM-DD-YYYY
      /^\d{1,2}\.\d{1,2}\.\d{4}$/ // DD.MM.YYYY
    ];
    
    // Check if it matches a date pattern
    const matchesPattern = datePatterns.some(pattern => pattern.test(value.trim()));
    if (!matchesPattern) {
      return false;
    }
    
    // Try to parse as a date
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  private validateTimeValue(value: string, _field: FieldDefinition): boolean {
    // Check if the value matches time format: HH:MM or HH:MM:SS
    const timePattern = /^([01]?\d|2[0-3]):([0-5]?\d)(?::([0-5]?\d))?$/;
    return timePattern.test(value.trim());
  }

  private validateBooleanValue(value: string, _field: FieldDefinition): boolean {
    const normalized = value.toLowerCase().trim();
    
    // Check if it's a valid boolean representation
    const validBooleans = ['true', 'false', 'yes', 'no', 'y', 'n', '1', '0', 'on', 'off'];
    return validBooleans.includes(normalized);
  }
}
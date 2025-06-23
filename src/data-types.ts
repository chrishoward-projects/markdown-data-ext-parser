import { DataType, FieldDefinition, ValidationRules, DualFormat, ParseError, ErrorType } from './types.js';
import { formatErrorMessage } from './utils.js';

export class DataTypeValidator {
  
  validateValue(value: unknown, field: FieldDefinition): ParseError[] {
    const errors: ParseError[] = [];
    
    if (value === null || value === undefined) {
      if (field.required) {
        errors.push({
          type: ErrorType.MISSING_REQUIRED_FIELD,
          message: formatErrorMessage(ErrorType.MISSING_REQUIRED_FIELD, { fieldName: field.name }),
          fieldName: field.name
        });
      }
      return errors;
    }

    const stringValue = String(value);
    
    // Type-specific validation
    switch (field.type) {
      case DataType.TEXT:
        errors.push(...this.validateTextValue(stringValue, field));
        break;
      case DataType.NUMBER:
        errors.push(...this.validateNumberValue(stringValue, field));
        break;
      case DataType.DATE:
        errors.push(...this.validateDateValue(stringValue, field));
        break;
      case DataType.TIME:
        errors.push(...this.validateTimeValue(stringValue, field));
        break;
      case DataType.BOOLEAN:
        errors.push(...this.validateBooleanValue(stringValue, field));
        break;
    }

    // General validation rules
    if (field.validation) {
      errors.push(...this.validateRules(stringValue, field.validation, field.name));
    }

    return errors;
  }

  private validateTextValue(value: string, field: FieldDefinition): ParseError[] {
    const errors: ParseError[] = [];
    
    if (field.format && typeof field.format === 'string') {
      const format = field.format.toLowerCase();
      
      switch (format) {
        case 'email':
          if (!this.isValidEmail(value)) {
            errors.push(this.createValidationError(field.name, 'Invalid email format'));
          }
          break;
        case 'url':
          if (!this.isValidURL(value)) {
            errors.push(this.createValidationError(field.name, 'Invalid URL format'));
          }
          break;
        default:
          // Pattern validation for formats like (##) #### ####
          if (!this.validateTextPattern(value, field.format)) {
            errors.push(this.createValidationError(field.name, `Value does not match pattern: ${field.format}`));
          }
      }
    }
    
    return errors;
  }

  private validateNumberValue(value: string, field: FieldDefinition): ParseError[] {
    const errors: ParseError[] = [];
    
    const numericValue = this.parseNumber(value);
    if (isNaN(numericValue)) {
      errors.push({
        type: ErrorType.TYPE_MISMATCH,
        message: formatErrorMessage(ErrorType.TYPE_MISMATCH, {
          fieldName: field.name,
          expected: 'number',
          actual: 'text'
        }),
        fieldName: field.name
      });
      return errors;
    }
    
    return errors;
  }

  private validateDateValue(value: string, field: FieldDefinition): ParseError[] {
    const errors: ParseError[] = [];
    
    if (!this.isValidDate(value, field.format)) {
      errors.push({
        type: ErrorType.TYPE_MISMATCH,
        message: formatErrorMessage(ErrorType.TYPE_MISMATCH, {
          fieldName: field.name,
          expected: 'date',
          actual: 'invalid date'
        }),
        fieldName: field.name
      });
    }
    
    return errors;
  }

  private validateTimeValue(value: string, field: FieldDefinition): ParseError[] {
    const errors: ParseError[] = [];
    
    if (!this.isValidTime(value, field.format)) {
      errors.push({
        type: ErrorType.TYPE_MISMATCH,
        message: formatErrorMessage(ErrorType.TYPE_MISMATCH, {
          fieldName: field.name,
          expected: 'time',
          actual: 'invalid time'
        }),
        fieldName: field.name
      });
    }
    
    return errors;
  }

  private validateBooleanValue(value: string, field: FieldDefinition): ParseError[] {
    const errors: ParseError[] = [];
    
    if (!this.isValidBoolean(value)) {
      errors.push({
        type: ErrorType.TYPE_MISMATCH,
        message: formatErrorMessage(ErrorType.TYPE_MISMATCH, {
          fieldName: field.name,
          expected: 'boolean',
          actual: 'invalid boolean'
        }),
        fieldName: field.name
      });
    }
    
    return errors;
  }

  private validateRules(value: string, rules: ValidationRules, fieldName: string): ParseError[] {
    const errors: ParseError[] = [];
    
    if (rules.min !== undefined) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue < rules.min) {
        errors.push(this.createValidationError(fieldName, `Value ${numValue} is less than minimum ${rules.min}`));
      } else if (isNaN(numValue) && value.length < rules.min) {
        errors.push(this.createValidationError(fieldName, `Text length ${value.length} is less than minimum ${rules.min}`));
      }
    }
    
    if (rules.max !== undefined) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue > rules.max) {
        errors.push(this.createValidationError(fieldName, `Value ${numValue} is greater than maximum ${rules.max}`));
      } else if (isNaN(numValue) && value.length > rules.max) {
        errors.push(this.createValidationError(fieldName, `Text length ${value.length} is greater than maximum ${rules.max}`));
      }
    }
    
    if (rules.pattern) {
      try {
        const regex = new RegExp(rules.pattern);
        if (!regex.test(value)) {
          errors.push(this.createValidationError(fieldName, `Value does not match pattern: ${rules.pattern}`));
        }
      } catch {
        errors.push(this.createValidationError(fieldName, `Invalid pattern: ${rules.pattern}`));
      }
    }
    
    if (rules.options && rules.options.length > 0) {
      if (!rules.options.includes(value)) {
        errors.push(this.createValidationError(fieldName, `Value must be one of: ${rules.options.join(', ')}`));
      }
    }
    
    if (rules.email && !this.isValidEmail(value)) {
      errors.push(this.createValidationError(fieldName, 'Invalid email format'));
    }
    
    if (rules.url && !this.isValidURL(value)) {
      errors.push(this.createValidationError(fieldName, 'Invalid URL format'));
    }
    
    return errors;
  }

  private isValidEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  private isValidURL(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  private validateTextPattern(value: string, pattern: string): boolean {
    // Convert pattern to regex
    // # = digit, a = letter, others are literal
    let regexPattern = '';
    for (let i = 0; i < pattern.length; i++) {
      const char = pattern[i];
      if (char === '#') {
        regexPattern += '\\d';
      } else if (char === 'a') {
        regexPattern += '[a-zA-Z]';
      } else if (char === '\\' && i + 1 < pattern.length) {
        // Escaped character
        regexPattern += '\\' + pattern[i + 1];
        i++; // Skip next character
      } else {
        // Literal character, escape if needed
        regexPattern += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
    }
    
    try {
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(value);
    } catch {
      return false;
    }
  }

  private parseNumber(value: string): number {
    // Remove common number formatting
    const cleaned = value.replace(/[$,\s%]/g, '');
    return parseFloat(cleaned);
  }

  private isValidDate(value: string, format?: string | DualFormat): boolean {
    if (!format) {
      // Try standard date parsing
      const date = new Date(value);
      return !isNaN(date.getTime());
    }
    
    const formatString = typeof format === 'string' ? format : format.input;
    return this.parseDateWithFormat(value, formatString) !== null;
  }

  private isValidTime(value: string, format?: string | DualFormat): boolean {
    if (!format) {
      // Try standard time parsing
      return /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?(\s?(AM|PM|am|pm))?$/.test(value);
    }
    
    const formatString = typeof format === 'string' ? format : format.input;
    return this.parseTimeWithFormat(value, formatString) !== null;
  }

  private isValidBoolean(value: string): boolean {
    const normalized = value.toLowerCase().trim();
    const validBooleans = ['true', 'false', 'yes', 'no', 'y', 'n', '1', '0'];
    return validBooleans.includes(normalized);
  }

  public parseDateWithFormat(value: string, format: string): Date | null {
    // Simplified date parsing - in a real implementation, use a proper date parsing library
    try {
      // Handle common formats
      if (format.includes('DD/MM/YYYY') || format.includes('DD-MM-YYYY')) {
        const parts = value.split(/[\/\-]/);
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // Month is 0-based
          const year = parseInt(parts[2]);
          const date = new Date(year, month, day);
          return isNaN(date.getTime()) ? null : date;
        }
      }
      
      if (format.includes('MM/DD/YYYY') || format.includes('MM-DD-YYYY')) {
        const parts = value.split(/[\/\-]/);
        if (parts.length === 3) {
          const month = parseInt(parts[0]) - 1; // Month is 0-based
          const day = parseInt(parts[1]);
          const year = parseInt(parts[2]);
          const date = new Date(year, month, day);
          return isNaN(date.getTime()) ? null : date;
        }
      }
      
      // Fallback to standard parsing
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  public parseTimeWithFormat(value: string, format: string): Date | null {
    try {
      // Handle 12-hour format with AM/PM
      if (format.includes('ap') || format.includes('AP')) {
        const match = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|AM|PM)$/);
        if (match) {
          let hours = parseInt(match[1]);
          const minutes = parseInt(match[2]);
          const seconds = match[3] ? parseInt(match[3]) : 0;
          const period = match[4].toLowerCase();
          
          if (period === 'pm' && hours !== 12) {
            hours += 12;
          } else if (period === 'am' && hours === 12) {
            hours = 0;
          }
          
          const date = new Date(2000, 0, 1, hours, minutes, seconds);
          return isNaN(date.getTime()) ? null : date;
        }
      }
      
      // Handle 24-hour format
      const match = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (match) {
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const seconds = match[3] ? parseInt(match[3]) : 0;
        
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59) {
          const date = new Date(2000, 0, 1, hours, minutes, seconds);
          return isNaN(date.getTime()) ? null : date;
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }

  private createValidationError(fieldName: string, message: string): ParseError {
    return {
      type: ErrorType.VALIDATION_FAILED,
      message: `Validation failed for field '${fieldName}': ${message}`,
      fieldName
    };
  }
}

export class DataTypeConverter {
  
  convertValue(value: unknown, field: FieldDefinition): unknown {
    if (value === null || value === undefined) {
      return value;
    }
    
    const stringValue = String(value);
    
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
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
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
    return parseFloat(cleaned);
  }

  private convertDateValue(value: string, field: FieldDefinition): Date | null {
    if (field.format) {
      const formatString = typeof field.format === 'string' ? field.format : field.format.input;
      return this.parseDateWithFormat(value, formatString);
    }
    
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  private convertTimeValue(value: string, field: FieldDefinition): Date | null {
    if (field.format) {
      const formatString = typeof field.format === 'string' ? field.format : field.format.input;
      return this.parseTimeWithFormat(value, formatString);
    }
    
    // Default time parsing
    const match = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(\s?(AM|PM|am|pm))?$/);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const seconds = match[3] ? parseInt(match[3]) : 0;
      const period = match[5];
      
      if (period) {
        const isPM = period.toLowerCase() === 'pm';
        if (isPM && hours !== 12) {
          hours += 12;
        } else if (!isPM && hours === 12) {
          hours = 0;
        }
      }
      
      return new Date(2000, 0, 1, hours, minutes, seconds);
    }
    
    return null;
  }

  private convertBooleanValue(value: string, _field: FieldDefinition): boolean {
    const normalized = value.toLowerCase().trim();
    
    switch (normalized) {
      case 'true':
      case 'yes':
      case 'y':
      case '1':
        return true;
      case 'false':
      case 'no':
      case 'n':
      case '0':
        return false;
      default:
        return false;
    }
  }

  public parseDateWithFormat(value: string, format: string): Date | null {
    // This is a simplified implementation
    // In production, use a proper date parsing library like date-fns
    return new DataTypeValidator().parseDateWithFormat(value, format);
  }

  public parseTimeWithFormat(value: string, format: string): Date | null {
    // This is a simplified implementation
    return new DataTypeValidator().parseTimeWithFormat(value, format);
  }
}
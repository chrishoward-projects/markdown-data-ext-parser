import { DataFormatter, FieldDefinition, FormattedValue, DataType, DualFormat } from './types.js';

export class MarkdownDataFormatter implements DataFormatter {
  
  formatValue(value: unknown, field: FieldDefinition): FormattedValue {
    if (value === null || value === undefined) {
      return {
        original: value,
        formatted: '',
        displayFormatted: ''
      };
    }

    const original = value;
    let formatted: string;
    let displayFormatted: string | undefined;

    switch (field.type) {
      case DataType.TEXT:
        formatted = this.formatTextValue(value, field);
        break;
      case DataType.NUMBER:
        formatted = this.formatNumberValue(value, field);
        break;
      case DataType.DATE:
        const dateResult = this.formatDateValue(value, field);
        formatted = dateResult.formatted;
        displayFormatted = dateResult.displayFormatted;
        break;
      case DataType.TIME:
        const timeResult = this.formatTimeValue(value, field);
        formatted = timeResult.formatted;
        displayFormatted = timeResult.displayFormatted;
        break;
      case DataType.BOOLEAN:
        formatted = this.formatBooleanValue(value, field);
        break;
      default:
        formatted = String(value);
    }

    return {
      original,
      formatted,
      displayFormatted
    };
  }

  parseValue(input: string, field: FieldDefinition): unknown {
    if (!input || input.trim() === '') {
      return null;
    }

    switch (field.type) {
      case DataType.TEXT:
        return this.parseTextValue(input, field);
      case DataType.NUMBER:
        return this.parseNumberValue(input, field);
      case DataType.DATE:
        return this.parseDateValue(input, field);
      case DataType.TIME:
        return this.parseTimeValue(input, field);
      case DataType.BOOLEAN:
        return this.parseBooleanValue(input, field);
      default:
        return input;
    }
  }

  validateFormat(value: unknown, format: string | DualFormat, type: DataType): boolean {
    if (value === null || value === undefined) {
      return true;
    }

    const stringValue = String(value);

    switch (type) {
      case DataType.TEXT:
        return this.validateTextFormat(stringValue, format);
      case DataType.NUMBER:
        return this.validateNumberFormat(stringValue, format);
      case DataType.DATE:
        return this.validateDateFormat(stringValue, format);
      case DataType.TIME:
        return this.validateTimeFormat(stringValue, format);
      case DataType.BOOLEAN:
        return this.validateBooleanFormat(stringValue, format);
      default:
        return true;
    }
  }

  validateType(value: unknown, type: DataType): boolean {
    if (value === null || value === undefined) {
      return true;
    }

    const stringValue = String(value);

    switch (type) {
      case DataType.TEXT:
        return true; // Text is always valid
      case DataType.NUMBER:
        return this.validateNumberFormat(stringValue, "");
      case DataType.DATE:
        return this.validateBasicDateFormat(stringValue);
      case DataType.TIME:
        return this.validateBasicTimeFormat(stringValue);
      case DataType.BOOLEAN:
        return this.validateBooleanFormat(stringValue, "");
      default:
        return true;
    }
  }

  private formatTextValue(value: unknown, field: FieldDefinition): string {
    const stringValue = String(value);
    
    if (!field.format || typeof field.format !== 'string') {
      return stringValue;
    }

    const format = field.format.toLowerCase();

    switch (format) {
      case 'title':
        return stringValue.replace(/\w\S*/g, txt => 
          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
      case 'upper':
        return stringValue.toUpperCase();
      case 'lower':
        return stringValue.toLowerCase();
      case 'email':
      case 'url':
      case 'markdown':
        return stringValue;
      default:
        // Apply pattern formatting if it's a pattern
        return this.applyTextPattern(stringValue, field.format);
    }
  }

  private formatNumberValue(value: unknown, field: FieldDefinition): string {
    const numValue = typeof value === 'number' ? value : parseFloat(String(value));
    
    if (isNaN(numValue)) {
      return String(value);
    }

    if (!field.format || typeof field.format !== 'string') {
      return numValue.toString();
    }

    return this.applyNumberFormat(numValue, field.format);
  }

  private formatDateValue(value: unknown, field: FieldDefinition): { formatted: string; displayFormatted?: string } {
    const date = value instanceof Date ? value : new Date(String(value));
    
    if (isNaN(date.getTime())) {
      return { formatted: String(value) };
    }

    if (!field.format) {
      return { formatted: date.toISOString().split('T')[0] };
    }

    if (typeof field.format === 'string') {
      return { formatted: this.applyDateFormat(date, field.format) };
    }

    // Dual format
    return {
      formatted: this.applyDateFormat(date, field.format.input),
      displayFormatted: this.applyDateFormat(date, field.format.display)
    };
  }

  private formatTimeValue(value: unknown, field: FieldDefinition): { formatted: string; displayFormatted?: string } {
    const time = value instanceof Date ? value : this.parseTimeString(String(value));
    
    if (!time) {
      return { formatted: String(value) };
    }

    if (!field.format) {
      return { formatted: `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}` };
    }

    if (typeof field.format === 'string') {
      return { formatted: this.applyTimeFormat(time, field.format) };
    }

    // Dual format
    return {
      formatted: this.applyTimeFormat(time, field.format.input),
      displayFormatted: this.applyTimeFormat(time, field.format.display)
    };
  }

  private formatBooleanValue(value: unknown, field: FieldDefinition): string {
    const boolValue = this.convertToBoolean(value);
    
    if (!field.format || typeof field.format !== 'string') {
      return boolValue ? 'true' : 'false';
    }

    const format = field.format.toLowerCase();
    
    switch (format) {
      case 'y/n':
        return boolValue ? 'Yes' : 'No';
      case 't/f':
        return boolValue ? 'True' : 'False';
      case '1/0':
        return boolValue ? '1' : '0';
      default:
        return boolValue ? 'true' : 'false';
    }
  }

  private applyTextPattern(value: string, pattern: string): string {
    // For now, return the original value
    // In a full implementation, this would apply formatting patterns
    return value;
  }

  private applyNumberFormat(value: number, format: string): string {
    // Handle currency format like $n,n.##
    if (format.includes('$')) {
      const formatted = this.formatCurrency(value, format);
      return formatted;
    }
    
    // Handle percentage format like n.#%
    if (format.includes('%')) {
      const percentage = value * 100;
      return this.formatPercentage(percentage, format);
    }
    
    // Handle decimal format like ####.##
    return this.formatDecimal(value, format);
  }

  private formatCurrency(value: number, format: string): string {
    // Extract decimal places from format
    const decimalMatch = format.match(/\.#+/);
    const decimalPlaces = decimalMatch ? decimalMatch[0].length - 1 : 2;
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces
    }).format(value);
  }

  private formatPercentage(value: number, format: string): string {
    const decimalMatch = format.match(/\.#+/);
    const decimalPlaces = decimalMatch ? decimalMatch[0].length - 1 : 1;
    
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces
    }).format(value / 100);
  }

  private formatDecimal(value: number, format: string): string {
    const decimalMatch = format.match(/\.#+/);
    const decimalPlaces = decimalMatch ? decimalMatch[0].length - 1 : 0;
    
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
      useGrouping: format.includes(',')
    }).format(value);
  }

  private applyDateFormat(date: Date, format: string): string {
    let result = format;
    
    // Year
    result = result.replace(/YYYY/g, date.getFullYear().toString());
    result = result.replace(/YY/g, date.getFullYear().toString().slice(-2));
    
    // Month
    result = result.replace(/MMMM/g, date.toLocaleString('en-US', { month: 'long' }));
    result = result.replace(/MMM/g, date.toLocaleString('en-US', { month: 'short' }));
    result = result.replace(/MM/g, (date.getMonth() + 1).toString().padStart(2, '0'));
    result = result.replace(/M/g, (date.getMonth() + 1).toString());
    
    // Day
    result = result.replace(/DD/g, date.getDate().toString().padStart(2, '0'));
    result = result.replace(/D/g, date.getDate().toString());
    result = result.replace(/DO/g, this.getOrdinalSuffix(date.getDate()));
    
    // Day of week
    result = result.replace(/WWWD/g, date.toLocaleString('en-US', { weekday: 'long' }));
    result = result.replace(/WWD/g, date.toLocaleString('en-US', { weekday: 'short' }));
    
    return result;
  }

  private applyTimeFormat(time: Date, format: string): string {
    let result = format;
    
    // Hours
    const hours24 = time.getHours();
    const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
    
    result = result.replace(/HH/g, hours24.toString().padStart(2, '0'));
    result = result.replace(/H/g, hours24.toString());
    result = result.replace(/hh/g, hours12.toString().padStart(2, '0'));
    result = result.replace(/h/g, hours12.toString());
    
    // Minutes
    result = result.replace(/mm/g, time.getMinutes().toString().padStart(2, '0'));
    result = result.replace(/m/g, time.getMinutes().toString());
    
    // Seconds
    result = result.replace(/ss/g, time.getSeconds().toString().padStart(2, '0'));
    result = result.replace(/s/g, time.getSeconds().toString());
    
    // AM/PM
    const ampm = hours24 >= 12 ? 'PM' : 'AM';
    result = result.replace(/A/g, ampm);
    result = result.replace(/a/g, ampm.toLowerCase());
    result = result.replace(/ap/g, ampm.toLowerCase());
    
    return result;
  }

  private getOrdinalSuffix(day: number): string {
    const suffix = ['th', 'st', 'nd', 'rd'];
    const v = day % 100;
    return day + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
  }

  private parseTextValue(input: string, _field: FieldDefinition): string {
    return input.trim();
  }

  private parseNumberValue(input: string, _field: FieldDefinition): number | null {
    // Remove currency symbols, commas, and percentage signs
    const cleaned = input.replace(/[$,\s%]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  private parseDateValue(input: string, field: FieldDefinition): Date | null {
    // Use the input format if it's a dual format
    const format = field.format && typeof field.format === 'object' ? field.format.input : field.format;
    
    if (format && typeof format === 'string') {
      return this.parseDateWithFormat(input, format);
    }
    
    const date = new Date(input);
    return isNaN(date.getTime()) ? null : date;
  }

  private parseTimeValue(input: string, field: FieldDefinition): Date | null {
    // Use the input format if it's a dual format
    const format = field.format && typeof field.format === 'object' ? field.format.input : field.format;
    
    if (format && typeof format === 'string') {
      return this.parseTimeWithFormat(input, format);
    }
    
    return this.parseTimeString(input);
  }

  private parseBooleanValue(input: string, _field: FieldDefinition): boolean {
    return this.convertToBoolean(input);
  }

  private parseTimeString(input: string): Date | null {
    const match = input.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(\s?(AM|PM|am|pm))?$/);
    if (!match) return null;
    
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

  private convertToBoolean(value: unknown): boolean {
    const stringValue = String(value).toLowerCase().trim();
    return ['true', 'yes', 'y', '1'].includes(stringValue);
  }

  private parseDateWithFormat(input: string, format: string): Date | null {
    // Simplified date parsing - in production, use a proper library
    try {
      const date = new Date(input);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  private parseTimeWithFormat(input: string, format: string): Date | null {
    // Simplified time parsing
    return this.parseTimeString(input);
  }

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

  private validateNumberFormat(value: string, _format: string | DualFormat): boolean {
    const cleaned = value.replace(/[$,\s%]/g, '');
    return !isNaN(parseFloat(cleaned));
  }

  private validateDateFormat(value: string, format: string | DualFormat): boolean {
    const formatString = typeof format === 'string' ? format : format.input;
    return this.parseDateWithFormat(value, formatString) !== null;
  }

  private validateTimeFormat(value: string, format: string | DualFormat): boolean {
    const formatString = typeof format === 'string' ? format : format.input;
    return this.parseTimeWithFormat(value, formatString) !== null;
  }

  private validateBooleanFormat(value: string, _format: string | DualFormat): boolean {
    const normalized = value.toLowerCase().trim();
    return ['true', 'false', 'yes', 'no', 'y', 'n', '1', '0'].includes(normalized);
  }

  private validateBasicDateFormat(value: string): boolean {
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

  private validateBasicTimeFormat(value: string): boolean {
    // Check if the value matches time format: HH:MM or HH:MM:SS
    const timePattern = /^([01]?\d|2[0-3]):([0-5]?\d)(?::([0-5]?\d))?$/;
    return timePattern.test(value.trim());
  }
}
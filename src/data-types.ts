import { DataType, FieldDefinition } from './types.js';

export class DataTypeConverter {
  
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

}
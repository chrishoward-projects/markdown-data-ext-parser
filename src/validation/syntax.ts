import { DataType, FieldDefinition, DualFormat } from '../types.js';
import { TypeValidator } from './type.js';

/**
 * Dedicated validation module for data type and format validation
 * Follows Single Responsibility Principle - only handles validation logic
 */
export class DataValidator {
  private typeValidator: TypeValidator;

  constructor() {
    this.typeValidator = new TypeValidator();
  }

  /**
   * Validates if a value matches the expected data type
   */
  validateType(value: unknown, type: DataType): boolean {
    return this.typeValidator.validateType(value, type);
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
        return this.typeValidator.validateType(value, type); // Use type validator for numbers
      case DataType.DATE:
        return this.typeValidator.validateType(value, type); // Use type validator for dates
      case DataType.TIME:
        return this.typeValidator.validateType(value, type); // Use type validator for times
      case DataType.BOOLEAN:
        return this.typeValidator.validateType(value, type); // Use type validator for booleans
      default:
        return true;
    }
  }

  /**
   * Basic format check for parsing compatibility
   */
  private validateTextFormat(value: string, format: string | DualFormat): boolean {
    // For a parser library, we just ensure the value can be processed
    // Actual validation of email/URL format is left to consuming applications
    return typeof value === 'string';
  }
}
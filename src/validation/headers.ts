import { DataSchema, DataEntry, ParseError, ErrorType } from '../types.js';

/**
 * Dedicated header validation module
 * Handles all header-related validation logic including table syntax and field validation
 */
export class HeaderValidator {

  /**
   * Validates table headers against schema definition
   */
  validateHeaders(headers: string[], schema: DataSchema, schemaName: string, lineNumber: number): ParseError[] {
    const errors: ParseError[] = [];
    const schemaFieldNames = new Set(schema.fields.map(f => f.name));
    
    for (const header of headers) {
      if (!schemaFieldNames.has(header)) {
        errors.push({
          type: ErrorType.INVALID_FIELD_NAME,
          message: `Header '${header}' does not match any field in schema '${schemaName}'`,
          fieldName: header,
          schemaName: schemaName,
          lineNumber: lineNumber
        });
      }
    }
    
    return errors;
  }

  /**
   * Parses and validates table header syntax
   */
  parseTableHeader(headerLine: string, lineNumber: number): { headers: string[]; errors: ParseError[] } {
    const headers: string[] = [];
    const errors: ParseError[] = [];
    
    // Validate basic table syntax
    if (!headerLine.startsWith('|') || !headerLine.endsWith('|')) {
      errors.push({
        type: ErrorType.INVALID_TABLE_SYNTAX,
        message: 'Table header must start and end with pipe (|) character',
        lineNumber: lineNumber
      });
    }
    
    // Parse markdown table header: | !field1 | !field2 | field3 |
    const cells = headerLine.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0);
    
    if (cells.length === 0) {
      errors.push({
        type: ErrorType.INVALID_TABLE_SYNTAX,
        message: 'Table header contains no field definitions',
        lineNumber: lineNumber
      });
      return { headers, errors };
    }
    
    for (const cell of cells) {
      if (cell.startsWith('!')) {
        const fieldName = cell.substring(1);
        if (!fieldName) {
          errors.push({
            type: ErrorType.INVALID_TABLE_SYNTAX,
            message: 'Empty field name in table header (! with no field name)',
            lineNumber: lineNumber
          });
          continue;
        }
        headers.push(fieldName);
      } else if (cell.length > 0) {
        // Regular field name without ! prefix - warn but allow
        headers.push(cell);
      }
    }
    
    return { headers, errors };
  }

  /**
   * Validates data entries for field consistency and requirements
   */
  validateDataEntries(entries: DataEntry[], schema: DataSchema): ParseError[] {
    const errors: ParseError[] = [];
    const schemaFields = new Map(schema.fields.map(f => [f.name, f]));
    
    for (const entry of entries) {
      // Check for unknown fields
      for (const [fieldName] of entry.fields) {
        if (!schemaFields.has(fieldName)) {
          errors.push({
            type: ErrorType.INVALID_FIELD_NAME,
            message: `Unknown field '${fieldName}' in data entry`,
            fieldName: fieldName,
            schemaName: entry.schemaName,
            lineNumber: entry.lineNumber
          });
        }
      }
      
      // Check for required fields
      for (const field of schema.fields) {
        if (field.required && !entry.fields.has(field.name)) {
          errors.push({
            type: ErrorType.MISSING_REQUIRED_FIELD,
            message: `Required field '${field.name}' is missing`,
            fieldName: field.name,
            schemaName: entry.schemaName,
            lineNumber: entry.lineNumber
          });
        }
      }
    }
    
    return errors;
  }

  /**
   * Validates that all required headers are present
   */
  validateRequiredHeaders(headers: string[], schema: DataSchema, schemaName: string, lineNumber: number): ParseError[] {
    const errors: ParseError[] = [];
    const requiredFields = schema.fields.filter(f => f.required);
    const headerSet = new Set(headers);
    
    for (const field of requiredFields) {
      if (!headerSet.has(field.name)) {
        errors.push({
          type: ErrorType.MISSING_REQUIRED_FIELD,
          message: `Required field '${field.name}' is missing from table headers`,
          fieldName: field.name,
          schemaName: schemaName,
          lineNumber: lineNumber
        });
      }
    }
    
    return errors;
  }

  /**
   * Validates header field names for proper naming conventions
   */
  validateHeaderFieldNames(headers: string[], lineNumber: number): ParseError[] {
    const errors: ParseError[] = [];
    const fieldNamePattern = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    
    for (const header of headers) {
      if (!fieldNamePattern.test(header)) {
        errors.push({
          type: ErrorType.INVALID_FIELD_NAME,
          message: `Invalid field name '${header}' - must start with letter and contain only letters, numbers, and underscores`,
          fieldName: header,
          lineNumber: lineNumber
        });
      }
    }
    
    return errors;
  }
}

/**
 * Convenience function for creating a HeaderValidator instance
 */
export function createHeaderValidator(): HeaderValidator {
  return new HeaderValidator();
}
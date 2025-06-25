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

}

/**
 * Convenience function for creating a HeaderValidator instance
 */
export function createHeaderValidator(): HeaderValidator {
  return new HeaderValidator();
}
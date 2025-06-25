import { 
  DataEntry, 
  DataSchema, 
  ParseError, 
  ErrorType, 
  Token, 
  TokenType 
} from '../types.js';
import { formatErrorMessage } from '../utils.js';
import { HeaderValidator } from '../validation/headers.js';
import { TableParser } from './table.js';
import { FreeformParser } from './freeform.js';

/**
 * Main data parser that orchestrates parsing by detecting format and delegating to specialized parsers
 */
export class DataParser {
  private tokens: Token[];
  private current: number = 0;
  private errors: ParseError[] = [];
  private schema: DataSchema;
  private schemaName: string;

  constructor(tokens: Token[], schema: DataSchema, schemaName: string) {
    this.tokens = tokens;
    this.schema = schema;
    this.schemaName = schemaName;
  }

  parseData(): { data: DataEntry[]; errors: ParseError[] } {
    this.current = 0;
    this.errors = [];
    let entries: DataEntry[] = [];

    // Determine format by looking at the first content token
    const format = this.detectDataFormat();
    
    if (format === 'tabular') {
      const tableParser = new TableParser(this.tokens, this.schema, this.schemaName);
      entries = tableParser.parseData();
      this.errors.push(...tableParser.getErrors());
    } else if (format === 'freeform') {
      const freeformParser = new FreeformParser(this.tokens, this.schema, this.schemaName);
      entries = freeformParser.parseData();
      this.errors.push(...freeformParser.getErrors());
    } else {
      this.addError(ErrorType.SYNTAX_ERROR, this.getCurrentLine(), {
        message: 'Unable to determine data format (tabular or free-form)'
      });
    }

    return {
      data: entries,
      errors: this.errors
    };
  }

  /**
   * Detect whether the data is in tabular or freeform format
   */
  private detectDataFormat(): 'tabular' | 'freeform' | 'unknown' {
    let hasTableHeader = false;
    let hasFieldValue = false;
    
    // Scan through tokens to determine format
    for (let i = 0; i < this.tokens.length; i++) {
      const token = this.tokens[i];
      if (!token) continue;
      
      if (token.type === TokenType.TABLE_HEADER) {
        hasTableHeader = true;
        break; // Tabular format confirmed
      } else if (token.type === TokenType.FIELD_VALUE) {
        hasFieldValue = true;
        // Continue scanning to check for table headers
      } else if (token.type === TokenType.TABLE_ROW) {
        // Table row without header might indicate malformed table
        if (!hasTableHeader) {
          this.addError(ErrorType.SYNTAX_ERROR, token.position.line, {
            message: 'Table row found without table header'
          });
          return 'unknown';
        }
      }
    }
    
    if (hasTableHeader) {
      return 'tabular';
    } else if (hasFieldValue) {
      return 'freeform';
    }
    
    // No recognizable format found
    return 'unknown';
  }

  /**
   * Get the current line number for error reporting
   */
  private getCurrentLine(): number {
    const currentToken = this.tokens[this.current];
    if (this.current < this.tokens.length && currentToken) {
      return currentToken.position.line;
    }
    const lastToken = this.tokens[this.tokens.length - 1];
    return this.tokens.length > 0 && lastToken ? lastToken.position.line : 1;
  }

  /**
   * Add a standardized error to the error collection
   */
  private addError(type: ErrorType, lineNumber: number, details: { 
    message?: string; 
    fieldName?: string; 
    schemaName?: string; 
  } = {}): void {
    this.errors.push({
      type,
      message: details.message || formatErrorMessage(type, details),
      lineNumber,
      ...(details.fieldName && { fieldName: details.fieldName }),
      schemaName: details.schemaName || this.schemaName
    });
  }
}

/**
 * Standalone function for validating data entries against a schema
 * Uses HeaderValidator for consistent validation logic
 */
export function validateDataEntries(entries: DataEntry[], schema: DataSchema): ParseError[] {
  // Use HeaderValidator for consistent validation logic
  const headerValidator = new HeaderValidator();
  return headerValidator.validateDataEntries(entries, schema);
}
import { 
  DataEntry, 
  DataSchema, 
  ParseError, 
  ErrorType, 
  Token, 
  TokenType 
} from './types.js';
import { formatErrorMessage } from './utils.js';
import { HeaderValidator } from './validation/headers.js';

export class DataParser {
  private tokens: Token[];
  private current: number = 0;
  private errors: ParseError[] = [];
  private schema: DataSchema;
  private schemaName: string;
  private headerValidator: HeaderValidator;

  constructor(tokens: Token[], schema: DataSchema, schemaName: string) {
    this.tokens = tokens;
    this.schema = schema;
    this.schemaName = schemaName;
    this.headerValidator = new HeaderValidator();
  }

  parseData(): { data: DataEntry[]; errors: ParseError[] } {
    this.current = 0;
    this.errors = [];
    const entries: DataEntry[] = [];

    // Determine format by looking at the first content token
    const format = this.detectDataFormat();
    
    if (format === 'tabular') {
      const tabularEntries = this.parseTabularData();
      entries.push(...tabularEntries);
    } else if (format === 'freeform') {
      const freeformEntries = this.parseFreeformData();
      entries.push(...freeformEntries);
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

  private detectDataFormat(): 'tabular' | 'freeform' | 'unknown' {
    let tokenIndex = 0;
    let foundTabular = false;
    let foundFreeform = false;
    let tabularLine = 0;
    let freeformLine = 0;
    
    // Scan all tokens to detect mixed formats
    while (tokenIndex < this.tokens.length) {
      const token = this.tokens[tokenIndex];
      if (!token) break;
      
      if (token.type === TokenType.TABLE_HEADER || token.type === TokenType.TABLE_ROW) {
        foundTabular = true;
        if (!tabularLine) tabularLine = token.position.line;
      }
      
      if (token.type === TokenType.FIELD_VALUE || token.type === TokenType.RECORD_SEPARATOR) {
        foundFreeform = true;
        if (!freeformLine) freeformLine = token.position.line;
      }
      
      if (token.type === TokenType.BLOCK_END || token.type === TokenType.EOF) {
        break;
      }
      
      tokenIndex++;
    }
    
    // Check for mixed formats
    if (foundTabular && foundFreeform) {
      this.addError(ErrorType.MIXED_DATA_FORMAT, Math.min(tabularLine, freeformLine), {
        message: `Mixed data formats detected: tabular format at line ${tabularLine}, free-form format at line ${freeformLine}`
      });
      return 'unknown';
    }
    
    if (foundTabular) return 'tabular';
    if (foundFreeform) return 'freeform';
    return 'unknown';
  }

  private parseTabularData(): DataEntry[] {
    const entries: DataEntry[] = [];
    let headers: string[] = [];
    let headerLineNumber = 0;

    // Find and parse table header
    while (!this.isAtEnd() && !this.isBlockEnd()) {
      const token = this.advance();
      
      if (token.type === TokenType.TABLE_HEADER) {
        const headerResult = this.headerValidator.parseTableHeader(token.value, token.position.line);
        headers = headerResult.headers;
        this.errors.push(...headerResult.errors);
        headerLineNumber = token.position.line;
        break;
      } else if (token.type !== TokenType.NEWLINE && token.type !== TokenType.COMMENT) {
        this.addError(ErrorType.SYNTAX_ERROR, token.position.line, {
          message: 'Expected table header in tabular data format'
        });
        return entries;
      }
    }

    if (headers.length === 0) {
      this.addError(ErrorType.SYNTAX_ERROR, this.getCurrentLine(), {
        message: 'No table headers found in tabular data'
      });
      return entries;
    }

    // Validate headers against schema
    const headerValidationErrors = this.headerValidator.validateHeaders(headers, this.schema, this.schemaName, headerLineNumber);
    this.errors.push(...headerValidationErrors);

    // Skip separator row (|---|---|---|)
    this.skipSeparatorRow();

    // Parse data rows
    let recordIndex = 0;
    while (!this.isAtEnd() && !this.isBlockEnd()) {
      const token = this.advance();
      
      if (token.type === TokenType.TABLE_ROW) {
        const entry = this.parseTableRow(token.value, headers, token.position.line, recordIndex);
        if (entry) {
          entries.push(entry);
          recordIndex++;
        }
      } else if (token.type !== TokenType.NEWLINE && token.type !== TokenType.COMMENT) {
        this.addError(ErrorType.SYNTAX_ERROR, token.position.line, {
          message: `Unexpected token in tabular data: ${token.value}`
        });
      }
    }

    return entries;
  }


  private parseTableRow(rowLine: string, headers: string[], lineNumber: number, recordIndex: number): DataEntry | null {
    // Validate basic table syntax
    if (!rowLine.startsWith('|') || !rowLine.endsWith('|')) {
      this.addError(ErrorType.INVALID_TABLE_SYNTAX, lineNumber, {
        message: 'Table row must start and end with pipe (|) character'
      });
    }
    
    const cells = rowLine.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0);
    
    if (cells.length === 0) {
      return null; // Empty row
    }

    // Validate column count matches headers
    if (cells.length > headers.length) {
      this.addError(ErrorType.INVALID_TABLE_SYNTAX, lineNumber, {
        message: `Too many columns in table row: expected ${headers.length}, found ${cells.length}`
      });
    }

    const fields = new Map<string, unknown>();
    
    // Match cells to headers
    for (let i = 0; i < Math.min(cells.length, headers.length); i++) {
      const fieldName = headers[i];
      const value = cells[i] || '';
      
      if (fieldName && value.length > 0) {
        fields.set(fieldName, value);
      }
    }

    return {
      schemaName: this.schemaName,
      fields,
      lineNumber,
      recordIndex
    };
  }

  private skipSeparatorRow(): void {
    while (!this.isAtEnd() && !this.isBlockEnd()) {
      const token = this.peek();
      
      if (token.type === TokenType.TABLE_ROW && this.isSeparatorRow(token.value)) {
        this.advance();
        break;
      } else if (token.type === TokenType.NEWLINE || token.type === TokenType.COMMENT) {
        this.advance();
      } else {
        break;
      }
    }
  }

  private isSeparatorRow(rowLine: string): boolean {
    // Check if this is a markdown table separator row like |---|---|---|
    const cells = rowLine.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0);
    return cells.length > 0 && cells.every(cell => /^-+$/.test(cell));
  }

  private parseFreeformData(): DataEntry[] {
    const entries: DataEntry[] = [];
    let currentRecord = new Map<string, unknown>();
    let recordLineNumber = this.getCurrentLine();
    let recordIndex = 0;

    while (!this.isAtEnd() && !this.isBlockEnd()) {
      const token = this.advance();
      
      if (token.type === TokenType.FIELD_VALUE) {
        const fieldResult = this.parseFieldValue(token.value);
        if (fieldResult) {
          currentRecord.set(fieldResult.name, fieldResult.value);
        }
      } else if (token.type === TokenType.RECORD_SEPARATOR) {
        // End of current record
        if (currentRecord.size > 0) {
          entries.push({
            schemaName: this.schemaName,
            fields: currentRecord,
            lineNumber: recordLineNumber,
            recordIndex
          });
          recordIndex++;
        }
        currentRecord = new Map<string, unknown>();
        recordLineNumber = token.position.line + 1;
      } else if (token.type === TokenType.COMMENT || token.type === TokenType.NEWLINE) {
        // Skip comments and newlines
        continue;
      } else {
        this.addError(ErrorType.SYNTAX_ERROR, token.position.line, {
          message: `Unexpected token in free-form data: ${token.value}`
        });
      }
    }

    // Add final record if it has data
    if (currentRecord.size > 0) {
      entries.push({
        schemaName: this.schemaName,
        fields: currentRecord,
        lineNumber: recordLineNumber,
        recordIndex
      });
    }

    return entries;
  }

  private parseFieldValue(fieldValueString: string): { name: string; value: string } | null {
    const spaceIndex = fieldValueString.indexOf(' ');
    
    if (spaceIndex === -1) {
      // Field name only, no value - validate field name format
      const fieldName = fieldValueString.trim();
      if (!fieldName) {
        this.addError(ErrorType.INVALID_FREEFORM_SYNTAX, this.getCurrentLine(), {
          message: 'Empty field name in free-form field value'
        });
        return null;
      }
      
      return {
        name: fieldName,
        value: ''
      };
    }
    
    const name = fieldValueString.substring(0, spaceIndex).trim();
    const value = fieldValueString.substring(spaceIndex + 1);
    
    if (!name) {
      this.addError(ErrorType.INVALID_FREEFORM_SYNTAX, this.getCurrentLine(), {
        message: 'Empty field name in free-form field value'
      });
      return null;
    }
    
    return { name, value };
  }


  private isAtEnd(): boolean {
    return this.current >= this.tokens.length || this.peek().type === TokenType.EOF;
  }

  private isBlockEnd(): boolean {
    return this.peek().type === TokenType.BLOCK_END;
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.previous();
  }

  private peek(): Token {
    return this.tokens[this.current] || { type: TokenType.EOF, value: '', position: { line: 0, column: 0, offset: 0 } };
  }

  private previous(): Token {
    return this.tokens[this.current - 1] || { type: TokenType.EOF, value: '', position: { line: 0, column: 0, offset: 0 } };
  }

  private getCurrentLine(): number {
    return this.peek().position.line;
  }

  private addError(
    type: ErrorType, 
    lineNumber: number, 
    details: { message?: string; fieldName?: string; schemaName?: string }
  ): void {
    this.errors.push({
      type,
      message: formatErrorMessage(type, details),
      lineNumber,
      fieldName: details.fieldName,
      schemaName: details.schemaName
    });
  }
}

export function validateDataEntries(entries: DataEntry[], schema: DataSchema): ParseError[] {
  // Use HeaderValidator for consistent validation logic
  const headerValidator = new HeaderValidator();
  return headerValidator.validateDataEntries(entries, schema);
}
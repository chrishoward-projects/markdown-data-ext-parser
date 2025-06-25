import { 
  DataEntry, 
  DataSchema, 
  ErrorType, 
  Token, 
  TokenType 
} from '../types.js';
import { BaseParser } from './base.js';

/**
 * Parser for tabular data format (markdown tables)
 * Handles table headers, separator rows, and data rows
 */
export class TableParser extends BaseParser {

  constructor(tokens: Token[], schema: DataSchema, schemaName: string) {
    super(tokens, schema, schemaName);
  }

  /**
   * Parse tabular data into DataEntry objects
   */
  parseData(): DataEntry[] {
    const entries: DataEntry[] = [];
    let headers: string[] = [];
    let headerLineNumber = 0;
    let recordIndex = 0;

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
          message: 'Unexpected token in tabular data - expected table row'
        });
      }
    }

    return entries;
  }

  /**
   * Parse a single table row into a DataEntry
   */
  private parseTableRow(rowLine: string, headers: string[], lineNumber: number, recordIndex: number): DataEntry | null {
    // Validate basic table syntax
    if (!rowLine.startsWith('|') || !rowLine.endsWith('|')) {
      this.addError(ErrorType.INVALID_TABLE_SYNTAX, lineNumber, {
        message: 'Table row must start and end with pipe (|) character'
      });
      return null;
    }

    // Parse markdown table row: | value1 | value2 | value3 |
    const cells = rowLine.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0);
    
    if (cells.length !== headers.length) {
      this.addError(ErrorType.INVALID_TABLE_SYNTAX, lineNumber, {
        message: `Table row has ${cells.length} columns but header has ${headers.length} columns`
      });
      return null;
    }

    // Create field map
    const fields = new Map<string, unknown>();
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const cellValue = cells[i];
      
      if (header) {
        // Convert empty cells to null
        fields.set(header, cellValue === '' ? null : cellValue);
      }
    }

    return this.createDataEntry(fields, lineNumber, recordIndex);
  }

  /**
   * Skip the markdown table separator row (|---|---|---|)
   */
  private skipSeparatorRow(): void {
    while (!this.isAtEnd() && !this.isBlockEnd()) {
      const token = this.peek();
      
      if (token.type === TokenType.TABLE_ROW && this.isSeparatorRow(token.value)) {
        this.advance(); // Skip the separator row
        break;
      } else if (token.type === TokenType.NEWLINE || token.type === TokenType.COMMENT) {
        this.advance(); // Skip whitespace
      } else {
        // No separator row found, which is technically valid for markdown tables
        break;
      }
    }
  }

  /**
   * Check if a row is a separator row (|---|---|---|)
   */
  private isSeparatorRow(rowLine: string): boolean {
    return /^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|$/.test(rowLine.trim());
  }
}
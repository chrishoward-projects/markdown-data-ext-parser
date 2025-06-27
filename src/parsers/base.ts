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

/**
 * Base parser class providing common functionality for all data parsers
 * Handles token navigation, error management, and shared utilities
 */
export abstract class BaseParser {
  protected tokens: Token[];
  protected current: number = 0;
  protected errors: ParseError[] = [];
  protected schema: DataSchema;
  protected schemaName: string;
  protected headerValidator: HeaderValidator;
  protected blockContext?: { blockNumber?: number; blockType?: 'datadef' | 'data' };

  constructor(
    tokens: Token[], 
    schema: DataSchema, 
    schemaName: string,
    blockContext?: { blockNumber?: number; blockType?: 'datadef' | 'data' }
  ) {
    this.tokens = tokens;
    this.schema = schema;
    this.schemaName = schemaName;
    this.headerValidator = new HeaderValidator();
    this.blockContext = blockContext;
  }

  /**
   * Abstract method that each parser must implement
   */
  abstract parseData(): DataEntry[];

  /**
   * Get all accumulated errors
   */
  getErrors(): ParseError[] {
    return this.errors;
  }

  /**
   * Check if we've reached the end of tokens
   */
  protected isAtEnd(): boolean {
    return this.current >= this.tokens.length || this.peek().type === TokenType.EOF;
  }

  /**
   * Check if we've reached a block end token
   */
  protected isBlockEnd(): boolean {
    return this.peek().type === TokenType.BLOCK_END;
  }

  /**
   * Advance to the next token and return the current one
   */
  protected advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  /**
   * Peek at the current token without advancing
   */
  protected peek(): Token {
    return this.tokens[this.current] || { type: TokenType.EOF, value: '', position: { line: 0, column: 0, offset: 0 } };
  }

  /**
   * Get the previous token
   */
  protected previous(): Token {
    return this.tokens[this.current - 1] || { type: TokenType.EOF, value: '', position: { line: 0, column: 0, offset: 0 } };
  }

  /**
   * Get the current line number for error reporting
   */
  protected getCurrentLine(): number {
    return this.peek().position.line;
  }

  /**
   * Add a standardized error to the error collection
   */
  protected addError(type: ErrorType, lineNumber: number, details: { 
    message?: string; 
    fieldName?: string; 
    schemaName?: string; 
  } = {}): void {
    this.errors.push({
      type,
      message: details.message || formatErrorMessage(type, details),
      lineNumber,
      ...(details.fieldName && { fieldName: details.fieldName }),
      ...(((details.schemaName !== undefined ? details.schemaName : this.schemaName) !== undefined) && { 
        schemaName: details.schemaName !== undefined ? details.schemaName : this.schemaName 
      }),
      ...(this.blockContext?.blockNumber !== undefined && { blockNumber: this.blockContext.blockNumber }),
      ...(this.blockContext?.blockType && { blockType: this.blockContext.blockType })
    });
  }

  /**
   * Create a data entry with the given fields and metadata
   */
  protected createDataEntry(fields: Map<string, unknown>, lineNumber: number, recordIndex: number): DataEntry {
    return {
      fields,
      lineNumber,
      recordIndex,
      schemaName: this.schemaName
    };
  }

  /**
   * Skip tokens of specified types (like newlines, comments)
   */
  protected skipTokenTypes(types: TokenType[]): void {
    while (!this.isAtEnd() && !this.isBlockEnd() && types.includes(this.peek().type)) {
      this.advance();
    }
  }

  /**
   * Skip newlines and comments
   */
  protected skipWhitespace(): void {
    this.skipTokenTypes([TokenType.NEWLINE, TokenType.COMMENT]);
  }
}
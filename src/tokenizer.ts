import { Token, TokenType, TokenPosition, ParseError, ErrorType } from './types.js';
import { isValidSchemaName, formatErrorMessage } from './utils.js';

export class Tokenizer {
  private text: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private errors: ParseError[] = [];

  constructor(text: string) {
    this.text = text;
  }

  tokenize(): { tokens: Token[]; errors: ParseError[] } {
    const tokens: Token[] = [];
    this.errors = [];
    
    while (!this.isAtEnd()) {
      const token = this.nextToken();
      if (token) {
        tokens.push(token);
      }
    }
    
    tokens.push(this.createToken(TokenType.EOF, ''));
    return { tokens, errors: this.errors };
  }

  private nextToken(): Token | null {
    this.skipWhitespace();
    
    if (this.isAtEnd()) {
      return null;
    }

    const char = this.peek();
    const startPosition = this.getCurrentPosition();

    // Handle newlines
    if (char === '\n') {
      this.advance();
      this.line++;
      this.column = 1;
      return this.createTokenAt(TokenType.NEWLINE, '\n', startPosition);
    }

    // Handle block markers starting with !?
    if (char === '!' && this.peek(1) === '?') {
      return this.readBlockStart(startPosition);
    }

    // Handle field names and values starting with !
    if (char === '!' && this.peek(1) !== '?') {
      return this.readFieldOrSpecial(startPosition);
    }

    // Handle table headers (markdown table with ! prefix)
    if (char === '|') {
      return this.readTableElement(startPosition);
    }

    // Handle comments
    if (char === '<' && this.peekString(4) === '<!--') {
      return this.readComment(startPosition);
    }

    // Handle external references [schema_name](path)
    if (char === '[') {
      const bracketContent = this.readBracketContent();
      if (bracketContent && this.peek() === '(') {
        return this.readExternalReference(startPosition, bracketContent);
      }
      // Not an external reference, treat as regular text
      return this.readText(startPosition);
    }

    // Regular text
    return this.readText(startPosition);
  }

  private readBlockStart(startPosition: TokenPosition): Token {
    this.advance(); // !
    this.advance(); // ?
    this.skipWhitespace();
    
    const blockType = this.readWord();
    if (!blockType) {
      this.addError(ErrorType.INVALID_BLOCK_SYNTAX, startPosition.line, {
        message: 'Missing block type after !? - expected "datadef" or "data"'
      });
      return this.createTokenAt(TokenType.BLOCK_START, '!?', startPosition);
    }
    
    if (blockType !== 'datadef' && blockType !== 'data') {
      this.addError(ErrorType.INVALID_BLOCK_TYPE, startPosition.line, {
        message: `Invalid block type "${blockType}" - expected "datadef" or "data"`
      });
    }
    
    this.skipWhitespace();
    const schemaName = this.readRestOfLine().trim();
    
    if (!schemaName) {
      this.addError(ErrorType.INVALID_BLOCK_SYNTAX, startPosition.line, {
        message: 'Missing schema name in block declaration'
      });
    } else if (!isValidSchemaName(schemaName)) {
      this.addError(ErrorType.INVALID_SCHEMA_NAME, startPosition.line, {
        schemaName,
        message: `Invalid schema name "${schemaName}" - must start with letter and contain only letters, numbers, underscores`
      });
    }
    
    const value = `${blockType} ${schemaName}`.trim();
    return this.createTokenAt(TokenType.BLOCK_START, value, startPosition);
  }

  private readFieldOrSpecial(startPosition: TokenPosition): Token {
    this.advance(); // !
    
    // Check for block end !#
    if (this.peek() === '#') {
      this.advance();
      return this.createTokenAt(TokenType.BLOCK_END, '!#', startPosition);
    }
    
    // Check for record separator !-
    if (this.peek() === '-') {
      this.advance();
      return this.createTokenAt(TokenType.RECORD_SEPARATOR, '!-', startPosition);
    }
    
    // Check for index definition !index:
    if (this.peekString(6) === 'index:') {
      this.advanceBy(6);
      this.skipWhitespace();
      const indexDef = this.readRestOfLine().trim();
      return this.createTokenAt(TokenType.INDEX_DEFINITION, indexDef, startPosition);
    }
    
    // Check for field name !fname:
    if (this.peekString(6) === 'fname:') {
      this.advanceBy(6);
      this.skipWhitespace();
      const fieldDef = this.readRestOfLine().trim();
      return this.createTokenAt(TokenType.FIELD_NAME, fieldDef, startPosition);
    }
    
    // Regular field value !fieldname value
    const fieldName = this.readWord();
    this.skipWhitespace();
    const fieldValue = this.readRestOfLine().trim();
    
    return this.createTokenAt(TokenType.FIELD_VALUE, `${fieldName} ${fieldValue}`.trim(), startPosition);
  }

  private readTableElement(startPosition: TokenPosition): Token {
    const line = this.readRestOfLine();
    
    // Check if this is a header row with ! prefixed fields
    if (line.includes('!')) {
      return this.createTokenAt(TokenType.TABLE_HEADER, line, startPosition);
    }
    
    return this.createTokenAt(TokenType.TABLE_ROW, line, startPosition);
  }

  private readComment(startPosition: TokenPosition): Token {
    this.advanceBy(4); // <!--
    let content = '';
    
    while (!this.isAtEnd() && this.peekString(3) !== '-->') {
      content += this.advance();
    }
    
    if (this.peekString(3) === '-->') {
      this.advanceBy(3);
    }
    
    return this.createTokenAt(TokenType.COMMENT, content, startPosition);
  }

  private readBracketContent(): string | null {
    const start = this.position;
    this.advance(); // [
    
    let content = '';
    let depth = 1;
    
    while (!this.isAtEnd() && depth > 0) {
      const char = this.peek();
      if (char === '[') {
        depth++;
      } else if (char === ']') {
        depth--;
      }
      
      if (depth > 0) {
        content += this.advance();
      } else {
        this.advance(); // ]
      }
    }
    
    return depth === 0 ? content : null;
  }

  private readExternalReference(startPosition: TokenPosition, schemaName: string): Token {
    this.advance(); // (
    
    if (!isValidSchemaName(schemaName)) {
      this.addError(ErrorType.MALFORMED_EXTERNAL_REFERENCE, startPosition.line, {
        message: `Invalid schema name "${schemaName}" in external reference`
      });
    }
    
    let path = '';
    while (!this.isAtEnd() && this.peek() !== ')') {
      path += this.advance();
    }
    
    if (this.peek() !== ')') {
      this.addError(ErrorType.UNCLOSED_LITERAL, startPosition.line, {
        message: 'Unclosed external reference - missing closing parenthesis'
      });
    } else {
      this.advance();
    }
    
    if (!path.trim()) {
      this.addError(ErrorType.MALFORMED_EXTERNAL_REFERENCE, startPosition.line, {
        message: 'Empty path in external reference'
      });
    }
    
    const value = `${schemaName}|${path}`;
    return this.createTokenAt(TokenType.EXTERNAL_REFERENCE, value, startPosition);
  }

  private readText(startPosition: TokenPosition): Token {
    let content = '';
    
    while (!this.isAtEnd()) {
      const char = this.peek();
      
      // Stop at special characters or line breaks
      if (char === '\n' || char === '!' || char === '|' || char === '<') {
        break;
      }
      
      content += this.advance();
    }
    
    return this.createTokenAt(TokenType.TEXT, content, startPosition);
  }

  private readWord(): string {
    let word = '';
    
    while (!this.isAtEnd() && /[a-zA-Z0-9_]/.test(this.peek())) {
      word += this.advance();
    }
    
    return word;
  }

  private readRestOfLine(): string {
    let content = '';
    
    while (!this.isAtEnd() && this.peek() !== '\n') {
      content += this.advance();
    }
    
    return content;
  }

  private skipWhitespace(): void {
    while (!this.isAtEnd() && /[ \t\r]/.test(this.peek())) {
      this.advance();
    }
  }

  private advance(): string {
    if (this.isAtEnd()) {
      return '\0';
    }
    
    const char = this.text[this.position];
    this.position++;
    this.column++;
    
    return char;
  }

  private advanceBy(count: number): void {
    for (let i = 0; i < count && !this.isAtEnd(); i++) {
      this.advance();
    }
  }

  private peek(offset: number = 0): string {
    const pos = this.position + offset;
    if (pos >= this.text.length) {
      return '\0';
    }
    return this.text[pos];
  }

  private peekString(length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += this.peek(i);
    }
    return result;
  }

  private isAtEnd(): boolean {
    return this.position >= this.text.length;
  }

  private getCurrentPosition(): TokenPosition {
    return {
      line: this.line,
      column: this.column,
      offset: this.position
    };
  }

  private createToken(type: TokenType, value: string): Token {
    return this.createTokenAt(type, value, this.getCurrentPosition());
  }

  private createTokenAt(type: TokenType, value: string, position: TokenPosition): Token {
    return {
      type,
      value,
      position
    };
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
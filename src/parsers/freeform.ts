import { 
  DataEntry, 
  DataSchema, 
  ErrorType, 
  Token, 
  TokenType 
} from '../types.js';
import { BaseParser } from './base.js';

/**
 * Parser for freeform data format (field-value pairs)
 * Handles field value assignments and record separators
 */
export class FreeformParser extends BaseParser {

  constructor(
    tokens: Token[], 
    schema: DataSchema, 
    schemaName: string,
    blockContext?: { blockNumber?: number; blockType?: 'datadef' | 'data' }
  ) {
    super(tokens, schema, schemaName, blockContext);
  }

  /**
   * Parse freeform data into DataEntry objects
   */
  parseData(): DataEntry[] {
    const entries: DataEntry[] = [];
    let currentFields = new Map<string, unknown>();
    let recordIndex = 0;
    let currentRecordStartLine = this.getCurrentLine();

    while (!this.isAtEnd() && !this.isBlockEnd()) {
      const token = this.advance();
      
      if (token.type === TokenType.FIELD_VALUE) {
        const fieldValue = this.parseFieldValue(token.value, token.position.line);
        if (fieldValue) {
          currentFields.set(fieldValue.name, fieldValue.value);
        }
      } else if (token.type === TokenType.RECORD_SEPARATOR) {
        // End of current record - create DataEntry if we have fields
        if (currentFields.size > 0) {
          const entry = this.createDataEntry(currentFields, currentRecordStartLine, recordIndex);
          entries.push(entry);
          recordIndex++;
          currentFields = new Map();
          currentRecordStartLine = token.position.line;
        }
      } else if (token.type === TokenType.NEWLINE || token.type === TokenType.COMMENT) {
        // Skip whitespace and comments
        continue;
      } else {
        this.addError(ErrorType.SYNTAX_ERROR, token.position.line, {
          message: 'Unexpected token in freeform data - expected field value or record separator'
        });
      }
    }

    // Handle the last record if there are remaining fields
    if (currentFields.size > 0) {
      const entry = this.createDataEntry(currentFields, currentRecordStartLine, recordIndex);
      entries.push(entry);
    }

    return entries;
  }

  /**
   * Parse a field value token into name-value pair
   */
  private parseFieldValue(fieldValueLine: string, lineNumber: number): { name: string; value: unknown } | null {
    // Parse field value format: "fieldname value" or "fieldname: value"
    let name: string;
    let value: string;
    
    // Try colon separator first
    const colonIndex = fieldValueLine.indexOf(':');
    if (colonIndex !== -1) {
      name = fieldValueLine.substring(0, colonIndex).trim();
      value = fieldValueLine.substring(colonIndex + 1).trim();
    } else {
      // Fallback to first space as separator
      const spaceIndex = fieldValueLine.indexOf(' ');
      if (spaceIndex !== -1) {
        name = fieldValueLine.substring(0, spaceIndex).trim();
        value = fieldValueLine.substring(spaceIndex + 1).trim();
      } else {
        // No separator found - treat entire line as field name with empty value
        name = fieldValueLine.trim();
        value = '';
      }
    }

    if (!name) {
      this.addError(ErrorType.INVALID_FREEFORM_SYNTAX, lineNumber, {
        message: 'Empty field name in field value assignment'
      });
      return null;
    }

    // Validate field name exists in schema
    const schemaField = this.schema.fields.find(f => f.name === name);
    if (!schemaField) {
      this.addError(ErrorType.INVALID_FIELD_NAME, lineNumber, {
        fieldName: name,
        message: `Field '${name}' does not exist in schema '${this.schemaName}'`
      });
      return null;
    }

    // Convert empty string to null for consistency
    const finalValue = value === '' ? null : value;
    
    return { name, value: finalValue };
  }
}
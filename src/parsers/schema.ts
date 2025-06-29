import { 
  DataSchema, 
  FieldDefinition, 
  IndexDefinition, 
  ParseError, 
  ErrorType, 
  Token, 
  TokenType,
  DataType 
} from '../types.js';
import { 
  isValidFieldName, 
  parseDataType, 
  parseFormat, 
 
  parseIndexDefinition,
  formatErrorMessage 
} from '../utils.js';

export class SchemaParser {
  private tokens: Token[];
  private current: number = 0;
  private errors: ParseError[] = [];
  private warnings: ParseError[] = [];
  private blockContext: { blockNumber?: number; blockType?: 'datadef' | 'data'; } | undefined;
  private currentSchemaName?: string;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parseSchema(
    schemaName: string, 
    startLine: number, 
    blockContext?: { blockNumber?: number; blockType?: 'datadef' | 'data'; }
  ): { schema: DataSchema | null; errors: ParseError[]; warnings: ParseError[] } {
    this.current = 0;
    this.errors = [];
    this.warnings = [];
    this.blockContext = blockContext || undefined;
    this.currentSchemaName = schemaName;

    const schema: DataSchema = {
      name: schemaName,
      fields: [],
      indexes: [],
      lineNumber: startLine
    };

    const fieldNames = new Set<string>();

    while (!this.isAtEnd() && !this.isBlockEnd()) {
      const token = this.advance();

      if (token.type === TokenType.FIELD_NAME) {
        const field = this.parseFieldDefinition(token);
        if (field) {
          if (fieldNames.has(field.name)) {
            this.addError(ErrorType.DUPLICATE_FIELD, token.position.line, {
              fieldName: field.name,
              schemaName: schemaName
            }, this.blockContext);
          } else {
            fieldNames.add(field.name);
            schema.fields.push(field);
          }
        }
      } else if (token.type === TokenType.INDEX_DEFINITION) {
        const index = this.parseIndexDefinition(token, fieldNames);
        if (index) {
          schema.indexes.push(index);
        }
      } else if (token.type === TokenType.COMMENT) {
        // Skip comments
        continue;
      } else if (token.type !== TokenType.NEWLINE) {
        this.addError(ErrorType.SYNTAX_ERROR, token.position.line, {
          message: `Unexpected token in schema definition: ${token.value}`
        }, this.blockContext);
      }
    }

    return {
      schema: this.errors.length === 0 ? schema : null,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  private parseFieldDefinition(token: Token): FieldDefinition | null {
    const fieldDefString = token.value;
    const parts = this.parseFieldComponents(fieldDefString, token.position.line);

    if (!parts.name) {
      this.addError(ErrorType.MISSING_FIELD_ATTRIBUTE, token.position.line, {
        message: 'Field name is required in field definition'
      }, this.blockContext);
      return null;
    }

    if (!isValidFieldName(parts.name)) {
      this.addError(ErrorType.INVALID_FIELD_NAME, token.position.line, {
        fieldName: parts.name,
        message: 'Field name must start with a letter and contain only letters, numbers, and underscores'
      }, this.blockContext);
      return null;
    }

    // Validate data type if specified
    if (parts.typeString && !this.isValidDataType(parts.typeString)) {
      this.addWarning(ErrorType.INVALID_DATA_TYPE, token.position.line, {
        fieldName: parts.name,
        message: `Invalid data type "${parts.typeString}" for field "${parts.name}" - defaulting to text`
      }, this.blockContext);
    }

    const field: FieldDefinition = {
      name: parts.name || '',
      type: parts.type || DataType.TEXT,
      ...(parts.label && { label: parts.label }),
      ...(parts.format && { format: parts.format }),
      ...(parts.required !== undefined && { required: parts.required })
    };

    return field;
  }

  private parseFieldComponents(fieldDefString: string, lineNumber: number): {
    name?: string;
    type?: DataType;
    typeString?: string;
    label?: string;
    format?: string | import('../types.js').DualFormat;
    validation?: any;
    required?: boolean;
  } {
    const parts: Record<string, string> = {};
    
    // First, validate for missing commas by checking for common attribute patterns
    this.validateFieldSyntax(fieldDefString, lineNumber);
    
    const components = this.splitRespectingQuotes(fieldDefString).map(c => c.trim());

    // First component is always the field name
    if (components.length > 0 && components[0]) {
      parts['name'] = components[0];
    }

    // Parse remaining components as key:value pairs
    for (let i = 1; i < components.length; i++) {
      const component = components[i];
      if (!component) continue;
      const colonIndex = component.indexOf(':');
      
      if (colonIndex === -1) {
        this.addError(ErrorType.MALFORMED_FIELD_ATTRIBUTE, lineNumber, {
          message: `Invalid field attribute syntax "${component}" - expected "key: value" format`
        }, this.blockContext);
        continue;
      }

      const key = component.substring(0, colonIndex).trim();
      let value = component.substring(colonIndex + 1).trim();

      if (!value) {
        this.addError(ErrorType.MISSING_FIELD_ATTRIBUTE, lineNumber, {
          message: `Missing value for field attribute "${key}"`
        }, this.blockContext);
        continue;
      }

      // Validate known attribute keys
      const validKeys = ['type', 'label', 'format', 'valid', 'required'];
      if (!validKeys.includes(key)) {
        this.addError(ErrorType.MALFORMED_FIELD_ATTRIBUTE, lineNumber, {
          message: `Unknown field attribute "${key}" - valid attributes: ${validKeys.join(', ')}`
        }, this.blockContext);
      }

      // Handle multi-component values (like validation rules and dual formats)
      if ((key === 'valid' || key === 'format') && value.startsWith('{') && !value.endsWith('}')) {
        // Collect remaining components until we find the closing brace
        let foundClose = false;
        for (let j = i + 1; j < components.length; j++) {
          value += ',' + components[j];
          i = j;
          if (components[j] && components[j].includes('}')) {
            foundClose = true;
            break;
          }
        }
        
        if (!foundClose) {
          this.addError(ErrorType.UNCLOSED_LITERAL, lineNumber, {
            message: `Unclosed brace in "${key}" attribute`
          }, this.blockContext);
        }
      }

      parts[key] = value;
    }

    const result: ReturnType<typeof this.parseFieldComponents> = {};

    if (parts['name']) {
      result.name = parts['name'];
    }

    if (parts['type']) {
      result.typeString = parts['type'];
      result.type = parseDataType(parts['type']);
    }

    if (parts['label']) {
      result.label = parts['label'].replace(/^["']|["']$/g, '');
    }

    if (parts['format']) {
      try {
        result.format = parseFormat(parts['format']);
      } catch (error) {
        this.addError(ErrorType.MALFORMED_DUAL_FORMAT, lineNumber, {
          message: `Invalid format syntax: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, this.blockContext);
      }
    }

    // Skip validation rules - this parser focuses on structure, not data validation

    if (parts['required']) {
      if (parts['required'].toLowerCase() !== 'true' && parts['required'].toLowerCase() !== 'false') {
        this.addError(ErrorType.MALFORMED_FIELD_ATTRIBUTE, lineNumber, {
          message: `Invalid required value "${parts['required']}" - must be "true" or "false"`
        }, this.blockContext);
      }
      result.required = parts['required'].toLowerCase() === 'true';
    }

    return result;
  }

  private validateFieldSyntax(fieldDefString: string, lineNumber: number): void {
    // Check for common patterns that indicate missing commas between attributes
    const validAttributeNames = ['type', 'label', 'format', 'valid', 'required'];
    
    // Look for pattern: quoted_value unquoted_attribute_name:
    // This indicates a missing comma after a quoted value
    const missingCommaPattern = /["'][^"']*["']\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g;
    let match;
    while ((match = missingCommaPattern.exec(fieldDefString)) !== null) {
      const attributeName = match[1];
      if (attributeName && validAttributeNames.includes(attributeName)) {
        this.addError(ErrorType.MALFORMED_FIELD_ATTRIBUTE, lineNumber, {
          message: `Missing comma before "${attributeName}" attribute. Field attributes must be separated by commas.`
        }, this.blockContext);
        return; // Stop after first error to avoid confusing multiple messages
      }
    }
    
    // Look for pattern: unquoted_value unquoted_attribute_name:
    // This is trickier but we can detect some cases
    const components = fieldDefString.split(',');
    for (let i = 0; i < components.length; i++) {
      const component = components[i]?.trim();
      if (!component) continue;
      
      // Skip the field name (first component)
      if (i === 0) continue;
      
      // Check if this component has multiple colons (indicating merged attributes)
      const colonCount = (component.match(/:/g) || []).length;
      if (colonCount > 1) {
        // Check if any of the segments before colons are valid attribute names
        const segments = component.split(':');
        for (let j = 1; j < segments.length - 1; j++) {
          const potentialAttr = segments[j]?.trim().split(/\s+/).pop();
          if (potentialAttr && validAttributeNames.includes(potentialAttr)) {
            this.addError(ErrorType.MALFORMED_FIELD_ATTRIBUTE, lineNumber, {
              message: `Missing comma before "${potentialAttr}" attribute. Field attributes must be separated by commas.`
            }, this.blockContext);
            return;
          }
        }
      }
      
      // Check for quoted values followed by text without comma
      if (component.includes('"') && !component.endsWith('"')) {
        const quoteIndex = component.lastIndexOf('"');
        if (quoteIndex > 0 && quoteIndex < component.length - 1) {
          const afterQuote = component.substring(quoteIndex + 1).trim();
          if (afterQuote.length > 0) {
            // Check if the text after quote looks like an attribute
            const words = afterQuote.split(/\s+/);
            for (const word of words) {
              if (validAttributeNames.includes(word)) {
                this.addError(ErrorType.MALFORMED_FIELD_ATTRIBUTE, lineNumber, {
                  message: `Missing comma before "${word}" attribute. Field attributes must be separated by commas.`
                }, this.blockContext);
                return;
              }
            }
          }
        }
      }
    }
  }

  private isValidDataType(typeString: string): boolean {
    const validTypes = ['text', 'number', 'num', 'date', 'time', 'boolean', 'bool'];
    return validTypes.includes(typeString.toLowerCase().trim());
  }

  private parseIndexDefinition(token: Token, fieldNames: Set<string>): IndexDefinition | null {
    const indexDefString = token.value;
    const fields = parseIndexDefinition(indexDefString);

    if (fields.length === 0) {
      this.addError(ErrorType.MALFORMED_FIELD_ATTRIBUTE, token.position.line, {
        message: 'Index definition must specify at least one field'
      }, this.blockContext);
      return null;
    }

    // Validate that all referenced fields exist
    for (const fieldName of fields) {
      if (!fieldNames.has(fieldName)) {
        this.addError(ErrorType.INVALID_INDEX_REFERENCE, token.position.line, {
          fieldName: fieldName,
          message: `Index references unknown field: ${fieldName}`
        }, this.blockContext);
        return null;
      }
    }

    return {
      name: fields.join('+'),
      fields: fields
    };
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

  private addError(
    type: ErrorType, 
    lineNumber: number, 
    details: { message?: string; fieldName?: string; schemaName?: string },
    blockContext?: { blockNumber?: number; blockType?: 'datadef' | 'data'; }
  ): void {
    this.errors.push({
      type,
      message: details.message || formatErrorMessage(type, details),
      lineNumber,
      ...(details.fieldName && { fieldName: details.fieldName }),
      ...((details.schemaName !== undefined ? details.schemaName : this.currentSchemaName) !== undefined && { 
        schemaName: details.schemaName !== undefined ? details.schemaName : this.currentSchemaName 
      }),
      ...(blockContext?.blockNumber !== undefined && { blockNumber: blockContext.blockNumber }),
      ...(blockContext?.blockType && { blockType: blockContext.blockType })
    });
  }

  private addWarning(
    type: ErrorType, 
    lineNumber: number, 
    details: { message?: string; fieldName?: string; schemaName?: string },
    blockContext?: { blockNumber?: number; blockType?: 'datadef' | 'data'; }
  ): void {
    this.warnings.push({
      type,
      message: details.message || formatErrorMessage(type, details),
      lineNumber,
      ...(details.fieldName && { fieldName: details.fieldName }),
      ...((details.schemaName !== undefined ? details.schemaName : this.currentSchemaName) !== undefined && { 
        schemaName: details.schemaName !== undefined ? details.schemaName : this.currentSchemaName 
      }),
      ...(blockContext?.blockNumber !== undefined && { blockNumber: blockContext.blockNumber }),
      ...(blockContext?.blockType && { blockType: blockContext.blockType })
    });
  }

  /**
   * Split a string on commas while respecting quoted strings
   * Handles both single and double quotes
   */
  private splitRespectingQuotes(str: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      
      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
        current += char;
      } else if (inQuotes && char === quoteChar) {
        inQuotes = false;
        quoteChar = '';
        current += char;
      } else if (!inQuotes && char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current) {
      result.push(current);
    }
    
    return result;
  }
}

export function validateSchemaDefinition(schema: DataSchema): ParseError[] {
  const errors: ParseError[] = [];

  // Check for empty schema
  if (schema.fields.length === 0) {
    errors.push({
      type: ErrorType.SYNTAX_ERROR,
      message: `Schema '${schema.name}' has no fields defined`,
      schemaName: schema.name,
      ...(schema.lineNumber !== undefined && { lineNumber: schema.lineNumber })
    });
  }

  // Validate field definitions
  for (const field of schema.fields) {
    // Check field name validity
    if (!isValidFieldName(field.name)) {
      errors.push({
        type: ErrorType.INVALID_FIELD_NAME,
        message: `Invalid field name '${field.name}' in schema '${schema.name}'`,
        fieldName: field.name,
        schemaName: schema.name,
        ...(schema.lineNumber !== undefined && { lineNumber: schema.lineNumber })
      });
    }

    // Validate format strings for specific types
    if (field.format && typeof field.format === 'string') {
      if (field.type === DataType.DATE && !isValidDateFormat(field.format)) {
        errors.push({
          type: ErrorType.VALIDATION_FAILED,
          message: `Invalid date format '${field.format}' for field '${field.name}'`,
          fieldName: field.name,
          schemaName: schema.name,
          ...(schema.lineNumber !== undefined && { lineNumber: schema.lineNumber })
        });
      }

      if (field.type === DataType.TIME && !isValidTimeFormat(field.format)) {
        errors.push({
          type: ErrorType.VALIDATION_FAILED,
          message: `Invalid time format '${field.format}' for field '${field.name}'`,
          fieldName: field.name,
          schemaName: schema.name,
          ...(schema.lineNumber !== undefined && { lineNumber: schema.lineNumber })
        });
      }
    }
  }

  // Validate index definitions
  for (const index of schema.indexes) {
    for (const fieldName of index.fields) {
      const fieldExists = schema.fields.some(f => f.name === fieldName);
      if (!fieldExists) {
        errors.push({
          type: ErrorType.INVALID_FIELD_NAME,
          message: `Index '${index.name}' references unknown field '${fieldName}'`,
          fieldName: fieldName,
          schemaName: schema.name,
          ...(schema.lineNumber !== undefined && { lineNumber: schema.lineNumber })
        });
      }
    }
  }

  return errors;
}

function isValidDateFormat(format: string): boolean {
  // Basic validation for common date format patterns
  const datePatterns = [
    /^[DMY/\-.s]+$/,  // Basic date patterns with separators
    /^[DMY]+$/,          // Date patterns without separators
    /^[DMY\s,]+$/        // Date patterns with month names
  ];
  
  return datePatterns.some(pattern => pattern.test(format));
}

function isValidTimeFormat(format: string): boolean {
  // Basic validation for common time format patterns
  const timePatterns = [
    /^[Hhmsa:]+$/,       // Basic time patterns
    /^[Hhmsa:\s]+$/      // Time patterns with spaces
  ];
  
  return timePatterns.some(pattern => pattern.test(format));
}
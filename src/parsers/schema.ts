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

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parseSchema(schemaName: string, startLine: number): { schema: DataSchema | null; errors: ParseError[]; warnings: ParseError[] } {
    this.current = 0;
    this.errors = [];
    this.warnings = [];

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
            });
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
        });
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
      });
      return null;
    }

    if (!isValidFieldName(parts.name)) {
      this.addError(ErrorType.INVALID_FIELD_NAME, token.position.line, {
        fieldName: parts.name,
        message: 'Field name must start with a letter and contain only letters, numbers, and underscores'
      });
      return null;
    }

    // Validate data type if specified
    if (parts.typeString && !this.isValidDataType(parts.typeString)) {
      this.addWarning(ErrorType.INVALID_DATA_TYPE, token.position.line, {
        fieldName: parts.name,
        actual: parts.typeString,
        message: `Invalid data type "${parts.typeString}" for field "${parts.name}" - defaulting to text`
      });
    }

    const field: FieldDefinition = {
      name: parts.name,
      type: parts.type || DataType.TEXT,
      label: parts.label,
      format: parts.format,
      required: parts.required
    };

    return field;
  }

  private parseFieldComponents(fieldDefString: string, lineNumber: number): {
    name?: string;
    type?: DataType;
    typeString?: string;
    label?: string;
    format?: string | import('./types.js').DualFormat;
    validation?: import('./types.js').ValidationRules;
    required?: boolean;
  } {
    const parts: Record<string, string> = {};
    const components = fieldDefString.split(',').map(c => c.trim());

    // First component is always the field name
    if (components.length > 0) {
      parts.name = components[0];
    }

    // Parse remaining components as key:value pairs
    for (let i = 1; i < components.length; i++) {
      const component = components[i];
      const colonIndex = component.indexOf(':');
      
      if (colonIndex === -1) {
        this.addError(ErrorType.MALFORMED_FIELD_ATTRIBUTE, lineNumber, {
          message: `Invalid field attribute syntax "${component}" - expected "key: value" format`
        });
        continue;
      }

      const key = component.substring(0, colonIndex).trim();
      let value = component.substring(colonIndex + 1).trim();

      if (!value) {
        this.addError(ErrorType.MISSING_FIELD_ATTRIBUTE, lineNumber, {
          message: `Missing value for field attribute "${key}"`
        });
        continue;
      }

      // Validate known attribute keys
      const validKeys = ['type', 'label', 'format', 'valid', 'required'];
      if (!validKeys.includes(key)) {
        this.addError(ErrorType.MALFORMED_FIELD_ATTRIBUTE, lineNumber, {
          message: `Unknown field attribute "${key}" - valid attributes: ${validKeys.join(', ')}`
        });
      }

      // Handle multi-component values (like validation rules and dual formats)
      if ((key === 'valid' || key === 'format') && value.startsWith('{') && !value.endsWith('}')) {
        // Collect remaining components until we find the closing brace
        let foundClose = false;
        for (let j = i + 1; j < components.length; j++) {
          value += ',' + components[j];
          i = j;
          if (components[j].includes('}')) {
            foundClose = true;
            break;
          }
        }
        
        if (!foundClose) {
          this.addError(ErrorType.UNCLOSED_LITERAL, lineNumber, {
            message: `Unclosed brace in "${key}" attribute`
          });
        }
      }

      parts[key] = value;
    }

    const result: ReturnType<typeof this.parseFieldComponents> = {};

    if (parts.name) {
      result.name = parts.name;
    }

    if (parts.type) {
      result.typeString = parts.type;
      result.type = parseDataType(parts.type);
    }

    if (parts.label) {
      result.label = parts.label.replace(/^["']|["']$/g, '');
    }

    if (parts.format) {
      try {
        result.format = parseFormat(parts.format);
      } catch (error) {
        this.addError(ErrorType.MALFORMED_DUAL_FORMAT, lineNumber, {
          message: `Invalid format syntax: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    // Skip validation rules - this parser focuses on structure, not data validation

    if (parts.required) {
      if (parts.required.toLowerCase() !== 'true' && parts.required.toLowerCase() !== 'false') {
        this.addError(ErrorType.MALFORMED_FIELD_ATTRIBUTE, lineNumber, {
          message: `Invalid required value "${parts.required}" - must be "true" or "false"`
        });
      }
      result.required = parts.required.toLowerCase() === 'true';
    }

    return result;
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
      });
      return null;
    }

    // Validate that all referenced fields exist
    for (const fieldName of fields) {
      if (!fieldNames.has(fieldName)) {
        this.addError(ErrorType.INVALID_INDEX_REFERENCE, token.position.line, {
          fieldName: fieldName,
          message: `Index references unknown field: ${fieldName}`
        });
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

  private addWarning(
    type: ErrorType, 
    lineNumber: number, 
    details: { message?: string; fieldName?: string; schemaName?: string }
  ): void {
    this.warnings.push({
      type,
      message: details.message || formatErrorMessage(type, details),
      lineNumber,
      fieldName: details.fieldName,
      schemaName: details.schemaName
    });
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
      lineNumber: schema.lineNumber
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
        lineNumber: schema.lineNumber
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
          lineNumber: schema.lineNumber
        });
      }

      if (field.type === DataType.TIME && !isValidTimeFormat(field.format)) {
        errors.push({
          type: ErrorType.VALIDATION_FAILED,
          message: `Invalid time format '${field.format}' for field '${field.name}'`,
          fieldName: field.name,
          schemaName: schema.name,
          lineNumber: schema.lineNumber
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
          lineNumber: schema.lineNumber
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
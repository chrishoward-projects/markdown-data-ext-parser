import { DataType, DualFormat, ValidationRules, SchemaCache as ISchemaCache, DataSchema } from './types.js';

export class SchemaCache implements ISchemaCache {
  public cache = new Map<string, DataSchema>();

  get(path: string): DataSchema | undefined {
    return this.cache.get(path);
  }

  set(path: string, schema: DataSchema): void {
    this.cache.set(path, schema);
  }

  clear(): void {
    this.cache.clear();
  }
}

export function isValidFieldName(name: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name);
}

export function isValidSchemaName(name: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name);
}

export function parseDataType(type: string): DataType {
  const normalizedType = type.toLowerCase().trim();
  switch (normalizedType) {
    case 'text':
      return DataType.TEXT;
    case 'number':
    case 'num':
      return DataType.NUMBER;
    case 'date':
      return DataType.DATE;
    case 'time':
      return DataType.TIME;
    case 'boolean':
    case 'bool':
      return DataType.BOOLEAN;
    default:
      return DataType.TEXT;
  }
}

export function parseFormat(formatString: string): string | DualFormat {
  const trimmed = formatString.trim();
  
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const content = trimmed.slice(1, -1);
      const parts = content.split(',').map(part => part.trim().replace(/^["']|["']$/g, ''));
      
      if (parts.length === 2) {
        return {
          input: parts[0] || '',
          display: parts[1] || ''
        };
      }
    } catch {
      return trimmed;
    }
  }
  
  return trimmed.replace(/^["']|["']$/g, '');
}

export function parseValidationRules(validString: string): ValidationRules {
  const rules: ValidationRules = {};
  
  try {
    const content = validString.trim();
    if (!content.startsWith('{') || !content.endsWith('}')) {
      return rules;
    }
    
    const rulesContent = content.slice(1, -1);
    const pairs = rulesContent.split(',').map(pair => pair.trim());
    
    for (const pair of pairs) {
      const colonIndex = pair.indexOf(':');
      if (colonIndex === -1) continue;
      
      const key = pair.substring(0, colonIndex).trim();
      const valueStr = pair.substring(colonIndex + 1).trim();
      
      switch (key) {
        case 'required':
          rules.required = valueStr === 'true';
          break;
        case 'min':
          rules.min = parseFloat(valueStr);
          break;
        case 'max':
          rules.max = parseFloat(valueStr);
          break;
        case 'pattern':
          rules.pattern = valueStr.replace(/^["']|["']$/g, '');
          break;
        case 'email':
          rules.email = valueStr === 'true';
          break;
        case 'url':
          rules.url = valueStr === 'true';
          break;
        case 'options':
          if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
            const optionsContent = valueStr.slice(1, -1);
            rules.options = optionsContent
              .split(',')
              .map(opt => opt.trim().replace(/^["']|["']$/g, ''))
              .filter(opt => opt.length > 0);
          }
          break;
      }
    }
  } catch {
    // Invalid validation rules format, return empty rules
  }
  
  return rules;
}

export function parseIndexDefinition(indexString: string): string[] {
  const trimmed = indexString.trim().replace(/^["']|["']$/g, '');
  return trimmed.split('+').map(field => field.trim()).filter(field => field.length > 0);
}

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function createDefaultParseOptions(): import('./types.js').ParseOptions {
  return {
    validateData: true,
    loadExternalSchemas: true,
    schemaCache: new SchemaCache()
  };
}

export function formatErrorMessage(
  type: import('./types.js').ErrorType,
  details: {
    message?: string;
    fieldName?: string;
    schemaName?: string;
    expected?: string;
    actual?: string;
  }
): string {
  const { message, fieldName, schemaName, expected, actual } = details;
  
  if (message) {
    return message;
  }
  
  switch (type) {
    case 'syntax_error':
      return 'Invalid syntax in Markdown Data Extension block';
    case 'schema_not_found':
      return `Schema '${schemaName || 'unknown'}' not found`;
    case 'invalid_field_name':
      return `Invalid field name '${fieldName || 'unknown'}'`;
    case 'type_mismatch':
      return `Type mismatch for field '${fieldName || 'unknown'}': expected ${expected || 'unknown'}, got ${actual || 'unknown'}`;
    case 'validation_failed':
      return `Validation failed for field '${fieldName || 'unknown'}'`;
    case 'external_reference_failed':
      return `Failed to load external schema reference`;
    case 'block_not_closed':
      return 'Data block not properly closed with !#';
    case 'invalid_block_type':
      return 'Invalid block type, expected "datadef" or "data"';
    case 'duplicate_field':
      return `Duplicate field '${fieldName || 'unknown'}' in schema '${schemaName || 'unknown'}'`;
    case 'missing_required_field':
      return `Missing required field '${fieldName || 'unknown'}'`;
    case 'missing_block_start':
      return 'Data content found without proper block declaration (!? datadef/data)';
    case 'invalid_block_syntax':
      return 'Invalid block syntax - expected "!? datadef schema_name" or "!? data schema_name"';
    case 'nested_blocks':
      return 'Nested blocks are not allowed - close current block with !# before starting new one';
    case 'empty_block':
      return 'Empty block - blocks must contain field definitions or data entries';
    case 'invalid_schema_name':
      return `Invalid schema name '${details.schemaName || 'unknown'}' - must start with letter and contain only letters, numbers, underscores`;
    case 'missing_field_attribute':
      return `Missing required field attribute in field definition`;
    case 'invalid_data_type':
      return `Invalid data type '${actual || 'unknown'}' - supported types: text, number, date, time, boolean`;
    case 'malformed_field_attribute':
      return `Malformed field attribute syntax in field '${fieldName || 'unknown'}'`;
    case 'invalid_index_reference':
      return `Index references non-existent field '${fieldName || 'unknown'}'`;
    case 'mixed_data_format':
      return 'Mixed data formats not allowed - use either tabular (|) or free-form (!field) format within a single data block';
    case 'invalid_table_syntax':
      return 'Invalid table syntax - check headers, separators, and column alignment';
    case 'invalid_freeform_syntax':
      return 'Invalid free-form syntax - use "!field_name value" format';
    case 'unclosed_literal':
      return 'Unclosed literal - missing closing quote, brace, or bracket';
    case 'invalid_character':
      return 'Invalid character in field name or schema name';
    case 'malformed_dual_format':
      return 'Malformed dual format - expected {"input_format", "display_format"}';
    case 'malformed_validation_rules':
      return 'Malformed validation rules - expected {key: value, ...} format';
    case 'malformed_external_reference':
      return 'Malformed external reference - expected [schema_name](path) format';
    default:
      return 'Unknown parser error';
  }
}
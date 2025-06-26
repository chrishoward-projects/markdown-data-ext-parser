import { DataType, DualFormat, SchemaCache as ISchemaCache, DataSchema } from './types.js';

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
    blockContext?: string;
  }
): string {
  const { message, fieldName, schemaName, expected, actual, blockContext } = details;
  
  if (message) {
    return blockContext ? `[Block ${blockContext}] ${message}` : message;
  }
  
  const blockPrefix = blockContext ? `[Block ${blockContext}] ` : '';
  
  switch (type) {
    case 'syntax_error':
      return `${blockPrefix}Invalid syntax in Markdown Data Extension block`;
    case 'schema_not_found':
      return `${blockPrefix}Schema '${schemaName || 'unknown'}' not found`;
    case 'invalid_field_name':
      return `${blockPrefix}Invalid field name '${fieldName || 'unknown'}'`;
    case 'type_mismatch':
      return `${blockPrefix}Type mismatch for field '${fieldName || 'unknown'}': expected ${expected || 'unknown'}, got ${actual || 'unknown'}`;
    case 'validation_failed':
      return `${blockPrefix}Validation failed for field '${fieldName || 'unknown'}'`;
    case 'external_reference_failed':
      return `${blockPrefix}Failed to load external schema reference`;
    case 'block_not_closed':
      return `${blockPrefix}Data block not properly closed with !#`;
    case 'invalid_block_type':
      return `${blockPrefix}Invalid block type, expected "datadef" or "data"`;
    case 'duplicate_field':
      return `${blockPrefix}Duplicate field '${fieldName || 'unknown'}' in schema '${schemaName || 'unknown'}'`;
    case 'missing_required_field':
      return `${blockPrefix}Missing required field '${fieldName || 'unknown'}'`;
    case 'missing_block_start':
      return `${blockPrefix}Data content found without proper block declaration (!? datadef/data)`;
    case 'invalid_block_syntax':
      return `${blockPrefix}Invalid block syntax - expected "!? datadef schema_name" or "!? data schema_name"`;
    case 'nested_blocks':
      return `${blockPrefix}Nested blocks are not allowed - close current block with !# before starting new one`;
    case 'empty_block':
      return `${blockPrefix}Empty block - blocks must contain field definitions or data entries`;
    case 'invalid_schema_name':
      return `${blockPrefix}Invalid schema name '${details.schemaName || 'unknown'}' - must start with letter and contain only letters, numbers, underscores`;
    case 'missing_field_attribute':
      return `${blockPrefix}Missing required field attribute in field definition`;
    case 'invalid_data_type':
      return `${blockPrefix}Invalid data type '${actual || 'unknown'}' - supported types: text, number, date, time, boolean`;
    case 'malformed_field_attribute':
      return `${blockPrefix}Malformed field attribute syntax in field '${fieldName || 'unknown'}'`;
    case 'invalid_index_reference':
      return `${blockPrefix}Index references non-existent field '${fieldName || 'unknown'}'`;
    case 'mixed_data_format':
      return `${blockPrefix}Mixed data formats not allowed - use either tabular (|) or free-form (!field) format within a single data block`;
    case 'invalid_table_syntax':
      return `${blockPrefix}Invalid table syntax - check headers, separators, and column alignment`;
    case 'invalid_freeform_syntax':
      return `${blockPrefix}Invalid free-form syntax - use "!field_name value" format`;
    case 'unclosed_literal':
      return `${blockPrefix}Unclosed literal - missing closing quote, brace, or bracket`;
    case 'invalid_character':
      return `${blockPrefix}Invalid character in field name or schema name`;
    case 'malformed_dual_format':
      return `${blockPrefix}Malformed dual format - expected {"input_format", "display_format"}`;
    case 'malformed_validation_rules':
      return `${blockPrefix}Malformed validation rules - expected {key: value, ...} format`;
    case 'malformed_external_reference':
      return `${blockPrefix}Malformed external reference - expected [schema_name](path) format`;
    default:
      return `${blockPrefix}Unknown parser error`;
  }
}
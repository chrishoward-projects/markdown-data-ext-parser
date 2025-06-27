export enum DataType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  TIME = 'time',
  BOOLEAN = 'boolean'
}

export enum ErrorType {
  SYNTAX_ERROR = 'syntax_error',
  SCHEMA_NOT_FOUND = 'schema_not_found',
  INVALID_FIELD_NAME = 'invalid_field_name',
  TYPE_MISMATCH = 'type_mismatch',
  VALIDATION_FAILED = 'validation_failed',
  EXTERNAL_REFERENCE_FAILED = 'external_reference_failed',
  BLOCK_NOT_CLOSED = 'block_not_closed',
  INVALID_BLOCK_TYPE = 'invalid_block_type',
  DUPLICATE_FIELD = 'duplicate_field',
  MISSING_REQUIRED_FIELD = 'missing_required_field',
  
  // New comprehensive syntax validation error types
  MISSING_BLOCK_START = 'missing_block_start',
  INVALID_BLOCK_SYNTAX = 'invalid_block_syntax',
  NESTED_BLOCKS = 'nested_blocks',
  EMPTY_BLOCK = 'empty_block',
  INVALID_SCHEMA_NAME = 'invalid_schema_name',
  MISSING_FIELD_ATTRIBUTE = 'missing_field_attribute',
  INVALID_DATA_TYPE = 'invalid_data_type',
  MALFORMED_FIELD_ATTRIBUTE = 'malformed_field_attribute',
  INVALID_INDEX_REFERENCE = 'invalid_index_reference',
  MIXED_DATA_FORMAT = 'mixed_data_format',
  INVALID_TABLE_SYNTAX = 'invalid_table_syntax',
  INVALID_FREEFORM_SYNTAX = 'invalid_freeform_syntax',
  UNCLOSED_LITERAL = 'unclosed_literal',
  INVALID_CHARACTER = 'invalid_character',
  MALFORMED_DUAL_FORMAT = 'malformed_dual_format',
  MALFORMED_VALIDATION_RULES = 'malformed_validation_rules',
  MALFORMED_EXTERNAL_REFERENCE = 'malformed_external_reference'
}

export interface DualFormat {
  input: string;
  display: string;
}

export interface FieldDefinition {
  name: string;
  type: DataType;
  label?: string;
  format?: string | DualFormat;
  required?: boolean;
}

export interface IndexDefinition {
  fields: string[];
  name: string;
}

export interface DataSchema {
  name: string;
  fields: FieldDefinition[];
  indexes: IndexDefinition[];
  sourcePath?: string;
  lineNumber?: number;
}

export interface DataEntry {
  schemaName: string;
  fields: Map<string, unknown>;
  lineNumber?: number;
  sourceFile?: string;
  recordIndex?: number;
  blockNumber?: number;
  recordNumber?: number;
}

export interface ParseError {
  type: ErrorType;
  message: string;
  lineNumber?: number;
  columnNumber?: number;
  schemaName?: string;
  fieldName?: string;
  sourceFile?: string;
  blockNumber?: number;
  blockType?: 'datadef' | 'data';
}

export interface ParseWarning {
  message: string;
  lineNumber?: number;
  columnNumber?: number;
  schemaName?: string;
  fieldName?: string;
  sourceFile?: string;
  blockNumber?: number;
  blockType?: 'datadef' | 'data';
}

export interface ParseOptions {
  basePath?: string;
  validateData?: boolean;
  loadExternalSchemas?: boolean;
  schemaCache?: SchemaCache;
  sourceFile?: string;
}

export interface DataBlock {
  blockNumber: number;
  schemaName: string;
  records: DataEntry[];
}

export interface TotalRecords {
  [schemaName: string]: number;
  total: number;
}

export interface BlockGroupedData {
  blocks: DataBlock[];
  totalRecords: TotalRecords;
}

export interface ParseResult {
  schemas: Map<string, DataSchema>;
  data: Map<string, DataEntry[]>;
  blockData: BlockGroupedData;
  errors: ParseError[];
  warnings: ParseWarning[];
  metadata: {
    parseTime: number;
    totalLines: number;
    schemasFound: number;
    dataEntriesFound: number;
  };
}

export interface SchemaCache {
  cache: Map<string, DataSchema>;
  get(path: string): DataSchema | undefined;
  set(path: string, schema: DataSchema): void;
  clear(): void;
}

export interface TokenPosition {
  line: number;
  column: number;
  offset: number;
}

export interface Token {
  type: TokenType;
  value: string;
  position: TokenPosition;
}

export enum TokenType {
  BLOCK_START = 'block_start',
  BLOCK_END = 'block_end',
  FIELD_NAME = 'field_name',
  FIELD_VALUE = 'field_value',
  RECORD_SEPARATOR = 'record_separator',
  TABLE_HEADER = 'table_header',
  TABLE_ROW = 'table_row',
  COMMENT = 'comment',
  TEXT = 'text',
  EOF = 'eof',
  NEWLINE = 'newline',
  INDEX_DEFINITION = 'index_definition',
  EXTERNAL_REFERENCE = 'external_reference'
}

export interface BlockInfo {
  type: 'datadef' | 'data';
  schemaName: string;
  externalPath?: string;
  startLine: number;
  endLine?: number;
}

export interface FormattedValue {
  original: unknown;
  formatted: string;
  displayFormatted?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ParseError[];
  warnings: ParseWarning[];
}

export interface DataFormatter {
  formatValue(value: unknown, field: FieldDefinition): FormattedValue;
  parseValue(input: string, field: FieldDefinition): unknown;
  validateFormat(value: unknown, format: string | DualFormat, type: DataType): boolean;
}

export interface MarkdownDataParser {
  parse(markdown: string, options?: ParseOptions): ParseResult;
  parseFile(filePath: string, options?: ParseOptions): Promise<ParseResult>;
  validateSchema(schema: DataSchema): ValidationResult;
  validateData(data: DataEntry[], schema: DataSchema): ValidationResult;
  getSchema(name: string): DataSchema | undefined;
  clearCache(): void;
}

export interface ParserState {
  currentLine: number;
  currentColumn: number;
  inBlock: boolean;
  currentBlockType?: 'datadef' | 'data';
  currentSchemaName?: string;
  currentSchema?: DataSchema;
  blockCounter: number;
  currentBlockNumber?: number;
  currentRecordNumber?: number;
  schemas: Map<string, DataSchema>;
  data: Map<string, DataEntry[]>;
  blocks: DataBlock[];
  errors: ParseError[];
  warnings: ParseWarning[];
  options: ParseOptions;
}
# API Reference

Complete API reference for the Markdown Data Extension Parser library.

## Table of Contents

- [Core Classes](#core-classes)
- [Interfaces](#interfaces)
- [Types and Enums](#types-and-enums)
- [Error Handling](#error-handling)
- [Utility Functions](#utility-functions)
- [Extension APIs](#extension-apis)

## Core Classes

### MarkdownDataExtensionParser

The main parser class for processing Markdown Data Extension documents.

```typescript
class MarkdownDataExtensionParser implements MarkdownDataParser
```

#### Constructor

```typescript
new MarkdownDataExtensionParser()
```

Creates a new parser instance with default configuration.

#### Methods

##### parse(markdown, options?)

```typescript
parse(markdown: string, options?: ParseOptions): ParseResult
```

Parses a markdown string and returns structured data and schemas.

**Parameters:**
- `markdown` (string): The markdown content to parse
- `options` (ParseOptions, optional): Parsing configuration options

**Returns:** `ParseResult` - Complete parsing results including data, schemas, errors, and metadata

**Example:**
```typescript
const parser = new MarkdownDataExtensionParser();
const result = parser.parse(markdownContent, {
  validateData: true,
  loadExternalSchemas: true
});
```

##### parseFile(filePath, options?)

```typescript
async parseFile(filePath: string, options?: ParseOptions): Promise<ParseResult>
```

Parses a markdown file from the filesystem.

**Parameters:**
- `filePath` (string): Path to the markdown file
- `options` (ParseOptions, optional): Parsing configuration options

**Returns:** `Promise<ParseResult>` - Parsing results

**Example:**
```typescript
const result = await parser.parseFile('./data.md', {
  basePath: './schemas',
  sourceFile: './data.md'
});
```

##### validateSchema(schema)

```typescript
validateSchema(schema: DataSchema): ValidationResult
```

Validates a schema definition for correctness.

**Parameters:**
- `schema` (DataSchema): The schema to validate

**Returns:** `ValidationResult` - Validation status and any errors

##### validateData(data, schema)

```typescript
validateData(data: DataEntry[], schema: DataSchema): ValidationResult
```

Validates data entries against a schema.

**Parameters:**
- `data` (DataEntry[]): Array of data entries to validate
- `schema` (DataSchema): Schema to validate against

**Returns:** `ValidationResult` - Validation results including errors and warnings

##### getSchema(name)

```typescript
getSchema(name: string): DataSchema | undefined
```

Retrieves a cached schema by name.

**Parameters:**
- `name` (string): Schema name

**Returns:** `DataSchema | undefined` - The schema if found, undefined otherwise

##### clearCache()

```typescript
clearCache(): void
```

Clears the internal schema cache.

### MarkdownDataFormatter

Handles formatting and parsing of data values according to field definitions.

```typescript
class MarkdownDataFormatter implements DataFormatter
```

#### Methods

##### formatValue(value, field)

```typescript
formatValue(value: unknown, field: FieldDefinition): FormattedValue
```

Formats a value according to field specifications.

**Parameters:**
- `value` (unknown): The value to format
- `field` (FieldDefinition): Field definition with type and format information

**Returns:** `FormattedValue` - Formatted value with original and display formats

##### parseValue(input, field)

```typescript
parseValue(input: string, field: FieldDefinition): unknown
```

Parses a string input into the appropriate data type.

**Parameters:**
- `input` (string): String input to parse
- `field` (FieldDefinition): Field definition for type information

**Returns:** `unknown` - Parsed value in appropriate type

##### validateFormat(value, format, type)

```typescript
validateFormat(value: unknown, format: string | DualFormat, type: DataType): boolean
```

Validates that a value matches a specific format.

**Parameters:**
- `value` (unknown): Value to validate
- `format` (string | DualFormat): Format specification
- `type` (DataType): Expected data type

**Returns:** `boolean` - True if valid, false otherwise

### DataTypeConverter

Converts values between different data types with validation.

```typescript
class DataTypeConverter
```

#### Methods

##### convertValue(value, field)

```typescript
convertValue(value: unknown, field: FieldDefinition): unknown
```

Converts a value to the type specified in the field definition.

**Parameters:**
- `value` (unknown): Value to convert
- `field` (FieldDefinition): Target field definition

**Returns:** `unknown` - Converted value

### Validation Classes

#### DataValidator

```typescript
class DataValidator
```

Validates data syntax and structure.

##### validateType(value, type)

```typescript
validateType(value: unknown, type: DataType): boolean
```

##### validateFormat(value, format, type)

```typescript
validateFormat(value: unknown, format: string | DualFormat, type: DataType): boolean
```

#### TypeValidator

```typescript
class TypeValidator
```

Type-specific validation logic.

##### validateValue(value, field)

```typescript
validateValue(value: unknown, field: FieldDefinition): boolean
```

#### HeaderValidator

```typescript
class HeaderValidator
```

Validates headers and data entries against schemas.

##### validateHeaders(headers, schema, schemaName, lineNumber)

```typescript
validateHeaders(
  headers: string[], 
  schema: DataSchema, 
  schemaName: string, 
  lineNumber: number
): ParseError[]
```

##### validateDataEntries(entries, schema)

```typescript
validateDataEntries(entries: DataEntry[], schema: DataSchema): ParseError[]
```

### Parser Classes

#### BaseParser

Abstract base class for all data parsers.

```typescript
abstract class BaseParser
```

##### Abstract Methods

```typescript
abstract parseData(): DataEntry[]
```

##### Protected Methods

```typescript
protected isAtEnd(): boolean
protected advance(): Token
protected peek(): Token
protected addError(type: ErrorType, lineNumber: number, details?: object): void
protected createDataEntry(fields: Map<string, unknown>, lineNumber: number, recordIndex: number): DataEntry
```

#### TableParser

```typescript
class TableParser extends BaseParser
```

Parses markdown table format data.

#### FreeformParser

```typescript
class FreeformParser extends BaseParser
```

Parses free-form field:value format data.

#### SchemaParser

```typescript
class SchemaParser
```

Parses schema definitions.

##### parseSchema(schemaName, startLine)

```typescript
parseSchema(schemaName: string, startLine: number): { schema: DataSchema | null; errors: ParseError[] }
```

#### DataParser

```typescript
class DataParser
```

Orchestrates data parsing by detecting format and delegating to specialized parsers.

##### parseData()

```typescript
parseData(): { data: DataEntry[]; errors: ParseError[] }
```

### Tokenizer

Lexical analysis and token generation.

```typescript
class Tokenizer
```

#### Methods

##### tokenize()

```typescript
tokenize(): { tokens: Token[]; errors: ParseError[] }
```

Tokenizes input text into a stream of tokens.

### SchemaCache

```typescript
class SchemaCache implements ISchemaCache
```

#### Methods

```typescript
get(path: string): DataSchema | undefined
set(path: string, schema: DataSchema): void
clear(): void
```

## Interfaces

### ParseOptions

```typescript
interface ParseOptions {
  basePath?: string;              // Base path for resolving external schemas
  validateData?: boolean;         // Enable data validation (default: true)
  loadExternalSchemas?: boolean;  // Load external schema references (default: true)
  schemaCache?: SchemaCache;      // Custom schema cache
  sourceFile?: string;            // Source file path for error reporting
}
```

### ParseResult

```typescript
interface ParseResult {
  schemas: Map<string, DataSchema>;    // Parsed schemas by name
  data: Map<string, DataEntry[]>;      // Parsed data entries by schema name
  errors: ParseError[];                // Parse and validation errors
  warnings: ParseWarning[];            // Non-fatal warnings
  metadata: {
    parseTime: number;                 // Parse time in milliseconds
    totalLines: number;                // Total lines processed
    schemasFound: number;              // Number of schemas found
    dataEntriesFound: number;          // Number of data entries found
  };
}
```

### DataSchema

```typescript
interface DataSchema {
  name: string;                    // Schema name
  fields: FieldDefinition[];       // Field definitions
  indexes: IndexDefinition[];      // Index definitions
  sourcePath?: string;             // Source file path
  lineNumber?: number;             // Line number where schema was defined
}
```

### FieldDefinition

```typescript
interface FieldDefinition {
  name: string;                    // Field name
  type: DataType;                  // Data type
  label?: string;                  // Human-readable label
  format?: string | DualFormat;    // Format specification
  validation?: ValidationRules;    // Validation rules
  required?: boolean;              // Whether field is required
}
```

### ValidationRules

```typescript
interface ValidationRules {
  required?: boolean;              // Field is required
  min?: number;                    // Minimum value (numbers) or length (strings)
  max?: number;                    // Maximum value (numbers) or length (strings)
  pattern?: string;                // Regular expression pattern
  options?: string[];              // Allowed values
  email?: boolean;                 // Email format validation
  url?: boolean;                   // URL format validation
}
```

### DualFormat

```typescript
interface DualFormat {
  input: string;                   // Input validation format
  display: string;                 // Display format
}
```

### DataEntry

```typescript
interface DataEntry {
  schemaName: string;              // Name of the schema this entry belongs to
  fields: Map<string, unknown>;   // Field values
  lineNumber?: number;             // Source line number
  sourceFile?: string;             // Source file path
  recordIndex?: number;            // Index within the data block
}
```

### ParseError

```typescript
interface ParseError {
  type: ErrorType;                 // Error type
  message: string;                 // Error message
  lineNumber?: number;             // Line where error occurred
  columnNumber?: number;           // Column where error occurred
  schemaName?: string;             // Related schema name
  fieldName?: string;              // Related field name
  sourceFile?: string;             // Source file path
}
```

### ValidationResult

```typescript
interface ValidationResult {
  valid: boolean;                  // Whether validation passed
  errors: ParseError[];            // Validation errors
  warnings: ParseWarning[];        // Validation warnings
}
```

### Token

```typescript
interface Token {
  type: TokenType;                 // Token type
  value: string;                   // Token value
  position: TokenPosition;         // Position information
}
```

### TokenPosition

```typescript
interface TokenPosition {
  line: number;                    // Line number (1-based)
  column: number;                  // Column number (1-based)
  offset: number;                  // Character offset from start
}
```

## Types and Enums

### DataType

```typescript
enum DataType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  TIME = 'time',
  BOOLEAN = 'boolean'
}
```

### ErrorType

```typescript
enum ErrorType {
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
```

### TokenType

```typescript
enum TokenType {
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
```

## Error Handling

### Error Types and Messages

The library provides detailed error information with specific types for different kinds of parsing and validation failures.

#### Syntax Errors

```typescript
// Block syntax errors
ErrorType.MISSING_BLOCK_START      // Data found without !? declaration
ErrorType.BLOCK_NOT_CLOSED         // Missing !# block terminator
ErrorType.NESTED_BLOCKS            // Block opened inside another block
ErrorType.INVALID_BLOCK_SYNTAX     // Malformed block declaration

// Data format errors
ErrorType.INVALID_TABLE_SYNTAX     // Malformed table rows
ErrorType.INVALID_FREEFORM_SYNTAX  // Invalid field:value syntax
ErrorType.MIXED_DATA_FORMAT        // Mixed table and freeform in same block
```

#### Schema Errors

```typescript
ErrorType.SCHEMA_NOT_FOUND         // Referenced schema doesn't exist
ErrorType.INVALID_SCHEMA_NAME      // Invalid schema name format
ErrorType.INVALID_DATA_TYPE        // Unknown data type specified
ErrorType.MALFORMED_FIELD_ATTRIBUTE // Invalid field definition syntax
```

#### Validation Errors

```typescript
ErrorType.INVALID_FIELD_NAME       // Field not defined in schema
ErrorType.TYPE_MISMATCH            // Value doesn't match field type
ErrorType.VALIDATION_FAILED        // Custom validation rule failed
ErrorType.MISSING_REQUIRED_FIELD   // Required field not provided
ErrorType.DUPLICATE_FIELD          // Field appears multiple times
```

### Error Context

All errors include contextual information:

```typescript
interface ParseError {
  type: ErrorType;           // Specific error type
  message: string;           // Human-readable description
  lineNumber?: number;       // Source line number
  columnNumber?: number;     // Source column number
  schemaName?: string;       // Related schema
  fieldName?: string;        // Related field
  sourceFile?: string;       // Source file path
}
```

## Utility Functions

### Factory Functions

```typescript
// Create default instances
function createParser(): MarkdownDataExtensionParser
function createFormatter(): MarkdownDataFormatter
function createConverter(): DataTypeConverter
function createValidator(): DataValidator
function createTypeValidator(): TypeValidator
function createHeaderValidator(): HeaderValidator

// Convenience parsing functions
function parseMarkdown(markdown: string, options?: ParseOptions): ParseResult
async function parseMarkdownFile(filePath: string, options?: ParseOptions): Promise<ParseResult>
```

### Validation Functions

```typescript
function validateSchemaDefinition(schema: DataSchema): ParseError[]
function validateDataEntries(entries: DataEntry[], schema: DataSchema): ParseError[]
```

### Utility Functions

```typescript
function isValidFieldName(name: string): boolean
function parseDataType(typeString: string): DataType
function parseFormat(formatString: string): string | DualFormat
function parseValidationRules(rulesString: string): ValidationRules
function parseIndexDefinition(indexString: string): IndexDefinition
function normalizeWhitespace(text: string): string
function escapeRegExp(string: string): string
function createDefaultParseOptions(): ParseOptions
function formatErrorMessage(type: ErrorType, details: object): string
```

## Extension APIs

### Abstract Classes for Extension

```typescript
// Extend for custom data parsers
abstract class BaseParser {
  abstract parseData(): DataEntry[]
  protected getErrors(): ParseError[]
  // ... utility methods
}

// Implement for custom formatters
interface DataFormatter {
  formatValue(value: unknown, field: FieldDefinition): FormattedValue
  parseValue(input: string, field: FieldDefinition): unknown
  validateFormat(value: unknown, format: string | DualFormat, type: DataType): boolean
}

// Implement for custom parser implementations
interface MarkdownDataParser {
  parse(markdown: string, options?: ParseOptions): ParseResult
  parseFile(filePath: string, options?: ParseOptions): Promise<ParseResult>
  validateSchema(schema: DataSchema): ValidationResult
  validateData(data: DataEntry[], schema: DataSchema): ValidationResult
  getSchema(name: string): DataSchema | undefined
  clearCache(): void
}
```

### Extension Points

The library provides several extension points through:

1. **Abstract base classes** (BaseParser)
2. **Interfaces** (DataFormatter, MarkdownDataParser)
3. **Composition over inheritance** (Tokenizer, Validators)
4. **Plugin architecture** (through component injection)

See the [Developer Guide](./DEVELOPERS.md) for detailed extension examples and patterns.

## Constants

```typescript
const VERSION = '1.0.0';
```

## Default Exports

```typescript
// Main parser instance for simple usage
const defaultParser: MarkdownDataExtensionParser
```

## Type Guards

```typescript
function isDataSchema(obj: unknown): obj is DataSchema
function isDataEntry(obj: unknown): obj is DataEntry
function isParseError(obj: unknown): obj is ParseError
function isValidationResult(obj: unknown): obj is ValidationResult
```

This API reference covers all public interfaces and classes in the library. For implementation details and extension patterns, see the [Developer Guide](./DEVELOPERS.md).
// Main exports
export { MarkdownDataExtensionParser } from './parser.js';
export { MarkdownDataFormatter } from './formatter.js';
export { DataTypeConverter } from './data-types.js';
export { DataValidator } from './validation/syntax.js';
export { TypeValidator } from './validation/type.js';
export { HeaderValidator } from './validation/headers.js';
export { Tokenizer } from './tokenizer.js';
export { SchemaParser, validateSchemaDefinition } from './schema-parser.js';
export { DataParser, validateDataEntries } from './data-parser.js';

// Type exports
export type {
  MarkdownDataParser,
  DataFormatter,
  ParseResult,
  ParseOptions,
  ParseError,
  ParseWarning,
  ValidationResult,
  DataSchema,
  DataEntry,
  FieldDefinition,
  IndexDefinition,
  ValidationRules,
  DualFormat,
  FormattedValue,
  SchemaCache as ISchemaCache,
  Token,
  TokenPosition,
  BlockInfo,
  ParserState
} from './types.js';

export {
  DataType,
  ErrorType,
  TokenType
} from './types.js';

// Utility exports
export {
  SchemaCache,
  isValidFieldName,
  parseDataType,
  parseFormat,
  parseValidationRules,
  parseIndexDefinition,
  normalizeWhitespace,
  escapeRegExp,
  createDefaultParseOptions,
  formatErrorMessage
} from './utils.js';

// Import classes for convenience functions
import { MarkdownDataExtensionParser } from './parser.js';
import { MarkdownDataFormatter } from './formatter.js';
import { DataTypeConverter } from './data-types.js';
import { DataValidator } from './validation/syntax.js';
import { TypeValidator } from './validation/type.js';
import { HeaderValidator } from './validation/headers.js';

// Convenience factory functions
export function createParser() {
  return new MarkdownDataExtensionParser();
}

export function createFormatter() {
  return new MarkdownDataFormatter();
}

export function createConverter() {
  return new DataTypeConverter();
}

export function createValidator() {
  return new DataValidator();
}

export function createTypeValidator() {
  return new TypeValidator();
}

export function createHeaderValidator() {
  return new HeaderValidator();
}

// Default parser instance for simple usage
export const defaultParser = new MarkdownDataExtensionParser();

// Simple parsing functions for quick usage
export function parseMarkdown(markdown: string, options?: any) {
  return defaultParser.parse(markdown, options);
}

export async function parseMarkdownFile(filePath: string, options?: any) {
  return defaultParser.parseFile(filePath, options);
}

// Version
export const VERSION = '1.0.0';
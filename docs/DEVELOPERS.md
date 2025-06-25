# Developer Guide: Extending the Markdown Data Extension Parser

This guide covers how to extend and customize the Markdown Data Extension Parser library. The library is designed with extensibility in mind, providing clear interfaces and patterns for adding new functionality.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Extension Points](#extension-points)
- [Creating Custom Parsers](#creating-custom-parsers)
- [Custom Data Type Validators](#custom-data-type-validators)
- [Custom Formatters](#custom-formatters)
- [Adding New Token Types](#adding-new-token-types)
- [Custom Validation Rules](#custom-validation-rules)
- [Plugin Development](#plugin-development)
- [Testing Extensions](#testing-extensions)
- [Best Practices](#best-practices)

## Architecture Overview

The library follows a modular, layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                 Public API Layer                        │
│  MarkdownDataExtensionParser (Main Entry Point)        │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────┐
│                Orchestration Layer                      │
│  • Document parsing and block management               │
│  • Schema and data coordination                        │
│  • State management and error aggregation             │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────┐
│              Specialized Parser Layer                   │
│  • SchemaParser  • DataParser  • TableParser          │
│  • FreeformParser  • BaseParser (abstract)            │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────┐
│               Foundation Layer                          │
│  • Tokenizer  • Validators  • Formatters              │
│  • Data Type Converters  • Error Handling             │
└─────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Single Responsibility**: Each component has one clear purpose
2. **Interface Segregation**: Well-defined contracts between components
3. **Open/Closed**: Open for extension, closed for modification
4. **Dependency Inversion**: High-level modules don't depend on low-level details

## Extension Points

The library provides several well-defined extension points:

### 1. Parser Extensions
- **BaseParser**: Abstract base class for data format parsers
- **DataParser**: Orchestrates format detection and delegation
- **MarkdownDataParser**: Interface for complete parser implementations

### 2. Validation Extensions
- **Validator classes**: Type-specific validation logic
- **ValidationRules**: Custom rule definitions
- **HeaderValidator**: Schema compliance validation

### 3. Formatting Extensions
- **DataFormatter**: Interface for value formatting
- **DataTypeConverter**: Type conversion and transformation
- **MarkdownDataFormatter**: Complete formatting implementation

### 4. Tokenization Extensions
- **Tokenizer**: Lexical analysis and token generation
- **Token types**: Custom syntax recognition

## Creating Custom Parsers

### Extending BaseParser

The `BaseParser` class provides common functionality for all data parsers:

```typescript
import { BaseParser } from 'mdl-data-extension-parser';
import { DataEntry, Token, TokenType } from 'mdl-data-extension-parser';

export class CustomFormatParser extends BaseParser {
  parseData(): DataEntry[] {
    const entries: DataEntry[] = [];
    let recordIndex = 0;

    while (!this.isAtEnd() && !this.isBlockEnd()) {
      const token = this.advance();
      
      if (token.type === TokenType.CUSTOM_FORMAT) {
        const entry = this.parseCustomFormat(token, recordIndex);
        if (entry) {
          entries.push(entry);
          recordIndex++;
        }
      }
    }

    return entries;
  }

  private parseCustomFormat(token: Token, recordIndex: number): DataEntry | null {
    // Parse your custom format
    const fields = new Map<string, unknown>();
    
    // Example: Parse custom syntax
    const customData = this.parseCustomSyntax(token.value);
    
    // Validate against schema
    for (const [fieldName, value] of customData) {
      const schemaField = this.schema.fields.find(f => f.name === fieldName);
      if (schemaField) {
        fields.set(fieldName, value);
      } else {
        this.addError(ErrorType.INVALID_FIELD_NAME, token.position.line, {
          fieldName,
          message: `Field '${fieldName}' not found in schema '${this.schemaName}'`
        });
      }
    }

    return this.createDataEntry(fields, token.position.line, recordIndex);
  }

  private parseCustomSyntax(input: string): Map<string, unknown> {
    // Implement your custom parsing logic
    const fields = new Map<string, unknown>();
    // ... parsing implementation
    return fields;
  }
}
```

### Integrating Custom Parsers

To integrate your custom parser with the main parsing system:

```typescript
// 1. Extend DataParser to detect your format
export class ExtendedDataParser extends DataParser {
  parseData(): { data: DataEntry[]; errors: ParseError[] } {
    const format = this.detectDataFormat();
    
    if (format === 'custom') {
      const customParser = new CustomFormatParser(this.tokens, this.schema, this.schemaName);
      const entries = customParser.parseData();
      this.errors.push(...customParser.getErrors());
      return { data: entries, errors: this.errors };
    }
    
    // Fall back to default behavior
    return super.parseData();
  }

  protected detectDataFormat(): 'tabular' | 'freeform' | 'custom' | 'unknown' {
    // Add detection logic for your custom format
    for (const token of this.tokens) {
      if (token.type === TokenType.CUSTOM_FORMAT) {
        return 'custom';
      }
    }
    
    return super.detectDataFormat() as any;
  }
}
```

## Custom Data Type Validators

### Creating Type-Specific Validators

```typescript
import { DataType, FieldDefinition, ValidationRules } from 'mdl-data-extension-parser';

export class CustomTypeValidator {
  validateGeoCoordinate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    
    // Validate latitude,longitude format
    const coordPattern = /^-?\d+\.\d+,-?\d+\.\d+$/;
    return coordPattern.test(value);
  }

  validateCustomType(value: unknown, field: FieldDefinition): boolean {
    switch (field.type) {
      case 'geo_coordinate' as DataType:
        return this.validateGeoCoordinate(value);
      
      case 'phone_number' as DataType:
        return this.validatePhoneNumber(value, field.validation);
      
      default:
        return true; // Unknown type, let other validators handle
    }
  }

  private validatePhoneNumber(value: unknown, rules?: ValidationRules): boolean {
    if (typeof value !== 'string') return false;
    
    // International phone number validation
    const phonePattern = /^\+?[\d\s\-\(\)]+$/;
    if (!phonePattern.test(value)) return false;
    
    // Apply custom validation rules
    if (rules?.pattern) {
      const customPattern = new RegExp(rules.pattern);
      return customPattern.test(value);
    }
    
    return true;
  }
}
```

### Extending the Main Validator

```typescript
import { TypeValidator } from 'mdl-data-extension-parser';

export class ExtendedTypeValidator extends TypeValidator {
  private customValidator = new CustomTypeValidator();

  validateValue(value: unknown, field: FieldDefinition): boolean {
    // Try custom validation first
    if (this.customValidator.validateCustomType(value, field)) {
      return true;
    }
    
    // Fall back to standard validation
    return super.validateValue(value, field);
  }
}
```

## Custom Formatters

### Creating Custom Data Formatters

```typescript
import { DataFormatter, FieldDefinition, FormattedValue, DualFormat } from 'mdl-data-extension-parser';

export class CustomDataFormatter implements DataFormatter {
  formatValue(value: unknown, field: FieldDefinition): FormattedValue {
    const customFormat = this.handleCustomFormats(value, field);
    if (customFormat) return customFormat;
    
    // Handle standard formats...
    return {
      original: value,
      formatted: String(value)
    };
  }

  parseValue(input: string, field: FieldDefinition): unknown {
    // Handle custom parsing logic
    if (field.type === 'geo_coordinate' as any) {
      return this.parseGeoCoordinate(input);
    }
    
    return input;
  }

  validateFormat(value: unknown, format: string | DualFormat, type: DataType): boolean {
    // Custom format validation
    return true;
  }

  private handleCustomFormats(value: unknown, field: FieldDefinition): FormattedValue | null {
    switch (field.type) {
      case 'geo_coordinate' as any:
        return this.formatGeoCoordinate(value, field.format);
      
      case 'phone_number' as any:
        return this.formatPhoneNumber(value, field.format);
      
      default:
        return null;
    }
  }

  private formatGeoCoordinate(value: unknown, format?: string | DualFormat): FormattedValue {
    if (typeof value !== 'string') {
      return { original: value, formatted: String(value) };
    }

    const [lat, lng] = value.split(',');
    
    if (typeof format === 'string' && format === 'dms') {
      // Convert to degrees, minutes, seconds
      const formatted = this.convertToDMS(parseFloat(lat), parseFloat(lng));
      return { original: value, formatted };
    }
    
    return { original: value, formatted: value };
  }

  private formatPhoneNumber(value: unknown, format?: string | DualFormat): FormattedValue {
    if (typeof value !== 'string') {
      return { original: value, formatted: String(value) };
    }

    // Format phone number based on format specification
    if (typeof format === 'string') {
      const formatted = this.applyPhoneFormat(value, format);
      return { original: value, formatted };
    }
    
    return { original: value, formatted: value };
  }

  private convertToDMS(lat: number, lng: number): string {
    // Implementation for degrees, minutes, seconds conversion
    return `${this.toDMS(lat, 'lat')} ${this.toDMS(lng, 'lng')}`;
  }

  private toDMS(coord: number, type: 'lat' | 'lng'): string {
    const absolute = Math.abs(coord);
    const degrees = Math.floor(absolute);
    const minutes = Math.floor((absolute - degrees) * 60);
    const seconds = ((absolute - degrees) * 60 - minutes) * 60;
    
    const direction = type === 'lat' 
      ? (coord >= 0 ? 'N' : 'S')
      : (coord >= 0 ? 'E' : 'W');
    
    return `${degrees}°${minutes}'${seconds.toFixed(2)}"${direction}`;
  }

  private applyPhoneFormat(phone: string, format: string): string {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Apply format pattern
    let formatted = format;
    let digitIndex = 0;
    
    for (let i = 0; i < formatted.length && digitIndex < digits.length; i++) {
      if (formatted[i] === '#') {
        formatted = formatted.substring(0, i) + digits[digitIndex] + formatted.substring(i + 1);
        digitIndex++;
      }
    }
    
    return formatted;
  }
}
```

## Adding New Token Types

### Extending the Tokenizer

```typescript
import { Tokenizer, TokenType, Token } from 'mdl-data-extension-parser';

export enum CustomTokenType {
  GEO_COORDINATE = 'geo_coordinate',
  PHONE_NUMBER = 'phone_number',
  CUSTOM_DIRECTIVE = 'custom_directive'
}

export class ExtendedTokenizer extends Tokenizer {
  protected recognizeToken(): Token | null {
    // Try to recognize custom tokens first
    const customToken = this.tryCustomTokens();
    if (customToken) return customToken;
    
    // Fall back to standard tokenization
    return super.recognizeToken();
  }

  private tryCustomTokens(): Token | null {
    const currentChar = this.peek();
    
    // Recognize geo coordinates: @lat,lng
    if (currentChar === '@') {
      return this.readGeoCoordinate();
    }
    
    // Recognize phone numbers: +1-234-567-8900
    if (currentChar === '+' && this.isPhoneNumber()) {
      return this.readPhoneNumber();
    }
    
    // Recognize custom directives: !@directive value
    if (currentChar === '!' && this.peekNext() === '@') {
      return this.readCustomDirective();
    }
    
    return null;
  }

  private readGeoCoordinate(): Token {
    const start = this.position;
    this.advance(); // Skip @
    
    let value = '@';
    while (!this.isAtEnd() && this.isGeoCoordinateChar()) {
      value += this.advance();
    }
    
    return {
      type: CustomTokenType.GEO_COORDINATE as any,
      value: value,
      position: { ...start, offset: start.offset }
    };
  }

  private readPhoneNumber(): Token {
    const start = this.position;
    let value = '';
    
    while (!this.isAtEnd() && this.isPhoneNumberChar()) {
      value += this.advance();
    }
    
    return {
      type: CustomTokenType.PHONE_NUMBER as any,
      value: value,
      position: { ...start, offset: start.offset }
    };
  }

  private readCustomDirective(): Token {
    const start = this.position;
    this.advance(); // Skip !
    this.advance(); // Skip @
    
    let value = '!@';
    while (!this.isAtEnd() && !this.isNewline()) {
      value += this.advance();
    }
    
    return {
      type: CustomTokenType.CUSTOM_DIRECTIVE as any,
      value: value,
      position: { ...start, offset: start.offset }
    };
  }

  private isGeoCoordinateChar(): boolean {
    const char = this.peek();
    return /[0-9.,\-]/.test(char);
  }

  private isPhoneNumber(): boolean {
    // Look ahead to see if this looks like a phone number
    let pos = this.current;
    let digitCount = 0;
    
    while (pos < this.text.length && digitCount < 15) {
      const char = this.text[pos];
      if (/\d/.test(char)) digitCount++;
      else if (!/[\s\-\(\)\+]/.test(char)) break;
      pos++;
    }
    
    return digitCount >= 7; // Minimum phone number length
  }

  private isPhoneNumberChar(): boolean {
    const char = this.peek();
    return /[\d\s\-\(\)\+]/.test(char);
  }
}
```

## Custom Validation Rules

### Extending ValidationRules

```typescript
import { ValidationRules } from 'mdl-data-extension-parser';

export interface ExtendedValidationRules extends ValidationRules {
  // Geographic validation
  latitude?: { min?: number; max?: number };
  longitude?: { min?: number; max?: number };
  
  // Phone number validation
  countryCode?: string;
  phoneFormat?: 'international' | 'national' | 'e164';
  
  // Custom pattern matching
  customPattern?: {
    pattern: string;
    flags?: string;
    message?: string;
  };
  
  // Data dependencies
  dependsOn?: {
    field: string;
    value: unknown;
    condition: 'equals' | 'not_equals' | 'greater' | 'less';
  };
}

export class ExtendedValidationRuleProcessor {
  validateExtendedRules(value: unknown, rules: ExtendedValidationRules): boolean {
    // Validate geographic coordinates
    if (rules.latitude || rules.longitude) {
      if (!this.validateGeoRules(value, rules)) return false;
    }
    
    // Validate phone number format
    if (rules.phoneFormat || rules.countryCode) {
      if (!this.validatePhoneRules(value, rules)) return false;
    }
    
    // Validate custom patterns
    if (rules.customPattern) {
      if (!this.validateCustomPattern(value, rules.customPattern)) return false;
    }
    
    return true;
  }

  private validateGeoRules(value: unknown, rules: ExtendedValidationRules): boolean {
    if (typeof value !== 'string') return false;
    
    const [latStr, lngStr] = value.split(',');
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    
    if (rules.latitude) {
      if (rules.latitude.min !== undefined && lat < rules.latitude.min) return false;
      if (rules.latitude.max !== undefined && lat > rules.latitude.max) return false;
    }
    
    if (rules.longitude) {
      if (rules.longitude.min !== undefined && lng < rules.longitude.min) return false;
      if (rules.longitude.max !== undefined && lng > rules.longitude.max) return false;
    }
    
    return true;
  }

  private validatePhoneRules(value: unknown, rules: ExtendedValidationRules): boolean {
    if (typeof value !== 'string') return false;
    
    // Validate country code
    if (rules.countryCode && !value.startsWith(`+${rules.countryCode}`)) {
      return false;
    }
    
    // Validate phone format
    if (rules.phoneFormat) {
      return this.validatePhoneFormat(value, rules.phoneFormat);
    }
    
    return true;
  }

  private validateCustomPattern(value: unknown, pattern: ExtendedValidationRules['customPattern']): boolean {
    if (typeof value !== 'string' || !pattern) return false;
    
    const regex = new RegExp(pattern.pattern, pattern.flags);
    return regex.test(value);
  }

  private validatePhoneFormat(phone: string, format: 'international' | 'national' | 'e164'): boolean {
    switch (format) {
      case 'international':
        return /^\+\d{1,3}\s?\d{1,14}$/.test(phone);
      case 'national':
        return /^\d{3}-?\d{3}-?\d{4}$/.test(phone);
      case 'e164':
        return /^\+\d{1,15}$/.test(phone);
      default:
        return true;
    }
  }
}
```

## Plugin Development

### Plugin Interface

```typescript
export interface ParserPlugin {
  name: string;
  version: string;
  
  // Extension hooks
  beforeParse?(markdown: string, options: ParseOptions): string;
  afterParse?(result: ParseResult): ParseResult;
  
  // Component extensions
  customTokenizer?(): Tokenizer;
  customValidators?(): CustomTypeValidator[];
  customFormatters?(): DataFormatter[];
  customParsers?(): typeof BaseParser[];
}

export class PluginManager {
  private plugins: ParserPlugin[] = [];
  
  register(plugin: ParserPlugin): void {
    this.plugins.push(plugin);
  }
  
  applyBeforeParse(markdown: string, options: ParseOptions): string {
    return this.plugins.reduce((content, plugin) => {
      return plugin.beforeParse ? plugin.beforeParse(content, options) : content;
    }, markdown);
  }
  
  applyAfterParse(result: ParseResult): ParseResult {
    return this.plugins.reduce((res, plugin) => {
      return plugin.afterParse ? plugin.afterParse(res) : res;
    }, result);
  }
  
  getCustomComponents(): {
    tokenizers: Tokenizer[];
    validators: CustomTypeValidator[];
    formatters: DataFormatter[];
    parsers: typeof BaseParser[];
  } {
    return {
      tokenizers: this.plugins.map(p => p.customTokenizer?.()).filter(Boolean),
      validators: this.plugins.flatMap(p => p.customValidators?.() || []),
      formatters: this.plugins.map(p => p.customFormatters?.()).flat().filter(Boolean),
      parsers: this.plugins.flatMap(p => p.customParsers?.() || [])
    };
  }
}
```

### Example Plugin

```typescript
export const GeoPlugin: ParserPlugin = {
  name: 'geo-extension',
  version: '1.0.0',
  
  beforeParse(markdown: string, options: ParseOptions): string {
    // Pre-process markdown to handle geo-specific syntax
    return markdown.replace(/@geo\((.*?)\)/g, (match, coords) => {
      return `!geo_coordinate ${coords}`;
    });
  },
  
  afterParse(result: ParseResult): ParseResult {
    // Post-process results to add geo-specific metadata
    result.metadata = {
      ...result.metadata,
      geoEntriesFound: this.countGeoEntries(result)
    };
    return result;
  },
  
  customValidators(): CustomTypeValidator[] {
    return [new GeoCoordinateValidator()];
  },
  
  customFormatters(): DataFormatter[] {
    return [new GeoCoordinateFormatter()];
  },
  
  customParsers(): typeof BaseParser[] {
    return [GeoDataParser];
  },
  
  private countGeoEntries(result: ParseResult): number {
    let count = 0;
    for (const entries of result.data.values()) {
      for (const entry of entries) {
        for (const [field, value] of entry.fields) {
          if (typeof value === 'string' && this.isGeoCoordinate(value)) {
            count++;
          }
        }
      }
    }
    return count;
  },
  
  private isGeoCoordinate(value: string): boolean {
    return /^-?\d+\.\d+,-?\d+\.\d+$/.test(value);
  }
};
```

## Testing Extensions

### Unit Testing Custom Components

```typescript
import { CustomFormatParser } from './custom-format-parser';
import { DataType, FieldDefinition } from 'mdl-data-extension-parser';

describe('CustomFormatParser', () => {
  let parser: CustomFormatParser;
  let mockTokens: Token[];
  let mockSchema: DataSchema;

  beforeEach(() => {
    mockSchema = {
      name: 'test',
      fields: [
        { name: 'id', type: DataType.NUMBER, required: true },
        { name: 'location', type: 'geo_coordinate' as DataType }
      ],
      indexes: []
    };
    
    mockTokens = [
      { type: TokenType.CUSTOM_FORMAT, value: 'id:1 location:40.7,-74.0', position: { line: 1, column: 1, offset: 0 } },
      { type: TokenType.EOF, value: '', position: { line: 1, column: 25, offset: 24 } }
    ];
    
    parser = new CustomFormatParser(mockTokens, mockSchema, 'test');
  });

  test('should parse custom format correctly', () => {
    const result = parser.parseData();
    
    expect(result).toHaveLength(1);
    expect(result[0].fields.get('id')).toBe(1);
    expect(result[0].fields.get('location')).toBe('40.7,-74.0');
  });

  test('should handle validation errors', () => {
    const invalidTokens = [
      { type: TokenType.CUSTOM_FORMAT, value: 'invalid_field:value', position: { line: 1, column: 1, offset: 0 } }
    ];
    
    const invalidParser = new CustomFormatParser(invalidTokens, mockSchema, 'test');
    invalidParser.parseData();
    
    const errors = invalidParser.getErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe(ErrorType.INVALID_FIELD_NAME);
  });
});
```

### Integration Testing

```typescript
import { MarkdownDataExtensionParser } from 'mdl-data-extension-parser';
import { GeoPlugin, PluginManager } from './geo-plugin';

describe('Plugin Integration', () => {
  let parser: MarkdownDataExtensionParser;
  let pluginManager: PluginManager;

  beforeEach(() => {
    parser = new MarkdownDataExtensionParser();
    pluginManager = new PluginManager();
    pluginManager.register(GeoPlugin);
  });

  test('should process geo syntax through plugin', () => {
    const markdown = `
!? datadef locations
!fname: name, type: text
!fname: coords, type: geo_coordinate
!#

!? data locations
@geo(40.7128,-74.0060) name:"New York"
!#
    `;

    const processedMarkdown = pluginManager.applyBeforeParse(markdown, {});
    const result = parser.parse(processedMarkdown);
    const finalResult = pluginManager.applyAfterParse(result);

    expect(finalResult.errors).toHaveLength(0);
    expect(finalResult.data.get('locations')).toHaveLength(1);
    expect(finalResult.metadata.geoEntriesFound).toBe(1);
  });
});
```

## Best Practices

### 1. Interface Compliance
- Always implement required interfaces completely
- Use TypeScript's strict mode for type safety
- Document interface extensions clearly

### 2. Error Handling
- Use the standard error types and reporting mechanisms
- Provide clear, actionable error messages
- Include line numbers and context where possible

### 3. Performance Considerations
- Cache expensive operations when possible
- Use streaming for large datasets
- Implement lazy loading for optional features

### 4. Backwards Compatibility
- Don't modify existing interfaces
- Use extension interfaces for new functionality
- Provide migration guides for breaking changes

### 5. Testing
- Write comprehensive unit tests for all extensions
- Include integration tests with the main parser
- Test error conditions and edge cases

### 6. Documentation
- Document all public APIs with TypeScript comments
- Provide usage examples for complex features
- Include performance characteristics in documentation

## Getting Help

- Review the existing codebase for patterns and examples
- Check the test suite for usage patterns
- Refer to the API documentation for interface details
- Consider contributing your extensions back to the main library

The library is designed to be extended safely and efficiently. Following these patterns will ensure your extensions integrate seamlessly with the existing architecture while maintaining performance and reliability.
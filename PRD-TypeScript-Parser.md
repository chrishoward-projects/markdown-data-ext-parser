# Product Requirements Document
# TypeScript Parser for Markdown Data Extension

## Executive Summary

This PRD defines the requirements for developing a TypeScript-based parser library that can parse, validate, and process documents containing the Markdown Data Extension syntax. The parser will enable applications to extract structured data from Markdown documents while maintaining the extension's core philosophy of plain-text compatibility.

## Project Overview

### Purpose

Create a robust TypeScript library that can:

* Parse Markdown documents containing data definition and data entry blocks
* Validate data against schema definitions
* Extract structured data for application use
* Provide type-safe interfaces for accessing parsed data
* Support both embedded and external schema references

### Target Users

* JavaScript/TypeScript application developers
* Documentation platform developers
* Data processing tool creators
* Static site generators integrating structured data

## Technical Requirements

### Core Parser Functionality

#### 1. Syntax Recognition

**Priority: High**

The parser must recognize and extract:

* Data definition blocks (`!? datadef schema_name`)
* Data entry blocks (`!? data schema_name` and `!? data [schema_name](path)`)
* Field definitions (`!fname:` syntax)
* Tabular data format (Markdown tables with `!field` headers)
* Free-form data format (`!field value` syntax)
* Block terminators (`!#`)
* Record separators (`!-`)
* Index definitions (`!index:`)
* Comments within data blocks

#### 2. Schema Processing

**Priority: High**

Schema parsing must handle:

* Field name extraction and validation
* Data type recognition (text, number, date, time, boolean)
* Format specification parsing (single and dual formats)
* Validation rule extraction
* Label processing
* Index definition parsing

#### 3. Data Validation

**Priority: High**

The parser must validate:

* Field names against schema definitions
* Data types according to field specifications
* Format compliance (dates, times, numbers, patterns)
* Required field presence
* Value constraints (min/max, options, patterns)
* Schema references (internal and external)

#### 4. External Schema Support

**Priority: Medium**

Support for:

* Resolving external schema references
* Path resolution (relative/absolute)
* Schema caching and reuse
* Cross-file schema validation

### Data Type System

#### 1. Text Type Support

* Pattern matching (`(##) #### ####`)
* Format transformations (title, upper, lower)
* Email validation
* URL validation
* Markdown preservation

#### 2. Number Type Support

* Numeric parsing and validation
* Format pattern processing (`$n,n.##`, `n.#%`)
* Currency symbol handling
* Precision control
* Rounding modes (up, down, standard)

#### 3. Date Type Support

* Multiple input format parsing
* ISO date handling
* Custom format patterns
* Dual format support (input/display)

#### 4. Time Type Support

* 12/24 hour format parsing
* Time with seconds support
* AM/PM handling
* Dual format support

#### 5. Boolean Type Support

* Multiple input value recognition (true/false, yes/no, y/n, 1/0)
* Custom display format support

### API Design

#### 1. Core Classes

```TypeScript
interface MarkdownDataParser {
  parse(markdown: string, options?: ParseOptions): ParseResult
  parseFile(filePath: string, options?: ParseOptions): Promise<ParseResult>
  validateSchema(schema: DataSchema): ValidationResult
  validateData(data: DataEntry[], schema: DataSchema): ValidationResult
}

interface ParseOptions {
  basePath?: string
  validateData?: boolean
  loadExternalSchemas?: boolean
  schemaCache?: SchemaCache
}

interface ParseResult {
  schemas: Map<string, DataSchema>
  data: Map<string, DataEntry[]>
  errors: ParseError[]
  warnings: ParseWarning[]
}

interface DataSchema {
  name: string
  fields: FieldDefinition[]
  indexes: IndexDefinition[]
  sourcePath?: string
}

interface FieldDefinition {
  name: string
  type: DataType
  label?: string
  format?: string | DualFormat
  validation?: ValidationRules
  required?: boolean
}

interface DataEntry {
  schemaName: string
  fields: Map<string, any>
  lineNumber?: number
  sourceFile?: string
}

enum DataType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  TIME = 'time',
  BOOLEAN = 'boolean'
}
```

#### 2. Error Handling

```TypeScript
interface ParseError {
  type: ErrorType
  message: string
  lineNumber?: number
  columnNumber?: number
  schemaName?: string
  fieldName?: string
}

enum ErrorType {
  SYNTAX_ERROR = 'syntax_error',
  SCHEMA_NOT_FOUND = 'schema_not_found',
  INVALID_FIELD_NAME = 'invalid_field_name',
  TYPE_MISMATCH = 'type_mismatch',
  VALIDATION_FAILED = 'validation_failed',
  EXTERNAL_REFERENCE_FAILED = 'external_reference_failed'
}
```

#### 3. Formatting System

```TypeScript
interface DataFormatter {
  formatValue(value: any, field: FieldDefinition): string
  parseValue(input: string, field: FieldDefinition): any
  validateFormat(value: any, format: string, type: DataType): boolean
}
```

### Performance Requirements

#### 1. Parsing Performance

* Parse documents up to 10MB in under 2 seconds
* Handle 1000+ data entries without performance degradation
* Lazy loading for external schema references
* Efficient memory usage for large datasets

#### 2. Memory Management

* Streaming parser option for large files
* Schema caching to avoid redundant parsing
* Configurable memory limits
* Garbage collection friendly design

### Integration Requirements

#### 1. Framework Compatibility

* Work with Node.js environments
* Browser compatibility (ES2020+)
* CommonJS and ES Module support
* TypeScript declaration files

#### 2. File System Integration

* Support for reading external schema files
* Relative path resolution
* Async file operations
* Error handling for missing files

#### 3. Extensibility

* Plugin system for custom data types
* Custom validation rule support
* Configurable formatting functions
* Event hooks for parsing stages

## Implementation Phases

### Phase 1: Core Parser (4 weeks)

**Priority: High**

1. Basic syntax recognition and tokenization
2. Schema definition parsing
3. Simple data entry parsing (tabular format)
4. Basic validation
5. TypeScript interfaces and types

**Deliverables:**

* Core parser class
* Schema definition parser
* Basic data validation
* Unit tests (>90% coverage)
* TypeScript declarations

### Phase 2: Advanced Features (3 weeks)

**Priority: High**

1. Free-form data parsing
2. External schema references
3. Complete data type system
4. Format validation and transformation
5. Error reporting system

**Deliverables:**

* External schema support
* Complete data type handling
* Format processing system
* Enhanced error reporting
* Integration tests

### Phase 3: Performance & Polish (2 weeks)

**Priority: Medium**

1. Performance optimization
2. Memory usage optimization
3. Browser compatibility
4. Documentation
5. Examples and tutorials

**Deliverables:**

* Performance benchmarks
* Browser build
* Complete documentation
* Usage examples
* Migration guide

### Phase 4: Extensions (2 weeks)

**Priority: Low**

1. Plugin system
2. Custom validators
3. Advanced formatting options
4. Query capabilities
5. Export utilities

**Deliverables:**

* Plugin architecture
* Custom validation framework
* Data export utilities
* Query interface
* Advanced examples

## Testing Strategy

### Unit Testing

* 95%+ code coverage
* All data types tested
* Error conditions covered
* Schema validation tests
* Format processing tests

### Integration Testing

* External schema loading
* Large document parsing
* Cross-platform compatibility
* Memory usage validation
* Performance benchmarks

### End-to-End Testing

* Real-world document examples
* Complex schema scenarios
* Error recovery testing
* Browser compatibility testing

## Documentation Requirements

### API Documentation

* Complete TypeScript interface documentation
* Method signatures and parameters
* Return type documentation
* Error condition documentation
* Usage examples for each method

### Developer Guide

* Getting started tutorial
* Schema design best practices
* Data validation guide
* Performance optimization tips
* Common use cases and examples

### Migration Guide

* Upgrade instructions
* Breaking change documentation
* Compatibility notes
* Migration examples

## Success Metrics

### Technical Metrics

* Parse 99.9% of valid Markdown Data Extension documents correctly
* Process 1000+ data entries in under 1 second
* Memory usage under 100MB for typical documents
* Zero memory leaks in long-running applications

### Developer Experience Metrics

* Complete TypeScript support with full type inference
* Installation and setup time under 5 minutes
* Clear error messages for common mistakes
* Comprehensive documentation with working examples

### Adoption Metrics

* NPM package with weekly downloads target
* GitHub stars and community engagement
* Integration with popular Markdown processors
* Positive developer feedback and testimonials

## Dependencies

### Core Dependencies

* TypeScript 5.0+
* Node.js 18+ (for file system operations)
* Modern JavaScript features (ES2020+)

### Optional Dependencies

* File system utilities (for external schema loading)
* Date parsing libraries (date-fns or similar)
* Validation libraries (for complex validation rules)

### Development Dependencies

* Jest (testing framework)
* ESLint (code quality)
* Prettier (code formatting)
* Rollup/Webpack (bundling)
* TypeDoc (documentation generation)

## Risk Assessment

### Technical Risks

**High Risk:**

* Complex format parsing for numbers and dates
* External schema reference resolution
* Performance with large documents

**Medium Risk:**

* Browser compatibility issues
* Memory usage optimization
* TypeScript type complexity

**Low Risk:**

* Basic syntax parsing
* Standard validation rules
* Documentation generation

### Mitigation Strategies

* Extensive testing with real-world examples
* Performance benchmarking throughout development
* Gradual feature rollout with feedback loops
* Community involvement in testing and feedback

## Future Considerations

### Potential Extensions

* SQL-like query language for data extraction
* Data transformation and aggregation utilities
* Integration with popular databases
* Real-time data validation in editors
* Visual schema designer tools

### Ecosystem Integration

* VS Code extension for syntax highlighting
* Webpack/Vite plugins for build-time processing
* React/Vue components for data display
* Static site generator plugins

This PRD provides a comprehensive roadmap for developing a robust TypeScript parser for the Markdown Data Extension, ensuring it meets the needs of developers while maintaining the extension's core principles of simplicity and readability.

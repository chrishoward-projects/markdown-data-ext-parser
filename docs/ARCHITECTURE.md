# Architecture Overview

This document provides a comprehensive overview of the Markdown Data Extension Parser library architecture, including system design, component relationships, data flow, and extension points.

## Table of Contents

- [System Overview](#system-overview)
- [Architectural Principles](#architectural-principles)
- [Component Architecture](#component-architecture)
- [Data Flow](#data-flow)
- [Extension Points](#extension-points)
- [Performance Considerations](#performance-considerations)
- [Error Handling Strategy](#error-handling-strategy)
- [Security Considerations](#security-considerations)

## System Overview

The Markdown Data Extension Parser is designed as a modular, extensible library that processes markdown documents containing structured data definitions and data entries. The architecture follows clean separation of concerns with well-defined interfaces between components.

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Application                         │
│  (Imports library, calls parse methods, handles results)       │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Public API
┌─────────────────────┴───────────────────────────────────────────┐
│                 MarkdownDataExtensionParser                     │
│              (Main orchestrator and public API)                │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Internal APIs
┌─────────────────────┴───────────────────────────────────────────┐
│                   Core Processing Pipeline                      │
│  Tokenizer → Block Parser → Schema Parser → Data Parser        │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Component APIs
┌─────────────────────┴───────────────────────────────────────────┐
│                  Specialized Components                         │
│  Validators • Formatters • Type Converters • Error Handlers    │
└─────────────────────────────────────────────────────────────────┘
```

## Architectural Principles

### 1. Single Responsibility Principle (SRP)
Each component has one clear responsibility:
- **Tokenizer**: Lexical analysis only
- **SchemaParser**: Schema definition parsing only
- **DataParser**: Data entry parsing coordination only
- **Validators**: Validation logic only

### 2. Open/Closed Principle
Components are open for extension but closed for modification:
- Abstract base classes (BaseParser)
- Interface-based design (DataFormatter, MarkdownDataParser)
- Plugin architecture through composition

### 3. Dependency Inversion
High-level modules don't depend on low-level modules:
- Main parser depends on abstractions, not concrete implementations
- Validators and formatters are injected, not hardcoded
- Extension points through interfaces

### 4. Interface Segregation
Clients depend only on methods they use:
- Separate interfaces for different concerns (parsing, formatting, validation)
- Fine-grained interfaces rather than monolithic ones

### 5. Don't Repeat Yourself (DRY)
Common functionality is abstracted and reused:
- BaseParser provides shared parser utilities
- Common error handling patterns
- Shared validation and formatting logic

## Component Architecture

### Layer 1: Public API

#### MarkdownDataExtensionParser
The main entry point providing a clean, simple API for users.

**Responsibilities:**
- Document-level parsing coordination
- Block identification and management
- Schema caching and lifecycle management
- Public API surface
- Error aggregation and reporting

**Dependencies:**
- Tokenizer (for lexical analysis)
- SchemaParser (for schema definitions)
- DataParser (for data entries)
- Validation components (for data validation)

### Layer 2: Orchestration

#### Parser State Management
Manages the parsing state across the entire document.

```typescript
interface ParserState {
  currentLine: number;
  currentColumn: number;
  inBlock: boolean;
  currentBlockType?: 'datadef' | 'data';
  currentSchemaName?: string;
  currentSchema?: DataSchema;
  schemas: Map<string, DataSchema>;
  data: Map<string, DataEntry[]>;
  errors: ParseError[];
  warnings: ParseWarning[];
  options: ParseOptions;
}
```

#### Block Management
Handles the identification and processing of markdown blocks.

**Block Processing Flow:**
1. Identify block start (`!? datadef/data`)
2. Validate block syntax and nesting
3. Collect tokens within block boundaries
4. Route to appropriate specialized parser
5. Handle block termination (`!#`)

### Layer 3: Specialized Parsers

#### Tokenizer
Converts raw text into a stream of typed tokens.

**Token Types:**
- Block control tokens (BLOCK_START, BLOCK_END)
- Data format tokens (TABLE_HEADER, TABLE_ROW, FIELD_VALUE)
- Structure tokens (RECORD_SEPARATOR, INDEX_DEFINITION)
- Meta tokens (COMMENT, NEWLINE, EOF)

**Design Pattern:**
- State machine for token recognition
- Lookahead for context-sensitive parsing
- Position tracking for error reporting

#### SchemaParser
Processes schema definition blocks into structured schema objects.

**Processing Steps:**
1. Parse field definitions (`!fname: name, type: text, ...`)
2. Parse index definitions (`!index: "field1+field2"`)
3. Validate schema structure
4. Create DataSchema objects

#### DataParser (Orchestrator)
Determines data format and delegates to specialized parsers.

**Format Detection:**
- Scans tokens to identify format (tabular vs freeform)
- Routes to TableParser or FreeformParser
- Handles format-specific error cases

#### TableParser
Handles markdown table format data parsing.

**Processing Flow:**
1. Parse table header (`| !field1 | !field2 |`)
2. Validate headers against schema
3. Skip separator row (`|---|---|`)
4. Parse data rows with field mapping
5. Create DataEntry objects

#### FreeformParser
Handles field:value format data parsing.

**Processing Flow:**
1. Parse field assignments (`!field value`)
2. Handle record separators (`!-`)
3. Validate fields against schema
4. Create DataEntry objects

### Layer 4: Support Components

#### Validation System

```
HeaderValidator
├── Schema validation
├── Header compliance checking
└── Data entry validation

TypeValidator
├── Type-specific validation
├── Format validation
└── Custom rule processing

DataValidator
├── Syntax validation
├── Structure validation
└── Cross-field validation
```

#### Formatting System

```
MarkdownDataFormatter
├── Value formatting (display)
├── Value parsing (input)
└── Format validation

DataTypeConverter
├── Type coercion
├── Format application
└── Validation integration
```

#### Error Handling

```
Error Management
├── Error type categorization
├── Context preservation
├── Error aggregation
└── User-friendly messaging
```

## Data Flow

### 1. Input Processing

```
Raw Markdown
    ↓
Tokenizer
    ↓
Token Stream
    ↓
Block Identification
    ↓
Block-specific Token Groups
```

### 2. Schema Processing

```
Schema Block Tokens
    ↓
SchemaParser
    ↓
Field Definitions + Index Definitions
    ↓
DataSchema Object
    ↓
Schema Cache
```

### 3. Data Processing

```
Data Block Tokens
    ↓
Format Detection
    ↓
┌─────────────────┬─────────────────┐
│   TableParser   │ FreeformParser  │
└─────────────────┴─────────────────┘
    ↓
DataEntry Objects
    ↓
Validation Pipeline
    ↓
Final Results
```

### 4. Result Assembly

```
Parsed Schemas + Data Entries + Errors
    ↓
Result Aggregation
    ↓
ParseResult Object
    ↓
User Application
```

## Extension Points

### 1. Parser Extensions

**BaseParser Abstract Class**
- Provides common parsing utilities
- Standardizes error handling
- Enables custom data format support

**Extension Pattern:**
```typescript
export class CustomParser extends BaseParser {
  parseData(): DataEntry[] {
    // Custom parsing logic
  }
}
```

### 2. Validation Extensions

**Interface-based Validation**
- Custom validation rules
- Type-specific validators
- Cross-field validation

**Extension Pattern:**
```typescript
export class CustomValidator {
  validateCustomType(value: unknown, field: FieldDefinition): boolean {
    // Custom validation logic
  }
}
```

### 3. Formatting Extensions

**DataFormatter Interface**
- Custom formatting rules
- Type-specific formatters
- Input/output transformation

**Extension Pattern:**
```typescript
export class CustomFormatter implements DataFormatter {
  formatValue(value: unknown, field: FieldDefinition): FormattedValue {
    // Custom formatting logic
  }
}
```

### 4. Tokenization Extensions

**Tokenizer Extension**
- Custom syntax recognition
- New token types
- Format-specific lexing

### 5. Plugin Architecture

**Plugin Interface**
- Before/after parse hooks
- Component replacement
- Feature extension

## Performance Considerations

### 1. Parsing Performance

**Tokenization Optimization:**
- Single-pass lexical analysis
- Minimal backtracking
- Efficient string operations

**Memory Management:**
- Streaming token processing
- Lazy loading of external schemas
- Efficient data structures (Maps for O(1) lookup)

**Caching Strategy:**
- Schema caching to avoid re-parsing
- Memoization of expensive operations
- LRU cache for external resources

### 2. Scalability

**Large Document Handling:**
- Incremental parsing for large files
- Memory-efficient token processing
- Batched validation for large datasets

**Concurrent Processing:**
- Stateless parser design enables parallelization
- Independent block processing
- Async support for file operations

### 3. Performance Metrics

**Benchmarks:**
- 10MB documents parsed in <2 seconds
- 1000+ data entries without degradation
- Linear time complexity for most operations

## Error Handling Strategy

### 1. Error Categories

**Syntax Errors:**
- Block structure violations
- Invalid token sequences
- Malformed syntax

**Semantic Errors:**
- Schema violations
- Type mismatches
- Missing required fields

**Runtime Errors:**
- File system errors
- External reference failures
- Memory/resource constraints

### 2. Error Recovery

**Graceful Degradation:**
- Continue parsing after recoverable errors
- Partial results with error reports
- Best-effort data extraction

**Error Context:**
- Line/column information
- Schema and field context
- Surrounding content for debugging

### 3. Error Reporting

**Structured Error Information:**
- Categorized error types
- Actionable error messages
- Machine-readable error data

**Developer-Friendly Errors:**
- Clear error descriptions
- Suggested fixes where possible
- Context for debugging

## Security Considerations

### 1. Input Validation

**Malformed Input Handling:**
- Robust parsing with bounds checking
- Protection against infinite loops
- Memory limit enforcement

**Injection Prevention:**
- No code execution from parsed content
- Safe string processing
- Validated external references

### 2. External References

**Path Validation:**
- Restricted file system access
- Path traversal prevention
- Whitelist-based validation

**Resource Limits:**
- File size limitations
- Parsing timeout enforcement
- Memory usage monitoring

### 3. Error Information Security

**Information Disclosure:**
- Sanitized error messages
- No sensitive path information
- Controlled stack trace exposure

## Future Architecture Considerations

### 1. Extensibility Roadmap

**Plugin System Enhancement:**
- Dynamic plugin loading
- Plugin dependency management
- Plugin API versioning

**Custom Data Type Support:**
- User-defined data types
- Custom validation rules
- Type system extensions

### 2. Performance Optimization

**Streaming Parser:**
- Event-driven parsing
- Memory-efficient processing
- Real-time validation

**Parallel Processing:**
- Multi-threaded parsing
- Distributed validation
- Async/await optimization

### 3. Integration Capabilities

**Database Integration:**
- Direct database mapping
- Query generation
- ORM integration

**Export Formats:**
- Multiple output formats
- Schema migration tools
- Data transformation pipelines

This architecture provides a solid foundation for current needs while enabling future extensions and optimizations. The modular design ensures that components can evolve independently while maintaining overall system coherence.
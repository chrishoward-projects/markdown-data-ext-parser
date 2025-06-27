# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

Core development workflow commands:
- `npm run build` - Build all output formats (CJS, ESM, UMD) using Rollup
- `npm run dev` - Build in watch mode for development
- `npm test` - Run Jest test suite  
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run lint` - Run ESLint on TypeScript source files
- `npm run lint:fix` - Run ESLint with automatic fixes
- `npm run typecheck` - Run TypeScript compiler type checking
- `npm run clean` - Remove dist directory
- `npm run update-version` - Bump patch version and build
- `npm run deploy` - Alias for build command

Testing commands:
- Single test file: `npm test -- basic.test.ts`
- Test pattern: `npm test -- --testNamePattern="parser"`
- Test with debug: `npm test -- --verbose`

## Architecture Overview

This is a TypeScript library for parsing Markdown Data Extension syntax. The architecture follows a modular, pipeline-based design with clear separation of concerns:

### Core Components

**Main Parser (src/parser.ts)**
- `MarkdownDataExtensionParser` - Main orchestrator class
- Manages document-level parsing, schema caching, and result aggregation
- Delegates to specialized parsers for different block types

**Processing Pipeline**
1. **Tokenizer (src/tokenizer.ts)** - Lexical analysis of markdown text
2. **Block Identification** - Detects and validates block boundaries (`!? datadef/data` to `!#`)
3. **Specialized Parsers** - Routes to schema or data parsers based on block type
4. **Validation & Formatting** - Type conversion and data validation

### Parser Hierarchy

**Base Parser (src/parsers/base.ts)**
- Abstract base class providing common parsing utilities
- Handles token navigation, error management, and data entry creation
- All specialized parsers extend this base

**Specialized Parsers (src/parsers/)**
- `SchemaParser` - Processes schema definition blocks (`!fname`, `!index`)
- `DataParser` - Orchestrator for data entry parsing
- `TableParser` - Handles markdown table format data
- `FreeformParser` - Handles field:value format data

### Supporting Systems

**Validation (src/validation/)**
- `HeaderValidator` - Schema compliance and header validation
- `TypeValidator` - Type-specific validation rules
- `DataValidator` - Syntax and structure validation

**Data Processing**
- `DataTypeConverter` (src/data-types.ts) - Type coercion and conversion
- `MarkdownDataFormatter` (src/formatter.ts) - Value formatting and parsing
- `SchemaCache` (src/utils.ts) - Schema caching and management

### Data Flow Pattern

```
Raw Markdown → Tokenizer → Block Parser → [Schema Parser | Data Parser] → Validation → Results
```

Each parser is stateless and independent, enabling parallel processing and testing.

## Key Design Patterns

**Single Responsibility Principle**
- Each parser handles one specific format or concern
- Clear separation between parsing, validation, and formatting

**Template Method Pattern**
- BaseParser provides common structure, subclasses implement specific parsing logic
- Consistent error handling and token navigation across all parsers

**Strategy Pattern**
- DataParser determines format (table vs freeform) and delegates to appropriate parser
- Pluggable validation and formatting components

## Configuration Files

- **TypeScript**: `tsconfig.json` (main), `tsconfig.test.json` (test-specific)
- **Build**: `rollup.config.js` (multi-format output: CJS, ESM, UMD)
- **Testing**: `jest.config.js` (ts-jest preset, 80% coverage threshold)
- **Linting**: `.eslintrc.js` (basic TypeScript linting)

## Testing Strategy

**Test Structure**
- Tests located in `src/__tests__/`
- Primary test file: `basic.test.ts` (comprehensive integration tests)
- Interactive browser tests in `test/` directory

**Testing Approach**
- Integration tests for complete parsing workflows
- Error case validation with specific error types
- Performance testing for large documents

**Browser Testing**
- `test/test.html` - ES module interface (requires HTTP server)  
- `test/test-umd.html` - UMD interface (can open directly)
- `python test/serve.py` to serve test interfaces

## Error Handling Philosophy

**Structured Error Reporting**
- Typed error categories (SYNTAX_ERROR, TYPE_MISMATCH, etc.)
- Line number and context information for all errors
- Block context tracking for nested error reporting

**Graceful Degradation**
- Continue parsing after recoverable errors
- Return partial results with comprehensive error reports
- Distinguish between errors (fatal) and warnings (non-fatal)

## Development Workflow

### Task Execution Philosophy
- **Do ONLY what is asked** - no scope creep or "helpful" extras
- **Identify other issues** while working, but **add them to todo list** instead of fixing
- **Ask before expanding scope** - if related work seems needed, ask first
- **Prefer working code over perfect code** - warnings that don't break functionality can stay
- **Be surgical with changes** - minimize modifications to achieve the goal

### Standard Workflow
1. **After code changes**: Run `npm run lint` and `npm run typecheck`
2. **Before committing**: Ensure tests pass with `npm test`
3. **Version updates**: Use `npm run update-version` (handles version bump + build)
4. **Release process**: Manual using `npm run release` when ready

## Build Outputs

The library generates multiple build formats:
- `dist/index.js` - CommonJS for Node.js
- `dist/index.mjs` - ES modules for modern bundlers
- `dist/index.umd.js` - UMD for direct browser usage
- `dist/index.d.ts` - TypeScript declaration files

## Parser Extension Points

**Adding New Data Formats**
- Extend `BaseParser` class
- Implement `parseData()` method
- Register with `DataParser` format detection

**Custom Validation**
- Implement validator interfaces in `src/validation/`
- Add to validation pipeline in main parser

**New Data Types**
- Extend `DataType` enum in `types.ts`
- Add conversion logic to `DataTypeConverter`
- Add formatting rules to `MarkdownDataFormatter`
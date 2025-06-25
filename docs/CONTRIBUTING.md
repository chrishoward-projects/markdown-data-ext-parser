# Contributing to Markdown Data Extension Parser

Thank you for considering contributing to the Markdown Data Extension Parser! This document provides guidelines and information for contributors.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Organization](#code-organization)
- [Contribution Guidelines](#contribution-guidelines)
- [Extension Development](#extension-development)
- [Testing Requirements](#testing-requirements)
- [Documentation Standards](#documentation-standards)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager
- Git for version control
- TypeScript knowledge (library is written in TypeScript)

### Development Environment

```bash
# Clone the repository
git clone https://github.com/your-org/mdl-data-extension-parsing.git
cd mdl-data-extension-parsing

# Install dependencies
npm install

# Run the build to ensure everything works
npm run build

# Run tests
npm test

# Run linting
npm run lint
```

## Development Setup

### Available Scripts

```bash
npm run build          # Build library for production
npm run build:watch    # Build in watch mode for development
npm run test           # Run test suite
npm run test:watch     # Run tests in watch mode
npm run lint           # Run ESLint
npm run lint:fix       # Run ESLint with automatic fixes
npm run typecheck      # Run TypeScript type checking
npm run clean          # Clean build artifacts
npm run update-version # Update version and build
```

### Project Structure

```
src/
├── index.ts                 # Main exports and public API
├── parser.ts               # Main MarkdownDataExtensionParser
├── tokenizer.ts            # Lexical analysis
├── types.ts                # Type definitions and interfaces
├── utils.ts                # Utility functions
├── formatter.ts            # Data formatting
├── data-types.ts           # Type conversion
├── parsers/                # Specialized parsers
│   ├── base.ts            # Abstract base parser
│   ├── schema.ts          # Schema definition parser
│   ├── data.ts            # Data orchestrator
│   ├── table.ts           # Table format parser
│   └── freeform.ts        # Freeform format parser
└── validation/             # Validation components
    ├── syntax.ts          # Syntax validation
    ├── type.ts            # Type validation
    └── headers.ts         # Header/schema validation

docs/                       # Documentation
├── API.md                 # Complete API reference
├── DEVELOPERS.md          # Extension development guide
├── ARCHITECTURE.md        # System architecture
├── CONTRIBUTING.md        # This file
└── examples/              # Extension examples

tests/                      # Test files (mirrors src structure)
dist/                       # Built artifacts (git ignored)
```

## Code Organization

### Architectural Principles

Follow these principles when contributing:

1. **Single Responsibility**: Each module/class has one clear purpose
2. **Interface Segregation**: Well-defined contracts between components
3. **Open/Closed**: Open for extension, closed for modification
4. **DRY**: Don't repeat yourself - abstract common patterns
5. **Modularity**: Clear separation of concerns

### File Organization Rules

- **Specialized functionality** goes in dedicated folders (`parsers/`, `validation/`)
- **Main orchestrators** stay in root (`parser.ts`, `tokenizer.ts`)
- **Related components** are grouped together
- **Extensions** follow existing patterns and naming conventions

### Naming Conventions

```typescript
// Classes: PascalCase
class MarkdownDataExtensionParser { }
class BaseParser { }

// Interfaces: PascalCase
interface DataFormatter { }
interface ParseOptions { }

// Enums: PascalCase
enum DataType { }
enum ErrorType { }

// Functions: camelCase
function parseMarkdown() { }
function createParser() { }

// Constants: UPPER_SNAKE_CASE
const DEFAULT_OPTIONS = { };
const VERSION = '1.0.0';

// Files: kebab-case for multi-word names
// data-parser.ts, schema-parser.ts
```

## Contribution Guidelines

### Types of Contributions

1. **Bug Fixes**: Fix incorrect behavior or errors
2. **Feature Enhancements**: Add new functionality to existing components
3. **New Extensions**: Create new parsers, validators, or formatters
4. **Performance Improvements**: Optimize existing code
5. **Documentation**: Improve or add documentation
6. **Tests**: Add or improve test coverage

### Before You Start

1. **Check existing issues** to see if your contribution is already being worked on
2. **Create an issue** for significant changes to discuss the approach
3. **Review the architecture** documentation to understand the design
4. **Look at existing code** to understand patterns and conventions

### Code Standards

#### TypeScript Requirements

- Use strict TypeScript settings
- Provide complete type annotations for public APIs
- Use interfaces over classes where appropriate
- Export types that consumers might need

```typescript
// Good: Complete type annotations
export function parseValue(input: string, field: FieldDefinition): unknown {
  // Implementation
}

// Good: Interface-based design
interface CustomParser {
  parseData(): DataEntry[];
  getErrors(): ParseError[];
}

// Good: Proper exports
export type { CustomParser, FieldDefinition };
```

#### Error Handling

- Use the standard error types from `ErrorType` enum
- Provide clear, actionable error messages
- Include context (line numbers, field names, schema names)
- Follow the error handling patterns in existing code

```typescript
// Good: Descriptive error with context
this.addError(ErrorType.INVALID_FIELD_NAME, lineNumber, {
  fieldName,
  message: `Field '${fieldName}' not found in schema '${schemaName}'`,
  schemaName
});
```

#### Performance Considerations

- Prefer O(1) operations where possible (use Maps for lookups)
- Avoid unnecessary string operations
- Cache expensive computations
- Use streaming for large data sets

```typescript
// Good: Use Map for O(1) lookups
const fieldMap = new Map(schema.fields.map(f => [f.name, f]));

// Good: Cache expensive operations
const memoizedValidator = memoize(validateComplexRule);
```

## Extension Development

### Creating New Parsers

When adding support for new data formats:

1. **Extend BaseParser** for common functionality
2. **Follow the established patterns** from existing parsers
3. **Add comprehensive tests** for the new format
4. **Update documentation** with examples

```typescript
export class NewFormatParser extends BaseParser {
  parseData(): DataEntry[] {
    // Implementation following established patterns
  }
  
  private parseNewFormatSyntax(token: Token): DataEntry | null {
    // Format-specific parsing logic
  }
}
```

### Adding New Data Types

1. **Extend the DataType enum** if needed
2. **Add validation logic** in appropriate validators
3. **Add formatting support** in formatters
4. **Provide comprehensive examples**

### Creating Custom Validators

1. **Follow the validator interface pattern**
2. **Integrate with existing validation pipeline**
3. **Provide clear error messages**
4. **Include edge case handling**

## Testing Requirements

### Test Structure

Tests should mirror the source structure:

```
tests/
├── parser.test.ts
├── tokenizer.test.ts
├── parsers/
│   ├── schema.test.ts
│   ├── table.test.ts
│   └── freeform.test.ts
└── validation/
    ├── syntax.test.ts
    └── type.test.ts
```

### Testing Standards

1. **Unit tests** for all public methods
2. **Integration tests** for complete parsing workflows
3. **Error case testing** for all error conditions
4. **Edge case coverage** for boundary conditions
5. **Performance tests** for critical paths

### Test Patterns

```typescript
describe('CustomParser', () => {
  let parser: CustomParser;
  let mockSchema: DataSchema;
  
  beforeEach(() => {
    mockSchema = createMockSchema();
    parser = new CustomParser(mockTokens, mockSchema, 'test');
  });
  
  describe('parseData', () => {
    test('should parse valid input correctly', () => {
      const result = parser.parseData();
      
      expect(result).toHaveLength(1);
      expect(result[0].fields.get('field1')).toBe('value1');
    });
    
    test('should handle validation errors', () => {
      // Test error conditions
    });
    
    test('should handle edge cases', () => {
      // Test boundary conditions
    });
  });
});
```

### Minimum Test Coverage

- **90%+ line coverage** for new code
- **All public methods** must have tests
- **All error paths** must be tested
- **Integration tests** for complete workflows

## Documentation Standards

### Code Documentation

```typescript
/**
 * Parses custom format data into structured entries.
 * 
 * @param tokens - Array of tokens to parse
 * @param schema - Schema to validate against
 * @param schemaName - Name of the schema for error reporting
 * @returns Array of parsed data entries
 * 
 * @example
 * ```typescript
 * const parser = new CustomParser(tokens, schema, 'users');
 * const entries = parser.parseData();
 * ```
 */
export class CustomParser extends BaseParser {
  /**
   * Parses tokens into data entries following custom format rules.
   * 
   * @returns Array of data entries with validation applied
   */
  parseData(): DataEntry[] {
    // Implementation
  }
}
```

### README Updates

When adding new features:

1. **Update the feature list** if adding major functionality
2. **Add usage examples** for new APIs
3. **Update installation instructions** if needed
4. **Add performance notes** for significant changes

### API Documentation

- **Update docs/API.md** for new public APIs
- **Include parameter descriptions** and return types
- **Provide usage examples** for complex features
- **Document error conditions** and handling

## Pull Request Process

### Before Submitting

1. **Run all tests**: `npm test`
2. **Run linting**: `npm run lint`
3. **Build successfully**: `npm run build`
4. **Update documentation** for your changes
5. **Add tests** for new functionality

### PR Requirements

1. **Clear description** of changes and motivation
2. **Reference related issues** if applicable
3. **Include breaking change notes** if relevant
4. **Add/update tests** as needed
5. **Update documentation** as needed

### PR Template

```markdown
## Description
Brief description of changes and why they're needed.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Added unit tests for new functionality
- [ ] Added integration tests if applicable
- [ ] All tests pass locally
- [ ] Linting passes

## Documentation
- [ ] Updated API documentation if needed
- [ ] Updated README if needed
- [ ] Added code comments for complex logic

## Checklist
- [ ] Code follows project conventions
- [ ] Self-review completed
- [ ] Tests added/updated
- [ ] Documentation updated
```

### Review Process

1. **Automated checks** must pass (tests, linting, build)
2. **Code review** by maintainers
3. **Documentation review** if applicable
4. **Performance review** for critical changes
5. **Approval and merge** by maintainers

## Release Process

### Version Management

The project uses semantic versioning (semver):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Steps

1. **Update version**: `npm run update-version`
2. **Update CHANGELOG.md** with release notes
3. **Create release commit**: Include all changes
4. **Tag release**: Follow semantic versioning
5. **Publish to npm**: Automated through CI/CD

### Breaking Changes

When introducing breaking changes:

1. **Document the changes** clearly
2. **Provide migration guide** when possible
3. **Update major version** number
4. **Announce breaking changes** prominently

## Getting Help

### Questions and Discussion

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Documentation**: Check docs/ folder for detailed guides

### Code of Conduct

This project follows a standard code of conduct:

- Be respectful and inclusive
- Focus on constructive feedback
- Help create a welcoming environment
- Report unacceptable behavior to maintainers

### Maintainer Contact

For significant architectural questions or major contributions, reach out to the maintainers through GitHub issues or discussions.

Thank you for contributing to the Markdown Data Extension Parser! Your contributions help make this library better for everyone.
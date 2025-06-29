# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.2] - 2025-06-29

### Fixed
- **False positive field detection** - Fixed critical bug where lone exclamation marks in regular text (e.g., "system!") were incorrectly treated as field markers, causing false `missing_block_start` errors. Tokenizer now only recognizes field patterns within proper data blocks.

### Technical
- **Block-aware tokenization** - Added `inDataBlock` state tracking to tokenizer to ensure field patterns (`!fieldname`, `!fname:`, etc.) are only recognized inside data blocks between `!?` and `!#` markers.
- **Context-sensitive parsing** - Lone `!` characters outside data blocks are now treated as regular text, preventing false positive errors while maintaining all correct field parsing functionality.

## [0.3.1] - 2025-06-29

### Added
- **GitHub Packages publishing** - Library is now published as `@chrishoward-projects/markdown-data-ext-parser` to GitHub Packages for private distribution across projects.

### Fixed
- **Format string parsing with commas** - Fixed incorrect validation error when field formats contained commas within quoted strings. Parser now properly handles formats like `"$n,n.##"` by respecting quote boundaries when splitting field attributes on commas.

### Technical
- **Enhanced comma splitting logic** - Added `splitRespectingQuotes()` method to schema parser that correctly handles both single and double quoted strings when parsing field attribute lists.
- **Package configuration** - Updated package name, registry configuration, and authentication setup for GitHub Packages distribution.

## [0.3.0] - 2025-06-28

### Added
- **Block-based data structure** - JSON output now groups data by blocks with sequential block numbers and record numbers within each block. Each block contains a `blockNumber`, `schemaName`, and array of numbered `records`.
- **Enhanced record tracking** - Added `blockNumber` and `recordNumber` fields to DataEntry interface for comprehensive data organization and reference.
- **Schema-based total counting** - Added `totalRecords` object with per-schema record counts plus overall total count for better data analysis.
- **Schema block tracking** - Added `blockNumber` field to DataSchema interface to track which block defined each schema.

### Changed
- **JSON output format** - Restructured data output to use new `blockData` structure with `blocks` array and `totalRecords` object while maintaining backward compatibility with legacy flat `data` structure.
- **Test interface enhancements** - Updated both test.html and test-umd.html to display new block-based JSON structure with proper record numbering and totals.

### Fixed
- **CRITICAL: Field definition comma validation** - Fixed parser bug where missing commas between field attributes were silently ignored, causing attribute values to be incorrectly merged. Parser now properly validates that commas are mandatory delimiters between all field attributes and throws clear error messages when commas are missing.

### Technical
- **New TypeScript interfaces** - Added `DataBlock`, `BlockGroupedData`, and `TotalRecords` interfaces for structured data representation.
- **Enhanced parser state** - Modified ParserState to track data by blocks instead of only flat schema grouping.
- **Robust field validation** - Added comprehensive pattern detection for missing commas in field definitions with regex-based validation and clear error reporting.
- **Backward compatibility** - Maintained existing flat data structure alongside new block-based structure to ensure no breaking changes.

## [0.2.4] - 2025-06-27

### Fixed
- **Consistent error context fields** - All errors and warnings now consistently include `blockNumber`, `blockType`, and `schemaName` fields when available. Previously, some errors were missing block context while others included it, leading to inconsistent programmatic error handling.

### Changed
- **Enhanced test interface** - "Validate Only" button in test-umd.html now displays both human-readable validation summary and complete JSON output for better debugging and testing capabilities.

### Technical
- **Comprehensive block context propagation** - Updated entire parser hierarchy (BaseParser, DataParser, TableParser, FreeformParser, HeaderValidator) to accept and propagate block context information
- **Improved error/warning creation** - All error and warning creation points now use consistent conditional spreading to include context fields
- **Enhanced test coverage** - Added comprehensive tests verifying all three context fields appear consistently across different parser components

## [0.2.3] - 2025-06-26

### Added
- **Block context in error reporting** - Enhanced error and warning messages to include block number and context information (e.g., "Block: 1 datadef contacts", "Block: 3 data products"). This makes it significantly easier for users to identify which specific block in their markdown document contains errors or warnings.

### Technical
- **Extended ParseError and ParseWarning interfaces** - Added blockNumber, blockType, and blockContext optional fields to provide comprehensive error context
- **Enhanced ParserState tracking** - Added block counter and current block context tracking throughout the parsing process
- **Improved error propagation** - All error and warning creation points now include block context information when available
- **Enhanced error formatting** - Updated formatErrorMessage function to display block context prefixes in error messages

## [0.2.2] - 2025-06-26

### Fixed
- **Invalid data type handling** - Changed invalid data types from critical errors to warnings. Parser now continues successfully when encountering unknown field types, defaulting to text type and generating appropriate warnings instead of breaking the entire parsing process.

### Technical
- **Enhanced error handling** - Added separate warning collection system to SchemaParser alongside existing error handling
- **Graceful degradation** - Parser now implements fault tolerance for invalid data types while maintaining strict validation for critical syntax errors
- **Improved user experience** - Applications can now handle invalid data types gracefully without losing entire parsing results

## [0.2.1] - 2025-06-26

### Fixed
- **Table parser empty cell handling** - Fixed incorrect "column count mismatch" errors when tables have empty trailing cells. Parser now properly pads missing trailing cells with empty strings and converts empty cells to null values, resolving false validation errors.

### Added
- **Freeform example with Load button** - Added comprehensive product catalog example showcasing freeform data format with "Load Freeform Example" button alongside existing "Load Tabular Example" button in both test interfaces
- **Improved example organization** - Grouped related fields on same lines in freeform examples (stock status + quantity, weight + dimensions) for better readability and demonstration of multi-field line syntax

### Changed
- **Project organization improvements** - Moved debug, example, and test files to organized subdirectories (`debug/`, `examples/`, `test/`) for cleaner root directory structure
- **Updated import paths** - Fixed all script and import references to use correct `../dist/` paths after file reorganization
- **Enhanced test interface** - Updated both test.html and test-umd.html with dual example buttons and improved organization

### Technical
- **Import path consistency** - Ensured all moved files reference correct relative paths to dist folder
- **Development workflow** - Updated serve.py to work correctly with new directory structure
- **File organization** - Maintained functionality while improving project structure and discoverability

## [0.2.0] - 2025-06-25

### BREAKING CHANGES
- **Removed data validation beyond basic type checking** - This library now focuses purely on parsing structure and converting types. All business rule validation has been removed to maintain clear separation of concerns. Applications should implement their own validation logic or use a separate validation library.

### Added
- **Comprehensive developer documentation**
  - Complete extension development guide (`docs/DEVELOPERS.md`)
  - Full API reference documentation (`docs/API.md`)
  - System architecture overview (`docs/ARCHITECTURE.md`)
  - Contribution guidelines (`docs/CONTRIBUTING.md`)
  - Extension examples for custom parsers and formatters
- **Improved project organization**
  - Reorganized validation modules into dedicated `src/validation/` folder
  - Moved data parser to `src/parsers/data.ts` for consistency
  - Created organized directory structure: `debug/`, `examples/`, `test/`
  - Updated development server to work with new file organization

### Removed
- **ValidationRules interface** - No longer needed as validation is left to consuming applications
- **Business rule validation methods** - Removed from all parser and validator classes
- **Validation documentation and examples** - Custom validator examples and documentation removed
- **parseValidationRules utility function** - No longer needed without validation rules

### Changed
- **Parser scope clarification** - Library now explicitly focused on parsing and type conversion only
- **Validation methods simplified** - Only basic type checking remains for parsing purposes
- **Documentation updated** - All references to data validation removed, focus on parsing capabilities
- **Project structure** - Root directory cleaned up with files moved to appropriate subdirectories

### Fixed
- **Import path consistency** - Updated relative imports after file reorganization
- **Development workflow** - Updated serve.py and README references for new file locations
- **Build process** - Ensured all changes pass linting and type checking

## [0.1.2] - 2025-06-24

### Added
- Comprehensive syntax validation system with 15+ new error types
  - Block structure validation (nested blocks, empty blocks, unclosed blocks)
  - Schema name validation with regex pattern checking
  - Field definition syntax validation (attributes, data types, formats)
  - Data format validation (mixed tabular/free-form detection)
  - Table syntax validation (pipe usage, column alignment, headers)
  - Free-form syntax validation (field names, separators)
  - External reference syntax validation
  - Dual format syntax validation for display patterns
  - Validation rules syntax validation for field constraints
  - Unclosed literal detection (braces, quotes, brackets)
- Enhanced error reporting with precise line numbers and context
- Parser-level syntax validation while maintaining renderer separation
- Improved tokenizer with comprehensive literal and character validation

### Fixed
- Field name mismatches between schema definitions and table headers in test files
- Data entries showing as empty objects due to field mapping issues
- Test interface field naming consistency issues

## [0.1.1] - 2025-06-23

### Added
- HTML test interface for interactive parser testing
  - Two-panel layout with markdown input and JSON output
  - Real-time parsing with live feedback and auto-parsing
  - Default example loader with comprehensive employee database demo
  - Parse and validate-only modes for different testing scenarios
  - Copy to clipboard functionality for parsed JSON output
  - Comprehensive error reporting with line numbers and context
  - Parse metadata display (timing, counts, validation status)
  - Responsive design that works on mobile devices
  - Debounced input for performance optimization

### Fixed
- JavaScript template literal syntax errors in test interface
- Unterminated template literal issues causing parse failures
- Inconsistent string interpolation causing display problems

## [0.1.0] - 2024-06-23

### Added
- Initial release of Markdown Data Extension Parser
- Complete TypeScript implementation with full type safety
- Support for all Markdown Data Extension syntax elements:
  - Data definition blocks (`!? datadef schema_name`)
  - Data entry blocks (`!? data schema_name`)
  - Field definitions with comprehensive properties
  - Index definitions for data queries
  - External schema references
- Full data type system with validation:
  - Text type with pattern matching and transformations
  - Number type with formatting and range validation
  - Date type with custom formats and dual format support
  - Time type with 12/24 hour formats
  - Boolean type with custom display formats
- Multiple data entry formats:
  - Tabular format (Markdown tables with `!field` headers)
  - Free-form format (`!field value` syntax with `!-` separators)
- Comprehensive validation and error reporting:
  - Schema validation with detailed error messages
  - Data type validation against field specifications
  - Line number tracking for precise error location
  - Field-level and record-level validation
- Format processing system:
  - Value transformation (title case, upper/lower case)
  - Pattern-based formatting for phone numbers, codes, etc.
  - Currency and percentage formatting for numbers
  - Date and time formatting with locale support
- External schema support:
  - Relative and absolute path resolution
  - Schema caching for performance
  - Cross-file schema validation
- Performance optimizations:
  - Efficient tokenization and parsing
  - Schema caching to avoid redundant processing
  - Memory-efficient design for large documents
- Cross-platform compatibility:
  - Node.js 18+ support
  - Browser compatibility (ES2020+)
  - CommonJS and ES Module exports
- Comprehensive API:
  - `MarkdownDataExtensionParser` main parser class
  - `MarkdownDataFormatter` for value formatting
  - `DataTypeValidator` for validation logic
  - Utility functions and factory methods
  - Type-safe interfaces for all data structures
- Developer experience features:
  - Complete TypeScript declarations
  - Comprehensive error handling
  - Detailed API documentation
  - Working examples and usage patterns
- Testing infrastructure:
  - Unit tests with Jest
  - TypeScript type checking
  - ESLint code quality checks
  - Build system with Rollup

### Technical Specifications
- Parse documents up to 10MB in under 2 seconds
- Handle 1000+ data entries without performance degradation
- Memory usage under 100MB for typical documents
- Zero memory leaks in long-running applications
- 95%+ code coverage in tests
- Full ES2020+ compatibility
- TypeScript 5.0+ support

### Documentation
- Comprehensive README with usage examples
- Complete API reference documentation
- Migration guide and best practices
- Performance optimization tips
- Real-world usage scenarios

[1.0.0]: https://github.com/chrishoward/mdl-data-extension-parser/releases/tag/v1.0.0
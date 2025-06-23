# Markdown Data Extension Parser

A TypeScript library for parsing, validating, and processing documents containing the Markdown Data Extension syntax. This parser enables applications to extract structured data from Markdown documents while maintaining the extension's core philosophy of plain-text compatibility.

## Features

- ✅ **Full syntax support** - Parse data definition and data entry blocks
- ✅ **Type-safe** - Complete TypeScript interfaces with full type inference  
- ✅ **Data validation** - Validate data against schema definitions with comprehensive error reporting
- ✅ **Multiple formats** - Support both tabular and free-form data entry formats
- ✅ **External schemas** - Load and reference schemas from external files
- ✅ **Format processing** - Transform and validate data types (text, number, date, time, boolean)
- ✅ **Performance** - Parse large documents efficiently with caching support
- ✅ **Browser & Node.js** - Works in both environments

## Installation

```bash
npm install mdl-data-extension-parser
```

## Quick Start

```typescript
import { MarkdownDataExtensionParser } from 'mdl-data-extension-parser';

const parser = new MarkdownDataExtensionParser();

const markdown = `
# Employee Database

!? datadef employees
!fname: id, type: number, label: "Employee ID", required: true
!fname: name, type: text, label: "Full Name", required: true
!fname: email, type: text, format: "email", required: true
!fname: salary, type: number, format: "$n,n.##"
!#

!? data employees
| !id | !name | !email | !salary |
|-----|-------|--------|---------|
| 1 | John Smith | john@company.com | 75000 |
| 2 | Jane Doe | jane@company.com | 82000 |
!#
`;

const result = parser.parse(markdown);

console.log('Schemas found:', result.schemas.size);
console.log('Data entries:', result.data.get('employees')?.length);
console.log('Errors:', result.errors.length);
```

## Testing

### Interactive HTML Test Interfaces

The library includes two test interfaces for different integration scenarios:

#### 1. ES Module Test Interface (test.html)
Modern interface using ES modules (recommended for development):

```bash
# Serve from HTTP server (required for ES modules)
python serve.py
# or
python -m http.server 8000
```

Then open http://localhost:8000/test.html

#### 2. UMD Test Interface (test-umd.html)
Alternative interface using UMD build (works directly in browser):

```bash
# Can open directly in browser (no server required)
open test-umd.html
# or serve from HTTP server
python serve.py
```

Then open http://localhost:8000/test-umd.html

**Both interfaces feature:**
- Two-panel layout with markdown input and JSON output
- Real-time parsing with live feedback and auto-parsing
- Default example loader with comprehensive demo data
- Parse and validate-only modes for different testing scenarios
- Copy to clipboard functionality for parsed JSON output
- Comprehensive error reporting with line numbers and context
- Parse metadata display (timing, counts, validation status)
- Responsive design for mobile testing

### Integration Methods

**For bundled applications (Webpack, Vite, etc.):**
```javascript
import { MarkdownDataExtensionParser } from 'mdl-data-extension-parser';
const parser = new MarkdownDataExtensionParser();
```

**For direct HTML usage (no bundler):**
```html
<script src="./node_modules/mdl-data-extension-parser/dist/index.umd.js"></script>
<script>
  const parser = new MarkdownDataExtensionParser.MarkdownDataExtensionParser();
</script>
```

**Note:** The ES module test interface requires serving from an HTTP server due to browser CORS restrictions when opening files directly with `file://` protocol. This only affects the test setup - real applications using bundlers or proper HTTP servers won't encounter this issue.

## API Reference

### Core Classes

#### `MarkdownDataExtensionParser`

The main parser class for processing Markdown Data Extension documents.

```typescript
const parser = new MarkdownDataExtensionParser();
```

**Methods:**

- `parse(markdown: string, options?: ParseOptions): ParseResult`
- `parseFile(filePath: string, options?: ParseOptions): Promise<ParseResult>`
- `validateSchema(schema: DataSchema): ValidationResult`
- `validateData(data: DataEntry[], schema: DataSchema): ValidationResult`

#### `ParseOptions`

```typescript
interface ParseOptions {
  basePath?: string;              // Base path for resolving external schemas
  validateData?: boolean;         // Enable data validation (default: true)
  loadExternalSchemas?: boolean;  // Load external schema references (default: true)
  schemaCache?: SchemaCache;      // Custom schema cache
  sourceFile?: string;            // Source file path for error reporting
}
```

#### `ParseResult`

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

### Data Types

The parser supports five core data types with comprehensive validation:

#### Text Type

```typescript
// Basic text field
!fname: name, type: text

// With format transformations
!fname: title, type: text, format: "title"     // Title Case
!fname: code, type: text, format: "upper"      // UPPERCASE
!fname: email, type: text, format: "email"     // Email validation
!fname: website, type: text, format: "url"     // URL validation

// With dual format (input validation + display formatting)
!fname: phone, type: text, format: {"##########", "(##) #### ####"}

// Display-only formatting (no input validation)
!fname: display_phone, type: text, format: "(##) #### ####"
```

#### Number Type

```typescript
// Basic number field
!fname: age, type: number

// With format and validation
!fname: price, type: number, format: "$n,n.##", valid: {min: 0}
!fname: percentage, type: number, format: "n.#%"
!fname: quantity, type: number, valid: {min: 1, max: 1000}
```

#### Date Type

```typescript
// Basic date field
!fname: birth_date, type: date

// With custom format
!fname: start_date, type: date, format: "DD/MM/YYYY"

// With dual format (input/display)
!fname: event_date, type: date, format: {"DD/MM/YYYY", "MMM DD, YYYY"}
```

#### Time Type

```typescript
// Basic time field
!fname: meeting_time, type: time

// With 12-hour format
!fname: appointment, type: time, format: "h:mm ap"

// With dual format
!fname: schedule, type: time, format: {"HH:mm", "h:mm AP"}
```

#### Boolean Type

```typescript
// Basic boolean field
!fname: active, type: boolean

// With custom display format
!fname: verified, type: boolean, format: "y/n"    // Yes/No
!fname: enabled, type: boolean, format: "t/f"     // True/False
```

### Schema Definition Examples

#### Complete Schema with Validation

```markdown
!? datadef products
!fname: id, type: number, label: "Product ID", required: true
!fname: name, type: text, label: "Product Name", required: true, valid: {min: 3, max: 100}
!fname: category, type: text, valid: {options: ["Electronics", "Clothing", "Books", "Home"]}
!fname: price, type: number, format: "$n,n.##", valid: {min: 0.01, max: 10000}
!fname: in_stock, type: boolean, format: "y/n"
!fname: created_date, type: date, format: "DD/MM/YYYY"
!index: "id"
!index: "category+in_stock"
!#
```

#### External Schema Reference

```markdown
!? data [products](./schemas/products.md)
| !id | !name | !category | !price | !in_stock |
|-----|-------|-----------|--------|-----------|
| 1 | Laptop | Electronics | 999.99 | true |
| 2 | T-Shirt | Clothing | 19.99 | true |
!#
```

### Data Entry Formats

#### Tabular Format

```markdown
!? data employees
| !id | !name | !email | !department |
|-----|-------|--------|-------------|
| 1 | John Smith | john@company.com | Engineering |
| 2 | Jane Doe | jane@company.com | Sales |
| 3 | Bob Johnson | bob@company.com | HR |
!#
```

#### Free-form Format

```markdown
!? data employees
!id 1
!name John Smith
!email john@company.com
!department Engineering
!-
!id 2
!name Jane Doe
!email jane@company.com
!department Sales
!#
```

### Error Handling

The parser provides comprehensive error reporting with line numbers and context:

```typescript
const result = parser.parse(markdown, { validateData: true });

if (result.errors.length > 0) {
  result.errors.forEach(error => {
    console.error(`${error.type} at line ${error.lineNumber}: ${error.message}`);
    if (error.fieldName) {
      console.error(`  Field: ${error.fieldName}`);
    }
    if (error.schemaName) {
      console.error(`  Schema: ${error.schemaName}`);
    }
  });
}
```

### Advanced Usage

#### Custom Schema Cache

```typescript
import { SchemaCache } from 'mdl-data-extension-parser';

const customCache = new SchemaCache();
const result = parser.parse(markdown, {
  schemaCache: customCache,
  loadExternalSchemas: true
});
```

#### Data Formatting

```typescript
import { MarkdownDataFormatter } from 'mdl-data-extension-parser';

const formatter = new MarkdownDataFormatter();
const field = { name: 'price', type: DataType.NUMBER, format: '$n,n.##' };

const formatted = formatter.formatValue(1234.56, field);
console.log(formatted.formatted); // "$1,234.56"

const parsed = formatter.parseValue('$1,234.56', field);
console.log(parsed); // 1234.56
```

#### Data Type Validation

```typescript
import { DataTypeValidator } from 'mdl-data-extension-parser';

const validator = new DataTypeValidator();
const field = { 
  name: 'email', 
  type: DataType.TEXT, 
  format: 'email', 
  required: true 
};

const errors = validator.validateValue('invalid-email', field);
if (errors.length > 0) {
  console.error('Validation failed:', errors[0].message);
}
```

## Performance

The parser is designed for high performance:

- Parses documents up to 10MB in under 2 seconds
- Handles 1000+ data entries without performance degradation
- Efficient memory usage with schema caching
- Lazy loading for external schema references

## Browser Support

The library works in all modern browsers and Node.js 18+:

```html
<script type="module">
import { parseMarkdown } from 'https://unpkg.com/mdl-data-extension-parser@latest/dist/index.mjs';

const result = parseMarkdown(markdownContent);
console.log(result);
</script>
```

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please read the contributing guidelines and submit pull requests to the repository.

## Changelog

See CHANGELOG.md for version history and updates.
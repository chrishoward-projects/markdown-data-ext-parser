# Custom Parser Extension Example

This example demonstrates how to create a custom parser to support a new data format in the Markdown Data Extension Parser library.

## Scenario

We want to add support for a JSON-like data format within markdown data blocks:

```markdown
!? data products
{
  "id": 1,
  "name": "Laptop",
  "price": 999.99,
  "inStock": true
}
{
  "id": 2,
  "name": "Mouse",
  "price": 25.50,
  "inStock": false
}
!#
```

## Implementation

### Step 1: Define Custom Token Types

First, we'll extend the token types to recognize JSON objects:

```typescript
// custom-tokens.ts
import { TokenType } from 'mdl-data-extension-parser';

export enum CustomTokenType {
  JSON_OBJECT = 'json_object'
}

// Extend the main TokenType for type safety
declare module 'mdl-data-extension-parser' {
  namespace TokenType {
    const JSON_OBJECT: 'json_object';
  }
}
```

### Step 2: Extend the Tokenizer

Create a custom tokenizer that recognizes JSON objects:

```typescript
// json-tokenizer.ts
import { Tokenizer, Token, TokenPosition } from 'mdl-data-extension-parser';
import { CustomTokenType } from './custom-tokens';

export class JsonTokenizer extends Tokenizer {
  protected recognizeToken(): Token | null {
    // Try to recognize JSON objects first
    const jsonToken = this.tryJsonObject();
    if (jsonToken) return jsonToken;
    
    // Fall back to standard tokenization
    return super.recognizeToken();
  }

  private tryJsonObject(): Token | null {
    const currentChar = this.peek();
    
    // JSON objects start with '{'
    if (currentChar !== '{') return null;
    
    const start = this.position;
    let braceCount = 0;
    let value = '';
    let inString = false;
    let escaped = false;
    
    while (!this.isAtEnd()) {
      const char = this.advance();
      value += char;
      
      if (escaped) {
        escaped = false;
        continue;
      }
      
      if (char === '\\' && inString) {
        escaped = true;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          
          // Complete JSON object found
          if (braceCount === 0) {
            return {
              type: CustomTokenType.JSON_OBJECT as any,
              value: value,
              position: { ...start, offset: start.offset }
            };
          }
        }
      }
    }
    
    // Incomplete JSON object - let error handling deal with it
    return null;
  }
}
```

### Step 3: Create the JSON Parser

Extend BaseParser to handle JSON format:

```typescript
// json-parser.ts
import { 
  BaseParser, 
  DataEntry, 
  Token, 
  ErrorType,
  FieldDefinition 
} from 'mdl-data-extension-parser';
import { CustomTokenType } from './custom-tokens';

export class JsonParser extends BaseParser {
  parseData(): DataEntry[] {
    const entries: DataEntry[] = [];
    let recordIndex = 0;

    while (!this.isAtEnd() && !this.isBlockEnd()) {
      const token = this.advance();
      
      if (token.type === CustomTokenType.JSON_OBJECT) {
        const entry = this.parseJsonObject(token, recordIndex);
        if (entry) {
          entries.push(entry);
          recordIndex++;
        }
      } else if (token.type !== 'newline' && token.type !== 'comment') {
        this.addError(ErrorType.SYNTAX_ERROR, token.position.line, {
          message: 'Expected JSON object in JSON data format'
        });
      }
    }

    return entries;
  }

  private parseJsonObject(token: Token, recordIndex: number): DataEntry | null {
    try {
      // Parse the JSON
      const jsonData = JSON.parse(token.value);
      
      // Validate it's an object
      if (typeof jsonData !== 'object' || jsonData === null || Array.isArray(jsonData)) {
        this.addError(ErrorType.SYNTAX_ERROR, token.position.line, {
          message: 'JSON data must be an object, not array or primitive'
        });
        return null;
      }
      
      // Convert to field map and validate against schema
      const fields = new Map<string, unknown>();
      const schemaFieldMap = new Map(this.schema.fields.map(f => [f.name, f]));
      
      for (const [key, value] of Object.entries(jsonData)) {
        const field = schemaFieldMap.get(key);
        
        if (!field) {
          this.addError(ErrorType.INVALID_FIELD_NAME, token.position.line, {
            fieldName: key,
            message: `Field '${key}' not found in schema '${this.schemaName}'`
          });
          continue;
        }
        
        // Validate and convert the value
        const validatedValue = this.validateAndConvertValue(value, field, token.position.line);
        fields.set(key, validatedValue);
      }
      
      // Check for required fields
      this.validateRequiredFields(fields, schemaFieldMap, token.position.line);
      
      return this.createDataEntry(fields, token.position.line, recordIndex);
      
    } catch (error) {
      this.addError(ErrorType.SYNTAX_ERROR, token.position.line, {
        message: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      return null;
    }
  }

  private validateAndConvertValue(
    value: unknown, 
    field: FieldDefinition, 
    lineNumber: number
  ): unknown {
    // Basic type checking for conversion
    const canConvert = this.canConvertValueType(value, field);
    
    if (!canConvert) {
      this.addError(ErrorType.TYPE_MISMATCH, lineNumber, {
        fieldName: field.name,
        message: `Field '${field.name}' expects ${field.type} but got ${typeof value}`
      });
    }
    
    // Apply any necessary conversions
    return this.convertValue(value, field);
  }

  private canConvertValueType(value: unknown, field: FieldDefinition): boolean {
    switch (field.type) {
      case 'text':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'date':
      case 'time':
        return typeof value === 'string'; // Will be converted during processing
      default:
        return true; // Unknown type, assume convertible
    }
  }

  private convertValue(value: unknown, field: FieldDefinition): unknown {
    // Handle date/time string conversion if needed
    if ((field.type === 'date' || field.type === 'time') && typeof value === 'string') {
      // Apply date/time parsing if format is specified
      if (field.format) {
        // Use the library's built-in formatter for conversion
        // This would integrate with the existing formatting system
      }
    }
    
    return value;
  }

  private validateRequiredFields(
    fields: Map<string, unknown>,
    schemaFields: Map<string, FieldDefinition>,
    lineNumber: number
  ): void {
    for (const [fieldName, field] of schemaFields) {
      if (field.required && !fields.has(fieldName)) {
        this.addError(ErrorType.MISSING_REQUIRED_FIELD, lineNumber, {
          fieldName,
          message: `Required field '${fieldName}' is missing`
        });
      }
    }
  }
}
```

### Step 4: Extend the Data Parser

Modify the data parser to detect and handle JSON format:

```typescript
// extended-data-parser.ts
import { DataParser, DataEntry, ParseError } from 'mdl-data-extension-parser';
import { JsonParser } from './json-parser';
import { CustomTokenType } from './custom-tokens';

export class ExtendedDataParser extends DataParser {
  parseData(): { data: DataEntry[]; errors: ParseError[] } {
    const format = this.detectDataFormat();
    
    if (format === 'json') {
      const jsonParser = new JsonParser(this.tokens, this.schema, this.schemaName);
      const entries = jsonParser.parseData();
      this.errors.push(...jsonParser.getErrors());
      return { data: entries, errors: this.errors };
    }
    
    // Fall back to default behavior for other formats
    return super.parseData();
  }

  protected detectDataFormat(): 'tabular' | 'freeform' | 'json' | 'unknown' {
    // Check for JSON objects first
    for (const token of this.tokens) {
      if (token.type === CustomTokenType.JSON_OBJECT) {
        return 'json';
      }
    }
    
    // Fall back to standard format detection
    return super.detectDataFormat() as any;
  }
}
```

### Step 5: Create a Custom Parser Factory

Create a factory that uses your extended components:

```typescript
// json-parser-factory.ts
import { 
  MarkdownDataExtensionParser,
  ParseOptions,
  ParseResult 
} from 'mdl-data-extension-parser';
import { JsonTokenizer } from './json-tokenizer';
import { ExtendedDataParser } from './extended-data-parser';

export class JsonEnabledParser extends MarkdownDataExtensionParser {
  parse(markdown: string, options?: ParseOptions): ParseResult {
    // Use custom tokenizer
    const tokenizer = new JsonTokenizer(markdown);
    const tokenizeResult = tokenizer.tokenize();
    
    // Process with extended parsing logic
    return this.parseWithCustomComponents(tokenizeResult, options);
  }

  private parseWithCustomComponents(
    tokenizeResult: { tokens: Token[]; errors: ParseError[] },
    options?: ParseOptions
  ): ParseResult {
    // Implementation that uses ExtendedDataParser
    // This would integrate with the existing parsing pipeline
    // but substitute the custom data parser when needed
    
    // For brevity, this would follow the same pattern as the main parser
    // but use ExtendedDataParser instead of DataParser
    return super.parse('', options); // Simplified for example
  }
}
```

### Step 6: Usage Example

```typescript
// usage.ts
import { JsonEnabledParser } from './json-parser-factory';

const parser = new JsonEnabledParser();

const markdown = `
!? datadef products
!fname: id, type: number, required: true
!fname: name, type: text, required: true
!fname: price, type: number, format: "$n,n.##"
!fname: inStock, type: boolean
!#

!? data products
{
  "id": 1,
  "name": "Laptop",
  "price": 999.99,
  "inStock": true
}
{
  "id": 2,
  "name": "Mouse",
  "price": 25.50,
  "inStock": false
}
!#
`;

const result = parser.parse(markdown);

console.log('Schemas found:', result.schemas.size);
console.log('Data entries:', result.data.get('products')?.length);
console.log('Errors:', result.errors.length);

// Access the parsed data
const products = result.data.get('products');
if (products) {
  for (const product of products) {
    console.log('Product:', Object.fromEntries(product.fields));
  }
}
```

## Testing the Custom Parser

```typescript
// json-parser.test.ts
import { JsonParser } from './json-parser';
import { DataType, DataSchema, Token } from 'mdl-data-extension-parser';
import { CustomTokenType } from './custom-tokens';

describe('JsonParser', () => {
  let parser: JsonParser;
  let mockSchema: DataSchema;

  beforeEach(() => {
    mockSchema = {
      name: 'products',
      fields: [
        { name: 'id', type: DataType.NUMBER, required: true },
        { name: 'name', type: DataType.TEXT, required: true },
        { name: 'price', type: DataType.NUMBER, format: '$n,n.##' },
        { name: 'inStock', type: DataType.BOOLEAN }
      ],
      indexes: []
    };
  });

  test('should parse valid JSON objects', () => {
    const tokens: Token[] = [
      {
        type: CustomTokenType.JSON_OBJECT as any,
        value: '{"id": 1, "name": "Laptop", "price": 999.99, "inStock": true}',
        position: { line: 1, column: 1, offset: 0 }
      }
    ];

    parser = new JsonParser(tokens, mockSchema, 'products');
    const result = parser.parseData();

    expect(result).toHaveLength(1);
    expect(result[0].fields.get('id')).toBe(1);
    expect(result[0].fields.get('name')).toBe('Laptop');
    expect(result[0].fields.get('price')).toBe(999.99);
    expect(result[0].fields.get('inStock')).toBe(true);
  });

  test('should handle parsing errors', () => {
    const tokens: Token[] = [
      {
        type: CustomTokenType.JSON_OBJECT as any,
        value: '{"invalid_field": "value"}',
        position: { line: 1, column: 1, offset: 0 }
      }
    ];

    parser = new JsonParser(tokens, mockSchema, 'products');
    parser.parseData();

    const errors = parser.getErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('invalid_field_name');
  });

  test('should handle malformed JSON', () => {
    const tokens: Token[] = [
      {
        type: CustomTokenType.JSON_OBJECT as any,
        value: '{"invalid": json}',
        position: { line: 1, column: 1, offset: 0 }
      }
    ];

    parser = new JsonParser(tokens, mockSchema, 'products');
    parser.parseData();

    const errors = parser.getErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('syntax_error');
    expect(errors[0].message).toContain('Invalid JSON');
  });
});
```

## Integration with Main Library

To fully integrate this with the main library, you would:

1. **Register the custom tokenizer** in the main parser
2. **Register the custom data parser** in the parser factory
3. **Add configuration options** to enable/disable JSON support
4. **Update documentation** with JSON format examples
5. **Add comprehensive tests** for all scenarios

This example demonstrates the extensibility of the library architecture and how new data formats can be added while maintaining compatibility with existing features and patterns.
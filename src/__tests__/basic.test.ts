import { MarkdownDataExtensionParser } from '../parser';
import { DataType } from '../types';

describe('Basic functionality', () => {
  let parser: MarkdownDataExtensionParser;

  beforeEach(() => {
    parser = new MarkdownDataExtensionParser();
  });

  it('should create parser instance', () => {
    expect(parser).toBeInstanceOf(MarkdownDataExtensionParser);
  });

  it('should parse simple schema', () => {
    const markdown = `
!? datadef test
!fname: name, type: text
!#
`;

    const result = parser.parse(markdown);
    expect(result.errors).toHaveLength(0);
    expect(result.schemas.size).toBe(1);
  });

  it('should parse simple data', () => {
    const markdown = `
!? datadef test
!fname: name, type: text
!#

!? data test
| !name |
|-------|
| John  |
!#
`;

    const result = parser.parse(markdown);
    expect(result.errors).toHaveLength(0);
    expect(result.data.size).toBe(1);
  });

  it('should include schemaName in error outputs', () => {
    const markdown = `
!? datadef products
!fname: invalid-field-name, type: text
!#
`;

    const result = parser.parse(markdown);
    expect(result.errors.length).toBeGreaterThan(0);
    
    // Find the invalid field name error
    const fieldNameError = result.errors.find(error => 
      error.type === 'invalid_field_name'
    );
    
    expect(fieldNameError).toBeDefined();
    expect(fieldNameError?.schemaName).toBe('products');
    expect(fieldNameError?.fieldName).toBe('invalid-field-name');
  });

  it('should include schemaName in warning outputs', () => {
    const markdown = `
!? datadef contacts
!fname: name, type: invalidtype
!#
`;

    const result = parser.parse(markdown);
    expect(result.warnings.length).toBeGreaterThan(0);
    
    // Find the invalid data type warning
    const dataTypeWarning = result.warnings.find(warning => 
      warning.message?.includes('Invalid data type')
    );
    
    expect(dataTypeWarning).toBeDefined();
    expect(dataTypeWarning?.schemaName).toBe('contacts');
    expect(dataTypeWarning?.fieldName).toBe('name');
  });

  it('should include all context fields (blockNumber, blockType, schemaName) in data parsing errors', () => {
    const markdown = `
!? datadef products
!fname: name, type: text
!#

!? data products
| !name | !nonexistent |
|-------|--------------|
| Product1 | value |
!#
`;

    const result = parser.parse(markdown);
    expect(result.errors.length).toBeGreaterThan(0);
    
    // Find the invalid field name error from header validation
    const headerError = result.errors.find(error => 
      error.type === 'invalid_field_name' && error.fieldName === 'nonexistent'
    );
    
    expect(headerError).toBeDefined();
    expect(headerError?.schemaName).toBe('products');
    expect(headerError?.blockNumber).toBe(2);
    expect(headerError?.blockType).toBe('data');
    expect(headerError?.fieldName).toBe('nonexistent');
  });

  it('should include all context fields in schema definition errors', () => {
    const markdown = `
!? datadef products
!fname: invalid-field-name, type: text
!fname: name, type: text
!#
`;

    const result = parser.parse(markdown);
    expect(result.errors.length).toBeGreaterThan(0);
    
    // Find the invalid field name error
    const fieldNameError = result.errors.find(error => 
      error.type === 'invalid_field_name'
    );
    
    expect(fieldNameError).toBeDefined();
    expect(fieldNameError?.schemaName).toBe('products');
    expect(fieldNameError?.blockNumber).toBe(1);
    expect(fieldNameError?.blockType).toBe('datadef');
    expect(fieldNameError?.fieldName).toBe('invalid-field-name');
  });

  it('should include all context fields in schema definition warnings', () => {
    const markdown = `
!? datadef inventory
!fname: category, type: invalidtype
!fname: name, type: text
!#
`;

    const result = parser.parse(markdown);
    expect(result.warnings.length).toBeGreaterThan(0);
    
    // Find the invalid data type warning
    const dataTypeWarning = result.warnings.find(warning => 
      warning.message?.includes('Invalid data type')
    );
    
    expect(dataTypeWarning).toBeDefined();
    expect(dataTypeWarning?.schemaName).toBe('inventory');
    expect(dataTypeWarning?.blockNumber).toBe(1);
    expect(dataTypeWarning?.blockType).toBe('datadef');
    expect(dataTypeWarning?.fieldName).toBe('category');
  });

  it('should include all three context fields consistently across all errors and warnings', () => {
    const markdown = `
!? datadef products
!fname: name, type: text
!fname: category, type: invalidtype
!#

!? data products
| !name | !manufacurer |
|-------|--------------|
| Product1 | Maker1 |
!#

!? data products
!name Product2
!#
`;

    const result = parser.parse(markdown);
    
    // Verify we have both errors and warnings
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    
    // Check that ALL errors have the three context fields when applicable
    for (const error of result.errors) {
      if (error.blockNumber !== undefined) {
        expect(error.blockType).toBeDefined();
        expect(error.schemaName).toBeDefined();
      }
    }
    
    // Check that ALL warnings have the three context fields when applicable  
    for (const warning of result.warnings) {
      if (warning.blockNumber !== undefined) {
        expect(warning.blockType).toBeDefined();
        expect(warning.schemaName).toBeDefined();
      }
    }
    
    // Specifically verify the examples from your error message
    const nestedBlockError = result.errors.find(e => e.type === 'nested_blocks');
    if (nestedBlockError) {
      expect(nestedBlockError.schemaName).toBe('products');
      expect(nestedBlockError.blockNumber).toBeDefined();
      expect(nestedBlockError.blockType).toBe('data');
    }
    
    const invalidFieldError = result.errors.find(e => 
      e.type === 'invalid_field_name' && e.fieldName === 'manufacurer'
    );
    if (invalidFieldError) {
      expect(invalidFieldError.schemaName).toBe('products');
      expect(invalidFieldError.blockNumber).toBeDefined();
      expect(invalidFieldError.blockType).toBe('data');
    }
    
    const invalidDataTypeWarning = result.warnings.find(w => 
      w.message?.includes('Invalid data type') && w.fieldName === 'category'
    );
    if (invalidDataTypeWarning) {
      expect(invalidDataTypeWarning.schemaName).toBe('products');
      expect(invalidDataTypeWarning.blockNumber).toBe(1);
      expect(invalidDataTypeWarning.blockType).toBe('datadef');
    }
  });

  it('should include blockNumber and blockType in freeform parser errors', () => {
    const markdown = `
!? datadef products
!fname: name, type: text
!fname: manufacturer, type: text
!#

!? data products
!name Product1
!manufaturer InvalidCompany
!#
`;

    const result = parser.parse(markdown);
    expect(result.errors.length).toBeGreaterThan(0);
    
    // Find the invalid field name error from freeform parsing
    const freeformError = result.errors.find(error => 
      error.type === 'invalid_field_name' && error.fieldName === 'manufaturer'
    );
    
    expect(freeformError).toBeDefined();
    expect(freeformError?.schemaName).toBe('products');
    expect(freeformError?.blockNumber).toBe(2);
    expect(freeformError?.blockType).toBe('data');
    expect(freeformError?.fieldName).toBe('manufaturer');
  });
});
# Custom Validator Extension Example

This example demonstrates how to create custom validators to add new validation rules and data types to the Markdown Data Extension Parser library.

## Scenario

We want to add validation for:
1. **Geographic coordinates** (latitude/longitude pairs)
2. **International phone numbers** with country-specific validation
3. **Custom business rules** (e.g., discount percentages, inventory levels)

## Implementation

### Step 1: Define Custom Data Types

First, extend the data type system:

```typescript
// custom-types.ts
import { DataType } from 'mdl-data-extension-parser';

// Extend the DataType enum
export enum CustomDataType {
  GEO_COORDINATE = 'geo_coordinate',
  PHONE_NUMBER = 'phone_number',
  PERCENTAGE = 'percentage',
  INVENTORY_LEVEL = 'inventory_level'
}

// Merge with existing DataType for type safety
declare module 'mdl-data-extension-parser' {
  enum DataType {
    GEO_COORDINATE = 'geo_coordinate',
    PHONE_NUMBER = 'phone_number',
    PERCENTAGE = 'percentage',
    INVENTORY_LEVEL = 'inventory_level'
  }
}
```

### Step 2: Extended Validation Rules

Define extended validation rules for our custom types:

```typescript
// extended-validation-rules.ts
import { ValidationRules } from 'mdl-data-extension-parser';

export interface ExtendedValidationRules extends ValidationRules {
  // Geographic validation
  latitude?: {
    min?: number;
    max?: number;
    precision?: number; // decimal places
  };
  longitude?: {
    min?: number;
    max?: number;
    precision?: number;
  };
  
  // Phone number validation
  countryCode?: string;
  phoneFormat?: 'international' | 'national' | 'e164';
  regions?: string[]; // Allowed country/region codes
  
  // Percentage validation
  percentageRange?: {
    min: number;
    max: number;
    allowNegative?: boolean;
  };
  
  // Inventory validation
  inventoryRules?: {
    minStock?: number;
    maxStock?: number;
    reorderLevel?: number;
    allowBackorder?: boolean;
  };
  
  // Business rule dependencies
  dependsOn?: {
    field: string;
    condition: 'equals' | 'not_equals' | 'greater' | 'less' | 'in_range';
    value: unknown;
    message?: string;
  }[];
}
```

### Step 3: Create Custom Validators

#### Geographic Coordinate Validator

```typescript
// geo-validator.ts
import { FieldDefinition, ParseError, ErrorType } from 'mdl-data-extension-parser';
import { ExtendedValidationRules, CustomDataType } from './custom-types';

export class GeoCoordinateValidator {
  validateCoordinate(value: unknown, field: FieldDefinition): ParseError[] {
    const errors: ParseError[] = [];
    
    if (field.type !== CustomDataType.GEO_COORDINATE) {
      return errors; // Not our type
    }
    
    if (typeof value !== 'string') {
      errors.push({
        type: ErrorType.TYPE_MISMATCH,
        message: `Geographic coordinate must be a string, got ${typeof value}`,
        fieldName: field.name
      });
      return errors;
    }
    
    // Parse coordinate format: "latitude,longitude"
    const coordMatch = value.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (!coordMatch) {
      errors.push({
        type: ErrorType.VALIDATION_FAILED,
        message: `Invalid coordinate format. Expected "latitude,longitude", got "${value}"`,
        fieldName: field.name
      });
      return errors;
    }
    
    const latitude = parseFloat(coordMatch[1]);
    const longitude = parseFloat(coordMatch[2]);
    
    // Basic coordinate range validation
    if (latitude < -90 || latitude > 90) {
      errors.push({
        type: ErrorType.VALIDATION_FAILED,
        message: `Latitude must be between -90 and 90, got ${latitude}`,
        fieldName: field.name
      });
    }
    
    if (longitude < -180 || longitude > 180) {
      errors.push({
        type: ErrorType.VALIDATION_FAILED,
        message: `Longitude must be between -180 and 180, got ${longitude}`,
        fieldName: field.name
      });
    }
    
    // Extended validation rules
    const rules = field.validation as ExtendedValidationRules;
    if (rules) {
      errors.push(...this.validateExtendedGeoRules(latitude, longitude, rules, field.name));
    }
    
    return errors;
  }
  
  private validateExtendedGeoRules(
    latitude: number,
    longitude: number,
    rules: ExtendedValidationRules,
    fieldName: string
  ): ParseError[] {
    const errors: ParseError[] = [];
    
    // Latitude validation
    if (rules.latitude) {
      const latRules = rules.latitude;
      
      if (latRules.min !== undefined && latitude < latRules.min) {
        errors.push({
          type: ErrorType.VALIDATION_FAILED,
          message: `Latitude ${latitude} is below minimum ${latRules.min}`,
          fieldName
        });
      }
      
      if (latRules.max !== undefined && latitude > latRules.max) {
        errors.push({
          type: ErrorType.VALIDATION_FAILED,
          message: `Latitude ${latitude} is above maximum ${latRules.max}`,
          fieldName
        });
      }
      
      if (latRules.precision !== undefined) {
        const decimalPlaces = (latitude.toString().split('.')[1] || '').length;
        if (decimalPlaces > latRules.precision) {
          errors.push({
            type: ErrorType.VALIDATION_FAILED,
            message: `Latitude precision exceeds ${latRules.precision} decimal places`,
            fieldName
          });
        }
      }
    }
    
    // Longitude validation
    if (rules.longitude) {
      const lngRules = rules.longitude;
      
      if (lngRules.min !== undefined && longitude < lngRules.min) {
        errors.push({
          type: ErrorType.VALIDATION_FAILED,
          message: `Longitude ${longitude} is below minimum ${lngRules.min}`,
          fieldName
        });
      }
      
      if (lngRules.max !== undefined && longitude > lngRules.max) {
        errors.push({
          type: ErrorType.VALIDATION_FAILED,
          message: `Longitude ${longitude} is above maximum ${lngRules.max}`,
          fieldName
        });
      }
      
      if (lngRules.precision !== undefined) {
        const decimalPlaces = (longitude.toString().split('.')[1] || '').length;
        if (decimalPlaces > lngRules.precision) {
          errors.push({
            type: ErrorType.VALIDATION_FAILED,
            message: `Longitude precision exceeds ${lngRules.precision} decimal places`,
            fieldName
          });
        }
      }
    }
    
    return errors;
  }
}
```

#### Phone Number Validator

```typescript
// phone-validator.ts
import { FieldDefinition, ParseError, ErrorType } from 'mdl-data-extension-parser';
import { ExtendedValidationRules, CustomDataType } from './custom-types';

export class PhoneNumberValidator {
  private countryPatterns: Map<string, RegExp> = new Map([
    ['US', /^\+1[2-9]\d{2}[2-9]\d{2}\d{4}$/],
    ['GB', /^\+44[1-9]\d{8,9}$/],
    ['AU', /^\+61[2-9]\d{8}$/],
    ['CA', /^\+1[2-9]\d{2}[2-9]\d{2}\d{4}$/],
    ['FR', /^\+33[1-9](?:[0-9]{8})$/],
    ['DE', /^\+49[1-9]\d{10,11}$/],
    ['JP', /^\+81[1-9]\d{8,9}$/]
  ]);
  
  validatePhoneNumber(value: unknown, field: FieldDefinition): ParseError[] {
    const errors: ParseError[] = [];
    
    if (field.type !== CustomDataType.PHONE_NUMBER) {
      return errors;
    }
    
    if (typeof value !== 'string') {
      errors.push({
        type: ErrorType.TYPE_MISMATCH,
        message: `Phone number must be a string, got ${typeof value}`,
        fieldName: field.name
      });
      return errors;
    }
    
    const cleanPhone = this.cleanPhoneNumber(value);
    const rules = field.validation as ExtendedValidationRules;
    
    // Basic phone number format validation
    if (!this.isValidPhoneFormat(cleanPhone)) {
      errors.push({
        type: ErrorType.VALIDATION_FAILED,
        message: `Invalid phone number format: "${value}"`,
        fieldName: field.name
      });
      return errors;
    }
    
    // Extended validation
    if (rules) {
      errors.push(...this.validatePhoneRules(cleanPhone, rules, field.name));
    }
    
    return errors;
  }
  
  private cleanPhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    return phone.replace(/[^\d+]/g, '');
  }
  
  private isValidPhoneFormat(phone: string): boolean {
    // Basic international format validation
    const internationalPattern = /^\+\d{7,15}$/;
    return internationalPattern.test(phone);
  }
  
  private validatePhoneRules(
    phone: string,
    rules: ExtendedValidationRules,
    fieldName: string
  ): ParseError[] {
    const errors: ParseError[] = [];
    
    // Country code validation
    if (rules.countryCode) {
      const expectedPrefix = `+${rules.countryCode}`;
      if (!phone.startsWith(expectedPrefix)) {
        errors.push({
          type: ErrorType.VALIDATION_FAILED,
          message: `Phone number must start with ${expectedPrefix}`,
          fieldName
        });
      } else {
        // Validate against country-specific pattern
        const pattern = this.countryPatterns.get(rules.countryCode);
        if (pattern && !pattern.test(phone)) {
          errors.push({
            type: ErrorType.VALIDATION_FAILED,
            message: `Invalid phone number format for country code ${rules.countryCode}`,
            fieldName
          });
        }
      }
    }
    
    // Phone format validation
    if (rules.phoneFormat) {
      const isValid = this.validateSpecificFormat(phone, rules.phoneFormat);
      if (!isValid) {
        errors.push({
          type: ErrorType.VALIDATION_FAILED,
          message: `Phone number doesn't match required format: ${rules.phoneFormat}`,
          fieldName
        });
      }
    }
    
    // Region validation
    if (rules.regions && rules.regions.length > 0) {
      const phoneCountry = this.extractCountryCode(phone);
      if (phoneCountry && !rules.regions.includes(phoneCountry)) {
        errors.push({
          type: ErrorType.VALIDATION_FAILED,
          message: `Phone number country code not allowed. Allowed regions: ${rules.regions.join(', ')}`,
          fieldName
        });
      }
    }
    
    return errors;
  }
  
  private validateSpecificFormat(phone: string, format: string): boolean {
    switch (format) {
      case 'international':
        return /^\+\d{1,3}\d{4,14}$/.test(phone);
      case 'national':
        return /^\d{10,11}$/.test(phone.replace(/^\+\d{1,3}/, ''));
      case 'e164':
        return /^\+\d{7,15}$/.test(phone);
      default:
        return true;
    }
  }
  
  private extractCountryCode(phone: string): string | null {
    const match = phone.match(/^\+(\d{1,3})/);
    return match ? match[1] : null;
  }
}
```

#### Business Rules Validator

```typescript
// business-validator.ts
import { FieldDefinition, ParseError, ErrorType, DataEntry } from 'mdl-data-extension-parser';
import { ExtendedValidationRules, CustomDataType } from './custom-types';

export class BusinessRulesValidator {
  validatePercentage(value: unknown, field: FieldDefinition): ParseError[] {
    const errors: ParseError[] = [];
    
    if (field.type !== CustomDataType.PERCENTAGE) {
      return errors;
    }
    
    if (typeof value !== 'number') {
      errors.push({
        type: ErrorType.TYPE_MISMATCH,
        message: `Percentage must be a number, got ${typeof value}`,
        fieldName: field.name
      });
      return errors;
    }
    
    const rules = field.validation as ExtendedValidationRules;
    if (rules?.percentageRange) {
      const { min, max, allowNegative } = rules.percentageRange;
      
      if (!allowNegative && value < 0) {
        errors.push({
          type: ErrorType.VALIDATION_FAILED,
          message: `Negative percentages not allowed`,
          fieldName: field.name
        });
      }
      
      if (value < min) {
        errors.push({
          type: ErrorType.VALIDATION_FAILED,
          message: `Percentage ${value} is below minimum ${min}`,
          fieldName: field.name
        });
      }
      
      if (value > max) {
        errors.push({
          type: ErrorType.VALIDATION_FAILED,
          message: `Percentage ${value} is above maximum ${max}`,
          fieldName: field.name
        });
      }
    }
    
    return errors;
  }
  
  validateInventoryLevel(value: unknown, field: FieldDefinition): ParseError[] {
    const errors: ParseError[] = [];
    
    if (field.type !== CustomDataType.INVENTORY_LEVEL) {
      return errors;
    }
    
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      errors.push({
        type: ErrorType.TYPE_MISMATCH,
        message: `Inventory level must be an integer, got ${typeof value}`,
        fieldName: field.name
      });
      return errors;
    }
    
    const rules = field.validation as ExtendedValidationRules;
    if (rules?.inventoryRules) {
      const { minStock, maxStock, reorderLevel, allowBackorder } = rules.inventoryRules;
      
      if (!allowBackorder && value < 0) {
        errors.push({
          type: ErrorType.VALIDATION_FAILED,
          message: `Negative inventory not allowed (backorders disabled)`,
          fieldName: field.name
        });
      }
      
      if (minStock !== undefined && value < minStock) {
        errors.push({
          type: ErrorType.VALIDATION_FAILED,
          message: `Inventory level ${value} is below minimum stock level ${minStock}`,
          fieldName: field.name
        });
      }
      
      if (maxStock !== undefined && value > maxStock) {
        errors.push({
          type: ErrorType.VALIDATION_FAILED,
          message: `Inventory level ${value} exceeds maximum stock level ${maxStock}`,
          fieldName: field.name
        });
      }
      
      if (reorderLevel !== undefined && value <= reorderLevel) {
        // This could be a warning rather than an error
        errors.push({
          type: ErrorType.VALIDATION_FAILED,
          message: `Inventory level ${value} is at or below reorder level ${reorderLevel}`,
          fieldName: field.name
        });
      }
    }
    
    return errors;
  }
  
  validateFieldDependencies(
    entry: DataEntry,
    field: FieldDefinition,
    allFields: Map<string, FieldDefinition>
  ): ParseError[] {
    const errors: ParseError[] = [];
    const rules = field.validation as ExtendedValidationRules;
    
    if (!rules?.dependsOn) {
      return errors;
    }
    
    for (const dependency of rules.dependsOn) {
      const dependentField = allFields.get(dependency.field);
      if (!dependentField) {
        errors.push({
          type: ErrorType.INVALID_FIELD_NAME,
          message: `Dependency field '${dependency.field}' not found in schema`,
          fieldName: field.name
        });
        continue;
      }
      
      const dependentValue = entry.fields.get(dependency.field);
      const currentValue = entry.fields.get(field.name);
      
      const conditionMet = this.evaluateCondition(
        dependentValue,
        dependency.condition,
        dependency.value
      );
      
      if (!conditionMet) {
        const message = dependency.message || 
          `Field '${field.name}' dependency not satisfied: '${dependency.field}' must ${dependency.condition} '${dependency.value}'`;
        
        errors.push({
          type: ErrorType.VALIDATION_FAILED,
          message,
          fieldName: field.name
        });
      }
    }
    
    return errors;
  }
  
  private evaluateCondition(
    actualValue: unknown,
    condition: string,
    expectedValue: unknown
  ): boolean {
    switch (condition) {
      case 'equals':
        return actualValue === expectedValue;
      case 'not_equals':
        return actualValue !== expectedValue;
      case 'greater':
        return typeof actualValue === 'number' && 
               typeof expectedValue === 'number' && 
               actualValue > expectedValue;
      case 'less':
        return typeof actualValue === 'number' && 
               typeof expectedValue === 'number' && 
               actualValue < expectedValue;
      case 'in_range':
        if (Array.isArray(expectedValue) && expectedValue.length === 2) {
          const [min, max] = expectedValue as [number, number];
          return typeof actualValue === 'number' && 
                 actualValue >= min && actualValue <= max;
        }
        return false;
      default:
        return true;
    }
  }
}
```

### Step 4: Composite Custom Validator

Create a composite validator that brings everything together:

```typescript
// composite-validator.ts
import { 
  FieldDefinition, 
  ParseError, 
  DataEntry, 
  DataSchema,
  TypeValidator 
} from 'mdl-data-extension-parser';
import { GeoCoordinateValidator } from './geo-validator';
import { PhoneNumberValidator } from './phone-validator';
import { BusinessRulesValidator } from './business-validator';
import { CustomDataType } from './custom-types';

export class ExtendedTypeValidator extends TypeValidator {
  private geoValidator = new GeoCoordinateValidator();
  private phoneValidator = new PhoneNumberValidator();
  private businessValidator = new BusinessRulesValidator();

  validateValue(value: unknown, field: FieldDefinition): boolean {
    // First, try custom validations
    const customErrors = this.validateCustomTypes(value, field);
    
    // If custom validation found errors, return false
    if (customErrors.length > 0) {
      return false;
    }
    
    // Fall back to standard validation
    return super.validateValue(value, field);
  }
  
  validateCustomTypes(value: unknown, field: FieldDefinition): ParseError[] {
    const errors: ParseError[] = [];
    
    switch (field.type) {
      case CustomDataType.GEO_COORDINATE:
        errors.push(...this.geoValidator.validateCoordinate(value, field));
        break;
        
      case CustomDataType.PHONE_NUMBER:
        errors.push(...this.phoneValidator.validatePhoneNumber(value, field));
        break;
        
      case CustomDataType.PERCENTAGE:
        errors.push(...this.businessValidator.validatePercentage(value, field));
        break;
        
      case CustomDataType.INVENTORY_LEVEL:
        errors.push(...this.businessValidator.validateInventoryLevel(value, field));
        break;
    }
    
    return errors;
  }
  
  validateDataEntry(
    entry: DataEntry, 
    schema: DataSchema
  ): ParseError[] {
    const errors: ParseError[] = [];
    const fieldMap = new Map(schema.fields.map(f => [f.name, f]));
    
    // Validate each field
    for (const field of schema.fields) {
      const value = entry.fields.get(field.name);
      
      // Standard validation
      const standardErrors = this.validateCustomTypes(value, field);
      errors.push(...standardErrors);
      
      // Business rule dependencies
      const dependencyErrors = this.businessValidator.validateFieldDependencies(
        entry, 
        field, 
        fieldMap
      );
      errors.push(...dependencyErrors);
    }
    
    return errors;
  }
}
```

### Step 5: Integration with Main Parser

Create an extended parser that uses the custom validators:

```typescript
// extended-parser.ts
import { 
  MarkdownDataExtensionParser,
  ParseOptions,
  ParseResult,
  ValidationResult,
  DataEntry,
  DataSchema
} from 'mdl-data-extension-parser';
import { ExtendedTypeValidator } from './composite-validator';

export class ExtendedMarkdownParser extends MarkdownDataExtensionParser {
  private extendedValidator = new ExtendedTypeValidator();

  validateData(data: DataEntry[], schema: DataSchema): ValidationResult {
    const errors: ParseError[] = [];
    const warnings: ParseError[] = [];
    
    // Use extended validation
    for (const entry of data) {
      const entryErrors = this.extendedValidator.validateDataEntry(entry, schema);
      errors.push(...entryErrors);
    }
    
    // Also run standard validation
    const standardResult = super.validateData(data, schema);
    errors.push(...standardResult.errors);
    warnings.push(...standardResult.warnings);
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
```

### Step 6: Usage Examples

#### Schema Definition with Custom Types

```markdown
!? datadef locations
!fname: id, type: number, required: true
!fname: name, type: text, required: true
!fname: coordinates, type: geo_coordinate, valid: {latitude: {min: -85, max: 85, precision: 6}, longitude: {min: -180, max: 180, precision: 6}}
!fname: contact_phone, type: phone_number, valid: {countryCode: "1", phoneFormat: "international", regions: ["US", "CA"]}
!fname: area_coverage, type: percentage, valid: {percentageRange: {min: 0, max: 100}}
!#

!? datadef products
!fname: id, type: number, required: true
!fname: name, type: text, required: true
!fname: discount, type: percentage, valid: {percentageRange: {min: 0, max: 50}, dependsOn: [{field: "category", condition: "equals", value: "sale"}]}
!fname: stock, type: inventory_level, valid: {inventoryRules: {minStock: 0, maxStock: 10000, reorderLevel: 10}}
!fname: category, type: text, valid: {options: ["regular", "sale", "clearance"]}
!#
```

#### Data with Custom Types

```markdown
!? data locations
| !id | !name | !coordinates | !contact_phone | !area_coverage |
|-----|-------|-------------|----------------|----------------|
| 1 | New York HQ | 40.7128,-74.0060 | +12125551234 | 85.5 |
| 2 | Los Angeles | 34.0522,-118.2437 | +13105559876 | 92.3 |
!#

!? data products
!id 1
!name "Laptop Sale"
!category sale
!discount 25.0
!stock 5
!-
!id 2
!name "Regular Mouse"
!category regular
!discount 0
!stock 150
!#
```

#### Using the Extended Parser

```typescript
import { ExtendedMarkdownParser } from './extended-parser';

const parser = new ExtendedMarkdownParser();

const result = parser.parse(markdownWithCustomTypes, {
  validateData: true
});

console.log('Validation errors:', result.errors.length);
for (const error of result.errors) {
  console.log(`${error.type}: ${error.message}`);
  if (error.fieldName) {
    console.log(`  Field: ${error.fieldName}`);
  }
}
```

## Testing Custom Validators

```typescript
// custom-validator.test.ts
import { GeoCoordinateValidator } from './geo-validator';
import { PhoneNumberValidator } from './phone-validator';
import { CustomDataType } from './custom-types';

describe('Custom Validators', () => {
  describe('GeoCoordinateValidator', () => {
    const validator = new GeoCoordinateValidator();
    
    test('should validate correct coordinates', () => {
      const field = {
        name: 'location',
        type: CustomDataType.GEO_COORDINATE,
        validation: {
          latitude: { min: -85, max: 85 },
          longitude: { min: -180, max: 180 }
        }
      };
      
      const errors = validator.validateCoordinate('40.7128,-74.0060', field);
      expect(errors).toHaveLength(0);
    });
    
    test('should reject invalid coordinate format', () => {
      const field = { name: 'location', type: CustomDataType.GEO_COORDINATE };
      const errors = validator.validateCoordinate('invalid', field);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('validation_failed');
    });
    
    test('should validate latitude range', () => {
      const field = {
        name: 'location',
        type: CustomDataType.GEO_COORDINATE,
        validation: { latitude: { min: 0, max: 50 } }
      };
      
      const errors = validator.validateCoordinate('60.0,0.0', field);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('above maximum 50');
    });
  });
  
  describe('PhoneNumberValidator', () => {
    const validator = new PhoneNumberValidator();
    
    test('should validate US phone numbers', () => {
      const field = {
        name: 'phone',
        type: CustomDataType.PHONE_NUMBER,
        validation: {
          countryCode: '1',
          phoneFormat: 'international'
        }
      };
      
      const errors = validator.validatePhoneNumber('+12125551234', field);
      expect(errors).toHaveLength(0);
    });
    
    test('should reject invalid country codes', () => {
      const field = {
        name: 'phone',
        type: CustomDataType.PHONE_NUMBER,
        validation: { countryCode: '1' }
      };
      
      const errors = validator.validatePhoneNumber('+442071234567', field);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('must start with +1');
    });
  });
});
```

This comprehensive example demonstrates how to extend the validation system with custom data types, validation rules, and business logic while maintaining integration with the existing parser infrastructure.
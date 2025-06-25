# Custom Formatter Extension Example

This example demonstrates how to create custom formatters to add new data formatting and parsing capabilities to the Markdown Data Extension Parser library.

## Scenario

We want to add custom formatting for:
1. **Currency values** with multi-currency support and localization
2. **Geographic coordinates** with multiple display formats (DMS, decimal, etc.)
3. **File sizes** with automatic unit conversion (bytes, KB, MB, GB, etc.)
4. **Social media handles** with platform-specific formatting

## Implementation

### Step 1: Define Custom Data Types and Formats

```typescript
// custom-format-types.ts
export enum CustomFormatType {
  CURRENCY = 'currency',
  GEO_COORDINATE = 'geo_coordinate',
  FILE_SIZE = 'file_size',
  SOCIAL_HANDLE = 'social_handle'
}

export interface CurrencyFormat {
  currency: string;           // ISO 4217 currency code
  locale?: string;            // Locale for formatting (e.g., 'en-US', 'de-DE')
  precision?: number;         // Decimal places
  symbol?: 'before' | 'after' | 'none';
  thousandsSeparator?: string;
  decimalSeparator?: string;
}

export interface GeoCoordinateFormat {
  style: 'decimal' | 'dms' | 'dmm' | 'mgrs';
  precision?: number;
  hemisphere?: boolean;       // Show N/S/E/W
  symbols?: boolean;          // Show °'"
}

export interface FileSizeFormat {
  unit?: 'auto' | 'bytes' | 'KB' | 'MB' | 'GB' | 'TB';
  precision?: number;
  binary?: boolean;           // Use 1024 vs 1000 base
  longForm?: boolean;         // "megabytes" vs "MB"
}

export interface SocialHandleFormat {
  platform: 'twitter' | 'instagram' | 'facebook' | 'linkedin' | 'github';
  includeAt?: boolean;        // Include @ symbol
  includeUrl?: boolean;       // Include full URL
}
```

### Step 2: Currency Formatter

```typescript
// currency-formatter.ts
import { FormattedValue, FieldDefinition } from 'mdl-data-extension-parser';
import { CurrencyFormat } from './custom-format-types';

export class CurrencyFormatter {
  private currencyData = new Map([
    ['USD', { symbol: '$', name: 'US Dollar', decimals: 2 }],
    ['EUR', { symbol: '€', name: 'Euro', decimals: 2 }],
    ['GBP', { symbol: '£', name: 'British Pound', decimals: 2 }],
    ['JPY', { symbol: '¥', name: 'Japanese Yen', decimals: 0 }],
    ['AUD', { symbol: 'A$', name: 'Australian Dollar', decimals: 2 }],
    ['CAD', { symbol: 'C$', name: 'Canadian Dollar', decimals: 2 }],
    ['CHF', { symbol: 'Fr', name: 'Swiss Franc', decimals: 2 }],
    ['CNY', { symbol: '¥', name: 'Chinese Yuan', decimals: 2 }],
    ['BTC', { symbol: '₿', name: 'Bitcoin', decimals: 8 }],
    ['ETH', { symbol: 'Ξ', name: 'Ethereum', decimals: 6 }}
  ]);

  formatCurrency(value: unknown, format: CurrencyFormat): FormattedValue {
    if (typeof value !== 'number') {
      return {
        original: value,
        formatted: String(value)
      };
    }

    const currencyInfo = this.currencyData.get(format.currency);
    if (!currencyInfo) {
      return {
        original: value,
        formatted: `${value} ${format.currency}`
      };
    }

    const precision = format.precision ?? currencyInfo.decimals;
    const formattedNumber = this.formatNumber(value, format, precision);
    
    let result: string;
    const symbol = currencyInfo.symbol;

    switch (format.symbol) {
      case 'before':
        result = `${symbol}${formattedNumber}`;
        break;
      case 'after':
        result = `${formattedNumber} ${symbol}`;
        break;
      case 'none':
        result = `${formattedNumber} ${format.currency}`;
        break;
      default:
        // Auto-detect based on locale
        result = this.formatWithLocale(value, format);
        break;
    }

    return {
      original: value,
      formatted: result
    };
  }

  parseCurrency(input: string, format: CurrencyFormat): number | null {
    if (!input) return null;

    // Remove currency symbols and separators
    const currencyInfo = this.currencyData.get(format.currency);
    let cleaned = input.trim();

    // Remove currency symbol
    if (currencyInfo) {
      cleaned = cleaned.replace(currencyInfo.symbol, '');
    }
    
    // Remove currency code
    cleaned = cleaned.replace(format.currency, '');
    
    // Remove thousands separators
    const thousandsSep = format.thousandsSeparator || ',';
    cleaned = cleaned.replace(new RegExp(`\\${thousandsSep}`, 'g'), '');
    
    // Handle decimal separator
    const decimalSep = format.decimalSeparator || '.';
    if (decimalSep !== '.') {
      cleaned = cleaned.replace(decimalSep, '.');
    }
    
    // Parse the number
    const parsed = parseFloat(cleaned.trim());
    return isNaN(parsed) ? null : parsed;
  }

  private formatNumber(value: number, format: CurrencyFormat, precision: number): string {
    const thousandsSep = format.thousandsSeparator || ',';
    const decimalSep = format.decimalSeparator || '.';
    
    const fixed = value.toFixed(precision);
    const [integer, decimal] = fixed.split('.');
    
    // Add thousands separators
    const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep);
    
    if (precision === 0) {
      return formattedInteger;
    }
    
    return `${formattedInteger}${decimalSep}${decimal}`;
  }

  private formatWithLocale(value: number, format: CurrencyFormat): string {
    const locale = format.locale || 'en-US';
    
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: format.currency,
        minimumFractionDigits: format.precision,
        maximumFractionDigits: format.precision
      }).format(value);
    } catch (error) {
      // Fallback for unsupported locales/currencies
      return this.formatNumber(value, format, format.precision || 2);
    }
  }
}
```

### Step 3: Geographic Coordinate Formatter

```typescript
// geo-formatter.ts
import { FormattedValue } from 'mdl-data-extension-parser';
import { GeoCoordinateFormat } from './custom-format-types';

export class GeoCoordinateFormatter {
  formatCoordinate(value: unknown, format: GeoCoordinateFormat): FormattedValue {
    if (typeof value !== 'string') {
      return {
        original: value,
        formatted: String(value)
      };
    }

    const match = value.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (!match) {
      return {
        original: value,
        formatted: value
      };
    }

    const latitude = parseFloat(match[1]);
    const longitude = parseFloat(match[2]);

    let formatted: string;

    switch (format.style) {
      case 'decimal':
        formatted = this.formatDecimal(latitude, longitude, format);
        break;
      case 'dms':
        formatted = this.formatDMS(latitude, longitude, format);
        break;
      case 'dmm':
        formatted = this.formatDMM(latitude, longitude, format);
        break;
      case 'mgrs':
        formatted = this.formatMGRS(latitude, longitude);
        break;
      default:
        formatted = value;
    }

    return {
      original: value,
      formatted
    };
  }

  parseCoordinate(input: string, format: GeoCoordinateFormat): string | null {
    if (!input) return null;

    // Try to parse different coordinate formats
    switch (format.style) {
      case 'decimal':
        return this.parseDecimal(input);
      case 'dms':
        return this.parseDMS(input);
      case 'dmm':
        return this.parseDMM(input);
      case 'mgrs':
        return this.parseMGRS(input);
      default:
        return this.parseDecimal(input); // Default fallback
    }
  }

  private formatDecimal(lat: number, lng: number, format: GeoCoordinateFormat): string {
    const precision = format.precision || 6;
    const latFixed = lat.toFixed(precision);
    const lngFixed = lng.toFixed(precision);

    if (format.hemisphere) {
      const latHem = lat >= 0 ? 'N' : 'S';
      const lngHem = lng >= 0 ? 'E' : 'W';
      return `${Math.abs(lat).toFixed(precision)}° ${latHem}, ${Math.abs(lng).toFixed(precision)}° ${lngHem}`;
    }

    return `${latFixed}, ${lngFixed}`;
  }

  private formatDMS(lat: number, lng: number, format: GeoCoordinateFormat): string {
    const latDMS = this.toDMS(Math.abs(lat));
    const lngDMS = this.toDMS(Math.abs(lng));
    
    const latHem = lat >= 0 ? 'N' : 'S';
    const lngHem = lng >= 0 ? 'E' : 'W';

    if (format.symbols) {
      return `${latDMS.degrees}°${latDMS.minutes}'${latDMS.seconds.toFixed(1)}"${latHem} ${lngDMS.degrees}°${lngDMS.minutes}'${lngDMS.seconds.toFixed(1)}"${lngHem}`;
    } else {
      return `${latDMS.degrees} ${latDMS.minutes} ${latDMS.seconds.toFixed(1)} ${latHem} ${lngDMS.degrees} ${lngDMS.minutes} ${lngDMS.seconds.toFixed(1)} ${lngHem}`;
    }
  }

  private formatDMM(lat: number, lng: number, format: GeoCoordinateFormat): string {
    const latDMM = this.toDMM(Math.abs(lat));
    const lngDMM = this.toDMM(Math.abs(lng));
    
    const latHem = lat >= 0 ? 'N' : 'S';
    const lngHem = lng >= 0 ? 'E' : 'W';

    if (format.symbols) {
      return `${latDMM.degrees}° ${latDMM.minutes.toFixed(3)}'${latHem} ${lngDMM.degrees}° ${lngDMM.minutes.toFixed(3)}'${lngHem}`;
    } else {
      return `${latDMM.degrees} ${latDMM.minutes.toFixed(3)} ${latHem} ${lngDMM.degrees} ${lngDMM.minutes.toFixed(3)} ${lngHem}`;
    }
  }

  private formatMGRS(lat: number, lng: number): string {
    // Simplified MGRS formatting (full implementation would be more complex)
    // This is a basic approximation
    const zone = Math.floor((lng + 180) / 6) + 1;
    const band = this.getUTMBand(lat);
    return `${zone}${band} [MGRS coordinates would be calculated here]`;
  }

  private toDMS(coord: number): { degrees: number; minutes: number; seconds: number } {
    const degrees = Math.floor(coord);
    const minutesFloat = (coord - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = (minutesFloat - minutes) * 60;

    return { degrees, minutes, seconds };
  }

  private toDMM(coord: number): { degrees: number; minutes: number } {
    const degrees = Math.floor(coord);
    const minutes = (coord - degrees) * 60;

    return { degrees, minutes };
  }

  private getUTMBand(lat: number): string {
    const bands = 'CDEFGHJKLMNPQRSTUVWX';
    const index = Math.floor((lat + 80) / 8);
    return bands[Math.max(0, Math.min(bands.length - 1, index))];
  }

  private parseDecimal(input: string): string | null {
    const match = input.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
    return match ? `${match[1]},${match[2]}` : null;
  }

  private parseDMS(input: string): string | null {
    // Parse DMS format like "40°42'46.0"N 74°0'21.6"W"
    const dmsPattern = /(\d+)[°](\d+)[']([0-9.]+)["]*([NSEW])\s*(\d+)[°](\d+)[']([0-9.]+)["]*([NSEW])/;
    const match = input.match(dmsPattern);
    
    if (!match) return null;

    const latDeg = parseInt(match[1]);
    const latMin = parseInt(match[2]);
    const latSec = parseFloat(match[3]);
    const latHem = match[4];
    
    const lngDeg = parseInt(match[5]);
    const lngMin = parseInt(match[6]);
    const lngSec = parseFloat(match[7]);
    const lngHem = match[8];

    let lat = latDeg + latMin / 60 + latSec / 3600;
    let lng = lngDeg + lngMin / 60 + lngSec / 3600;

    if (latHem === 'S') lat = -lat;
    if (lngHem === 'W') lng = -lng;

    return `${lat},${lng}`;
  }

  private parseDMM(input: string): string | null {
    // Parse DMM format like "40° 42.767'N 74° 0.36'W"
    const dmmPattern = /(\d+)[°]\s*([0-9.]+)[']([NSEW])\s*(\d+)[°]\s*([0-9.]+)[']([NSEW])/;
    const match = input.match(dmmPattern);
    
    if (!match) return null;

    const latDeg = parseInt(match[1]);
    const latMin = parseFloat(match[2]);
    const latHem = match[3];
    
    const lngDeg = parseInt(match[4]);
    const lngMin = parseFloat(match[5]);
    const lngHem = match[6];

    let lat = latDeg + latMin / 60;
    let lng = lngDeg + lngMin / 60;

    if (latHem === 'S') lat = -lat;
    if (lngHem === 'W') lng = -lng;

    return `${lat},${lng}`;
  }

  private parseMGRS(input: string): string | null {
    // MGRS parsing would be complex - simplified version
    return null; // Would implement full MGRS to decimal conversion
  }
}
```

### Step 4: File Size Formatter

```typescript
// file-size-formatter.ts
import { FormattedValue } from 'mdl-data-extension-parser';
import { FileSizeFormat } from './custom-format-types';

export class FileSizeFormatter {
  private readonly binaryUnits = ['bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
  private readonly decimalUnits = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  private readonly longFormBinary = ['bytes', 'kibibytes', 'mebibytes', 'gibibytes', 'tebibytes', 'pebibytes'];
  private readonly longFormDecimal = ['bytes', 'kilobytes', 'megabytes', 'gigabytes', 'terabytes', 'petabytes'];

  formatFileSize(value: unknown, format: FileSizeFormat): FormattedValue {
    if (typeof value !== 'number' || value < 0) {
      return {
        original: value,
        formatted: String(value)
      };
    }

    const binary = format.binary ?? true;
    const precision = format.precision ?? 2;
    const longForm = format.longForm ?? false;
    const base = binary ? 1024 : 1000;

    if (format.unit && format.unit !== 'auto') {
      return this.formatToSpecificUnit(value, format.unit, binary, precision, longForm);
    }

    // Auto-determine best unit
    const units = binary ? this.binaryUnits : this.decimalUnits;
    const longFormUnits = binary ? this.longFormBinary : this.longFormDecimal;
    
    let unitIndex = 0;
    let size = value;

    while (size >= base && unitIndex < units.length - 1) {
      size /= base;
      unitIndex++;
    }

    const unitName = longForm ? longFormUnits[unitIndex] : units[unitIndex];
    const formattedSize = unitIndex === 0 ? size.toString() : size.toFixed(precision);

    return {
      original: value,
      formatted: `${formattedSize} ${unitName}`
    };
  }

  parseFileSize(input: string, format: FileSizeFormat): number | null {
    if (!input) return null;

    const binary = format.binary ?? true;
    const base = binary ? 1024 : 1000;
    
    // Remove extra whitespace and normalize
    const cleaned = input.trim().toLowerCase();
    
    // Extract number and unit
    const match = cleaned.match(/^([0-9.]+)\s*(.*)$/);
    if (!match) return null;

    const numberPart = parseFloat(match[1]);
    if (isNaN(numberPart)) return null;

    const unitPart = match[2].trim();

    // Map unit to multiplier
    const multiplier = this.getUnitMultiplier(unitPart, binary);
    if (multiplier === null) return null;

    return numberPart * multiplier;
  }

  private formatToSpecificUnit(
    value: number, 
    unit: string, 
    binary: boolean, 
    precision: number, 
    longForm: boolean
  ): FormattedValue {
    const base = binary ? 1024 : 1000;
    const units = binary ? this.binaryUnits : this.decimalUnits;
    const longFormUnits = binary ? this.longFormBinary : this.longFormDecimal;
    
    const unitIndex = units.findIndex(u => u.toLowerCase() === unit.toLowerCase());
    if (unitIndex === -1) {
      return {
        original: value,
        formatted: `${value} bytes`
      };
    }

    const divisor = Math.pow(base, unitIndex);
    const convertedValue = value / divisor;
    const unitName = longForm ? longFormUnits[unitIndex] : units[unitIndex];
    const formattedValue = unitIndex === 0 ? convertedValue.toString() : convertedValue.toFixed(precision);

    return {
      original: value,
      formatted: `${formattedValue} ${unitName}`
    };
  }

  private getUnitMultiplier(unit: string, binary: boolean): number | null {
    const base = binary ? 1024 : 1000;
    const units = binary ? this.binaryUnits : this.decimalUnits;
    const longFormUnits = binary ? this.longFormBinary : this.longFormDecimal;

    // Check short form units
    const shortIndex = units.findIndex(u => u.toLowerCase() === unit);
    if (shortIndex !== -1) {
      return Math.pow(base, shortIndex);
    }

    // Check long form units
    const longIndex = longFormUnits.findIndex(u => u.toLowerCase() === unit);
    if (longIndex !== -1) {
      return Math.pow(base, longIndex);
    }

    // Handle common variations
    const variations: { [key: string]: number } = {
      'b': 1,
      'byte': 1,
      'k': binary ? 1024 : 1000,
      'kb': binary ? 1024 : 1000,
      'kib': 1024,
      'm': binary ? Math.pow(1024, 2) : Math.pow(1000, 2),
      'mb': binary ? Math.pow(1024, 2) : Math.pow(1000, 2),
      'mib': Math.pow(1024, 2),
      'g': binary ? Math.pow(1024, 3) : Math.pow(1000, 3),
      'gb': binary ? Math.pow(1024, 3) : Math.pow(1000, 3),
      'gib': Math.pow(1024, 3),
      't': binary ? Math.pow(1024, 4) : Math.pow(1000, 4),
      'tb': binary ? Math.pow(1024, 4) : Math.pow(1000, 4),
      'tib': Math.pow(1024, 4)
    };

    return variations[unit] || null;
  }
}
```

### Step 5: Social Media Handle Formatter

```typescript
// social-formatter.ts
import { FormattedValue } from 'mdl-data-extension-parser';
import { SocialHandleFormat } from './custom-format-types';

export class SocialHandleFormatter {
  private platformConfigs = {
    twitter: {
      urlPattern: 'https://twitter.com/',
      handlePattern: /^@?([A-Za-z0-9_]{1,15})$/,
      maxLength: 15,
      allowedChars: 'letters, numbers, and underscores'
    },
    instagram: {
      urlPattern: 'https://instagram.com/',
      handlePattern: /^@?([A-Za-z0-9_.]{1,30})$/,
      maxLength: 30,
      allowedChars: 'letters, numbers, dots, and underscores'
    },
    facebook: {
      urlPattern: 'https://facebook.com/',
      handlePattern: /^@?([A-Za-z0-9.]{5,50})$/,
      maxLength: 50,
      allowedChars: 'letters, numbers, and dots (min 5 chars)'
    },
    linkedin: {
      urlPattern: 'https://linkedin.com/in/',
      handlePattern: /^@?([A-Za-z0-9-]{3,100})$/,
      maxLength: 100,
      allowedChars: 'letters, numbers, and hyphens (min 3 chars)'
    },
    github: {
      urlPattern: 'https://github.com/',
      handlePattern: /^@?([A-Za-z0-9-]{1,39})$/,
      maxLength: 39,
      allowedChars: 'letters, numbers, and hyphens'
    }
  };

  formatSocialHandle(value: unknown, format: SocialHandleFormat): FormattedValue {
    if (typeof value !== 'string') {
      return {
        original: value,
        formatted: String(value)
      };
    }

    const config = this.platformConfigs[format.platform];
    if (!config) {
      return {
        original: value,
        formatted: value
      };
    }

    // Validate and extract handle
    const match = value.match(config.handlePattern);
    if (!match) {
      return {
        original: value,
        formatted: value // Return original if invalid
      };
    }

    const handle = match[1];
    let formatted = handle;

    // Add @ symbol if requested
    if (format.includeAt) {
      formatted = `@${formatted}`;
    }

    // Add full URL if requested
    if (format.includeUrl) {
      formatted = `${config.urlPattern}${handle}`;
    }

    return {
      original: value,
      formatted
    };
  }

  parseSocialHandle(input: string, format: SocialHandleFormat): string | null {
    if (!input) return null;

    const config = this.platformConfigs[format.platform];
    if (!config) return null;

    let cleaned = input.trim();

    // Remove URL if present
    if (cleaned.startsWith(config.urlPattern)) {
      cleaned = cleaned.substring(config.urlPattern.length);
    }

    // Remove @ if present
    if (cleaned.startsWith('@')) {
      cleaned = cleaned.substring(1);
    }

    // Validate handle format
    const isValid = config.handlePattern.test(`@${cleaned}`);
    if (!isValid) return null;

    return cleaned;
  }

}
```

### Step 6: Composite Custom Formatter

```typescript
// composite-formatter.ts
import { 
  MarkdownDataFormatter,
  DataFormatter, 
  FormattedValue, 
  FieldDefinition, 
  DualFormat,
  DataType 
} from 'mdl-data-extension-parser';
import { CurrencyFormatter } from './currency-formatter';
import { GeoCoordinateFormatter } from './geo-formatter';
import { FileSizeFormatter } from './file-size-formatter';
import { SocialHandleFormatter } from './social-formatter';
import { 
  CustomFormatType,
  CurrencyFormat,
  GeoCoordinateFormat,
  FileSizeFormat,
  SocialHandleFormat 
} from './custom-format-types';

export class ExtendedDataFormatter extends MarkdownDataFormatter implements DataFormatter {
  private currencyFormatter = new CurrencyFormatter();
  private geoFormatter = new GeoCoordinateFormatter();
  private fileSizeFormatter = new FileSizeFormatter();
  private socialFormatter = new SocialHandleFormatter();

  formatValue(value: unknown, field: FieldDefinition): FormattedValue {
    // Try custom formatting first
    const customResult = this.tryCustomFormatting(value, field);
    if (customResult) return customResult;

    // Fall back to standard formatting
    return super.formatValue(value, field);
  }

  parseValue(input: string, field: FieldDefinition): unknown {
    // Try custom parsing first
    const customResult = this.tryCustomParsing(input, field);
    if (customResult !== null) return customResult;

    // Fall back to standard parsing
    return super.parseValue(input, field);
  }

  private tryCustomFormatting(value: unknown, field: FieldDefinition): FormattedValue | null {
    if (!field.format || typeof field.format === 'string') {
      return null; // Standard formats handled by base class
    }

    const format = field.format as any;
    
    // Determine format type
    if (this.isCurrencyFormat(format)) {
      return this.currencyFormatter.formatCurrency(value, format);
    }
    
    if (this.isGeoCoordinateFormat(format)) {
      return this.geoFormatter.formatCoordinate(value, format);
    }
    
    if (this.isFileSizeFormat(format)) {
      return this.fileSizeFormatter.formatFileSize(value, format);
    }
    
    if (this.isSocialHandleFormat(format)) {
      return this.socialFormatter.formatSocialHandle(value, format);
    }

    return null;
  }

  private tryCustomParsing(input: string, field: FieldDefinition): unknown | null {
    if (!field.format || typeof field.format === 'string') {
      return null; // Standard formats handled by base class
    }

    const format = field.format as any;

    if (this.isCurrencyFormat(format)) {
      return this.currencyFormatter.parseCurrency(input, format);
    }
    
    if (this.isGeoCoordinateFormat(format)) {
      return this.geoFormatter.parseCoordinate(input, format);
    }
    
    if (this.isFileSizeFormat(format)) {
      return this.fileSizeFormatter.parseFileSize(input, format);
    }
    
    if (this.isSocialHandleFormat(format)) {
      return this.socialFormatter.parseSocialHandle(input, format);
    }

    return null;
  }

  // Type guards
  private isCurrencyFormat(format: any): format is CurrencyFormat {
    return format && typeof format.currency === 'string';
  }

  private isGeoCoordinateFormat(format: any): format is GeoCoordinateFormat {
    return format && typeof format.style === 'string' && 
           ['decimal', 'dms', 'dmm', 'mgrs'].includes(format.style);
  }

  private isFileSizeFormat(format: any): format is FileSizeFormat {
    return format && (
      format.unit !== undefined || 
      format.binary !== undefined || 
      format.longForm !== undefined
    );
  }

  private isSocialHandleFormat(format: any): format is SocialHandleFormat {
    return format && typeof format.platform === 'string' &&
           ['twitter', 'instagram', 'facebook', 'linkedin', 'github'].includes(format.platform);
  }
}
```

### Step 7: Usage Examples

#### Schema Definition with Custom Formats

```markdown
!? datadef products
!fname: id, type: number, required: true
!fname: name, type: text, required: true
!fname: price, type: number, format: {currency: "USD", locale: "en-US", symbol: "before"}
!fname: file_size, type: number, format: {unit: "auto", binary: true, precision: 2}
!fname: location, type: text, format: {style: "dms", hemisphere: true, symbols: true}
!fname: twitter, type: text, format: {platform: "twitter", includeAt: true}
!#

!? datadef international_products  
!fname: id, type: number, required: true
!fname: name, type: text, required: true
!fname: price_usd, type: number, format: {currency: "USD", locale: "en-US"}
!fname: price_eur, type: number, format: {currency: "EUR", locale: "de-DE", thousandsSeparator: ".", decimalSeparator: ","}
!fname: coordinates, type: text, format: {style: "decimal", precision: 4, hemisphere: false}
!fname: instagram, type: text, format: {platform: "instagram", includeUrl: true}
!#
```

#### Data with Custom Formatting

```markdown
!? data products
| !id | !name | !price | !file_size | !location | !twitter |
|-----|-------|--------|------------|-----------|----------|
| 1 | Software | 99.99 | 52428800 | 40.7128,-74.0060 | @mycompany |
| 2 | Hardware | 1299.50 | 1073741824 | 34.0522,-118.2437 | @hardware_co |
!#

!? data international_products
!id 1
!name "Global Software"
!price_usd 99.99
!price_eur 85.50
!coordinates 52.5200,13.4050
!instagram mycompany_global
!-
!id 2
!name "Premium Service"
!price_usd 299.99
!price_eur 259.99
!coordinates 48.8566,2.3522
!instagram premium_services
!#
```

#### Using the Extended Formatter

```typescript
import { ExtendedDataFormatter } from './composite-formatter';
import { MarkdownDataExtensionParser } from 'mdl-data-extension-parser';

// Create parser with custom formatter
const parser = new MarkdownDataExtensionParser();
const formatter = new ExtendedDataFormatter();

const result = parser.parse(markdownWithCustomFormats);

// Format the data for display
for (const [schemaName, entries] of result.data) {
  const schema = result.schemas.get(schemaName);
  if (!schema) continue;

  console.log(`\n=== ${schemaName} ===`);
  
  for (const entry of entries) {
    console.log(`\nRecord ${entry.recordIndex}:`);
    
    for (const field of schema.fields) {
      const value = entry.fields.get(field.name);
      const formatted = formatter.formatValue(value, field);
      
      console.log(`  ${field.label || field.name}: ${formatted.formatted}`);
      if (formatted.displayFormatted) {
        console.log(`    (Display: ${formatted.displayFormatted})`);
      }
    }
  }
}
```

#### Output Example

```
=== products ===

Record 0:
  id: 1
  name: Software
  price: $99.99
  file_size: 50.00 MiB
  location: 40°42'46.1"N 74°0'21.6"W
  twitter: @mycompany

Record 1:
  id: 2
  name: Hardware
  price: $1,299.50
  file_size: 1.00 GiB
  location: 34°3'7.9"N 118°14'37.3"W
  twitter: @hardware_co

=== international_products ===

Record 0:
  id: 1
  name: Global Software
  price_usd: $99.99
  price_eur: 85,50 €
  coordinates: 52.5200, 13.4050
  instagram: https://instagram.com/mycompany_global
```

### Step 8: Testing Custom Formatters

```typescript
// custom-formatter.test.ts
import { CurrencyFormatter } from './currency-formatter';
import { GeoCoordinateFormatter } from './geo-formatter';
import { FileSizeFormatter } from './file-size-formatter';

describe('Custom Formatters', () => {
  describe('CurrencyFormatter', () => {
    const formatter = new CurrencyFormatter();
    
    test('should format USD currency', () => {
      const result = formatter.formatCurrency(1234.56, {
        currency: 'USD',
        symbol: 'before',
        thousandsSeparator: ',',
        decimalSeparator: '.'
      });
      
      expect(result.formatted).toBe('$1,234.56');
    });
    
    test('should parse currency strings', () => {
      const result = formatter.parseCurrency('$1,234.56', {
        currency: 'USD',
        thousandsSeparator: ',',
        decimalSeparator: '.'
      });
      
      expect(result).toBe(1234.56);
    });
  });
  
  describe('FileSizeFormatter', () => {
    const formatter = new FileSizeFormatter();
    
    test('should auto-format file sizes', () => {
      const result = formatter.formatFileSize(1073741824, {
        unit: 'auto',
        binary: true,
        precision: 2
      });
      
      expect(result.formatted).toBe('1.00 GiB');
    });
    
    test('should parse file size strings', () => {
      const result = formatter.parseFileSize('1.5 GB', {
        binary: false
      });
      
      expect(result).toBe(1500000000);
    });
  });
});
```

This comprehensive example demonstrates how to extend the formatting system with complex custom formatters that handle parsing and multiple display formats while maintaining integration with the existing parser infrastructure.
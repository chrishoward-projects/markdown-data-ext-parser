import { promises as fs } from 'fs';
import { resolve, dirname, join } from 'path';
import { 
  MarkdownDataParser, 
  ParseResult, 
  ParseOptions, 
  DataSchema, 
  DataEntry, 
  ValidationResult,
  Token,
  TokenType,
  ErrorType,
  BlockInfo,
  ParserState
} from './types.js';
import { Tokenizer } from './tokenizer.js';
import { SchemaParser, validateSchemaDefinition } from './schema-parser.js';
import { DataParser, validateDataEntries } from './data-parser.js';
import { DataTypeConverter } from './data-types.js';
import { MarkdownDataFormatter } from './formatter.js';
import { DataValidator } from './validation/syntax.js';
import { createDefaultParseOptions, SchemaCache } from './utils.js';

export class MarkdownDataExtensionParser implements MarkdownDataParser {
  private schemaCache: SchemaCache;
  private dataTypeConverter: DataTypeConverter;
  private formatter: MarkdownDataFormatter;
  private validator: DataValidator;

  constructor() {
    this.schemaCache = new SchemaCache();
    this.dataTypeConverter = new DataTypeConverter();
    this.formatter = new MarkdownDataFormatter();
    this.validator = new DataValidator();
  }

  parse(markdown: string, options?: ParseOptions): ParseResult {
    const startTime = Date.now();
    const mergedOptions = { ...createDefaultParseOptions(), ...options };
    
    if (mergedOptions.schemaCache) {
      this.schemaCache = mergedOptions.schemaCache;
    }

    const state: ParserState = {
      currentLine: 1,
      currentColumn: 1,
      inBlock: false,
      schemas: new Map(),
      data: new Map(),
      errors: [],
      warnings: [],
      options: mergedOptions
    };

    try {
      // Tokenize the markdown
      const tokenizer = new Tokenizer(markdown);
      const tokenizeResult = tokenizer.tokenize();
      
      // Add tokenization errors to state
      state.errors.push(...tokenizeResult.errors);

      // Parse blocks
      this.parseBlocks(tokenizeResult.tokens, state);

      // Validate data if requested
      if (mergedOptions.validateData) {
        this.validateAllData(state);
      }

    } catch (error) {
      state.errors.push({
        type: ErrorType.SYNTAX_ERROR,
        message: `Parser error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lineNumber: state.currentLine
      });
    }

    const parseTime = Date.now() - startTime;
    const totalDataEntries = Array.from(state.data.values()).reduce((sum, entries) => sum + entries.length, 0);

    return {
      schemas: state.schemas,
      data: state.data,
      errors: state.errors,
      warnings: state.warnings,
      metadata: {
        parseTime,
        totalLines: markdown.split('\n').length,
        schemasFound: state.schemas.size,
        dataEntriesFound: totalDataEntries
      }
    };
  }

  async parseFile(filePath: string, options?: ParseOptions): Promise<ParseResult> {
    try {
      const absolutePath = resolve(filePath);
      const markdown = await fs.readFile(absolutePath, 'utf-8');
      
      const fileOptions: ParseOptions = {
        ...options,
        basePath: options?.basePath || dirname(absolutePath),
        sourceFile: absolutePath
      };

      return this.parse(markdown, fileOptions);
    } catch (error) {
      return {
        schemas: new Map(),
        data: new Map(),
        errors: [{
          type: ErrorType.EXTERNAL_REFERENCE_FAILED,
          message: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          sourceFile: filePath
        }],
        warnings: [],
        metadata: {
          parseTime: 0,
          totalLines: 0,
          schemasFound: 0,
          dataEntriesFound: 0
        }
      };
    }
  }

  validateSchema(schema: DataSchema): ValidationResult {
    const errors = validateSchemaDefinition(schema);
    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  validateData(data: DataEntry[], schema: DataSchema): ValidationResult {
    const errors: import('./types.js').ParseError[] = [];
    const warnings: import('./types.js').ParseError[] = [];
    
    // Only basic structural validation (parser-level errors)
    errors.push(...validateDataEntries(data, schema));
    
    // Convert data types and validate types (generate warnings for type mismatches)
    for (const entry of data) {
      const schemaFields = new Map(schema.fields.map(f => [f.name, f]));
      
      for (const [fieldName, value] of entry.fields) {
        const field = schemaFields.get(fieldName);
        if (field) {
          // Validate type before conversion - add warning if type doesn't match
          // Use existing formatter validation infrastructure
          let isValid = true;
          let validationMessage = '';
          
          if (field.format) {
            // Validate specific format if field has one
            isValid = this.validator.validateFormat(value, field.format, field.type);
            validationMessage = `Field '${fieldName}' expects ${field.type} with format '${field.format}' but got '${value}'`;
          } else {
            // Validate basic type for fields without specific format
            isValid = this.validator.validateType(value, field.type);
            validationMessage = `Field '${fieldName}' expects ${field.type} but got '${value}'`;
          }
          
          if (!isValid) {
            warnings.push({
              type: 'TYPE_MISMATCH' as any,
              message: validationMessage,
              lineNumber: entry.lineNumber || 0,
              schemaName: schema.name,
              fieldName: fieldName
            });
          }
          
          // Convert the value (even if validation failed, for best-effort parsing)
          const convertedValue = this.dataTypeConverter.convertValue(value, field);
          // Update the entry with converted value
          entry.fields.set(fieldName, convertedValue);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  getSchema(name: string): DataSchema | undefined {
    return this.schemaCache.get(name);
  }

  clearCache(): void {
    this.schemaCache.clear();
  }

  private parseBlocks(tokens: Token[], state: ParserState): void {
    let currentTokens: Token[] = [];
    let currentBlock: BlockInfo | null = null;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token) continue;
      state.currentLine = token.position.line;
      state.currentColumn = token.position.column;

      if (token.type === TokenType.BLOCK_START) {
        // Check for nested blocks
        if (state.inBlock && currentBlock) {
          state.errors.push({
            type: ErrorType.NESTED_BLOCKS,
            message: `Cannot start new block '${token.value}' - block '${currentBlock.type} ${currentBlock.schemaName}' is still open`,
            lineNumber: token.position.line,
            schemaName: currentBlock.schemaName
          });
          continue;
        }

        const blockInfo = this.parseBlockStart(token);
        if (blockInfo) {
          currentBlock = blockInfo;
          currentTokens = [];
          state.inBlock = true;
          state.currentBlockType = blockInfo.type;
          state.currentSchemaName = blockInfo.schemaName;
        }
      } else if (token.type === TokenType.BLOCK_END) {
        if (!state.inBlock || !currentBlock) {
          state.errors.push({
            type: ErrorType.SYNTAX_ERROR,
            message: 'Block end (!#) found without matching block start (!?)',
            lineNumber: token.position.line
          });
          continue;
        }

        if (currentBlock && state.inBlock) {
          currentBlock.endLine = token.position.line;
          
          // Check for empty blocks
          const contentTokens = currentTokens.filter(t => 
            t.type !== TokenType.NEWLINE && 
            t.type !== TokenType.COMMENT &&
            t.value.trim().length > 0
          );
          
          if (contentTokens.length === 0) {
            state.errors.push({
              type: ErrorType.EMPTY_BLOCK,
              message: `Empty ${currentBlock.type} block for schema '${currentBlock.schemaName}'`,
              lineNumber: currentBlock.startLine,
              schemaName: currentBlock.schemaName
            });
          }

          this.processBlock(currentBlock, currentTokens, state);
          currentBlock = null;
          currentTokens = [];
          state.inBlock = false;
          state.currentBlockType = undefined;
          state.currentSchemaName = undefined;
        }
      } else if (state.inBlock) {
        currentTokens.push(token);
      } else {
        // Check for data content outside blocks
        if (this.isDataContent(token)) {
          state.errors.push({
            type: ErrorType.MISSING_BLOCK_START,
            message: 'Data content found without proper block declaration (!? datadef/data)',
            lineNumber: token.position.line
          });
        }
      }
    }

    // Handle unclosed block
    if (state.inBlock && currentBlock) {
      state.errors.push({
        type: ErrorType.BLOCK_NOT_CLOSED,
        message: `Block '${currentBlock.type} ${currentBlock.schemaName}' not properly closed`,
        lineNumber: currentBlock.startLine,
        schemaName: currentBlock.schemaName
      });
    }
  }

  private parseBlockStart(token: Token): BlockInfo | null {
    const parts = token.value.trim().split(/\s+/);
    if (parts.length < 2) return null;

    const blockType = parts[0];
    let schemaName = parts.slice(1).join(' ');
    let externalPath: string | undefined;

    // Check for external reference [schema_name](path)
    const externalMatch = schemaName.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (externalMatch) {
      schemaName = externalMatch[1];
      externalPath = externalMatch[2];
    }

    if (blockType === 'datadef' || blockType === 'data') {
      return {
        type: blockType as 'datadef' | 'data',
        schemaName,
        externalPath,
        startLine: token.position.line
      };
    }

    return null;
  }

  private isDataContent(token: Token): boolean {
    return token.type === TokenType.FIELD_NAME || 
           token.type === TokenType.FIELD_VALUE ||
           token.type === TokenType.TABLE_HEADER ||
           token.type === TokenType.TABLE_ROW ||
           token.type === TokenType.RECORD_SEPARATOR ||
           token.type === TokenType.INDEX_DEFINITION;
  }

  private processBlock(blockInfo: BlockInfo, tokens: Token[], state: ParserState): void {
    if (blockInfo.type === 'datadef') {
      this.processSchemaDefinition(blockInfo, tokens, state);
    } else if (blockInfo.type === 'data') {
      this.processDataEntry(blockInfo, tokens, state);
    }
  }

  private processSchemaDefinition(blockInfo: BlockInfo, tokens: Token[], state: ParserState): void {
    const schemaParser = new SchemaParser(tokens);
    const result = schemaParser.parseSchema(blockInfo.schemaName, blockInfo.startLine);
    
    if (result.schema) {
      result.schema.sourcePath = state.options.sourceFile;
      state.schemas.set(blockInfo.schemaName, result.schema);
      this.schemaCache.set(blockInfo.schemaName, result.schema);
      
      // No additional validation - schema parsing handles structural errors
    }
    
    state.errors.push(...result.errors);
  }

  private processDataEntry(blockInfo: BlockInfo, tokens: Token[], state: ParserState): void {
    let schema = state.schemas.get(blockInfo.schemaName);
    
    // Check for external schema reference but don't load synchronously
    if (!schema && blockInfo.externalPath && state.options.loadExternalSchemas) {
      state.warnings.push({
        message: `External schema reference '${blockInfo.externalPath}' - external loading not supported in synchronous parsing`,
        lineNumber: blockInfo.startLine,
        schemaName: blockInfo.schemaName
      });
    }
    
    if (!schema) {
      state.errors.push({
        type: ErrorType.SCHEMA_NOT_FOUND,
        message: `Schema '${blockInfo.schemaName}' not found`,
        lineNumber: blockInfo.startLine,
        schemaName: blockInfo.schemaName
      });
      return;
    }

    const dataParser = new DataParser(tokens, schema, blockInfo.schemaName);
    const result = dataParser.parseData();
    
    // Add to state
    const existingData = state.data.get(blockInfo.schemaName) || [];
    state.data.set(blockInfo.schemaName, [...existingData, ...result.data]);
    state.errors.push(...result.errors);
  }

  private async loadExternalSchema(path: string, options: ParseOptions): Promise<DataSchema | null> {
    try {
      const cachedSchema = this.schemaCache.get(path);
      if (cachedSchema) {
        return cachedSchema;
      }

      const absolutePath = options.basePath ? resolve(options.basePath, path) : resolve(path);
      const schemaMarkdown = await fs.readFile(absolutePath, 'utf-8');
      
      const schemaOptions: ParseOptions = {
        ...options,
        basePath: dirname(absolutePath),
        sourceFile: absolutePath,
        validateData: false // Only parse schema, not data
      };

      const result = this.parse(schemaMarkdown, schemaOptions);
      
      if (result.errors.length > 0) {
        return null;
      }

      // Return the first schema found
      const schemas = Array.from(result.schemas.values());
      return schemas.length > 0 ? schemas[0] : null;
      
    } catch {
      return null;
    }
  }

  private validateAllData(state: ParserState): void {
    for (const [schemaName, entries] of state.data) {
      const schema = state.schemas.get(schemaName);
      if (schema) {
        const validationResult = this.validateData(entries, schema);
        state.errors.push(...validationResult.errors);
        state.warnings.push(...validationResult.warnings);
      }
    }
  }
}
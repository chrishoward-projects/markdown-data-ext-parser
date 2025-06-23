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
});
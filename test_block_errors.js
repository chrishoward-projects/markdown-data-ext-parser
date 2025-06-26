import { createParser } from './dist/index.mjs';

const testMarkdown = `
!? datadef contacts
!fname: name, type: text
!fname: email, type: invalidtype
!fname: age, type: number

!#

!? data products
!name John Doe
!email john@email.com
!age 30
!#

!? datadef products
!fname: id, type: number
!fname: name, type: text
!fname: price, type: wrongtype

!#

!? data contacts
!name Jane Doe  
!email jane@email.com
!age 25
!#
`;

console.log('Testing enhanced error reporting with block context...\n');

const parser = createParser();
const result = parser.parse(testMarkdown);

console.log('Parse Results:');
console.log(`- Schemas found: ${result.schemas.size}`);
console.log(`- Data entries: ${Array.from(result.data.values()).reduce((sum, entries) => sum + entries.length, 0)}`);
console.log(`- Errors: ${result.errors.length}`);
console.log(`- Warnings: ${result.warnings.length}\n`);

if (result.errors.length > 0) {
  console.log('Errors:');
  result.errors.forEach((error, index) => {
    console.log(`${index + 1}. ${error.message}`);
    console.log(`   Block: ${error.blockContext || 'N/A'}`);
    console.log(`   Line: ${error.lineNumber}, Type: ${error.type}`);
    console.log('');
  });
}

if (result.warnings.length > 0) {
  console.log('Warnings:');
  result.warnings.forEach((warning, index) => {
    console.log(`${index + 1}. ${warning.message}`);
    console.log(`   Block: ${warning.blockContext || 'N/A'}`);
    console.log(`   Line: ${warning.lineNumber}`);
    console.log('');
  });
}

console.log('Schema fields:');
for (const [schemaName, schema] of result.schemas) {
  const fieldStrings = schema.fields.map(f => `${f.name}:${f.type}`);
  console.log(`- ${schemaName}: [${fieldStrings.join(', ')}]`);
}
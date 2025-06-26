const { MarkdownDataExtensionParser } = require('../dist/index.js');

// Create parser instance
const parser = new MarkdownDataExtensionParser();

// Example markdown with data extension
const markdown = `
# Company Employee Database

This document contains our employee information using the Markdown Data Extension.

!? datadef employees
!fname: id, type: number, label: "Employee ID", required: true
!fname: name, type: text, label: "Full Name", required: true
!fname: email, type: text, format: "email", required: true
!fname: department, type: text, valid: {options: ["Engineering", "Sales", "HR", "Marketing"]}
!fname: salary, type: number, format: "$n,n.##", valid: {min: 30000, max: 200000}
!fname: start_date, type: date, format: "DD/MM/YYYY"
!fname: active, type: boolean, format: "y/n"
!index: "id"
!index: "department+active"
!#

## Employee Data

Our current employees:

!? data employees
| !id | !name | !email | !department | !salary | !start_date | !active |
|-----|-------|--------|-------------|---------|-------------|---------|
| 1 | John Smith | john.smith@company.com | Engineering | 85000 | 15/03/2020 | true |
| 2 | Jane Doe | jane.doe@company.com | Sales | 75000 | 22/07/2021 | true |
| 3 | Bob Johnson | bob.johnson@company.com | HR | 65000 | 10/11/2019 | false |
| 4 | Alice Wilson | alice.wilson@company.com | Marketing | 70000 | 05/01/2022 | true |
!#

## Additional Information

This data is used for payroll and organizational management.
`;

// Parse the markdown
console.log('Parsing Markdown Data Extension...\n');
const result = parser.parse(markdown, { validateData: true });

// Display results
console.log('=== Parse Results ===');
console.log(`Parse time: ${result.metadata.parseTime}ms`);
console.log(`Total lines: ${result.metadata.totalLines}`);
console.log(`Schemas found: ${result.metadata.schemasFound}`);
console.log(`Data entries found: ${result.metadata.dataEntriesFound}`);
console.log(`Errors: ${result.errors.length}`);
console.log(`Warnings: ${result.warnings.length}\n`);

// Display schemas
console.log('=== Schemas ===');
for (const [name, schema] of result.schemas) {
  console.log(`Schema: ${name}`);
  console.log(`  Fields: ${schema.fields.length}`);
  schema.fields.forEach(field => {
    console.log(`    - ${field.name}: ${field.type}${field.required ? ' (required)' : ''}`);
  });
  console.log(`  Indexes: ${schema.indexes.length}`);
  schema.indexes.forEach(index => {
    console.log(`    - ${index.name}: [${index.fields.join(', ')}]`);
  });
  console.log();
}

// Display data
console.log('=== Data ===');
for (const [schemaName, entries] of result.data) {
  console.log(`Data for schema: ${schemaName}`);
  console.log(`  Entries: ${entries.length}`);
  entries.forEach((entry, index) => {
    console.log(`    Entry ${index + 1}:`);
    for (const [fieldName, value] of entry.fields) {
      console.log(`      ${fieldName}: ${value}`);
    }
  });
  console.log();
}

// Display any errors
if (result.errors.length > 0) {
  console.log('=== Errors ===');
  result.errors.forEach(error => {
    console.log(`${error.type} at line ${error.lineNumber}: ${error.message}`);
    if (error.fieldName) console.log(`  Field: ${error.fieldName}`);
    if (error.schemaName) console.log(`  Schema: ${error.schemaName}`);
  });
  console.log();
}

console.log('Example completed successfully!');
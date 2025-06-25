const { MarkdownDataExtensionParser } = require('./dist/index.js');

const parser = new MarkdownDataExtensionParser();

// Test the exact format from the test interface
const testMarkdown = `!? datadef employees
!fname: employee_id, type: number, required: true, label: "Employee ID"
!fname: name, type: text, required: true, label: "Full Name"
!fname: email, type: text, format: "email", required: true, label: "Email Address"
!#

!? data employees
| !employee_id | !name | !email |
|--------------|-------|--------|
| 1001 | Alice Johnson | alice.johnson@company.com |
| 1002 | Bob Smith | bob.smith@company.com |
!#`;

console.log('Testing employee table parsing...');
const result = parser.parse(testMarkdown);

console.log('\nErrors:', result.errors.length);
result.errors.forEach(error => {
  console.log(`- Line ${error.lineNumber}: ${error.message}`);
});

console.log('\nData entries found:', result.metadata.dataEntriesFound);
console.log('Data structure:');

for (const [schemaName, entries] of result.data) {
  console.log(`Schema: ${schemaName}, Entries count: ${entries.length}`);
  
  entries.forEach((entry, index) => {
    console.log(`  Entry ${index}:`);
    console.log(`    Fields Map size: ${entry.fields.size}`);
    console.log(`    Fields:`, Object.fromEntries(entry.fields));
    console.log(`    Line: ${entry.lineNumber}, Schema: ${entry.schemaName}`);
  });
}
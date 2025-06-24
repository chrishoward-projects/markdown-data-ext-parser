const { MarkdownDataExtensionParser } = require('./dist/index.js');

const parser = new MarkdownDataExtensionParser();

// Use the exact data from the test interface
const testMarkdown = `# Employee Management System

This document demonstrates the Markdown Data Extension with a comprehensive employee database.

!? datadef employees
!fname: employee_id, type: number, label: "Employee ID", required: true
!fname: name, type: text, label: "Full Name", required: true, valid: {min: 2, max: 50}
!fname: email, type: text, format: "email", required: true
!fname: phone, type: text, format: {"##########", "(##) #### ####"}, label: "Phone Number"
!fname: department, type: text, required: true, label: "Department"
!fname: position, type: text, required: true, label: "Job Position"
!fname: salary, type: number, format: "currency", label: "Annual Salary"
!fname: start_date, type: date, format: {"MM/DD/YYYY", "MMM DD, YYYY"}, required: true, label: "Start Date"
!fname: is_active, type: boolean, format: "yes/no", required: true, label: "Active Status"
!fname: manager_id, type: number, label: "Manager ID"
!#

## Employee Records

Our current team members:

!? data employees
| !employee_id | !name | !email | !phone | !department | !position | !salary | !start_date | !is_active | !manager_id |
|--------------|-------|--------|---------|-------------|-----------|---------|-------------|------------|-------------|
| 1001 | Alice Johnson | alice.johnson@company.com | 5551234567 | Engineering | Senior Developer | 95000 | 01/15/2020 | yes | 1005 |
| 1002 | Bob Smith | bob.smith@company.com | 5552345678 | Marketing | Marketing Manager | 75000 | 03/22/2021 | yes | 1006 |
!#`;

console.log('Testing with test interface data...');
const result = parser.parse(testMarkdown);

console.log('\\nErrors:', result.errors.length);
result.errors.forEach(error => {
  console.log(`- Line ${error.lineNumber}: ${error.message}`);
});

console.log('\\nData entries found:', result.metadata.dataEntriesFound);
console.log('Data structure:');

for (const [schemaName, entries] of result.data) {
  console.log(`Schema: ${schemaName}, Entries count: ${entries.length}`);
  
  entries.forEach((entry, index) => {
    console.log(`  Entry ${index}:`);
    console.log(`    Fields Map type:`, entry.fields instanceof Map);
    console.log(`    Fields Map size:`, entry.fields.size);
    console.log(`    Fields Map keys:`, Array.from(entry.fields.keys()));
    console.log(`    Fields Map values:`, Array.from(entry.fields.values()));
    console.log(`    Fields as Object:`, Object.fromEntries(entry.fields));
    console.log(`    Line: ${entry.lineNumber}, Schema: ${entry.schemaName}`);
  });
}
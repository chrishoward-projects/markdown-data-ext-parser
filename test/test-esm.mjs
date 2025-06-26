import { MarkdownDataExtensionParser } from '../dist/index.mjs';

const parser = new MarkdownDataExtensionParser();

const testMarkdown = `!? datadef employees
!fname: employee_id, type: number, required: true
!fname: name, type: text, required: true
!fname: email, type: text, format: "email", required: true
!#

!? data employees
| !employee_id | !name | !email |
|--------------|-------|--------|
| 1001 | Alice Johnson | alice.johnson@company.com |
| 1002 | Bob Smith | bob.smith@company.com |
!#`;

console.log('Testing ESM version...');
const result = parser.parse(testMarkdown);

console.log('\\nESM Result:');
console.log('Data entries found:', result.metadata.dataEntriesFound);
console.log('result.data instanceof Map:', result.data instanceof Map);

if (result.data instanceof Map) {
    for (const [schemaName, entries] of result.data) {
        console.log(`\\nSchema: ${schemaName}, Entries: ${entries.length}`);
        entries.forEach((entry, index) => {
            console.log(`  Entry ${index}:`);
            console.log(`    fields instanceof Map:`, entry.fields instanceof Map);
            console.log(`    fields size:`, entry.fields?.size);
            if (entry.fields instanceof Map) {
                console.log(`    fields as Object:`, Object.fromEntries(entry.fields));
            }
        });
    }
}

// Test the same conversion logic as the browser
const cleanResult = {
    metadata: result.metadata,
    schemas: Array.from(result.schemas.entries()).map(([name, schema]) => ({
        name,
        fields: schema.fields,
        indexes: schema.indexes,
        sourcePath: schema.sourcePath
    })),
    data: Array.from(result.data.entries()).map(([schemaName, entries]) => ({
        schemaName,
        entries: entries.map(entry => ({
            fields: Object.fromEntries(entry.fields),
            lineNumber: entry.lineNumber,
            recordIndex: entry.recordIndex
        }))
    })),
    errors: result.errors,
    warnings: result.warnings
};

console.log('\\nCleaned result:');
console.log(JSON.stringify(cleanResult, null, 2));
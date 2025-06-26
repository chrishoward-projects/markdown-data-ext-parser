const { MarkdownDataExtensionParser } = require('../dist/index.js');

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

console.log('Testing Map serialization issue...');
const result = parser.parse(testMarkdown);

console.log('\\n=== RAW RESULT EXAMINATION ===');
console.log('result.data instanceof Map:', result.data instanceof Map);
console.log('result.data.size:', result.data.size);

for (const [schemaName, entries] of result.data) {
    console.log(`\\nSchema: ${schemaName}`);
    console.log('entries type:', Array.isArray(entries));
    console.log('entries length:', entries.length);
    
    entries.forEach((entry, index) => {
        console.log(`\\n  Entry ${index}:`);
        console.log('    entry type:', typeof entry);
        console.log('    entry keys:', Object.keys(entry));
        console.log('    entry.fields instanceof Map:', entry.fields instanceof Map);
        console.log('    entry.fields size:', entry.fields ? entry.fields.size : 'undefined');
        
        if (entry.fields instanceof Map) {
            console.log('    Map keys:', Array.from(entry.fields.keys()));
            console.log('    Map values:', Array.from(entry.fields.values()));
        }
    });
}

console.log('\\n=== JSON SERIALIZATION TEST ===');
console.log('JSON.stringify(result.data):');
console.log(JSON.stringify(result.data, null, 2));

console.log('\\n=== MANUAL CONVERSION TEST ===');
const convertedData = Array.from(result.data.entries()).map(([schemaName, entries]) => ({
    schemaName,
    entries: entries.map(entry => ({
        fields: Object.fromEntries(entry.fields),
        lineNumber: entry.lineNumber,
        recordIndex: entry.recordIndex
    }))
}));

console.log('Converted data:');
console.log(JSON.stringify(convertedData, null, 2));
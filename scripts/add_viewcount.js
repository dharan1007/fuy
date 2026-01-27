const fs = require('fs');
const path = 'c:/Users/dhara/fuy/prisma/schema.prisma';

let content = fs.readFileSync(path, 'utf8');

// Check if viewCount already exists
if (content.includes('viewCount')) {
    console.log('viewCount already exists');
    process.exit(0);
}

// Split preserving line endings
const lines = content.split('\n');
const result = [];

for (let i = 0; i < lines.length; i++) {
    result.push(lines[i]);
    // Look for the status line in Post model
    if (lines[i].includes('status') && lines[i].includes('@default("PUBLISHED")') && lines[i].includes('PUBLISHED, DRAFT, ARCHIVED')) {
        result.push('  viewCount           Int       @default(0)');
        console.log('Added viewCount after line ' + (i + 1));
    }
}

fs.writeFileSync(path, result.join('\n'), 'utf8');
console.log('Schema updated successfully');

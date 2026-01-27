const fs = require('fs');
const path = 'c:/Users/dhara/fuy/prisma/schema.prisma';

try {
    let content = fs.readFileSync(path, 'utf8');
    // Remove BOM if present (charCodeAt(0) === 0xFEFF)
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
        console.log('Removed BOM from schema.prisma');
        fs.writeFileSync(path, content, 'utf8');
    } else {
        console.log('No BOM found, but rewriting just in case.');
        // Sometimes it might not be distinct in string access if node strips it automatically, 
        // but let's try writing it back cleanly.
        fs.writeFileSync(path, content, 'utf8');
    }
} catch (e) {
    console.error('Error processing file:', e);
}

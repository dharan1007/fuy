
const fs = require('fs');
const path = 'c:/Users/dhara/fuy/prisma/schema.prisma';

try {
  let content = fs.readFileSync(path, 'utf8');

  // Regex to find uniqueCode definition without default
  // Matches: uniqueCode [whitespace] String [whitespace] @unique [NOT FOLLOWED BY @default]
  // We replace it with version having @default(cuid())

  const regex = /uniqueCode\s+String\s+@unique(?!\s*@default)/g;

  if (regex.test(content)) {
    content = content.replace(regex, 'uniqueCode      String   @unique @default(cuid())');
    fs.writeFileSync(path, content);
    console.log('Schema updated successfully.');
  } else {
    console.log('Schema already correct or pattern not found.');
  }
} catch (e) {
  console.error('Error:', e);
}

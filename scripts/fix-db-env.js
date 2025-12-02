
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env');
const envLocalPath = path.resolve(process.cwd(), '.env.local');

if (fs.existsSync(envPath)) {
    console.log('Reading .env...');
    let content = fs.readFileSync(envPath, 'utf8');
    let dbUrl = '';

    // Robust parser
    content.split(/\r?\n/).forEach(line => {
        const match = line.match(/^\s*([^=]+?)\s*=\s*(.*)$/);
        if (match) {
            const key = match[1];
            if (key === 'DATABASE_URL') {
                let value = match[2].trim();
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                dbUrl = value;
            }
        }
    });

    if (dbUrl) {
        if (dbUrl.includes('pooler.supabase.com')) {
            console.log('Found Supabase pooler URL.');

            // 1. Ensure port 6543 for transaction pooler
            let newUrl = dbUrl.replace(':5432', ':6543');

            // 2. Ensure pgbouncer=true
            if (!newUrl.includes('pgbouncer=true')) {
                const separator = newUrl.includes('?') ? '&' : '?';
                newUrl = `${newUrl}${separator}pgbouncer=true&connection_limit=1`;
            }

            console.log('Original URL (masked):', dbUrl.replace(/:([^:@]+)@/, ':****@'));
            console.log('New URL (masked):     ', newUrl.replace(/:([^:@]+)@/, ':****@'));

            console.log('Updating .env.local...');
            let localContent = '';
            if (fs.existsSync(envLocalPath)) {
                localContent = fs.readFileSync(envLocalPath, 'utf8');
            }

            // Remove existing DATABASE_URL line if present to overwrite it
            const localLines = localContent.split(/\r?\n/).filter(line => !line.startsWith('DATABASE_URL='));
            localLines.push(`DATABASE_URL="${newUrl}"`);

            fs.writeFileSync(envLocalPath, localLines.join('\n'));
            console.log('✅ Updated .env.local with port 6543 and pgbouncer params.');
        } else {
            console.log('Not a Supabase pooler URL, skipping.');
        }
    } else {
        console.error('❌ Could not find DATABASE_URL in .env');
    }
} else {
    console.error('❌ .env file not found');
}


const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

function loadEnv(filePath) {
    if (fs.existsSync(filePath)) {
        console.log(`Loading ${path.basename(filePath)}...`);
        const content = fs.readFileSync(filePath, 'utf8');
        content.split('\n').forEach(line => {
            const match = line.match(/^\s*([^=]+)\s*=\s*(.*)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                process.env[key] = value;
            }
        });
    }
}

// Load .env then .env.local (overriding)
loadEnv(path.resolve(process.cwd(), '.env'));
loadEnv(path.resolve(process.cwd(), '.env.local'));

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

async function main() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        const msg = '❌ DATABASE_URL is not set';
        console.error(msg);
        fs.writeFileSync('db-error.log', msg);
        return;
    }

    // Mask password for logging
    const maskedUrl = url.replace(/:([^:@]+)@/, ':****@');
    console.log(`Checking connection to: ${maskedUrl}`);

    try {
        console.log('Attempting to connect...');
        await prisma.$connect();
        console.log('✅ Successfully connected to database!');

        const count = await prisma.user.count();
        console.log(`✅ Database query successful. User count: ${count}`);
        fs.writeFileSync('db-error.log', 'SUCCESS');
    } catch (e) {
        console.error('❌ Connection failed:', e);
        fs.writeFileSync('db-error.log', JSON.stringify(e, null, 2) + '\n' + e.toString());
    } finally {
        await prisma.$disconnect();
    }
}

main();

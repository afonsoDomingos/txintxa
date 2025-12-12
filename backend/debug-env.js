const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const content = fs.readFileSync(envPath, 'utf8');

const mongoLine = content.split('\n').find(line => line.includes('MONGODB_URI'));

if (mongoLine) {
    const parts = mongoLine.split('=');
    if (parts.length > 1) {
        const value = parts.slice(1).join('=');
        console.log('Valor começa com:', JSON.stringify(value.substring(0, 15)));
    }
}

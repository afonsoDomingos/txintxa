const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
let content = fs.readFileSync(envPath, 'utf8');

// Corrigir duplicação de chave
if (content.includes('MONGODB_URI=MONGODB_URI=')) {
    content = content.replace('MONGODB_URI=MONGODB_URI=', 'MONGODB_URI=');
    fs.writeFileSync(envPath, content);
    console.log('✅ Corrigido: MONGODB_URI duplicado foi removido.');
} else {
    console.log('Nenhuma duplicação óbvia encontrada.');
    // Tenta ver se tem MONGODB_URI=mongodb+srv mas com espaço ou algo assim
    // Mas pelo debug anterior, era MONGODB_URI=mon... o que sugere duplicação ou o usuário digitou MONGODB_URI=...
}

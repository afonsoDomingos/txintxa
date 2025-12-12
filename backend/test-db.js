require('dotenv').config();
const mongoose = require('mongoose');

console.log('Testando conexão com:', process.env.MONGODB_URI?.split('@')[1]); // Mostrar só parte da URL por segurança

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ SUCESSO: Conectado ao MongoDB Atlas!');
        console.log('Banco de dados:', mongoose.connection.name);
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ ERRO: Não foi possível conectar.');
        console.error(err.message);
        process.exit(1);
    });

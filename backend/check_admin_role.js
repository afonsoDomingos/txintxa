require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./models'); // Ajuste o caminho se necessário

const checkUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Conectado ao MongoDB.');

        const email = 'admin@txintxa.com';
        const user = await User.findOne({ email });

        if (user) {
            console.log(`\n--- DADOS DO USUÁRIO ---`);
            console.log(`Email: ${user.email}`);
            console.log(`Role atual: ${user.role}`);
            console.log(`Status: ${user.status}`);
            console.log(`------------------------\n`);
        } else {
            console.log(`Usuário ${email} não encontrado!`);
        }

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

checkUser();

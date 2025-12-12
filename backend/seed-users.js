require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User.model');

async function seedUsers() {
    console.log('🌱 Iniciando Seed de Usuários...');

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado ao MongoDB');

        // Dados dos usuários
        const users = [
            {
                firstName: 'Karingana',
                lastName: 'Studio',
                email: 'karinganastudio23@gmail.com',
                password: '@Cliente123@',
                phone: '841000001',
                role: 'user',
                emailVerified: true,
                status: 'active'
            },
            {
                firstName: 'Administrador',
                lastName: 'Txintxa',
                email: 'admin@txintxa.com',
                password: '@Admin123@',
                phone: '840000000',
                role: 'admin',
                emailVerified: true,
                status: 'active'
            }
        ];

        for (const userData of users) {
            // Verificar se usuário já existe
            const existingUser = await User.findOne({ email: userData.email });

            if (existingUser) {
                console.log(`⚠️ Usuário ${userData.email} já existe. Pulando...`);
                continue;
            }

            // Criar novo usuário
            // A senha será hasheada automaticamente pelo UserSchema.pre('save')
            const user = new User(userData);
            await user.save();

            console.log(`✅ Usuário criado: ${userData.email} (${userData.role})`);
        }

        console.log('🏁 Seed concluído com sucesso!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Erro no seed:', error);
        process.exit(1);
    }
}

seedUsers();

require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('./models/Transaction.model');
const User = require('./models/User.model');

const check = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            console.error('❌ MONGODB_URI não definida no .env');
            return;
        }

        console.log('🔄 Conectando ao MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Conectado!');

        const count = await Transaction.countDocuments();
        console.log(`\n📊 Total de transações no banco: ${count}`);

        if (count > 0) {
            const lastTxn = await Transaction.findOne().sort({ createdAt: -1 });
            console.log('\n📝 Última transação salva:');
            console.log(`ID: ${lastTxn.transactionId}`);
            console.log(`Valor: ${lastTxn.sourceAmount} ${lastTxn.sourceCurrency}`);
            console.log(`Status: ${lastTxn.status}`);
            console.log(`Data: ${lastTxn.createdAt}`);
            console.log(`Usuário ID: ${lastTxn.user}`);

            const user = await User.findById(lastTxn.user);
            if (user) {
                console.log(`Feita por: ${user.firstName} ${user.lastName} (${user.email})`);
            }
        } else {
            console.log('⚠️ Nenhuma transação encontrada ainda.');
        }

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Desconectado.');
    }
};

check();

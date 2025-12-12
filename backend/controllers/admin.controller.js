const { User, Transaction } = require('../models');
const logger = require('../utils/logger');

// Controller para dados do painel admin
const getDashboard = async (req, res) => {
    try {
        // Total de usuários
        const totalUsers = await User.countDocuments();

        // Volume total de transações (assumindo campo amountUSD)
        const totalVolumeAgg = await Transaction.aggregate([
            { $group: { _id: null, total: { $sum: '$amountUSD' } } }
        ]);
        const totalVolume = totalVolumeAgg[0] ? totalVolumeAgg[0].total : 0;

        // Transações pendentes (status = 'pending')
        const pendingCount = await Transaction.countDocuments({ status: 'pending' });

        // Últimas 5 transações
        const recentTransactions = await Transaction.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('user amountUSD status createdAt')
            .populate('user', 'fullName email');

        res.json({
            success: true,
            data: {
                totalUsers,
                totalVolume,
                pendingCount,
                recentTransactions
            }
        });
    } catch (error) {
        logger.error('Erro ao buscar dados do admin dashboard:', error);
        res.status(500).json({ success: false, message: 'Erro interno' });
    }
};

module.exports = { getDashboard };

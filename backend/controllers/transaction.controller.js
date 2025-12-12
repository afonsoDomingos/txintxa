/**
 * Controller de Transações
 */

const { Transaction } = require('../models');
const logger = require('../utils/logger');

/**
 * Listar transações do usuário
 */
const getTransactions = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, type, startDate, endDate } = req.query;

        const result = await Transaction.findByUser(req.user._id, {
            page: parseInt(page),
            limit: parseInt(limit),
            status,
            type,
            startDate,
            endDate
        });

        res.json({
            success: true,
            data: {
                transactions: result.transactions.map(t => ({
                    transactionId: t.transactionId,
                    type: t.type,
                    sourceAmount: t.sourceAmount,
                    sourceCurrency: t.sourceCurrency,
                    destinationAmount: t.destinationAmount,
                    destinationCurrency: t.destinationCurrency,
                    netAmount: t.netAmount,
                    exchangeRate: t.exchangeRate,
                    fees: t.fees,
                    status: t.status,
                    createdAt: t.createdAt,
                    completedAt: t.completedAt,
                    source: t.source,
                    destination: t.destination
                })),
                pagination: result.pagination
            }
        });
    } catch (error) {
        logger.error('Erro ao listar transações:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar transações'
        });
    }
};

/**
 * Obter detalhes de uma transação
 */
const getTransactionById = async (req, res) => {
    try {
        const { id } = req.params;

        const transaction = await Transaction.findOne({
            $or: [
                { _id: id },
                { transactionId: id }
            ],
            user: req.user._id
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transação não encontrada'
            });
        }

        res.json({
            success: true,
            data: {
                ...transaction.toPublicJSON(),
                statusHistory: transaction.statusHistory.map(h => ({
                    status: h.status,
                    message: h.message,
                    timestamp: h.timestamp
                }))
            }
        });
    } catch (error) {
        logger.error('Erro ao obter transação:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter transação'
        });
    }
};

/**
 * Obter estatísticas de transações do usuário
 */
const getStats = async (req, res) => {
    try {
        const stats = await Transaction.getUserStats(req.user._id);

        res.json({
            success: true,
            data: {
                totalTransactions: stats.totalTransactions,
                totalFees: Math.round(stats.totalFees * 100) / 100,
                averageAmount: Math.round(stats.avgAmount * 100) / 100,
                byType: {
                    paypalToMpesa: stats.paypalToMpesa,
                    mpesaToPaypal: stats.mpesaToPaypal
                }
            }
        });
    } catch (error) {
        logger.error('Erro ao obter estatísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter estatísticas'
        });
    }
};

/**
 * Exportar transações (CSV)
 */
const exportTransactions = async (req, res) => {
    try {
        const { startDate, endDate, format = 'csv' } = req.query;

        const query = { user: req.user._id };

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const transactions = await Transaction.find(query)
            .sort({ createdAt: -1 })
            .limit(1000)
            .lean();

        if (format === 'csv') {
            const csvHeader = 'ID,Tipo,Valor Origem,Moeda Origem,Valor Destino,Moeda Destino,Taxa,Status,Data\n';
            const csvRows = transactions.map(t =>
                `${t.transactionId},${t.type},${t.sourceAmount},${t.sourceCurrency},${t.netAmount},${t.destinationCurrency},${t.fees.total},${t.status},${new Date(t.createdAt).toISOString()}`
            ).join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=transacoes-txintxa.csv');
            return res.send(csvHeader + csvRows);
        }

        res.json({
            success: true,
            data: transactions
        });
    } catch (error) {
        logger.error('Erro ao exportar transações:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao exportar transações'
        });
    }
};

module.exports = {
    getTransactions,
    getTransactionById,
    getStats,
    exportTransactions
};

/**
 * Modelo de Transação
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const transactionSchema = new mongoose.Schema({
    // Identificação
    transactionId: {
        type: String,
        default: () => `TXN-${uuidv4().slice(0, 8).toUpperCase()}`,
        unique: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Tipo e Direção
    type: {
        type: String,
        enum: ['paypal_to_mpesa', 'mpesa_to_paypal'],
        required: true
    },

    // Valores
    sourceAmount: {
        type: Number,
        required: true,
        min: [1, 'Valor mínimo é 1']
    },
    sourceCurrency: {
        type: String,
        required: true,
        enum: ['USD', 'MZN']
    },
    destinationAmount: {
        type: Number,
        required: true
    },
    destinationCurrency: {
        type: String,
        required: true,
        enum: ['USD', 'MZN']
    },

    // Taxa de Câmbio
    exchangeRate: {
        type: Number,
        required: true
    },
    exchangeRateSource: {
        type: String,
        default: 'exchangerate-api'
    },

    // Taxas
    fees: {
        percentage: { type: Number, default: 2 },
        fixed: { type: Number, default: 0.50 },
        total: { type: Number, required: true },
        currency: { type: String, default: 'USD' }
    },

    // Valor final (após taxas)
    netAmount: {
        type: Number,
        required: true
    },

    // Status
    status: {
        type: String,
        enum: [
            'pending',           // Aguardando início
            'processing',        // Em processamento
            'awaiting_source',   // Aguardando débito da fonte
            'source_completed',  // Débito da fonte concluído
            'awaiting_destination', // Aguardando crédito no destino
            'completed',         // Concluído com sucesso
            'failed',            // Falhou
            'cancelled',         // Cancelado pelo usuário
            'reversed'           // Estornado
        ],
        default: 'pending'
    },
    statusHistory: [{
        status: String,
        timestamp: { type: Date, default: Date.now },
        message: String,
        metadata: mongoose.Schema.Types.Mixed
    }],

    // Dados da Fonte (PayPal ou M-Pesa)
    source: {
        provider: {
            type: String,
            enum: ['paypal', 'mpesa'],
            required: true
        },
        accountIdentifier: String, // Email do PayPal ou telefone M-Pesa
        transactionId: String,     // ID da transação no provedor
        status: String,
        metadata: mongoose.Schema.Types.Mixed
    },

    // Dados do Destino
    destination: {
        provider: {
            type: String,
            enum: ['paypal', 'mpesa'],
            required: true
        },
        accountIdentifier: String,
        transactionId: String,
        status: String,
        metadata: mongoose.Schema.Types.Mixed
    },

    // OTP
    otpVerified: {
        type: Boolean,
        default: false
    },
    otpVerifiedAt: Date,

    // Notas e Erros
    notes: String,
    errorMessage: String,
    errorCode: String,

    // Metadados
    ipAddress: String,
    userAgent: String,
    deviceInfo: mongoose.Schema.Types.Mixed,

    // Timestamps
    initiatedAt: { type: Date, default: Date.now },
    completedAt: Date,
    failedAt: Date

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Índices
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ 'source.transactionId': 1 });
transactionSchema.index({ 'destination.transactionId': 1 });

// Virtual: Duração da transação
transactionSchema.virtual('duration').get(function () {
    if (!this.completedAt && !this.failedAt) return null;
    const endTime = this.completedAt || this.failedAt;
    return endTime - this.initiatedAt;
});

// Virtual: Descrição legível
transactionSchema.virtual('description').get(function () {
    if (this.type === 'paypal_to_mpesa') {
        return `${this.sourceAmount} USD → ${this.destinationAmount} MZN`;
    }
    return `${this.sourceAmount} MZN → ${this.destinationAmount} USD`;
});

// Método: Adicionar ao histórico de status
transactionSchema.methods.addStatusHistory = function (status, message = '', metadata = {}) {
    this.statusHistory.push({
        status,
        message,
        metadata,
        timestamp: new Date()
    });
    this.status = status;
    return this.save();
};

// Método: Marcar como concluído
transactionSchema.methods.markCompleted = async function (destinationTxnId) {
    this.status = 'completed';
    this.completedAt = new Date();
    this.destination.transactionId = destinationTxnId;
    this.destination.status = 'completed';

    this.statusHistory.push({
        status: 'completed',
        message: 'Transação concluída com sucesso',
        timestamp: new Date()
    });

    return this.save();
};

// Método: Marcar como falho
transactionSchema.methods.markFailed = async function (errorMessage, errorCode = 'UNKNOWN') {
    this.status = 'failed';
    this.failedAt = new Date();
    this.errorMessage = errorMessage;
    this.errorCode = errorCode;

    this.statusHistory.push({
        status: 'failed',
        message: errorMessage,
        metadata: { errorCode },
        timestamp: new Date()
    });

    return this.save();
};

// Método: Formatar para resposta pública
transactionSchema.methods.toPublicJSON = function () {
    return {
        transactionId: this.transactionId,
        type: this.type,
        description: this.description,
        sourceAmount: this.sourceAmount,
        sourceCurrency: this.sourceCurrency,
        destinationAmount: this.destinationAmount,
        destinationCurrency: this.destinationCurrency,
        exchangeRate: this.exchangeRate,
        fees: this.fees,
        netAmount: this.netAmount,
        status: this.status,
        initiatedAt: this.initiatedAt,
        completedAt: this.completedAt,
        duration: this.duration
    };
};

// Static: Buscar transações do usuário com paginação
transactionSchema.statics.findByUser = async function (userId, options = {}) {
    const {
        page = 1,
        limit = 10,
        status,
        type,
        startDate,
        endDate
    } = options;

    const query = { user: userId };

    if (status) query.status = status;
    if (type) query.type = type;
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const total = await this.countDocuments(query);
    const transactions = await this.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    return {
        transactions,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

// Static: Estatísticas do usuário
transactionSchema.statics.getUserStats = async function (userId) {
    const stats = await this.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId), status: 'completed' } },
        {
            $group: {
                _id: null,
                totalTransactions: { $sum: 1 },
                totalFees: { $sum: '$fees.total' },
                avgAmount: { $avg: '$sourceAmount' },
                paypalToMpesa: {
                    $sum: { $cond: [{ $eq: ['$type', 'paypal_to_mpesa'] }, 1, 0] }
                },
                mpesaToPaypal: {
                    $sum: { $cond: [{ $eq: ['$type', 'mpesa_to_paypal'] }, 1, 0] }
                }
            }
        }
    ]);

    return stats[0] || {
        totalTransactions: 0,
        totalFees: 0,
        avgAmount: 0,
        paypalToMpesa: 0,
        mpesaToPaypal: 0
    };
};

module.exports = mongoose.model('Transaction', transactionSchema);

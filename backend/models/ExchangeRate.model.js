/**
 * Modelo de Taxa de Câmbio
 */

const mongoose = require('mongoose');

const exchangeRateSchema = new mongoose.Schema({
    // Par de moedas
    baseCurrency: {
        type: String,
        required: true,
        uppercase: true,
        enum: ['USD', 'MZN', 'EUR', 'ZAR']
    },
    targetCurrency: {
        type: String,
        required: true,
        uppercase: true,
        enum: ['USD', 'MZN', 'EUR', 'ZAR']
    },

    // Taxa
    rate: {
        type: Number,
        required: true,
        min: 0
    },

    // Fonte da taxa
    source: {
        type: String,
        enum: ['exchangerate-api', 'fixer', 'manual', 'cached'],
        default: 'exchangerate-api'
    },

    // Validade
    validFrom: {
        type: Date,
        default: Date.now
    },
    validUntil: {
        type: Date,
        required: true
    },

    // Metadados
    metadata: {
        apiResponse: mongoose.Schema.Types.Mixed,
        fetchedAt: Date
    }
}, {
    timestamps: true
});

// Índice composto único
exchangeRateSchema.index(
    { baseCurrency: 1, targetCurrency: 1, validFrom: -1 },
    { unique: true }
);

// Índice para expiração
exchangeRateSchema.index({ validUntil: 1 });

// Virtual: Par formatado
exchangeRateSchema.virtual('pair').get(function () {
    return `${this.baseCurrency}/${this.targetCurrency}`;
});

// Virtual: Está válido
exchangeRateSchema.virtual('isValid').get(function () {
    const now = new Date();
    return now >= this.validFrom && now <= this.validUntil;
});

// Static: Obter taxa atual
exchangeRateSchema.statics.getCurrentRate = async function (baseCurrency, targetCurrency) {
    const now = new Date();

    const rate = await this.findOne({
        baseCurrency,
        targetCurrency,
        validFrom: { $lte: now },
        validUntil: { $gte: now }
    }).sort({ validFrom: -1 });

    return rate;
};

// Static: Salvar nova taxa
exchangeRateSchema.statics.saveRate = async function (baseCurrency, targetCurrency, rate, source = 'exchangerate-api', validityHours = 1) {
    const now = new Date();
    const validUntil = new Date(now.getTime() + validityHours * 60 * 60 * 1000);

    // Upsert para evitar duplicatas
    return this.findOneAndUpdate(
        {
            baseCurrency,
            targetCurrency,
            validFrom: now
        },
        {
            baseCurrency,
            targetCurrency,
            rate,
            source,
            validFrom: now,
            validUntil,
            metadata: {
                fetchedAt: now
            }
        },
        { upsert: true, new: true }
    );
};

module.exports = mongoose.model('ExchangeRate', exchangeRateSchema);

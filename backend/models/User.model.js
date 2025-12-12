/**
 * Modelo de Usuário
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // Informações Básicas
    firstName: {
        type: String,
        required: [true, 'Nome é obrigatório'],
        trim: true,
        maxlength: [50, 'Nome não pode exceder 50 caracteres']
    },
    lastName: {
        type: String,
        required: [true, 'Sobrenome é obrigatório'],
        trim: true,
        maxlength: [50, 'Sobrenome não pode exceder 50 caracteres']
    },
    email: {
        type: String,
        required: [true, 'Email é obrigatório'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Email inválido']
    },
    phone: {
        type: String,
        required: [true, 'Telefone é obrigatório'],
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Senha é obrigatória'],
        minlength: [8, 'Senha deve ter pelo menos 8 caracteres'],
        select: false
    },
    avatar: {
        type: String,
        default: ''
    },

    // Verificações
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,

    phoneVerified: {
        type: Boolean,
        default: false
    },
    phoneVerificationCode: String,
    phoneVerificationExpires: Date,

    // KYC
    kycStatus: {
        type: String,
        enum: ['pending', 'submitted', 'approved', 'rejected'],
        default: 'pending'
    },
    kycData: {
        documentType: {
            type: String,
            enum: ['bi', 'passport', 'driving_license']
        },
        documentNumber: String,
        documentFrontUrl: String,
        documentBackUrl: String,
        selfieUrl: String,
        dateOfBirth: Date,
        address: {
            street: String,
            city: String,
            province: String,
            postalCode: String
        },
        submittedAt: Date,
        reviewedAt: Date,
        rejectionReason: String
    },

    // Contas Vinculadas
    paypalAccount: {
        email: String,
        accountId: String,
        verified: { type: Boolean, default: false },
        linkedAt: Date
    },
    mpesaAccount: {
        phone: String,
        verified: { type: Boolean, default: false },
        linkedAt: Date
    },

    // Limites
    limits: {
        dailyUsed: { type: Number, default: 0 },
        weeklyUsed: { type: Number, default: 0 },
        dailyLimit: { type: Number, default: 500 },  // USD
        weeklyLimit: { type: Number, default: 2000 }, // USD
        lastDailyReset: { type: Date, default: Date.now },
        lastWeeklyReset: { type: Date, default: Date.now }
    },

    // Segurança
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: String,

    passwordResetToken: String,
    passwordResetExpires: Date,

    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: Date,

    lastLogin: Date,
    lastLoginIP: String,

    // Status
    status: {
        type: String,
        enum: ['active', 'suspended', 'blocked'],
        default: 'active'
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'superadmin'],
        default: 'user'
    },

    // Preferências
    preferences: {
        language: { type: String, default: 'pt' },
        currency: { type: String, default: 'MZN' },
        notifications: {
            email: { type: Boolean, default: true },
            sms: { type: Boolean, default: true },
            push: { type: Boolean, default: true }
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Índices
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ 'paypalAccount.email': 1 });
userSchema.index({ 'mpesaAccount.phone': 1 });

// Virtual: Nome completo
userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual: Conta vinculada
userSchema.virtual('isFullyLinked').get(function () {
    return this.paypalAccount?.verified && this.mpesaAccount?.verified;
});

// Pre-save: Hash da senha
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Método: Comparar senha
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Método: Verificar se está bloqueado
userSchema.methods.isLocked = function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Método: Incrementar tentativas de login
userSchema.methods.incLoginAttempts = async function () {
    // Se já passou o tempo de bloqueio, resetar
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 }
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };

    // Bloquear após 5 tentativas
    if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
        updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 horas
    }

    return this.updateOne(updates);
};

// Método: Resetar limites diários
userSchema.methods.resetDailyLimits = async function () {
    const now = new Date();
    const lastReset = new Date(this.limits.lastDailyReset);

    if (now.toDateString() !== lastReset.toDateString()) {
        this.limits.dailyUsed = 0;
        this.limits.lastDailyReset = now;
        await this.save();
    }
};

// Método: Verificar limite disponível
userSchema.methods.checkLimit = function (amountUSD) {
    const dailyAvailable = this.limits.dailyLimit - this.limits.dailyUsed;
    const weeklyAvailable = this.limits.weeklyLimit - this.limits.weeklyUsed;

    return {
        canTransact: amountUSD <= dailyAvailable && amountUSD <= weeklyAvailable,
        dailyAvailable,
        weeklyAvailable,
        requested: amountUSD
    };
};

// Método: Obter dados públicos (sem informações sensíveis)
userSchema.methods.toPublicJSON = function () {
    return {
        id: this._id,
        firstName: this.firstName,
        lastName: this.lastName,
        fullName: this.fullName,
        avatar: this.avatar,
        email: this.email,
        phone: this.phone,
        emailVerified: this.emailVerified,
        phoneVerified: this.phoneVerified,
        kycStatus: this.kycStatus,
        paypalLinked: !!this.paypalAccount?.verified,
        mpesaLinked: !!this.mpesaAccount?.verified,
        limits: {
            dailyUsed: this.limits.dailyUsed,
            weeklyUsed: this.limits.weeklyUsed,
            dailyLimit: this.limits.dailyLimit,
            weeklyLimit: this.limits.weeklyLimit
        },
        preferences: this.preferences,
        role: this.role,
        createdAt: this.createdAt
    };
};

module.exports = mongoose.model('User', userSchema);

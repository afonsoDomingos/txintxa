/**
 * Modelo de Log de Auditoria
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    // Usuário que realizou a ação
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // Tipo de ação
    action: {
        type: String,
        required: true,
        enum: [
            // Autenticação
            'auth.register',
            'auth.login',
            'auth.logout',
            'auth.password_reset_request',
            'auth.password_reset_complete',
            'auth.email_verification',
            'auth.phone_verification',
            'auth.otp_verification',
            'auth.failed_login',

            // Usuário
            'user.profile_update',
            'user.kyc_submit',
            'user.kyc_approved',
            'user.kyc_rejected',
            'user.account_link_paypal',
            'user.account_link_mpesa',

            // Transações
            'transaction.initiated',
            'transaction.otp_verified',
            'transaction.processing',
            'transaction.completed',
            'transaction.failed',
            'transaction.cancelled',
            'transaction.reversed',

            // Admin
            'admin.user_suspended',
            'admin.user_activated',
            'admin.rate_updated',
            'admin.settings_changed',

            // Sistema
            'system.api_error',
            'system.external_api_call',
            'security.suspicious_activity'
        ],
        index: true
    },

    // Recurso afetado
    resource: {
        type: { type: String },
        id: mongoose.Schema.Types.ObjectId
    },

    // Detalhes
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // Resultado
    success: {
        type: Boolean,
        default: true
    },
    errorMessage: String,

    // Metadados de request
    request: {
        ip: String,
        userAgent: String,
        path: String,
        method: String,
        country: String
    },

    // Timestamp
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: false // Usamos nosso próprio timestamp
});

// Índices para consultas eficientes
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ 'request.ip': 1, timestamp: -1 });

// TTL: Manter logs por 1 ano
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Static: Criar log de forma simplificada
auditLogSchema.statics.log = async function (action, options = {}) {
    const {
        user,
        resource,
        details,
        success = true,
        errorMessage,
        request
    } = options;

    return this.create({
        user,
        action,
        resource,
        details,
        success,
        errorMessage,
        request: {
            ip: request?.ip,
            userAgent: request?.headers?.['user-agent'],
            path: request?.path,
            method: request?.method
        },
        timestamp: new Date()
    });
};

// Static: Buscar logs do usuário
auditLogSchema.statics.findByUser = async function (userId, options = {}) {
    const { page = 1, limit = 50, action } = options;

    const query = { user: userId };
    if (action) query.action = new RegExp(action, 'i');

    return this.find(query)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
};

// Static: Detectar atividade suspeita
auditLogSchema.statics.checkSuspiciousActivity = async function (userId, ip) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [failedLogins, differentIPs] = await Promise.all([
        // Contagem de logins falhos
        this.countDocuments({
            action: 'auth.failed_login',
            $or: [{ user: userId }, { 'request.ip': ip }],
            timestamp: { $gte: oneHourAgo }
        }),
        // IPs diferentes para o mesmo usuário
        this.distinct('request.ip', {
            user: userId,
            timestamp: { $gte: oneHourAgo }
        })
    ]);

    return {
        isSuspicious: failedLogins >= 5 || differentIPs.length >= 3,
        failedLogins,
        uniqueIPs: differentIPs.length
    };
};

module.exports = mongoose.model('AuditLog', auditLogSchema);

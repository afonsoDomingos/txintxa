/**
 * Middleware de Autenticação JWT
 */

const jwt = require('jsonwebtoken');
const { User, AuditLog } = require('../models');
const logger = require('../utils/logger');

/**
 * Verifica e valida o token JWT
 */
const authenticate = async (req, res, next) => {
    try {
        // Extrair token do header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token de autenticação não fornecido'
            });
        }

        const token = authHeader.split(' ')[1];

        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Buscar usuário
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Verificar se usuário está ativo
        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Conta suspensa ou bloqueada. Contate o suporte.'
            });
        }

        // Adicionar usuário ao request
        req.user = user;
        req.userId = user._id;

        next();
    } catch (error) {
        logger.error('Erro de autenticação:', error);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token inválido'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expirado. Faça login novamente.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Erro de autenticação'
        });
    }
};

/**
 * Verifica se é admin
 */
const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Não autenticado'
        });
    }

    if (!['admin', 'superadmin'].includes(req.user.role)) {
        // Logar tentativa de acesso não autorizado
        AuditLog.log('security.suspicious_activity', {
            user: req.user._id,
            details: { attempted: 'admin_access' },
            request: req
        });

        return res.status(403).json({
            success: false,
            message: 'Acesso não autorizado'
        });
    }

    next();
};

/**
 * Verifica se email está verificado
 */
const requireEmailVerified = (req, res, next) => {
    if (!req.user.emailVerified) {
        return res.status(403).json({
            success: false,
            message: 'Email não verificado. Verifique seu email para continuar.'
        });
    }
    next();
};

/**
 * Verifica se telefone está verificado
 */
const requirePhoneVerified = (req, res, next) => {
    if (!req.user.phoneVerified) {
        return res.status(403).json({
            success: false,
            message: 'Telefone não verificado. Verifique seu telefone para continuar.'
        });
    }
    next();
};

/**
 * Verifica se KYC está aprovado
 */
const requireKYC = (req, res, next) => {
    if (req.user.kycStatus !== 'approved') {
        return res.status(403).json({
            success: false,
            message: 'Verificação KYC necessária para realizar transações.',
            kycStatus: req.user.kycStatus
        });
    }
    next();
};

/**
 * Verifica se as contas estão vinculadas
 */
const requireLinkedAccounts = (req, res, next) => {
    const { type } = req.body;

    if (type === 'paypal_to_mpesa') {
        if (!req.user.paypalAccount?.verified) {
            return res.status(403).json({
                success: false,
                message: 'Vincule sua conta PayPal para continuar.'
            });
        }
        if (!req.user.mpesaAccount?.verified) {
            return res.status(403).json({
                success: false,
                message: 'Vincule sua conta M-Pesa para continuar.'
            });
        }
    } else if (type === 'mpesa_to_paypal') {
        if (!req.user.mpesaAccount?.verified) {
            return res.status(403).json({
                success: false,
                message: 'Vincule sua conta M-Pesa para continuar.'
            });
        }
        if (!req.user.paypalAccount?.verified) {
            return res.status(403).json({
                success: false,
                message: 'Vincule sua conta PayPal para continuar.'
            });
        }
    }

    next();
};

/**
 * Gerar token JWT
 */
const generateToken = (userId, expiresIn = process.env.JWT_EXPIRES_IN || '7d') => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn }
    );
};

module.exports = {
    authenticate,
    isAdmin,
    requireEmailVerified,
    requirePhoneVerified,
    requireKYC,
    requireLinkedAccounts,
    generateToken
};

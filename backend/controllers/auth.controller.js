/**
 * Controller de Autenticação
 */

const { User, AuditLog } = require('../models');
const { generateToken } = require('../middleware');
const { notificationService } = require('../services');
const { normalizePhone } = require('../utils/validators');
const { encrypt, generateOTP, generateToken: genToken } = require('../utils/encryption');
const logger = require('../utils/logger');

/**
 * Registrar novo usuário
 */
const register = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, password } = req.body;

        // Verificar se email já existe
        const existingUser = await User.findOne({
            $or: [
                { email: email.toLowerCase() },
                { phone: normalizePhone(phone) }
            ]
        });

        if (existingUser) {
            if (existingUser.email === email.toLowerCase()) {
                return res.status(400).json({
                    success: false,
                    message: 'Este email já está registrado'
                });
            }
            return res.status(400).json({
                success: false,
                message: 'Este número de telefone já está registrado'
            });
        }

        // Gerar token de verificação de email
        const emailVerificationToken = genToken(32);

        // Criar usuário
        const user = new User({
            firstName,
            lastName,
            email: email.toLowerCase(),
            phone: normalizePhone(phone),
            password,
            emailVerificationToken,
            emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 horas
            // Em desenvolvimento, auto-verificar email
            emailVerified: process.env.NODE_ENV === 'development'
        });

        await user.save();

        // Enviar email de verificação
        await notificationService.sendVerificationEmail(
            user.email,
            user.firstName,
            emailVerificationToken
        );

        // Log de auditoria
        await AuditLog.log('auth.register', {
            user: user._id,
            details: { email: user.email },
            request: req
        });

        // Gerar JWT
        const token = generateToken(user._id);

        logger.info('Novo usuário registrado:', { userId: user._id, email: user.email });

        res.status(201).json({
            success: true,
            message: 'Registro realizado com sucesso. Verifique seu email.',
            data: {
                user: user.toPublicJSON(),
                token
            }
        });
    } catch (error) {
        logger.error('Erro no registro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao realizar registro'
        });
    }
};

/**
 * Login de usuário
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar usuário com senha
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Email ou senha incorretos'
            });
        }

        // Verificar se conta está bloqueada
        if (user.isLocked()) {
            await AuditLog.log('auth.failed_login', {
                user: user._id,
                details: { reason: 'account_locked' },
                success: false,
                request: req
            });

            return res.status(403).json({
                success: false,
                message: 'Conta temporariamente bloqueada. Tente novamente mais tarde.'
            });
        }

        // Verificar senha
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            await user.incLoginAttempts();

            await AuditLog.log('auth.failed_login', {
                user: user._id,
                details: { reason: 'wrong_password' },
                success: false,
                request: req
            });

            return res.status(401).json({
                success: false,
                message: 'Email ou senha incorretos'
            });
        }

        // Verificar status da conta
        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Conta suspensa ou bloqueada. Contate o suporte.'
            });
        }

        // Resetar tentativas de login e atualizar último login
        user.loginAttempts = 0;
        user.lockUntil = undefined;
        user.lastLogin = new Date();
        user.lastLoginIP = req.ip;
        await user.save();

        // Log de auditoria
        await AuditLog.log('auth.login', {
            user: user._id,
            request: req
        });

        // Gerar JWT
        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Login realizado com sucesso',
            data: {
                user: user.toPublicJSON(),
                token
            }
        });
    } catch (error) {
        logger.error('Erro no login:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao realizar login'
        });
    }
};

/**
 * Verificar email
 */
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.body;

        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Token inválido ou expirado'
            });
        }

        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        await AuditLog.log('auth.email_verification', {
            user: user._id,
            request: req
        });

        res.json({
            success: true,
            message: 'Email verificado com sucesso'
        });
    } catch (error) {
        logger.error('Erro na verificação de email:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao verificar email'
        });
    }
};

/**
 * Reenviar email de verificação
 */
const resendVerificationEmail = async (req, res) => {
    try {
        const user = req.user;

        if (user.emailVerified) {
            return res.status(400).json({
                success: false,
                message: 'Email já verificado'
            });
        }

        // Gerar novo token
        const emailVerificationToken = genToken(32);
        user.emailVerificationToken = emailVerificationToken;
        user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
        await user.save();

        // Enviar email
        await notificationService.sendVerificationEmail(
            user.email,
            user.firstName,
            emailVerificationToken
        );

        res.json({
            success: true,
            message: 'Email de verificação reenviado'
        });
    } catch (error) {
        logger.error('Erro ao reenviar email:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao reenviar email'
        });
    }
};

/**
 * Enviar OTP para verificação de telefone
 */
const sendPhoneOTP = async (req, res) => {
    try {
        const user = req.user;

        if (user.phoneVerified) {
            return res.status(400).json({
                success: false,
                message: 'Telefone já verificado'
            });
        }

        // Gerar OTP
        const otp = generateOTP();
        user.phoneVerificationCode = encrypt(otp);
        user.phoneVerificationExpires = Date.now() + 5 * 60 * 1000; // 5 minutos
        await user.save();

        // Enviar SMS
        await notificationService.sendOTP(user.phone, otp);

        res.json({
            success: true,
            message: 'Código OTP enviado para seu telefone'
        });
    } catch (error) {
        logger.error('Erro ao enviar OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao enviar código'
        });
    }
};

/**
 * Verificar telefone com OTP
 */
const verifyPhone = async (req, res) => {
    try {
        const { otp } = req.body;
        const user = req.user;

        if (user.phoneVerified) {
            return res.status(400).json({
                success: false,
                message: 'Telefone já verificado'
            });
        }

        if (!user.phoneVerificationCode || user.phoneVerificationExpires < Date.now()) {
            return res.status(400).json({
                success: false,
                message: 'Código expirado. Solicite um novo.'
            });
        }

        // Verificar OTP (simplificado - em produção usar decrypt)
        const isValid = encrypt(otp) === user.phoneVerificationCode;

        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Código inválido'
            });
        }

        user.phoneVerified = true;
        user.phoneVerificationCode = undefined;
        user.phoneVerificationExpires = undefined;
        await user.save();

        await AuditLog.log('auth.phone_verification', {
            user: user._id,
            request: req
        });

        res.json({
            success: true,
            message: 'Telefone verificado com sucesso'
        });
    } catch (error) {
        logger.error('Erro na verificação de telefone:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao verificar telefone'
        });
    }
};

/**
 * Solicitar reset de senha
 */
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email: email.toLowerCase() });

        // Sempre retornar sucesso para não revelar se email existe
        if (!user) {
            return res.json({
                success: true,
                message: 'Se o email existir, você receberá instruções para redefinir sua senha'
            });
        }

        // Gerar token de reset
        const resetToken = genToken(32);
        user.passwordResetToken = resetToken;
        user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hora
        await user.save();

        // Enviar email
        await notificationService.sendPasswordResetEmail(
            user.email,
            user.firstName,
            resetToken
        );

        await AuditLog.log('auth.password_reset_request', {
            user: user._id,
            request: req
        });

        res.json({
            success: true,
            message: 'Se o email existir, você receberá instruções para redefinir sua senha'
        });
    } catch (error) {
        logger.error('Erro no forgot password:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao processar solicitação'
        });
    }
};

/**
 * Resetar senha
 */
const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        const user = await User.findOne({
            passwordResetToken: token,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Token inválido ou expirado'
            });
        }

        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        user.loginAttempts = 0;
        user.lockUntil = undefined;
        await user.save();

        await AuditLog.log('auth.password_reset_complete', {
            user: user._id,
            request: req
        });

        res.json({
            success: true,
            message: 'Senha redefinida com sucesso'
        });
    } catch (error) {
        logger.error('Erro no reset password:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao redefinir senha'
        });
    }
};

/**
 * Obter usuário atual
 */
const getMe = async (req, res) => {
    res.json({
        success: true,
        data: req.user.toPublicJSON()
    });
};

/**
 * Logout (invalidar token - opcional se usar blacklist)
 */
const logout = async (req, res) => {
    await AuditLog.log('auth.logout', {
        user: req.user._id,
        request: req
    });

    res.json({
        success: true,
        message: 'Logout realizado com sucesso'
    });
};

module.exports = {
    register,
    login,
    verifyEmail,
    resendVerificationEmail,
    sendPhoneOTP,
    verifyPhone,
    forgotPassword,
    resetPassword,
    getMe,
    logout
};

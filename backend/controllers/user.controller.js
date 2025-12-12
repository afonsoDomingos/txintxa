/**
 * Controller de Usuário
 */

const { User, AuditLog } = require('../models');
const { paypalService, mpesaService, notificationService } = require('../services');
const { normalizePhone } = require('../utils/validators');
const logger = require('../utils/logger');
const cloudinary = require('cloudinary').v2;

// Configurar Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
}

/**
 * Obter perfil do usuário
 */
const getProfile = async (req, res) => {
    res.json({
        success: true,
        data: req.user.toPublicJSON()
    });
};

/**
 * Atualizar perfil
 */
const updateProfile = async (req, res) => {
    try {
        const allowedUpdates = ['firstName', 'lastName', 'phone', 'email', 'preferences'];
        const updates = {};

        // Campos normais
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        // Upload de Avatar para Cloudinary
        if (req.body.avatar && req.body.avatar.startsWith('data:image')) {
            if (!process.env.CLOUDINARY_CLOUD_NAME) {
                logger.warn('Tentativa de upload de avatar sem credenciais do Cloudinary configuradas');
                // Opcional: Retornar erro ou apenas ignorar o avatar
            } else {
                try {
                    const result = await cloudinary.uploader.upload(req.body.avatar, {
                        folder: 'txintxa_avatars',
                        public_id: `user_${req.user._id}`,
                        overwrite: true,
                        transformation: [{ width: 500, height: 500, crop: "limit" }]
                    });
                    updates.avatar = result.secure_url;
                } catch (uploadError) {
                    logger.error('Erro no upload para Cloudinary:', uploadError);
                    return res.status(500).json({
                        success: false,
                        message: 'Erro ao processar imagem de perfil'
                    });
                }
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum campo para atualizar'
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        await AuditLog.log('user.profile_update', {
            user: user._id,
            details: { updatedFields: Object.keys(updates) },
            request: req
        });

        res.json({
            success: true,
            message: 'Perfil atualizado',
            data: user.toPublicJSON()
        });
    } catch (error) {
        logger.error('Erro ao atualizar perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar perfil'
        });
    }
};

/**
 * Submeter KYC
 */
const submitKYC = async (req, res) => {
    try {
        const user = req.user;

        if (user.kycStatus === 'approved') {
            return res.status(400).json({
                success: false,
                message: 'KYC já aprovado'
            });
        }

        if (user.kycStatus === 'submitted') {
            return res.status(400).json({
                success: false,
                message: 'KYC já submetido e aguardando revisão'
            });
        }

        const {
            documentType,
            documentNumber,
            dateOfBirth,
            address
        } = req.body;

        user.kycData = {
            documentType,
            documentNumber,
            dateOfBirth: new Date(dateOfBirth),
            address,
            submittedAt: new Date()
        };
        user.kycStatus = 'submitted';
        await user.save();

        await AuditLog.log('user.kyc_submit', {
            user: user._id,
            details: { documentType },
            request: req
        });

        res.json({
            success: true,
            message: 'KYC submetido com sucesso. Revisão em até 24 horas.',
            data: {
                kycStatus: user.kycStatus,
                submittedAt: user.kycData.submittedAt
            }
        });
    } catch (error) {
        logger.error('Erro ao submeter KYC:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao submeter KYC'
        });
    }
};

/**
 * Vincular conta PayPal
 */
const linkPayPal = async (req, res) => {
    try {
        const { email, authorizationCode } = req.body;
        const user = req.user;

        if (user.paypalAccount?.verified) {
            return res.status(400).json({
                success: false,
                message: 'Conta PayPal já vinculada'
            });
        }

        let paypalData;

        if (authorizationCode) {
            // Usar OAuth para verificar identidade
            try {
                paypalData = await paypalService.verifyUserIdentity(authorizationCode);
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Não foi possível verificar conta PayPal'
                });
            }
        } else if (email) {
            // Vinculação simples por email (menos seguro, para demo)
            paypalData = {
                email: email.toLowerCase(),
                verified: process.env.NODE_ENV === 'development' // Auto-verificar em dev
            };
        } else {
            return res.status(400).json({
                success: false,
                message: 'Email ou código de autorização obrigatório'
            });
        }

        user.paypalAccount = {
            email: paypalData.email,
            accountId: paypalData.accountId,
            verified: paypalData.verified || process.env.NODE_ENV === 'development',
            linkedAt: new Date()
        };
        await user.save();

        await AuditLog.log('user.account_link_paypal', {
            user: user._id,
            details: { email: paypalData.email },
            request: req
        });

        res.json({
            success: true,
            message: user.paypalAccount.verified
                ? 'Conta PayPal vinculada com sucesso'
                : 'Conta PayPal vinculada. Verificação pendente.',
            data: {
                email: user.paypalAccount.email,
                verified: user.paypalAccount.verified
            }
        });
    } catch (error) {
        logger.error('Erro ao vincular PayPal:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao vincular conta PayPal'
        });
    }
};

/**
 * Vincular conta M-Pesa
 */
const linkMPesa = async (req, res) => {
    try {
        const { phone } = req.body;
        const user = req.user;

        if (user.mpesaAccount?.verified) {
            return res.status(400).json({
                success: false,
                message: 'Conta M-Pesa já vinculada'
            });
        }

        const normalizedPhone = normalizePhone(phone);

        // Em produção, enviar OTP para verificar
        // Aqui, auto-verificamos em desenvolvimento
        user.mpesaAccount = {
            phone: normalizedPhone,
            verified: process.env.NODE_ENV === 'development',
            linkedAt: new Date()
        };
        await user.save();

        await AuditLog.log('user.account_link_mpesa', {
            user: user._id,
            details: { phone: normalizedPhone.slice(-4) },
            request: req
        });

        // Em produção, enviar OTP
        if (process.env.NODE_ENV !== 'development') {
            // await notificationService.sendOTP(normalizedPhone, otp);
        }

        res.json({
            success: true,
            message: user.mpesaAccount.verified
                ? 'Conta M-Pesa vinculada com sucesso'
                : 'Conta M-Pesa vinculada. Verifique com OTP.',
            data: {
                phone: normalizedPhone,
                verified: user.mpesaAccount.verified
            }
        });
    } catch (error) {
        logger.error('Erro ao vincular M-Pesa:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao vincular conta M-Pesa'
        });
    }
};

/**
 * Desvincular conta PayPal
 */
const unlinkPayPal = async (req, res) => {
    try {
        const user = req.user;

        if (!user.paypalAccount?.email) {
            return res.status(400).json({
                success: false,
                message: 'Nenhuma conta PayPal vinculada'
            });
        }

        user.paypalAccount = undefined;
        await user.save();

        res.json({
            success: true,
            message: 'Conta PayPal desvinculada'
        });
    } catch (error) {
        logger.error('Erro ao desvincular PayPal:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao desvincular conta'
        });
    }
};

/**
 * Desvincular conta M-Pesa
 */
const unlinkMPesa = async (req, res) => {
    try {
        const user = req.user;

        if (!user.mpesaAccount?.phone) {
            return res.status(400).json({
                success: false,
                message: 'Nenhuma conta M-Pesa vinculada'
            });
        }

        user.mpesaAccount = undefined;
        await user.save();

        res.json({
            success: true,
            message: 'Conta M-Pesa desvinculada'
        });
    } catch (error) {
        logger.error('Erro ao desvincular M-Pesa:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao desvincular conta'
        });
    }
};

/**
 * Obter limites do usuário
 */
const getLimits = async (req, res) => {
    const user = req.user;

    // Resetar limites se necessário
    await user.resetDailyLimits();

    res.json({
        success: true,
        data: {
            daily: {
                used: user.limits.dailyUsed,
                limit: user.limits.dailyLimit,
                available: user.limits.dailyLimit - user.limits.dailyUsed
            },
            weekly: {
                used: user.limits.weeklyUsed,
                limit: user.limits.weeklyLimit,
                available: user.limits.weeklyLimit - user.limits.weeklyUsed
            },
            currency: 'USD'
        }
    });
};

/**
 * Obter saldos das contas vinculadas
 */
const getBalances = async (req, res) => {
    try {
        const user = req.user;
        const balances = {};

        // Saldo PayPal (se vinculado)
        if (user.paypalAccount?.verified) {
            try {
                const paypalBalance = await paypalService.getBalance();
                balances.paypal = {
                    available: paypalBalance.balances?.[0]?.total_balance?.value || '0.00',
                    currency: 'USD'
                };
            } catch (error) {
                balances.paypal = {
                    available: 'Indisponível',
                    error: true
                };
            }
        }

        // Saldo M-Pesa (não disponível via API padrão)
        if (user.mpesaAccount?.verified) {
            balances.mpesa = {
                available: 'Consulte no app M-Pesa',
                currency: 'MZN',
                note: 'O saldo M-Pesa não pode ser consultado via API'
            };
        }

        res.json({
            success: true,
            data: balances
        });
    } catch (error) {
        logger.error('Erro ao obter saldos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter saldos'
        });
    }
};

/**
 * Alterar senha
 */
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user._id).select('+password');

        const isMatch = await user.comparePassword(currentPassword);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Senha atual incorreta'
            });
        }

        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Senha alterada com sucesso'
        });
    } catch (error) {
        logger.error('Erro ao alterar senha:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao alterar senha'
        });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    submitKYC,
    linkPayPal,
    linkMPesa,
    unlinkPayPal,
    unlinkMPesa,
    getLimits,
    getBalances,
    changePassword
};

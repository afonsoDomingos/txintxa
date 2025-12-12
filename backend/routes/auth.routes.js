/**
 * Rotas de Autenticação
 */

const express = require('express');
const router = express.Router();
const { authController } = require('../controllers');
const {
    authenticate,
    validate,
    registerRules,
    loginRules,
    verifyEmailRules,
    verifyOTPRules
} = require('../middleware');

// Registro
router.post('/register', registerRules, validate, authController.register);

// Login
router.post('/login', loginRules, validate, authController.login);

// Logout
router.post('/logout', authenticate, authController.logout);

// Verificar email
router.post('/verify-email', verifyEmailRules, validate, authController.verifyEmail);

// Reenviar email de verificação
router.post('/resend-verification', authenticate, authController.resendVerificationEmail);

// Enviar OTP para telefone
router.post('/send-phone-otp', authenticate, authController.sendPhoneOTP);

// Verificar telefone com OTP
router.post('/verify-phone', authenticate, verifyOTPRules, validate, authController.verifyPhone);

// Esqueci senha
router.post('/forgot-password', authController.forgotPassword);

// Resetar senha
router.post('/reset-password', authController.resetPassword);

// Obter usuário atual
router.get('/me', authenticate, authController.getMe);

// [DEV ONLY] Verificar email automaticamente
if (process.env.NODE_ENV === 'development') {
    const { User } = require('../models');
    router.post('/dev-verify-email', async (req, res) => {
        try {
            const { email } = req.body;
            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) {
                return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
            }
            user.emailVerified = true;
            await user.save();
            res.json({ success: true, message: 'Email verificado (DEV)' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    });
}

module.exports = router;

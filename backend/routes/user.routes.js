/**
 * Rotas de Usuário
 */

const express = require('express');
const router = express.Router();
const { userController } = require('../controllers');
const {
    authenticate,
    validate,
    kycSubmitRules,
    linkPayPalRules,
    linkMPesaRules
} = require('../middleware');

// Todas as rotas requerem autenticação
router.use(authenticate);

// Perfil
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

// Senha
router.post('/change-password', userController.changePassword);

// KYC
router.post('/kyc', kycSubmitRules, validate, userController.submitKYC);

// Vinculação de contas
router.post('/link/paypal', linkPayPalRules, validate, userController.linkPayPal);
router.post('/link/mpesa', linkMPesaRules, validate, userController.linkMPesa);
router.delete('/unlink/paypal', userController.unlinkPayPal);
router.delete('/unlink/mpesa', userController.unlinkMPesa);

// Limites
router.get('/limits', userController.getLimits);

// Saldos
router.get('/balances', userController.getBalances);

module.exports = router;

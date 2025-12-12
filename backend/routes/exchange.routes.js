/**
 * Rotas de Câmbio (Exchange)
 */

const express = require('express');
const router = express.Router();
const { exchangeController } = require('../controllers');
const {
    authenticate,
    requireEmailVerified,
    validate,
    exchangeQuoteRules,
    verifyOTPRules
} = require('../middleware');

// Taxa de câmbio (público)
router.get('/rates', exchangeController.getRates);

// Rotas protegidas
router.use(authenticate);

// Cotação
router.post('/quote', exchangeQuoteRules, validate, exchangeController.getQuote);

// Iniciar transação (gera OTP)
router.post('/initiate',
    requireEmailVerified,
    exchangeQuoteRules,
    validate,
    exchangeController.initiateExchange
);

// Confirmar transação com OTP
router.post('/confirm',
    verifyOTPRules,
    validate,
    exchangeController.confirmExchange
);

// Status de transação específica
router.get('/status/:transactionId', exchangeController.getTransactionStatus);

// Cancelar transação pendente
router.post('/cancel/:transactionId', exchangeController.cancelExchange);

module.exports = router;

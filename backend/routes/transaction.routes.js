/**
 * Rotas de Transações
 */

const express = require('express');
const router = express.Router();
const { transactionController } = require('../controllers');
const { authenticate, validate, paginationRules } = require('../middleware');

// Todas as rotas requerem autenticação
router.use(authenticate);

// Listar transações
router.get('/', paginationRules, validate, transactionController.getTransactions);

// Estatísticas
router.get('/stats', transactionController.getStats);

// Exportar
router.get('/export', transactionController.exportTransactions);

// Detalhes de transação
router.get('/:id', transactionController.getTransactionById);

module.exports = router;

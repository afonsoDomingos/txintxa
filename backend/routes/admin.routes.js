const express = require('express');
const router = express.Router();
const { getDashboard } = require('../controllers/admin.controller');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');

// Todas as rotas admin requerem autenticação + verificação de admin
router.use(authenticate);
router.use(isAdmin);

router.get('/dashboard', getDashboard);

module.exports = router;

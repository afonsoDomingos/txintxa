const express = require('express');
const router = express.Router();
const { chat } = require('../controllers/assistant.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Rota protegida (apenas usuários logados podem conversar, ou pública se preferir)
router.post('/chat', authenticate, chat);

module.exports = router;

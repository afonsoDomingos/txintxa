/**
 * TXINTXA - Servidor Principal
 * Plataforma de câmbio PayPal ↔ M-Pesa
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const { connectDB, disconnectDB } = require('./config/database');

// Importar rotas
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const userRoutes = require('./routes/user.routes');
const exchangeRoutes = require('./routes/exchange.routes');
const transactionRoutes = require('./routes/transaction.routes');
const webhookRoutes = require('./routes/webhook.routes');
const assistantRoutes = require('./routes/assistant.routes');

// Inicializar app
const app = express();

// ===========================================
// MIDDLEWARE DE SEGURANÇA
// ===========================================

// Helmet - Headers de segurança
app.use(helmet());

// CORS
app.use(cors({
    origin: [process.env.FRONTEND_URL || 'https://txintxa.vercel.app', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    message: {
        success: false,
        message: 'Demasiadas requisições. Tente novamente mais tarde.'
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// Rate limiting mais restrito para autenticação
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        message: 'Demasiadas tentativas de login. Tente novamente em 15 minutos.'
    }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ===========================================
// MIDDLEWARE DE PARSING
// ===========================================

// Para webhooks (raw body necessário)
app.use('/api/webhooks', express.raw({ type: 'application/json' }));

// JSON Parser
app.use(express.json({ limit: '50mb' }));

// URL Encoded
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ===========================================
// MIDDLEWARE DE LOGGING
// ===========================================

app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    next();
});

// ===========================================
// ROTAS
// ===========================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Txintxa API está funcionando!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/exchange', exchangeRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/admin', adminRoutes);

// ===========================================
// TRATAMENTO DE ERROS
// ===========================================

// Rota não encontrada
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint não encontrado'
    });
});

// Handler de erros global
app.use((err, req, res, next) => {
    logger.error('Erro não tratado:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    // Erros de validação do Mongoose
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            message: 'Erro de validação',
            errors
        });
    }

    // Erro de JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Token inválido'
        });
    }

    // Erro de JWT expirado
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expirado'
        });
    }

    // Erro genérico
    res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'development'
            ? err.message
            : 'Erro interno do servidor'
    });
});

// ===========================================
// CONEXÃO COM MONGODB E INÍCIO DO SERVIDOR
// ===========================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Conectar ao MongoDB (com fallback para memory server)
        await connectDB();

        // Iniciar servidor
        app.listen(PORT, () => {
            logger.info(`🚀 Servidor Txintxa rodando na porta ${PORT}`);
            logger.info(`📌 Ambiente: ${process.env.NODE_ENV}`);
            logger.info(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
        });

    } catch (error) {
        logger.error('❌ Erro ao iniciar servidor:', error);
        process.exit(1);
    }
};

// Handlers de shutdown graceful
process.on('SIGTERM', async () => {
    logger.info('SIGTERM recebido. Fechando servidor...');
    await mongoose.connection.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT recebido. Fechando servidor...');
    await mongoose.connection.close();
    process.exit(0);
});

// Iniciar
startServer();

module.exports = app;

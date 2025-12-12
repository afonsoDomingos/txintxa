/**
 * Configuração do MongoDB com suporte a Memory Server
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

let mongoServer;

const connectDB = async () => {
    try {
        let mongoUri = process.env.MONGODB_URI;

        // Em desenvolvimento sem MongoDB instalado, usar memory server
        if (process.env.NODE_ENV === 'development' && process.env.USE_MEMORY_DB !== 'false') {
            try {
                const { MongoMemoryServer } = require('mongodb-memory-server');
                mongoServer = await MongoMemoryServer.create();
                mongoUri = mongoServer.getUri();
                logger.info('✅ Usando MongoDB em memória (desenvolvimento)');
            } catch (error) {
                logger.info('Tentando conectar ao MongoDB local...');
            }
        }

        const conn = await mongoose.connect(mongoUri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        });

        logger.info(`✅ MongoDB conectado: ${conn.connection.host}`);

        // Event listeners
        mongoose.connection.on('error', (err) => {
            logger.error('Erro na conexão MongoDB:', err);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB desconectado');
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('MongoDB reconectado');
        });

        return conn;
    } catch (error) {
        logger.error('Erro ao conectar ao MongoDB:', error);

        // Tentar usar memory server como fallback
        if (!mongoServer) {
            try {
                logger.info('Tentando iniciar MongoDB em memória...');
                const { MongoMemoryServer } = require('mongodb-memory-server');
                mongoServer = await MongoMemoryServer.create();
                const mongoUri = mongoServer.getUri();

                const conn = await mongoose.connect(mongoUri, {
                    maxPoolSize: 10,
                    serverSelectionTimeoutMS: 5000,
                    socketTimeoutMS: 45000
                });

                logger.info(`✅ MongoDB em memória conectado: ${conn.connection.host}`);
                return conn;
            } catch (memError) {
                logger.error('Erro ao iniciar MongoDB em memória:', memError);
                process.exit(1);
            }
        }

        process.exit(1);
    }
};

const disconnectDB = async () => {
    await mongoose.connection.close();
    if (mongoServer) {
        await mongoServer.stop();
    }
};

module.exports = { connectDB, disconnectDB };

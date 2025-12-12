/**
 * Logger com Winston
 */

const winston = require('winston');
const path = require('path');

// Formato personalizado
const customFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
        let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

        if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
        }

        if (stack) {
            log += `\n${stack}`;
        }

        return log;
    })
);

// Configuração de transports
const transports = [
    // Console
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            customFormat
        )
    })
];

// Adicionar arquivos de log em produção
if (process.env.NODE_ENV === 'production') {
    transports.push(
        // Logs de erro
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // Logs combinados
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/combined.log'),
            maxsize: 5242880,
            maxFiles: 5
        })
    );
}

// Criar logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: customFormat,
    transports,
    exitOnError: false
});

module.exports = logger;

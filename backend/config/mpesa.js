/**
 * Configuração da API M-Pesa Vodacom Moçambique
 */

const crypto = require('crypto');

// Gerar token de autenticação M-Pesa
const generateToken = () => {
    const apiKey = process.env.MPESA_API_KEY;
    const publicKey = process.env.MPESA_PUBLIC_KEY;

    // Criptografar API Key com a chave pública
    const buffer = Buffer.from(apiKey);
    const encrypted = crypto.publicEncrypt(
        {
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_PADDING
        },
        buffer
    );

    return encrypted.toString('base64');
};

// Configurações base
const config = {
    baseUrl: process.env.MPESA_BASE_URL || 'https://api.sandbox.vm.co.mz',
    serviceProviderCode: process.env.MPESA_SERVICE_PROVIDER_CODE,
    origin: process.env.MPESA_ORIGIN || 'developer.mpesa.vm.co.mz',

    // Endpoints
    endpoints: {
        c2b: '/ipg/v1x/c2bPayment/singleStage/',  // Customer to Business
        b2c: '/ipg/v1x/b2cPayment/',               // Business to Customer
        reversal: '/ipg/v1x/reversal/',            // Estorno
        queryTransaction: '/ipg/v1x/queryTransactionStatus/'
    },

    // Headers padrão
    getHeaders: () => ({
        'Content-Type': 'application/json',
        'Origin': config.origin,
        'Authorization': `Bearer ${generateToken()}`
    })
};

module.exports = {
    config,
    generateToken
};

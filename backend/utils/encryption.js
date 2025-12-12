/**
 * Utilitários de Criptografia
 */

const CryptoJS = require('crypto-js');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

/**
 * Criptografa dados sensíveis
 */
const encrypt = (data) => {
    if (!data) return null;
    const stringData = typeof data === 'object' ? JSON.stringify(data) : String(data);
    return CryptoJS.AES.encrypt(stringData, ENCRYPTION_KEY).toString();
};

/**
 * Descriptografa dados
 */
const decrypt = (encryptedData) => {
    if (!encryptedData) return null;
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);

        // Tentar parsear como JSON
        try {
            return JSON.parse(decrypted);
        } catch {
            return decrypted;
        }
    } catch (error) {
        console.error('Erro ao descriptografar:', error);
        return null;
    }
};

/**
 * Hash de dados (irreversível)
 */
const hash = (data) => {
    return CryptoJS.SHA256(data).toString();
};

/**
 * Gera um código OTP de 6 dígitos
 */
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Gera um token aleatório
 */
const generateToken = (length = 32) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

/**
 * Mascara dados sensíveis para logs
 */
const maskSensitiveData = (data, visibleChars = 4) => {
    if (!data) return null;
    const str = String(data);
    if (str.length <= visibleChars * 2) {
        return '*'.repeat(str.length);
    }
    return str.slice(0, visibleChars) + '*'.repeat(str.length - visibleChars * 2) + str.slice(-visibleChars);
};

module.exports = {
    encrypt,
    decrypt,
    hash,
    generateOTP,
    generateToken,
    maskSensitiveData
};

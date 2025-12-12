/**
 * Validadores personalizados
 */

/**
 * Valida número de telefone moçambicano
 * Formato: 84/85/86/87 + 7 dígitos
 */
const isValidMozambicanPhone = (phone) => {
    // Remove espaços e hífens
    const cleaned = phone.replace(/[\s-]/g, '');

    // Formatos aceitos: 84xxxxxxx, 258 84 xxx xxxx, +258 84 xxx xxxx
    const patterns = [
        /^8[4-7]\d{7}$/,           // 84xxxxxxx
        /^258\s?8[4-7]\d{7}$/,     // 258 84xxxxxxx
        /^\+258\s?8[4-7]\d{7}$/    // +258 84xxxxxxx
    ];

    return patterns.some(pattern => pattern.test(cleaned));
};

/**
 * Normaliza número de telefone para formato internacional
 */
const normalizePhone = (phone) => {
    let cleaned = phone.replace(/[\s-]/g, '');

    if (cleaned.startsWith('+258')) {
        return cleaned;
    }

    if (cleaned.startsWith('258')) {
        return '+' + cleaned;
    }

    if (cleaned.startsWith('8')) {
        return '+258' + cleaned;
    }

    return cleaned;
};

/**
 * Valida email
 */
const isValidEmail = (email) => {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
};

/**
 * Valida força da senha
 * Mínimo: 8 caracteres, 1 maiúscula, 1 minúscula, 1 número
 */
const isStrongPassword = (password) => {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);

    return {
        isValid: minLength && hasUpperCase && hasLowerCase && hasNumber,
        errors: {
            minLength: !minLength ? 'Mínimo 8 caracteres' : null,
            hasUpperCase: !hasUpperCase ? 'Pelo menos uma letra maiúscula' : null,
            hasLowerCase: !hasLowerCase ? 'Pelo menos uma letra minúscula' : null,
            hasNumber: !hasNumber ? 'Pelo menos um número' : null
        }
    };
};

/**
 * Valida valor monetário
 */
const isValidAmount = (amount, min = 1, max = 10000) => {
    const num = parseFloat(amount);
    return !isNaN(num) && num >= min && num <= max;
};

/**
 * Valida documento de identidade moçambicano (BI)
 */
const isValidBI = (bi) => {
    // BI: 12 dígitos numéricos + letra de controle
    const pattern = /^\d{12}[A-Z]$/;
    return pattern.test(bi.toUpperCase());
};

/**
 * Sanitiza input para prevenir XSS
 */
const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;

    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .trim();
};

module.exports = {
    isValidMozambicanPhone,
    normalizePhone,
    isValidEmail,
    isStrongPassword,
    isValidAmount,
    isValidBI,
    sanitizeInput
};

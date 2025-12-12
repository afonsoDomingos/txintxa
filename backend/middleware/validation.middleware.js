/**
 * Middleware de Validação de Requests
 */

const { validationResult, body, param, query } = require('express-validator');
const { isValidMozambicanPhone, isStrongPassword } = require('../utils/validators');

/**
 * Handler de erros de validação
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Erro de validação',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }

    next();
};

/**
 * Regras de validação para registro
 */
const registerRules = [
    body('firstName')
        .trim()
        .notEmpty().withMessage('Nome é obrigatório')
        .isLength({ min: 2, max: 50 }).withMessage('Nome deve ter entre 2 e 50 caracteres')
        .matches(/^[a-zA-ZÀ-ÿ\s]+$/).withMessage('Nome deve conter apenas letras'),

    body('lastName')
        .trim()
        .notEmpty().withMessage('Sobrenome é obrigatório')
        .isLength({ min: 2, max: 50 }).withMessage('Sobrenome deve ter entre 2 e 50 caracteres')
        .matches(/^[a-zA-ZÀ-ÿ\s]+$/).withMessage('Sobrenome deve conter apenas letras'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email é obrigatório')
        .isEmail().withMessage('Email inválido')
        .normalizeEmail(),

    body('phone')
        .trim()
        .notEmpty().withMessage('Telefone é obrigatório')
        .custom((value) => {
            if (!isValidMozambicanPhone(value)) {
                throw new Error('Número de telefone moçambicano inválido');
            }
            return true;
        }),

    body('password')
        .notEmpty().withMessage('Senha é obrigatória')
        .custom((value) => {
            const result = isStrongPassword(value);
            if (!result.isValid) {
                const errorMessages = Object.values(result.errors).filter(Boolean);
                throw new Error(errorMessages[0]);
            }
            return true;
        }),

    body('confirmPassword')
        .notEmpty().withMessage('Confirmação de senha é obrigatória')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Senhas não coincidem');
            }
            return true;
        }),

    body('acceptTerms')
        .notEmpty().withMessage('Aceite os termos de uso')
        .custom((value) => {
            if (value === true || value === 'true' || value === '1') {
                return true;
            }
            throw new Error('Você deve aceitar os termos de uso');
        })
];

/**
 * Regras de validação para login
 */
const loginRules = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email é obrigatório')
        .isEmail().withMessage('Email inválido'),

    body('password')
        .notEmpty().withMessage('Senha é obrigatória')
];

/**
 * Regras de validação para cotação de câmbio
 */
const exchangeQuoteRules = [
    body('type')
        .notEmpty().withMessage('Tipo de transação é obrigatório')
        .isIn(['paypal_to_mpesa', 'mpesa_to_paypal']).withMessage('Tipo de transação inválido'),

    body('amount')
        .notEmpty().withMessage('Valor é obrigatório')
        .isFloat({ min: 1 }).withMessage('Valor mínimo é 1')
        .isFloat({ max: 10000 }).withMessage('Valor máximo é 10.000')
];

/**
 * Regras de validação para executar transação
 */
const executeExchangeRules = [
    body('type')
        .notEmpty().withMessage('Tipo de transação é obrigatório')
        .isIn(['paypal_to_mpesa', 'mpesa_to_paypal']).withMessage('Tipo de transação inválido'),

    body('amount')
        .notEmpty().withMessage('Valor é obrigatório')
        .isFloat({ min: 1 }).withMessage('Valor mínimo é 1')
        .isFloat({ max: 10000 }).withMessage('Valor máximo é 10.000'),

    body('otp')
        .notEmpty().withMessage('Código OTP é obrigatório')
        .isLength({ min: 6, max: 6 }).withMessage('OTP deve ter 6 dígitos')
        .isNumeric().withMessage('OTP deve conter apenas números')
];

/**
 * Regras de validação para verificação de email
 */
const verifyEmailRules = [
    body('token')
        .notEmpty().withMessage('Token de verificação é obrigatório')
];

/**
 * Regras de validação para OTP
 */
const verifyOTPRules = [
    body('otp')
        .notEmpty().withMessage('Código OTP é obrigatório')
        .isLength({ min: 6, max: 6 }).withMessage('OTP deve ter 6 dígitos')
        .isNumeric().withMessage('OTP deve conter apenas números')
];

/**
 * Regras de validação para KYC
 */
const kycSubmitRules = [
    body('documentType')
        .notEmpty().withMessage('Tipo de documento é obrigatório')
        .isIn(['bi', 'passport', 'driving_license']).withMessage('Tipo de documento inválido'),

    body('documentNumber')
        .notEmpty().withMessage('Número do documento é obrigatório')
        .isLength({ min: 5, max: 20 }).withMessage('Número do documento inválido'),

    body('dateOfBirth')
        .notEmpty().withMessage('Data de nascimento é obrigatória')
        .isDate().withMessage('Data de nascimento inválida')
        .custom((value) => {
            const dob = new Date(value);
            const age = (new Date() - dob) / (365.25 * 24 * 60 * 60 * 1000);
            if (age < 18) {
                throw new Error('Você deve ter pelo menos 18 anos');
            }
            return true;
        }),

    body('address.city')
        .notEmpty().withMessage('Cidade é obrigatória'),

    body('address.province')
        .notEmpty().withMessage('Província é obrigatória')
];

/**
 * Regras de validação para vinculação PayPal
 */
const linkPayPalRules = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email do PayPal é obrigatório')
        .isEmail().withMessage('Email inválido')
];

/**
 * Regras de validação para vinculação M-Pesa
 */
const linkMPesaRules = [
    body('phone')
        .trim()
        .notEmpty().withMessage('Número M-Pesa é obrigatório')
        .custom((value) => {
            if (!isValidMozambicanPhone(value)) {
                throw new Error('Número de telefone moçambicano inválido');
            }
            return true;
        })
];

/**
 * Regras de validação para paginação
 */
const paginationRules = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limite deve estar entre 1 e 100')
];

module.exports = {
    validate,
    registerRules,
    loginRules,
    exchangeQuoteRules,
    executeExchangeRules,
    verifyEmailRules,
    verifyOTPRules,
    kycSubmitRules,
    linkPayPalRules,
    linkMPesaRules,
    paginationRules
};

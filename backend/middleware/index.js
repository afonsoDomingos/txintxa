/**
 * Índice de Middlewares
 */

const {
    authenticate,
    isAdmin,
    requireEmailVerified,
    requirePhoneVerified,
    requireKYC,
    requireLinkedAccounts,
    generateToken
} = require('./auth.middleware');

const {
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
} = require('./validation.middleware');

module.exports = {
    // Auth
    authenticate,
    isAdmin,
    requireEmailVerified,
    requirePhoneVerified,
    requireKYC,
    requireLinkedAccounts,
    generateToken,

    // Validation
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

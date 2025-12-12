/**
 * Configuração do PayPal
 */

const paypal = require('@paypal/checkout-server-sdk');

// Ambiente (sandbox ou live)
const environment = () => {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const mode = process.env.PAYPAL_MODE || 'sandbox';

    if (mode === 'live') {
        return new paypal.core.LiveEnvironment(clientId, clientSecret);
    }
    return new paypal.core.SandboxEnvironment(clientId, clientSecret);
};

// Cliente PayPal
const client = () => {
    return new paypal.core.PayPalHttpClient(environment());
};

// URLs da API
const getApiUrl = () => {
    const mode = process.env.PAYPAL_MODE || 'sandbox';
    return mode === 'live'
        ? process.env.PAYPAL_LIVE_URL
        : process.env.PAYPAL_SANDBOX_URL;
};

module.exports = {
    client,
    environment,
    getApiUrl,
    paypal
};

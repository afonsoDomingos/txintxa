/**
 * Índice de Serviços
 */

const paypalService = require('./paypal.service');
const mpesaService = require('./mpesa.service');
const exchangeRateService = require('./exchangeRate.service');
const notificationService = require('./notification.service');

module.exports = {
    paypalService,
    mpesaService,
    exchangeRateService,
    notificationService
};

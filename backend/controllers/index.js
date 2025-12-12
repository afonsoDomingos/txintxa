/**
 * Índice de Controllers
 */

const authController = require('./auth.controller');
const userController = require('./user.controller');
const exchangeController = require('./exchange.controller');
const transactionController = require('./transaction.controller');

module.exports = {
    authController,
    userController,
    exchangeController,
    transactionController
};

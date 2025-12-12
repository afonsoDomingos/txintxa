/**
 * Índice de Modelos
 */

const User = require('./User.model');
const Transaction = require('./Transaction.model');
const ExchangeRate = require('./ExchangeRate.model');
const AuditLog = require('./AuditLog.model');

module.exports = {
    User,
    Transaction,
    ExchangeRate,
    AuditLog
};

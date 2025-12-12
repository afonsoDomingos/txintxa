/**
 * Controller de Câmbio (Exchange)
 */

const { User, Transaction, AuditLog } = require('../models');
const { exchangeRateService, paypalService, mpesaService, notificationService } = require('../services');
const { generateOTP, encrypt } = require('../utils/encryption');
const logger = require('../utils/logger');

/**
 * Obter taxas de câmbio atuais
 */
const getRates = async (req, res) => {
    try {
        const rates = await exchangeRateService.getMultipleRates();

        res.json({
            success: true,
            data: {
                rates,
                timestamp: new Date(),
                disclaimer: 'Taxas são indicativas e podem variar no momento da transação.'
            }
        });
    } catch (error) {
        logger.error('Erro ao obter taxas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter taxas de câmbio'
        });
    }
};

/**
 * Obter cotação para transação
 */
const getQuote = async (req, res) => {
    try {
        const { type, amount } = req.body;

        // Obter cotação
        const quote = await exchangeRateService.getQuote(type, parseFloat(amount));

        // Verificar limites do usuário
        const user = req.user;
        await user.resetDailyLimits();

        const amountInUSD = type === 'paypal_to_mpesa'
            ? quote.sourceAmount
            : quote.destinationAmount;

        const limitCheck = user.checkLimit(amountInUSD);

        res.json({
            success: true,
            data: {
                ...quote,
                limits: {
                    canProceed: limitCheck.canTransact,
                    dailyAvailable: limitCheck.dailyAvailable,
                    weeklyAvailable: limitCheck.weeklyAvailable
                }
            }
        });
    } catch (error) {
        logger.error('Erro ao obter cotação:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao calcular cotação'
        });
    }
};

/**
 * Iniciar transação (gerar OTP)
 */
const initiateExchange = async (req, res) => {
    try {
        const { type, amount } = req.body;
        const user = req.user;

        // Em desenvolvimento, permitir sem contas vinculadas
        const isDev = process.env.NODE_ENV === 'development';

        // Verificar contas vinculadas (apenas em produção)
        if (!isDev) {
            if (type === 'paypal_to_mpesa') {
                if (!user.paypalAccount?.verified || !user.mpesaAccount?.verified) {
                    return res.status(400).json({
                        success: false,
                        message: 'Vincule suas contas PayPal e M-Pesa antes de continuar'
                    });
                }
            } else {
                if (!user.mpesaAccount?.verified || !user.paypalAccount?.verified) {
                    return res.status(400).json({
                        success: false,
                        message: 'Vincule suas contas M-Pesa e PayPal antes de continuar'
                    });
                }
            }
        }

        // Verificar KYC (apenas em produção e para valores altos)
        if (!isDev && user.kycStatus !== 'approved' && parseFloat(amount) > 100) {
            return res.status(400).json({
                success: false,
                message: 'KYC necessário para transações acima de $100/equivalente'
            });
        }

        // Verificar limites
        const quote = await exchangeRateService.getQuote(type, parseFloat(amount));
        const amountInUSD = type === 'paypal_to_mpesa'
            ? quote.sourceAmount
            : quote.destinationAmount;

        const limitCheck = user.checkLimit(amountInUSD);
        if (!limitCheck.canTransact) {
            return res.status(400).json({
                success: false,
                message: 'Limite de transação excedido',
                data: {
                    dailyAvailable: limitCheck.dailyAvailable,
                    weeklyAvailable: limitCheck.weeklyAvailable
                }
            });
        }

        // Definir contas (usar simuladas em dev se não vinculadas)
        const sourceAccount = type === 'paypal_to_mpesa'
            ? (user.paypalAccount?.email || 'dev-paypal@test.com')
            : (user.mpesaAccount?.phone || '+258841234567');
        const destAccount = type === 'paypal_to_mpesa'
            ? (user.mpesaAccount?.phone || '+258841234567')
            : (user.paypalAccount?.email || 'dev-paypal@test.com');

        // Criar transação pendente
        const transaction = new Transaction({
            user: user._id,
            type,
            sourceAmount: quote.sourceAmount,
            sourceCurrency: quote.sourceCurrency,
            destinationAmount: quote.destinationAmount,
            destinationCurrency: quote.destinationCurrency,
            exchangeRate: quote.exchangeRate,
            fees: quote.fees,
            netAmount: quote.netAmount,
            source: {
                provider: type === 'paypal_to_mpesa' ? 'paypal' : 'mpesa',
                accountIdentifier: sourceAccount
            },
            destination: {
                provider: type === 'paypal_to_mpesa' ? 'mpesa' : 'paypal',
                accountIdentifier: destAccount
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        // Adicionar status inicial
        transaction.statusHistory.push({
            status: 'pending',
            message: 'Transação iniciada, aguardando confirmação OTP'
        });

        await transaction.save();

        // Gerar e enviar OTP
        const otp = generateOTP();

        // Salvar OTP temporariamente (em produção, usar Redis)
        transaction.notes = encrypt(otp);
        await transaction.save();

        // Enviar OTP via SMS
        await notificationService.sendOTP(user.phone, otp);

        await AuditLog.log('transaction.initiated', {
            user: user._id,
            resource: { type: 'transaction', id: transaction._id },
            details: { transactionId: transaction.transactionId, type, amount: quote.sourceAmount },
            request: req
        });

        res.json({
            success: true,
            message: 'Transação iniciada. Confirme com o código OTP enviado.',
            data: {
                transactionId: transaction.transactionId,
                quote: {
                    sourceAmount: quote.sourceAmount,
                    sourceCurrency: quote.sourceCurrency,
                    destinationAmount: quote.destinationAmount,
                    destinationCurrency: quote.destinationCurrency,
                    netAmount: quote.netAmount,
                    fees: quote.fees,
                    exchangeRate: quote.exchangeRate
                },
                expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutos
            }
        });
    } catch (error) {
        logger.error('Erro ao iniciar transação:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao iniciar transação'
        });
    }
};

/**
 * Confirmar transação com OTP
 */
const confirmExchange = async (req, res) => {
    try {
        const { transactionId, otp } = req.body;
        const user = req.user;

        // Buscar transação
        const transaction = await Transaction.findOne({
            transactionId,
            user: user._id,
            status: 'pending'
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transação não encontrada ou já processada'
            });
        }

        // Verificar expiração (5 minutos)
        const transactionAge = Date.now() - transaction.createdAt;
        if (transactionAge > 5 * 60 * 1000) {
            transaction.status = 'cancelled';
            transaction.statusHistory.push({
                status: 'cancelled',
                message: 'Transação expirada'
            });
            await transaction.save();

            return res.status(400).json({
                success: false,
                message: 'Transação expirada. Inicie uma nova.'
            });
        }

        // Verificar OTP
        const storedOTP = transaction.notes;
        const isDev = process.env.NODE_ENV === 'development';
        const isDevOTP = isDev && otp === '123456';  // OTP de desenvolvimento

        if (!isDevOTP && encrypt(otp) !== storedOTP) {
            return res.status(400).json({
                success: false,
                message: isDev ? 'Código OTP inválido. Use 123456 em desenvolvimento.' : 'Código OTP inválido'
            });
        }

        // OTP verificado
        transaction.otpVerified = true;
        transaction.otpVerifiedAt = new Date();
        transaction.notes = undefined;

        // Iniciar processamento
        transaction.status = 'processing';
        transaction.statusHistory.push({
            status: 'processing',
            message: 'OTP verificado, processando transação'
        });
        await transaction.save();

        await AuditLog.log('transaction.otp_verified', {
            user: user._id,
            resource: { type: 'transaction', id: transaction._id },
            request: req
        });

        // Processar transação em background
        processTransaction(transaction._id, user);

        res.json({
            success: true,
            message: 'Transação confirmada e em processamento',
            data: {
                transactionId: transaction.transactionId,
                status: 'processing'
            }
        });
    } catch (error) {
        logger.error('Erro ao confirmar transação:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao confirmar transação'
        });
    }
};

/**
 * Processar transação (função assíncrona)
 */
async function processTransaction(transactionId, user) {
    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
        logger.error('Transação não encontrada para processamento:', transactionId);
        return;
    }

    try {
        logger.info('Processando transação:', transaction.transactionId);

        if (transaction.type === 'paypal_to_mpesa') {
            // FLUXO: PayPal → M-Pesa
            // 1. Debitar do PayPal (criar ordem de pagamento)
            // 2. Creditar no M-Pesa (B2C)

            // Passo 1: Criar ordem PayPal
            transaction.status = 'awaiting_source';
            transaction.statusHistory.push({
                status: 'awaiting_source',
                message: 'Aguardando débito do PayPal'
            });
            await transaction.save();

            // Em produção, criar ordem PayPal e aguardar aprovação
            // Para demo, simulamos sucesso
            const paypalResult = await simulatePayPalDebit(transaction);

            if (!paypalResult.success) {
                throw new Error(paypalResult.error || 'Falha no débito PayPal');
            }

            transaction.source.transactionId = paypalResult.orderId;
            transaction.source.status = 'completed';
            transaction.status = 'source_completed';
            transaction.statusHistory.push({
                status: 'source_completed',
                message: 'PayPal debitado com sucesso'
            });
            await transaction.save();

            // Passo 2: Creditar no M-Pesa (B2C)
            transaction.status = 'awaiting_destination';
            transaction.statusHistory.push({
                status: 'awaiting_destination',
                message: 'Enviando para M-Pesa'
            });
            await transaction.save();

            let mpesaResult;
            if (process.env.NODE_ENV === 'development') {
                mpesaResult = await mpesaService.simulatePayment(
                    transaction.destination.accountIdentifier,
                    transaction.netAmount,
                    transaction.transactionId
                );
            } else {
                mpesaResult = await mpesaService.b2cPayment(
                    transaction.destination.accountIdentifier,
                    transaction.netAmount,
                    transaction.transactionId
                );
            }

            if (!mpesaResult.success) {
                throw new Error(mpesaResult.responseDesc || 'Falha no envio M-Pesa');
            }

            transaction.destination.transactionId = mpesaResult.transactionId;
            transaction.destination.status = 'completed';

        } else {
            // FLUXO: M-Pesa → PayPal
            // 1. Debitar do M-Pesa (C2B)
            // 2. Creditar no PayPal (Payout)

            transaction.status = 'awaiting_source';
            transaction.statusHistory.push({
                status: 'awaiting_source',
                message: 'Aguardando débito do M-Pesa'
            });
            await transaction.save();

            let mpesaResult;
            if (process.env.NODE_ENV === 'development') {
                mpesaResult = await mpesaService.simulatePayment(
                    transaction.source.accountIdentifier,
                    transaction.sourceAmount,
                    transaction.transactionId
                );
            } else {
                mpesaResult = await mpesaService.c2bPayment(
                    transaction.source.accountIdentifier,
                    transaction.sourceAmount,
                    transaction.transactionId
                );
            }

            if (!mpesaResult.success) {
                throw new Error(mpesaResult.responseDesc || 'Falha no débito M-Pesa');
            }

            transaction.source.transactionId = mpesaResult.transactionId;
            transaction.source.status = 'completed';
            transaction.status = 'source_completed';
            transaction.statusHistory.push({
                status: 'source_completed',
                message: 'M-Pesa debitado com sucesso'
            });
            await transaction.save();

            // Creditar no PayPal
            transaction.status = 'awaiting_destination';
            transaction.statusHistory.push({
                status: 'awaiting_destination',
                message: 'Enviando para PayPal'
            });
            await transaction.save();

            const paypalResult = await paypalService.createPayout(
                transaction.destination.accountIdentifier,
                transaction.netAmount,
                transaction.transactionId
            );

            transaction.destination.transactionId = paypalResult.batchId;
            transaction.destination.status = 'completed';
        }

        // Transação concluída!
        await transaction.markCompleted(transaction.destination.transactionId);

        // Atualizar limites do usuário
        const amountInUSD = transaction.type === 'paypal_to_mpesa'
            ? transaction.sourceAmount
            : transaction.netAmount;

        await User.findByIdAndUpdate(user._id, {
            $inc: {
                'limits.dailyUsed': amountInUSD,
                'limits.weeklyUsed': amountInUSD
            }
        });

        // Enviar notificações
        await notificationService.sendTransactionEmail(
            user.email,
            user.firstName,
            transaction.toPublicJSON()
        );
        await notificationService.sendTransactionSMS(user.phone, transaction);

        await AuditLog.log('transaction.completed', {
            user: user._id,
            resource: { type: 'transaction', id: transaction._id },
            details: { transactionId: transaction.transactionId }
        });

        logger.info('Transação concluída:', transaction.transactionId);

    } catch (error) {
        logger.error('Erro ao processar transação:', error);

        await transaction.markFailed(error.message, 'PROCESSING_ERROR');

        // Notificar usuário sobre falha
        await notificationService.sendTransactionEmail(
            user.email,
            user.firstName,
            transaction.toPublicJSON()
        );

        await AuditLog.log('transaction.failed', {
            user: user._id,
            resource: { type: 'transaction', id: transaction._id },
            details: { error: error.message },
            success: false
        });
    }
}

/**
 * Simular débito PayPal (para desenvolvimento)
 */
async function simulatePayPalDebit(transaction) {
    // Simular delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 95% de sucesso
    if (Math.random() < 0.95) {
        return {
            success: true,
            orderId: `PAY_${Date.now()}`
        };
    }

    return {
        success: false,
        error: 'Saldo insuficiente no PayPal'
    };
}

/**
 * Obter status de uma transação
 */
const getTransactionStatus = async (req, res) => {
    try {
        const { transactionId } = req.params;

        const transaction = await Transaction.findOne({
            transactionId,
            user: req.user._id
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transação não encontrada'
            });
        }

        res.json({
            success: true,
            data: transaction.toPublicJSON()
        });
    } catch (error) {
        logger.error('Erro ao obter status:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter status da transação'
        });
    }
};

/**
 * Cancelar transação pendente
 */
const cancelExchange = async (req, res) => {
    try {
        const { transactionId } = req.params;

        const transaction = await Transaction.findOne({
            transactionId,
            user: req.user._id,
            status: 'pending'
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transação não encontrada ou não pode ser cancelada'
            });
        }

        transaction.status = 'cancelled';
        transaction.statusHistory.push({
            status: 'cancelled',
            message: 'Cancelada pelo usuário'
        });
        await transaction.save();

        await AuditLog.log('transaction.cancelled', {
            user: req.user._id,
            resource: { type: 'transaction', id: transaction._id }
        });

        res.json({
            success: true,
            message: 'Transação cancelada'
        });
    } catch (error) {
        logger.error('Erro ao cancelar:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao cancelar transação'
        });
    }
};

module.exports = {
    getRates,
    getQuote,
    initiateExchange,
    confirmExchange,
    getTransactionStatus,
    cancelExchange
};

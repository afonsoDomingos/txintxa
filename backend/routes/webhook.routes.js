/**
 * Rotas de Webhooks
 */

const express = require('express');
const router = express.Router();
const { Transaction, AuditLog } = require('../models');
const logger = require('../utils/logger');

/**
 * Webhook do PayPal
 */
router.post('/paypal', async (req, res) => {
    try {
        const body = JSON.parse(req.body.toString());

        logger.info('Webhook PayPal recebido:', {
            eventType: body.event_type,
            resourceId: body.resource?.id
        });

        // Verificar tipo de evento
        switch (body.event_type) {
            case 'PAYMENT.CAPTURE.COMPLETED':
                // Pagamento capturado com sucesso
                await handlePayPalPaymentComplete(body.resource);
                break;

            case 'PAYMENT.CAPTURE.DENIED':
            case 'PAYMENT.CAPTURE.DECLINED':
                // Pagamento negado
                await handlePayPalPaymentFailed(body.resource);
                break;

            case 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED':
                // Payout enviado com sucesso
                await handlePayPalPayoutSuccess(body.resource);
                break;

            case 'PAYMENT.PAYOUTS-ITEM.FAILED':
                // Payout falhou
                await handlePayPalPayoutFailed(body.resource);
                break;
        }

        await AuditLog.log('system.external_api_call', {
            details: {
                provider: 'paypal',
                eventType: body.event_type,
                resourceId: body.resource?.id
            }
        });

        res.status(200).send('OK');
    } catch (error) {
        logger.error('Erro no webhook PayPal:', error);
        res.status(500).send('Error');
    }
});

/**
 * Webhook do M-Pesa
 */
router.post('/mpesa', async (req, res) => {
    try {
        const body = JSON.parse(req.body.toString());

        logger.info('Webhook M-Pesa recebido:', body);

        // Processar callback do M-Pesa
        const { input_TransactionID, input_ThirdPartyReference, output_ResponseCode } = body;

        if (output_ResponseCode === 'INS-0') {
            // Transação bem-sucedida
            await handleMPesaSuccess(input_ThirdPartyReference, input_TransactionID);
        } else {
            // Transação falhou
            await handleMPesaFailure(input_ThirdPartyReference, output_ResponseCode);
        }

        await AuditLog.log('system.external_api_call', {
            details: {
                provider: 'mpesa',
                transactionId: input_TransactionID,
                responseCode: output_ResponseCode
            }
        });

        res.status(200).json({
            output_ResponseCode: 'INS-0',
            output_ResponseDesc: 'Callback received successfully'
        });
    } catch (error) {
        logger.error('Erro no webhook M-Pesa:', error);
        res.status(500).json({
            output_ResponseCode: 'INS-1',
            output_ResponseDesc: 'Error processing callback'
        });
    }
});

// === Handlers ===

async function handlePayPalPaymentComplete(resource) {
    const orderId = resource.id;

    const transaction = await Transaction.findOne({
        'source.transactionId': orderId,
        status: 'awaiting_source'
    });

    if (transaction) {
        transaction.source.status = 'completed';
        transaction.status = 'source_completed';
        transaction.statusHistory.push({
            status: 'source_completed',
            message: 'Pagamento PayPal confirmado'
        });
        await transaction.save();

        logger.info('PayPal payment completed:', orderId);
    }
}

async function handlePayPalPaymentFailed(resource) {
    const orderId = resource.id;

    const transaction = await Transaction.findOne({
        'source.transactionId': orderId
    });

    if (transaction) {
        await transaction.markFailed('Pagamento PayPal negado', 'PAYPAL_DENIED');
        logger.warn('PayPal payment failed:', orderId);
    }
}

async function handlePayPalPayoutSuccess(resource) {
    const batchId = resource.payout_batch_id;

    const transaction = await Transaction.findOne({
        'destination.transactionId': batchId,
        status: 'awaiting_destination'
    });

    if (transaction) {
        await transaction.markCompleted(batchId);
        logger.info('PayPal payout completed:', batchId);
    }
}

async function handlePayPalPayoutFailed(resource) {
    const batchId = resource.payout_batch_id;

    const transaction = await Transaction.findOne({
        'destination.transactionId': batchId
    });

    if (transaction) {
        await transaction.markFailed('Payout PayPal falhou', 'PAYPAL_PAYOUT_FAILED');
        logger.warn('PayPal payout failed:', batchId);
    }
}

async function handleMPesaSuccess(thirdPartyRef, mpesaTxnId) {
    const transaction = await Transaction.findOne({
        transactionId: thirdPartyRef
    });

    if (transaction) {
        if (transaction.source.provider === 'mpesa') {
            transaction.source.transactionId = mpesaTxnId;
            transaction.source.status = 'completed';
            transaction.status = 'source_completed';
        } else {
            transaction.destination.transactionId = mpesaTxnId;
            await transaction.markCompleted(mpesaTxnId);
        }

        transaction.statusHistory.push({
            status: transaction.status,
            message: 'M-Pesa confirmado'
        });
        await transaction.save();

        logger.info('M-Pesa transaction completed:', mpesaTxnId);
    }
}

async function handleMPesaFailure(thirdPartyRef, responseCode) {
    const transaction = await Transaction.findOne({
        transactionId: thirdPartyRef
    });

    if (transaction) {
        await transaction.markFailed(`M-Pesa error: ${responseCode}`, responseCode);
        logger.warn('M-Pesa transaction failed:', { thirdPartyRef, responseCode });
    }
}

module.exports = router;

/**
 * Serviço de Integração PayPal
 */

const axios = require('axios');
const { client, getApiUrl } = require('../config/paypal');
const logger = require('../utils/logger');

class PayPalService {
    constructor() {
        this.baseUrl = getApiUrl();
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    /**
     * Obter token de acesso OAuth2
     */
    async getAccessToken() {
        // Verificar se token ainda é válido
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            const auth = Buffer.from(
                `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
            ).toString('base64');

            const response = await axios.post(
                `${this.baseUrl}/v1/oauth2/token`,
                'grant_type=client_credentials',
                {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            this.accessToken = response.data.access_token;
            // Token expira em X segundos, mas renovamos 5 min antes
            this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;

            return this.accessToken;
        } catch (error) {
            logger.error('Erro ao obter token PayPal:', error.response?.data || error.message);
            throw new Error('Falha na autenticação com PayPal');
        }
    }

    /**
     * Verificar saldo da conta
     */
    async getBalance(accessToken = null) {
        try {
            const token = accessToken || await this.getAccessToken();

            // Nota: Esta API requer permissões especiais
            // Em sandbox, pode não estar disponível
            const response = await axios.get(
                `${this.baseUrl}/v1/reporting/balances`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;
        } catch (error) {
            logger.error('Erro ao obter saldo PayPal:', error.response?.data || error.message);
            // Retornar saldo simulado em sandbox
            if (process.env.PAYPAL_MODE === 'sandbox') {
                return {
                    balances: [
                        { currency: 'USD', total_balance: { value: '1000.00' } }
                    ]
                };
            }
            throw error;
        }
    }

    /**
     * Criar pagamento (Payout) para conta PayPal
     * Usado quando: M-Pesa → PayPal (enviar USD para usuário)
     */
    async createPayout(recipientEmail, amount, senderTransactionId, note = 'Txintxa Transfer') {
        try {
            const token = await this.getAccessToken();

            const payoutData = {
                sender_batch_header: {
                    sender_batch_id: `Txintxa_${senderTransactionId}_${Date.now()}`,
                    email_subject: 'Você recebeu um pagamento da Txintxa',
                    email_message: 'Você recebeu um pagamento da plataforma Txintxa.'
                },
                items: [
                    {
                        recipient_type: 'EMAIL',
                        amount: {
                            value: amount.toFixed(2),
                            currency: 'USD'
                        },
                        receiver: recipientEmail,
                        note: note,
                        sender_item_id: senderTransactionId
                    }
                ]
            };

            const response = await axios.post(
                `${this.baseUrl}/v1/payments/payouts`,
                payoutData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            logger.info('PayPal Payout criado:', {
                batchId: response.data.batch_header.payout_batch_id,
                status: response.data.batch_header.batch_status
            });

            return {
                success: true,
                batchId: response.data.batch_header.payout_batch_id,
                status: response.data.batch_header.batch_status,
                data: response.data
            };
        } catch (error) {
            logger.error('Erro ao criar payout PayPal:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Falha ao processar pagamento PayPal');
        }
    }

    /**
     * Verificar status de payout
     */
    async getPayoutStatus(payoutBatchId) {
        try {
            const token = await this.getAccessToken();

            const response = await axios.get(
                `${this.baseUrl}/v1/payments/payouts/${payoutBatchId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                batchId: payoutBatchId,
                status: response.data.batch_header.batch_status,
                items: response.data.items,
                data: response.data
            };
        } catch (error) {
            logger.error('Erro ao verificar status payout:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Criar ordem de pagamento (para receber de usuário)
     * Usado quando: PayPal → M-Pesa (debitar USD do usuário)
     */
    async createOrder(amount, transactionId, description = 'Txintxa Exchange') {
        try {
            const token = await this.getAccessToken();

            const orderData = {
                intent: 'CAPTURE',
                purchase_units: [
                    {
                        reference_id: transactionId,
                        description: description,
                        amount: {
                            currency_code: 'USD',
                            value: amount.toFixed(2)
                        }
                    }
                ],
                application_context: {
                    brand_name: 'Txintxa',
                    landing_page: 'LOGIN',
                    user_action: 'PAY_NOW',
                    return_url: `${process.env.FRONTEND_URL}/exchange/success?txn=${transactionId}`,
                    cancel_url: `${process.env.FRONTEND_URL}/exchange/cancel?txn=${transactionId}`
                }
            };

            const response = await axios.post(
                `${this.baseUrl}/v2/checkout/orders`,
                orderData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const approvalLink = response.data.links.find(link => link.rel === 'approve');

            return {
                success: true,
                orderId: response.data.id,
                status: response.data.status,
                approvalUrl: approvalLink?.href,
                data: response.data
            };
        } catch (error) {
            logger.error('Erro ao criar ordem PayPal:', error.response?.data || error.message);
            throw new Error('Falha ao criar ordem de pagamento PayPal');
        }
    }

    /**
     * Capturar pagamento de ordem
     */
    async captureOrder(orderId) {
        try {
            const token = await this.getAccessToken();

            const response = await axios.post(
                `${this.baseUrl}/v2/checkout/orders/${orderId}/capture`,
                {},
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                orderId: response.data.id,
                status: response.data.status,
                captureId: response.data.purchase_units?.[0]?.payments?.captures?.[0]?.id,
                data: response.data
            };
        } catch (error) {
            logger.error('Erro ao capturar ordem PayPal:', error.response?.data || error.message);
            throw new Error('Falha ao capturar pagamento PayPal');
        }
    }

    /**
     * Verificar identidade do usuário PayPal (para vinculação)
     */
    async verifyUserIdentity(authorizationCode) {
        try {
            const token = await this.getAccessToken();

            // Trocar código por access token do usuário
            const auth = Buffer.from(
                `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
            ).toString('base64');

            const tokenResponse = await axios.post(
                `${this.baseUrl}/v1/oauth2/token`,
                `grant_type=authorization_code&code=${authorizationCode}`,
                {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            const userToken = tokenResponse.data.access_token;

            // Obter informações do usuário
            const userResponse = await axios.get(
                `${this.baseUrl}/v1/identity/oauth2/userinfo?schema=paypalv1.1`,
                {
                    headers: {
                        'Authorization': `Bearer ${userToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                email: userResponse.data.emails?.[0]?.value,
                accountId: userResponse.data.payer_id,
                name: userResponse.data.name,
                verified: userResponse.data.verified_account
            };
        } catch (error) {
            logger.error('Erro ao verificar identidade PayPal:', error.response?.data || error.message);
            throw new Error('Falha ao verificar conta PayPal');
        }
    }
}

module.exports = new PayPalService();

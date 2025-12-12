/**
 * Serviço de Integração M-Pesa Vodacom Moçambique
 */

const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class MPesaService {
    constructor() {
        this.baseUrl = process.env.MPESA_BASE_URL || 'https://api.sandbox.vm.co.mz';
        this.apiKey = process.env.MPESA_API_KEY;
        this.publicKey = process.env.MPESA_PUBLIC_KEY;
        this.serviceProviderCode = process.env.MPESA_SERVICE_PROVIDER_CODE;
    }

    /**
     * Gerar token de autenticação Bearer
     */
    generateBearerToken() {
        try {
            // Formatar a chave pública
            const formattedKey = `-----BEGIN PUBLIC KEY-----\n${this.publicKey}\n-----END PUBLIC KEY-----`;

            // Criptografar a API Key com a chave pública
            const encrypted = crypto.publicEncrypt(
                {
                    key: formattedKey,
                    padding: crypto.constants.RSA_PKCS1_PADDING
                },
                Buffer.from(this.apiKey)
            );

            return encrypted.toString('base64');
        } catch (error) {
            logger.error('Erro ao gerar token M-Pesa:', error);
            throw new Error('Falha na autenticação M-Pesa');
        }
    }

    /**
     * Headers padrão
     */
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Origin': process.env.MPESA_ORIGIN || '*',
            'Authorization': `Bearer ${this.generateBearerToken()}`
        };
    }

    /**
     * C2B - Customer to Business
     * Receber pagamento do cliente M-Pesa
     * Usado quando: M-Pesa → PayPal (debitar MZN do usuário)
     */
    async c2bPayment(customerPhone, amount, transactionRef, thirdPartyRef = null) {
        try {
            const endpoint = '/ipg/v1x/c2bPayment/singleStage/';

            const payload = {
                input_TransactionReference: transactionRef,
                input_CustomerMSISDN: this.formatPhone(customerPhone),
                input_Amount: amount.toFixed(2),
                input_ThirdPartyReference: thirdPartyRef || `TXN_${uuidv4().slice(0, 8)}`,
                input_ServiceProviderCode: this.serviceProviderCode
            };

            logger.info('M-Pesa C2B Request:', {
                phone: this.maskPhone(customerPhone),
                amount,
                ref: transactionRef
            });

            const response = await axios.post(
                `${this.baseUrl}${endpoint}`,
                payload,
                { headers: this.getHeaders() }
            );

            const result = response.data;

            // Verificar código de resposta
            if (result.output_ResponseCode === 'INS-0') {
                return {
                    success: true,
                    transactionId: result.output_TransactionID,
                    conversationId: result.output_ConversationID,
                    responseCode: result.output_ResponseCode,
                    responseDesc: result.output_ResponseDesc,
                    data: result
                };
            } else {
                logger.warn('M-Pesa C2B não bem-sucedido:', result);
                return {
                    success: false,
                    responseCode: result.output_ResponseCode,
                    responseDesc: result.output_ResponseDesc,
                    data: result
                };
            }
        } catch (error) {
            logger.error('Erro M-Pesa C2B:', error.response?.data || error.message);
            throw new Error(this.getErrorMessage(error));
        }
    }

    /**
     * B2C - Business to Customer
     * Enviar pagamento para cliente M-Pesa
     * Usado quando: PayPal → M-Pesa (creditar MZN para usuário)
     */
    async b2cPayment(customerPhone, amount, transactionRef, thirdPartyRef = null) {
        try {
            const endpoint = '/ipg/v1x/b2cPayment/';

            const payload = {
                input_TransactionReference: transactionRef,
                input_CustomerMSISDN: this.formatPhone(customerPhone),
                input_Amount: amount.toFixed(2),
                input_ThirdPartyReference: thirdPartyRef || `TXN_${uuidv4().slice(0, 8)}`,
                input_ServiceProviderCode: this.serviceProviderCode
            };

            logger.info('M-Pesa B2C Request:', {
                phone: this.maskPhone(customerPhone),
                amount,
                ref: transactionRef
            });

            const response = await axios.post(
                `${this.baseUrl}${endpoint}`,
                payload,
                { headers: this.getHeaders() }
            );

            const result = response.data;

            if (result.output_ResponseCode === 'INS-0') {
                return {
                    success: true,
                    transactionId: result.output_TransactionID,
                    conversationId: result.output_ConversationID,
                    responseCode: result.output_ResponseCode,
                    responseDesc: result.output_ResponseDesc,
                    data: result
                };
            } else {
                logger.warn('M-Pesa B2C não bem-sucedido:', result);
                return {
                    success: false,
                    responseCode: result.output_ResponseCode,
                    responseDesc: result.output_ResponseDesc,
                    data: result
                };
            }
        } catch (error) {
            logger.error('Erro M-Pesa B2C:', error.response?.data || error.message);
            throw new Error(this.getErrorMessage(error));
        }
    }

    /**
     * Consultar status de transação
     */
    async queryTransaction(queryReference, thirdPartyRef) {
        try {
            const endpoint = '/ipg/v1x/queryTransactionStatus/';

            const payload = {
                input_QueryReference: queryReference,
                input_ThirdPartyReference: thirdPartyRef,
                input_ServiceProviderCode: this.serviceProviderCode
            };

            const response = await axios.get(
                `${this.baseUrl}${endpoint}`,
                {
                    params: payload,
                    headers: this.getHeaders()
                }
            );

            return {
                success: response.data.output_ResponseCode === 'INS-0',
                status: response.data.output_ResponseCode,
                data: response.data
            };
        } catch (error) {
            logger.error('Erro ao consultar transação M-Pesa:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Reverter transação
     */
    async reverseTransaction(transactionId, amount, thirdPartyRef) {
        try {
            const endpoint = '/ipg/v1x/reversal/';

            const payload = {
                input_TransactionID: transactionId,
                input_SecurityCredential: this.generateBearerToken(),
                input_InitiatorIdentifier: this.serviceProviderCode,
                input_ThirdPartyReference: thirdPartyRef,
                input_ServiceProviderCode: this.serviceProviderCode,
                input_ReversalAmount: amount.toFixed(2)
            };

            const response = await axios.put(
                `${this.baseUrl}${endpoint}`,
                payload,
                { headers: this.getHeaders() }
            );

            return {
                success: response.data.output_ResponseCode === 'INS-0',
                data: response.data
            };
        } catch (error) {
            logger.error('Erro ao reverter transação M-Pesa:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Simular pagamento (apenas para sandbox/testes)
     */
    async simulatePayment(customerPhone, amount, transactionRef) {
        if (process.env.NODE_ENV !== 'development' && process.env.MPESA_MODE !== 'sandbox') {
            throw new Error('Simulação só disponível em ambiente de desenvolvimento');
        }

        logger.info('Simulando pagamento M-Pesa:', {
            phone: this.maskPhone(customerPhone),
            amount,
            ref: transactionRef
        });

        // Simular delay de processamento
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 100% de sucesso em desenvolvimento
        const isSuccess = true;

        if (isSuccess) {
            return {
                success: true,
                transactionId: `SIM_${uuidv4().slice(0, 12).toUpperCase()}`,
                conversationId: uuidv4(),
                responseCode: 'INS-0',
                responseDesc: 'Request processed successfully (SIMULATED)'
            };
        } else {
            return {
                success: false,
                responseCode: 'INS-1',
                responseDesc: 'Transaction failed (SIMULATED)'
            };
        }
    }

    /**
     * Formatar número de telefone para padrão M-Pesa
     */
    formatPhone(phone) {
        let cleaned = phone.replace(/[\s\-\(\)]/g, '');

        // Remover '+' se presente
        if (cleaned.startsWith('+')) {
            cleaned = cleaned.slice(1);
        }

        // Adicionar código do país se necessário
        if (cleaned.startsWith('8')) {
            cleaned = '258' + cleaned;
        }

        return cleaned;
    }

    /**
     * Mascarar número de telefone para logs
     */
    maskPhone(phone) {
        const formatted = this.formatPhone(phone);
        if (formatted.length >= 9) {
            return formatted.slice(0, 6) + '***' + formatted.slice(-2);
        }
        return '***';
    }

    /**
     * Obter mensagem de erro legível
     */
    getErrorMessage(error) {
        const responseCode = error.response?.data?.output_ResponseCode;

        const errorMessages = {
            'INS-1': 'Erro interno do serviço M-Pesa',
            'INS-5': 'Transação cancelada pelo usuário',
            'INS-6': 'Transação falhou',
            'INS-9': 'Timeout na requisição',
            'INS-10': 'Saldo insuficiente',
            'INS-13': 'Número de telefone inválido',
            'INS-14': 'Valor inválido',
            'INS-15': 'Transação duplicada',
            'INS-17': 'Provedor de serviço inválido',
            'INS-20': 'Transação não encontrada',
            'INS-21': 'Transação já processada',
            'INS-25': 'Limite de transação excedido'
        };

        return errorMessages[responseCode] || error.message || 'Erro desconhecido M-Pesa';
    }
}

module.exports = new MPesaService();

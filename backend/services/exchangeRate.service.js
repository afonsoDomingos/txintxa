/**
 * Serviço de Taxa de Câmbio
 */

const axios = require('axios');
const { ExchangeRate } = require('../models');
const logger = require('../utils/logger');

class ExchangeRateService {
    constructor() {
        this.apiKey = process.env.EXCHANGE_RATE_API_KEY;
        this.baseUrl = process.env.EXCHANGE_RATE_API_URL || 'https://v6.exchangerate-api.com/v6';
        this.cacheValidityHours = 1; // Cache válido por 1 hora
    }

    /**
     * Obter taxa de câmbio USD/MZN
     */
    async getRate(baseCurrency = 'USD', targetCurrency = 'MZN') {
        try {
            // Tentar obter do cache primeiro
            const cachedRate = await ExchangeRate.getCurrentRate(baseCurrency, targetCurrency);

            if (cachedRate && cachedRate.isValid) {
                logger.debug('Taxa de câmbio obtida do cache:', {
                    pair: cachedRate.pair,
                    rate: cachedRate.rate
                });
                return {
                    rate: cachedRate.rate,
                    source: 'cache',
                    validUntil: cachedRate.validUntil
                };
            }

            // Se API key não está configurada, usar taxas simuladas
            if (!this.apiKey || this.apiKey === 'your-free-api-key') {
                return this.getSimulatedRate(baseCurrency, targetCurrency);
            }

            // Buscar da API
            const freshRate = await this.fetchFromAPI(baseCurrency, targetCurrency);

            // Salvar no cache
            await ExchangeRate.saveRate(
                baseCurrency,
                targetCurrency,
                freshRate.rate,
                'exchangerate-api',
                this.cacheValidityHours
            );

            return freshRate;
        } catch (error) {
            logger.error('Erro ao obter taxa de câmbio:', error);

            // Usar taxas simuladas como fallback
            return this.getSimulatedRate(baseCurrency, targetCurrency);
        }
    }

    /**
     * Taxas simuladas para desenvolvimento
     */
    getSimulatedRate(baseCurrency, targetCurrency) {
        const simulatedRates = {
            'USD/MZN': 63.50,
            'MZN/USD': 0.0157,
            'EUR/MZN': 68.20,
            'ZAR/MZN': 3.45
        };

        const pair = `${baseCurrency}/${targetCurrency}`;
        const rate = simulatedRates[pair] || 1;

        logger.info(`Usando taxa simulada: ${pair} = ${rate}`);

        return {
            rate,
            source: 'simulated',
            warning: 'Taxa simulada para desenvolvimento'
        };
    }

    /**
     * Buscar taxa da API externa
     */
    async fetchFromAPI(baseCurrency, targetCurrency) {
        try {
            const url = `${this.baseUrl}/${this.apiKey}/pair/${baseCurrency}/${targetCurrency}`;

            const response = await axios.get(url, {
                timeout: 10000 // 10 segundos
            });

            if (response.data.result !== 'success') {
                throw new Error(`API retornou erro: ${response.data['error-type']}`);
            }

            const rate = response.data.conversion_rate;

            logger.info('Taxa de câmbio obtida da API:', {
                pair: `${baseCurrency}/${targetCurrency}`,
                rate
            });

            return {
                rate,
                source: 'exchangerate-api',
                lastUpdate: new Date(response.data.time_last_update_utc),
                nextUpdate: new Date(response.data.time_next_update_utc)
            };
        } catch (error) {
            logger.error('Erro ao buscar taxa da API:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Converter valor entre moedas
     */
    async convert(amount, fromCurrency, toCurrency) {
        const { rate } = await this.getRate(fromCurrency, toCurrency);
        const convertedAmount = amount * rate;

        return {
            originalAmount: amount,
            originalCurrency: fromCurrency,
            convertedAmount: Math.round(convertedAmount * 100) / 100, // 2 casas decimais
            targetCurrency: toCurrency,
            rate,
            timestamp: new Date()
        };
    }

    /**
     * Calcular cotação completa com taxas
     */
    async getQuote(type, amount) {
        let sourceAmount, sourceCurrency, destinationCurrency;
        let exchangeRate, destinationAmount;

        if (type === 'paypal_to_mpesa') {
            // USD → MZN
            sourceAmount = amount;
            sourceCurrency = 'USD';
            destinationCurrency = 'MZN';

            const { rate } = await this.getRate('USD', 'MZN');
            exchangeRate = rate;
            destinationAmount = sourceAmount * rate;
        } else {
            // MZN → USD
            sourceAmount = amount;
            sourceCurrency = 'MZN';
            destinationCurrency = 'USD';

            const { rate } = await this.getRate('MZN', 'USD');
            exchangeRate = rate;
            destinationAmount = sourceAmount * rate;
        }

        // Calcular taxas
        const feePercentage = parseFloat(process.env.TRANSACTION_FEE_PERCENTAGE) || 2;
        const feeFixed = parseFloat(process.env.TRANSACTION_FEE_FIXED) || 0.50;

        // Taxa é sempre em USD
        let feeAmountUSD;
        if (sourceCurrency === 'USD') {
            feeAmountUSD = (sourceAmount * feePercentage / 100) + feeFixed;
        } else {
            // Converter para USD primeiro
            const { rate: mznToUsd } = await this.getRate('MZN', 'USD');
            const sourceInUSD = sourceAmount * mznToUsd;
            feeAmountUSD = (sourceInUSD * feePercentage / 100) + feeFixed;
        }

        // Valor líquido (após taxas)
        let netAmount;
        if (destinationCurrency === 'MZN') {
            // Subtrair taxa do destino convertida para MZN
            const { rate: usdToMzn } = await this.getRate('USD', 'MZN');
            const feeInMZN = feeAmountUSD * usdToMzn;
            netAmount = destinationAmount - feeInMZN;
        } else {
            netAmount = destinationAmount - feeAmountUSD;
        }

        return {
            type,
            sourceAmount: Math.round(sourceAmount * 100) / 100,
            sourceCurrency,
            destinationAmount: Math.round(destinationAmount * 100) / 100,
            destinationCurrency,
            exchangeRate: Math.round(exchangeRate * 10000) / 10000,
            fees: {
                percentage: feePercentage,
                fixed: feeFixed,
                total: Math.round(feeAmountUSD * 100) / 100,
                currency: 'USD'
            },
            netAmount: Math.round(netAmount * 100) / 100,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000), // Cotação válida por 5 min
            disclaimer: 'A taxa de câmbio é indicativa e pode variar no momento da transação.'
        };
    }

    /**
     * Obter múltiplas taxas
     */
    async getMultipleRates() {
        const pairs = [
            { base: 'USD', target: 'MZN' },
            { base: 'MZN', target: 'USD' },
            { base: 'EUR', target: 'MZN' },
            { base: 'ZAR', target: 'MZN' }
        ];

        const rates = await Promise.all(
            pairs.map(async ({ base, target }) => {
                try {
                    const result = await this.getRate(base, target);
                    return {
                        pair: `${base}/${target}`,
                        rate: result.rate,
                        source: result.source
                    };
                } catch (error) {
                    return {
                        pair: `${base}/${target}`,
                        rate: null,
                        error: 'Não disponível'
                    };
                }
            })
        );

        return rates;
    }
}

module.exports = new ExchangeRateService();

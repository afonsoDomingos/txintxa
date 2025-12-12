import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { exchangeAPI } from '../services/api'
import { FiArrowRight, FiArrowDown, FiCheck, FiAlertCircle, FiRefreshCw } from 'react-icons/fi'
import toast from 'react-hot-toast'
import mpesaLogo from '../assets/mpesa2.png'
import paypalLogo from '../assets/paypal2.png'
import './Exchange.css'

const Exchange = () => {
    const { user } = useAuth()
    const [step, setStep] = useState(1) // 1: Form, 2: Confirm, 3: OTP, 4: Success
    const [direction, setDirection] = useState('paypal_to_mpesa')
    const [amount, setAmount] = useState('')
    const [quote, setQuote] = useState(null)
    const [otp, setOtp] = useState('')
    const [transactionId, setTransactionId] = useState('')
    const [loading, setLoading] = useState(false)
    const [loadingQuote, setLoadingQuote] = useState(false)
    const [rates, setRates] = useState(null)

    // Fetch current rates
    useEffect(() => {
        fetchRates()
    }, [])

    // Get quote when amount changes
    useEffect(() => {
        const timer = setTimeout(() => {
            if (amount && parseFloat(amount) >= 1) {
                getQuote()
            } else {
                setQuote(null)
            }
        }, 500)

        return () => clearTimeout(timer)
    }, [amount, direction])

    const fetchRates = async () => {
        try {
            const response = await exchangeAPI.getRates()
            setRates(response.data.data.rates)
        } catch (error) {
            console.error('Error fetching rates:', error)
        }
    }

    const getQuote = async () => {
        setLoadingQuote(true)
        try {
            const response = await exchangeAPI.getQuote({
                type: direction,
                amount: parseFloat(amount)
            })
            setQuote(response.data.data)
        } catch (error) {
            console.error('Error getting quote:', error)
        } finally {
            setLoadingQuote(false)
        }
    }

    const handleInitiate = async () => {
        if (!amount || parseFloat(amount) < 1) {
            toast.error('Valor mínimo é 1')
            return
        }

        // Check if accounts are linked
        if (direction === 'paypal_to_mpesa' && (!user?.paypalLinked || !user?.mpesaLinked)) {
            toast.error('Vincule suas contas PayPal e M-Pesa primeiro')
            return
        }

        setLoading(true)
        try {
            const response = await exchangeAPI.initiate({
                type: direction,
                amount: parseFloat(amount)
            })

            setTransactionId(response.data.data.transactionId)
            setQuote(response.data.data.quote)
            setStep(3) // Go to OTP step
            toast.success('Código OTP enviado para seu telefone')
        } catch (error) {
            const message = error.response?.data?.message || 'Erro ao iniciar transação'
            toast.error(message)
        } finally {
            setLoading(false)
        }
    }

    const handleConfirmOTP = async () => {
        if (otp.length !== 6) {
            toast.error('Código OTP deve ter 6 dígitos')
            return
        }

        setLoading(true)
        try {
            await exchangeAPI.confirm({
                transactionId,
                otp
            })

            setStep(4) // Success
            toast.success('Transação confirmada!')
        } catch (error) {
            const message = error.response?.data?.message || 'Código OTP inválido'
            toast.error(message)
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setStep(1)
        setAmount('')
        setQuote(null)
        setOtp('')
        setTransactionId('')
    }

    const currentRate = rates?.find(r =>
        r.pair === (direction === 'paypal_to_mpesa' ? 'USD/MZN' : 'MZN/USD')
    )?.rate || (direction === 'paypal_to_mpesa' ? 63.50 : 0.016)

    return (
        <div className="exchange-page fade-in">
            <div className="exchange-container">
                {/* Header */}
                <div className="exchange-header">
                    <h1>Trocar Moeda</h1>
                    <p className="text-secondary">Converta entre PayPal (USD) e M-Pesa (MZN)</p>
                </div>

                {/* Steps Indicator */}
                <div className="steps-indicator">
                    <div className={`step-dot ${step >= 1 ? 'active' : ''}`}>1</div>
                    <div className={`step-line ${step >= 2 ? 'active' : ''}`}></div>
                    <div className={`step-dot ${step >= 2 ? 'active' : ''}`}>2</div>
                    <div className={`step-line ${step >= 3 ? 'active' : ''}`}></div>
                    <div className={`step-dot ${step >= 3 ? 'active' : ''}`}>3</div>
                    <div className={`step-line ${step >= 4 ? 'active' : ''}`}></div>
                    <div className={`step-dot ${step >= 4 ? 'active' : ''}`}>✓</div>
                </div>

                {/* Step 1 & 2: Exchange Form */}
                {(step === 1 || step === 2) && (
                    <div className="exchange-form card">
                        {/* Direction Toggle */}
                        <div className="direction-toggle">
                            <button
                                className={`direction-btn ${direction === 'paypal_to_mpesa' ? 'active' : ''}`}
                                onClick={() => setDirection('paypal_to_mpesa')}
                            >
                                <img src={paypalLogo} alt="PayPal" style={{ height: '24px' }} />
                                <FiArrowRight />
                                <img src={mpesaLogo} alt="M-Pesa" style={{ height: '24px' }} />
                            </button>
                            <button
                                className={`direction-btn ${direction === 'mpesa_to_paypal' ? 'active' : ''}`}
                                onClick={() => setDirection('mpesa_to_paypal')}
                            >
                                <img src={mpesaLogo} alt="M-Pesa" style={{ height: '24px' }} />
                                <FiArrowRight />
                                <img src={paypalLogo} alt="PayPal" style={{ height: '24px' }} />
                            </button>
                        </div>

                        {/* Exchange Rate Display */}
                        <div className="rate-display">
                            <FiRefreshCw className={loadingQuote ? 'spinning' : ''} />
                            <span>
                                1 {direction === 'paypal_to_mpesa' ? 'USD' : 'MZN'} = {' '}
                                <strong>{currentRate?.toFixed(direction === 'paypal_to_mpesa' ? 2 : 4)}</strong>
                                {' '}{direction === 'paypal_to_mpesa' ? 'MZN' : 'USD'}
                            </span>
                        </div>

                        {/* Amount Input */}
                        <div className="amount-section">
                            <div className="amount-input-group">
                                <label>Você envia</label>
                                <div className="amount-input">
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        min="1"
                                        max="10000"
                                    />
                                    <span className="currency-badge">
                                        {direction === 'paypal_to_mpesa' ? 'USD' : 'MZN'}
                                    </span>
                                </div>
                            </div>

                            <div className="amount-arrow">
                                <FiArrowDown />
                            </div>

                            <div className="amount-input-group">
                                <label>Você recebe</label>
                                <div className="amount-input readonly">
                                    <input
                                        type="text"
                                        value={quote ? quote.netAmount.toFixed(2) : '0.00'}
                                        readOnly
                                        placeholder="0.00"
                                    />
                                    <span className="currency-badge">
                                        {direction === 'paypal_to_mpesa' ? 'MZN' : 'USD'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Quote Details */}
                        {quote && (
                            <div className="quote-details slide-up">
                                <div className="quote-row">
                                    <span>Taxa de câmbio</span>
                                    <span>{quote.exchangeRate.toFixed(4)}</span>
                                </div>
                                <div className="quote-row">
                                    <span>Valor bruto</span>
                                    <span>{quote.destinationAmount.toFixed(2)} {quote.destinationCurrency}</span>
                                </div>
                                <div className="quote-row fee" style={{
                                    borderTop: '1px dashed var(--border)',
                                    paddingTop: '10px',
                                    marginTop: '5px'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 500 }}>Menos Taxas</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            ({quote.fees.percentage}% + {quote.sourceCurrency === 'USD' ? '$' : ''}{quote.fees.fixed} {quote.sourceCurrency})
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                        <span style={{ color: '#ef4444', fontWeight: 600 }}>
                                            - {quote.fees.total.toFixed(2)} {quote.sourceCurrency}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: '#ef4444', opacity: 0.8 }}>
                                            (≈ {(quote.fees.total * quote.exchangeRate).toFixed(2)} {quote.destinationCurrency})
                                        </span>
                                    </div>
                                </div>
                                <div className="quote-row total">
                                    <span>Você recebe</span>
                                    <span>{quote.netAmount.toFixed(2)} {quote.destinationCurrency}</span>
                                </div>

                                {!quote.limits?.canProceed && (
                                    <div className="limit-warning">
                                        <FiAlertCircle />
                                        <span>Limite excedido. Disponível: ${quote.limits?.dailyAvailable?.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Action Button */}
                        <button
                            className="btn btn-primary btn-block btn-lg"
                            onClick={handleInitiate}
                            disabled={loading || !quote || !quote.limits?.canProceed}
                        >
                            {loading ? (
                                <div className="loading-dots">
                                    <span></span><span></span><span></span>
                                </div>
                            ) : (
                                <>
                                    Continuar
                                    <FiArrowRight />
                                </>
                            )}
                        </button>

                        <p className="exchange-disclaimer">
                            Taxa válida por 5 minutos. Ao continuar, você concorda com os termos de serviço.
                        </p>
                    </div>
                )}

                {/* Step 3: OTP Verification */}
                {step === 3 && (
                    <div className="otp-section card slide-up">
                        <div className="otp-icon">📱</div>
                        <h2>Verificação OTP</h2>
                        <p className="text-secondary">
                            Enviamos um código de 6 dígitos para<br />
                            <strong>{user?.phone}</strong>
                        </p>

                        <div className="otp-input-group">
                            <input
                                type="text"
                                maxLength="6"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                placeholder="000000"
                                className="otp-input"
                                autoFocus
                            />
                        </div>

                        <div className="otp-summary">
                            <div className="summary-row">
                                <span>Transação</span>
                                <span>{transactionId}</span>
                            </div>
                            <div className="summary-row">
                                <span>Enviar</span>
                                <span>{quote?.sourceAmount} {quote?.sourceCurrency}</span>
                            </div>
                            <div className="summary-row highlight">
                                <span>Receber</span>
                                <span>{quote?.netAmount} {quote?.destinationCurrency}</span>
                            </div>
                        </div>

                        <button
                            className="btn btn-primary btn-block btn-lg"
                            onClick={handleConfirmOTP}
                            disabled={loading || otp.length !== 6}
                        >
                            {loading ? (
                                <div className="loading-dots">
                                    <span></span><span></span><span></span>
                                </div>
                            ) : (
                                <>
                                    <FiCheck />
                                    Confirmar Transação
                                </>
                            )}
                        </button>

                        <button className="btn btn-secondary btn-block" onClick={resetForm}>
                            Cancelar
                        </button>
                    </div>
                )}

                {/* Step 4: Success */}
                {step === 4 && (
                    <div className="success-section card slide-up">
                        <div className="success-icon">✅</div>
                        <h2>Transação Confirmada!</h2>
                        <p className="text-secondary">
                            Sua transação está sendo processada e você receberá uma notificação em breve.
                        </p>

                        <div className="success-summary">
                            <div className="summary-row">
                                <span>ID</span>
                                <span className="mono">{transactionId}</span>
                            </div>
                            <div className="summary-row">
                                <span>Enviado</span>
                                <span>{quote?.sourceAmount} {quote?.sourceCurrency}</span>
                            </div>
                            <div className="summary-row highlight">
                                <span>A receber</span>
                                <span>{quote?.netAmount} {quote?.destinationCurrency}</span>
                            </div>
                            <div className="summary-row">
                                <span>Status</span>
                                <span className="badge badge-processing">Processando</span>
                            </div>
                        </div>

                        <button className="btn btn-primary btn-block" onClick={resetForm}>
                            Nova Transação
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Exchange

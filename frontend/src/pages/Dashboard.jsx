import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { userAPI, exchangeAPI, transactionAPI } from '../services/api'
import { FiArrowRight, FiTrendingUp, FiAlertCircle, FiCheckCircle, FiClock, FiDollarSign } from 'react-icons/fi'
import toast from 'react-hot-toast'
import mpesaLogo from '../assets/mpesa2.png'
import paypalLogo from '../assets/paypal2.png'
import './Dashboard.css'

const Dashboard = () => {
    const { user } = useAuth()
    const [rates, setRates] = useState(null)
    const [limits, setLimits] = useState(null)
    const [stats, setStats] = useState(null)
    const [recentTxns, setRecentTxns] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            const [ratesRes, limitsRes, statsRes, txnsRes] = await Promise.all([
                exchangeAPI.getRates(),
                userAPI.getLimits(),
                transactionAPI.getStats(),
                transactionAPI.getAll({ limit: 5 })
            ])

            setRates(ratesRes.data.data.rates)
            setLimits(limitsRes.data.data)
            setStats(statsRes.data.data)
            setRecentTxns(txnsRes.data.data.transactions)
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusBadge = (status) => {
        const badges = {
            pending: { class: 'badge-pending', icon: FiClock, text: 'Pendente' },
            processing: { class: 'badge-processing', icon: FiClock, text: 'Processando' },
            completed: { class: 'badge-completed', icon: FiCheckCircle, text: 'Concluído' },
            failed: { class: 'badge-failed', icon: FiAlertCircle, text: 'Falhou' }
        }
        const badge = badges[status] || badges.pending
        return (
            <span className={`badge ${badge.class}`}>
                <badge.icon size={12} />
                {badge.text}
            </span>
        )
    }

    const usdToMznRate = rates?.find(r => r.pair === 'USD/MZN')?.rate || 63.50

    if (loading) {
        return (
            <div className="loading-screen" style={{ minHeight: '50vh' }}>
                <div className="spinner"></div>
            </div>
        )
    }

    return (
        <div className="dashboard fade-in">
            {/* Welcome */}
            <div className="dashboard-header">
                <div>
                    <h1>Olá, {user?.firstName} 👋</h1>
                    <p className="text-secondary">Bem-vindo de volta à Txintxa</p>
                </div>
                <Link to="/exchange" className="btn btn-primary">
                    Nova Troca
                    <FiArrowRight />
                </Link>
            </div>

            {/* Alerts */}
            {!user?.emailVerified && (
                <div className="alert alert-warning">
                    <FiAlertCircle />
                    <span>Verifique seu email para desbloquear todas as funcionalidades.</span>
                    <button className="btn btn-sm btn-secondary">Reenviar</button>
                </div>
            )}

            {(!user?.paypalLinked || !user?.mpesaLinked) && (
                <div className="alert alert-info">
                    <FiAlertCircle />
                    <span>
                        Vincule suas contas {!user?.paypalLinked && 'PayPal'}
                        {!user?.paypalLinked && !user?.mpesaLinked && ' e '}
                        {!user?.mpesaLinked && 'M-Pesa'} para começar a trocar.
                    </span>
                    <Link to="/profile" className="btn btn-sm btn-primary">Vincular</Link>
                </div>
            )}

            {/* Stats Grid */}
            <div className="stats-grid">
                {/* Exchange Rate */}
                <div className="stat-card">
                    <div className="stat-icon rate">
                        <FiTrendingUp />
                    </div>
                    <div className="stat-info">
                        <p className="stat-label">Taxa USD/MZN</p>
                        <p className="stat-value">{usdToMznRate.toFixed(2)}</p>
                    </div>
                </div>

                {/* Total Transactions */}
                <div className="stat-card">
                    <div className="stat-icon transactions">
                        <FiDollarSign />
                    </div>
                    <div className="stat-info">
                        <p className="stat-label">Transações</p>
                        <p className="stat-value">{stats?.totalTransactions || 0}</p>
                    </div>
                </div>

                {/* Daily Limit */}
                <div className="stat-card">
                    <div className="stat-icon limit">
                        <FiClock />
                    </div>
                    <div className="stat-info">
                        <p className="stat-label">Limite Diário</p>
                        <p className="stat-value">
                            ${limits?.daily?.available?.toFixed(0) || 500}
                            <span className="stat-sub"> / ${limits?.daily?.limit || 500}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Exchange */}
            <div className="quick-exchange card">
                <h2>Troca Rápida</h2>
                <div className="exchange-direction">
                    <div className="direction-option active">
                        <img src={paypalLogo} alt="PayPal" style={{ height: '30px' }} />
                        <span className="direction-arrow">→</span>
                        <img src={mpesaLogo} alt="M-Pesa" style={{ height: '30px' }} />
                    </div>
                    <div className="direction-info">
                        <p>$100 USD = <strong>{(100 * usdToMznRate).toFixed(0)} MZN</strong></p>
                        <small>Taxa: 2% + taxa de rede</small>
                    </div>
                </div>
                <Link to="/exchange" className="btn btn-primary btn-block">
                    Iniciar Troca
                    <FiArrowRight />
                </Link>
            </div>

            {/* Recent Transactions */}
            <div className="recent-transactions card">
                <div className="card-header">
                    <h2>Transações Recentes</h2>
                    <Link to="/history" className="btn btn-sm btn-secondary">Ver Todas</Link>
                </div>

                {recentTxns.length > 0 ? (
                    <div className="transactions-list">
                        {recentTxns.map((txn) => (
                            <div key={txn.transactionId} className="transaction-item">
                                <div className="txn-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card-hover)', width: '40px', height: '40px', borderRadius: '50%' }}>
                                    <img
                                        src={txn.type === 'paypal_to_mpesa' ? paypalLogo : mpesaLogo}
                                        alt="Icon"
                                        style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                                    />
                                </div>
                                <div className="txn-details">
                                    <p className="txn-type">
                                        {txn.type === 'paypal_to_mpesa' ? 'PayPal → M-Pesa' : 'M-Pesa → PayPal'}
                                    </p>
                                    <p className="txn-date">
                                        {new Date(txn.createdAt).toLocaleDateString('pt-MZ', {
                                            day: '2-digit',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                                <div className="txn-amount">
                                    <p className="amount-sent">-{txn.sourceAmount} {txn.sourceCurrency}</p>
                                    <p className="amount-received">+{txn.netAmount} {txn.destinationCurrency}</p>
                                </div>
                                <div className="txn-status">
                                    {getStatusBadge(txn.status)}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <p>Nenhuma transação ainda</p>
                        <Link to="/exchange" className="btn btn-primary btn-sm">Fazer primeira troca</Link>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Dashboard

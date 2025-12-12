import { useState, useEffect } from 'react'
import { transactionAPI } from '../services/api'
import { FiSearch, FiFilter, FiDownload, FiClock, FiCheckCircle, FiAlertCircle, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import toast from 'react-hot-toast'
import mpesaLogo from '../assets/mpesa2.png'
import paypalLogo from '../assets/paypal2.png'
import './History.css'

const History = () => {
    const [transactions, setTransactions] = useState([])
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 })
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState({
        status: '',
        type: '',
        startDate: '',
        endDate: ''
    })
    const [showFilters, setShowFilters] = useState(false)
    const [selectedTxn, setSelectedTxn] = useState(null)

    useEffect(() => {
        fetchTransactions()
    }, [pagination.page, filters])

    const fetchTransactions = async () => {
        setLoading(true)
        try {
            const response = await transactionAPI.getAll({
                page: pagination.page,
                limit: pagination.limit,
                ...filters
            })
            setTransactions(response.data.data.transactions)
            setPagination(prev => ({ ...prev, ...response.data.data.pagination }))
        } catch (error) {
            toast.error('Erro ao carregar transações')
        } finally {
            setLoading(false)
        }
    }

    const handleExport = async () => {
        try {
            const response = await transactionAPI.export({
                ...filters,
                format: 'csv'
            })

            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', 'transacoes-txintxa.csv')
            document.body.appendChild(link)
            link.click()
            link.remove()

            toast.success('Exportação concluída')
        } catch (error) {
            toast.error('Erro ao exportar')
        }
    }

    const getStatusInfo = (status) => {
        const statuses = {
            pending: { class: 'badge-pending', icon: FiClock, text: 'Pendente' },
            processing: { class: 'badge-processing', icon: FiClock, text: 'Processando' },
            awaiting_source: { class: 'badge-processing', icon: FiClock, text: 'Aguardando' },
            source_completed: { class: 'badge-processing', icon: FiClock, text: 'Processando' },
            awaiting_destination: { class: 'badge-processing', icon: FiClock, text: 'Finalizando' },
            completed: { class: 'badge-completed', icon: FiCheckCircle, text: 'Concluído' },
            failed: { class: 'badge-failed', icon: FiAlertCircle, text: 'Falhou' },
            cancelled: { class: 'badge-failed', icon: FiAlertCircle, text: 'Cancelado' }
        }
        return statuses[status] || statuses.pending
    }

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('pt-MZ', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="history-page fade-in">
            <div className="history-header">
                <div>
                    <h1>Histórico de Transações</h1>
                    <p className="text-secondary">{pagination.total} transações encontradas</p>
                </div>
                <div className="header-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <FiFilter />
                        Filtros
                    </button>
                    <button className="btn btn-secondary" onClick={handleExport}>
                        <FiDownload />
                        Exportar
                    </button>
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="filters-panel card slide-up">
                    <div className="filters-grid">
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select
                                className="form-input"
                                value={filters.status}
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            >
                                <option value="">Todos</option>
                                <option value="pending">Pendente</option>
                                <option value="processing">Processando</option>
                                <option value="completed">Concluído</option>
                                <option value="failed">Falhou</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tipo</label>
                            <select
                                className="form-input"
                                value={filters.type}
                                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                            >
                                <option value="">Todos</option>
                                <option value="paypal_to_mpesa">PayPal → M-Pesa</option>
                                <option value="mpesa_to_paypal">M-Pesa → PayPal</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Data Início</label>
                            <input
                                type="date"
                                className="form-input"
                                value={filters.startDate}
                                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Data Fim</label>
                            <input
                                type="date"
                                className="form-input"
                                value={filters.endDate}
                                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                            />
                        </div>
                    </div>
                    <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => setFilters({ status: '', type: '', startDate: '', endDate: '' })}
                    >
                        Limpar Filtros
                    </button>
                </div>
            )}

            {/* Transactions List */}
            <div className="transactions-container card">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                    </div>
                ) : transactions.length > 0 ? (
                    <>
                        <div className="transactions-list">
                            {transactions.map((txn) => {
                                const statusInfo = getStatusInfo(txn.status)
                                return (
                                    <div
                                        key={txn.transactionId}
                                        className="transaction-card"
                                        onClick={() => setSelectedTxn(txn)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className="txn-main">
                                            <div className="txn-type-icon">
                                                {txn.type === 'paypal_to_mpesa' ? '💸' : '💰'}
                                            </div>
                                            <div className="txn-info">
                                                <p className="txn-id">{txn.transactionId}</p>
                                                <p className="txn-type-label">
                                                    {txn.type === 'paypal_to_mpesa' ? 'PayPal → M-Pesa' : 'M-Pesa → PayPal'}
                                                </p>
                                                <p className="txn-date">{formatDate(txn.createdAt)}</p>
                                            </div>
                                        </div>
                                        <div className="txn-amounts">
                                            <p className="txn-sent">
                                                -{txn.sourceAmount.toFixed(2)} {txn.sourceCurrency}
                                            </p>
                                            <p className="txn-received">
                                                +{txn.netAmount.toFixed(2)} {txn.destinationCurrency}
                                            </p>
                                        </div>
                                        <div className="txn-status-col">
                                            <span className={`badge ${statusInfo.class}`}>
                                                <statusInfo.icon size={12} />
                                                {statusInfo.text}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Pagination ... (mantido igual) */}
                        {pagination.pages > 1 && (
                            <div className="pagination">
                                <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                    disabled={pagination.page === 1}
                                >
                                    <FiChevronLeft />
                                </button>
                                <span className="page-info">
                                    Página {pagination.page} de {pagination.pages}
                                </span>
                                <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                    disabled={pagination.page === pagination.pages}
                                >
                                    <FiChevronRight />
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <h3>Nenhuma transação</h3>
                        <p>Você ainda não fez nenhuma transação.</p>
                    </div>
                )}
            </div>

            {/* Transaction Details Modal */}
            {selectedTxn && (
                <div className="modal-overlay" onClick={() => setSelectedTxn(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Detalhes da Transação</h2>
                            <button className="close-btn" onClick={() => setSelectedTxn(null)}>
                                <FiAlertCircle style={{ transform: 'rotate(45deg)' }} /> {/* Using AlertCircle as X icon or import FiX */}
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-group highlight">
                                <label>ID da Transação</label>
                                <p className="mono">{selectedTxn.transactionId}</p>
                            </div>

                            <div className="detail-row date-row">
                                <label>Data</label>
                                <p>{new Date(selectedTxn.createdAt).toLocaleString('pt-MZ')}</p>
                            </div>

                            <div className="detail-status">
                                <label>Status</label>
                                {(() => {
                                    const info = getStatusInfo(selectedTxn.status);
                                    return (
                                        <span className={`badge ${info.class}`}>
                                            <info.icon size={14} /> {info.text}
                                        </span>
                                    );
                                })()}
                            </div>

                            <div className="divider"></div>

                            <div className="financial-details">
                                <div className="detail-row">
                                    <span>Valor Enviado</span>
                                    <span className="value">{selectedTxn.sourceAmount.toFixed(2)} {selectedTxn.sourceCurrency}</span>
                                </div>
                                <div className="detail-row">
                                    <span>Taxa de Câmbio</span>
                                    <span className="value">{selectedTxn.exchangeRate.toFixed(4)}</span>
                                </div>
                                <div className="detail-row">
                                    <span>Valor Bruto</span>
                                    <span className="value">{selectedTxn.destinationAmount.toFixed(2)} {selectedTxn.destinationCurrency}</span>
                                </div>

                                <div className="detail-row fee-row" style={{ color: '#ef4444' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span>Menos Taxas</span>
                                        <small style={{ fontSize: '0.75rem', opacity: 0.8 }}>({selectedTxn.fees?.percentage}% + ${selectedTxn.fees?.fixed})</small>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                        <span>- {selectedTxn.fees?.total.toFixed(2)} {selectedTxn.sourceCurrency}</span>
                                        <small style={{ fontSize: '0.75rem', opacity: 0.8 }}>(≈ {(selectedTxn.fees?.total * selectedTxn.exchangeRate).toFixed(2)} {selectedTxn.destinationCurrency})</small>
                                    </div>
                                </div>

                                <div className="detail-row total-row">
                                    <span>Valor Recebido</span>
                                    <span className="value highlight">{selectedTxn.netAmount.toFixed(2)} {selectedTxn.destinationCurrency}</span>
                                </div>
                            </div>

                            <div className="divider"></div>

                            <div className="account-details">
                                <h3>Fluxo de Contas</h3>
                                <div className="flow-container" style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '15px',
                                    background: 'var(--bg-dark)',
                                    padding: '15px',
                                    borderRadius: '8px',
                                    marginTop: '10px'
                                }}>
                                    {/* Origem */}
                                    <div className="account-flow-item" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div className="flow-icon" style={{
                                            width: '32px', height: '32px', borderRadius: '50%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: '#f8f9fa',
                                            overflow: 'hidden'
                                        }}>
                                            <img
                                                src={selectedTxn.type === 'paypal_to_mpesa' ? paypalLogo : mpesaLogo}
                                                alt="Source"
                                                style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>De (Origem)</span>
                                            <span style={{ fontWeight: 500 }}>{selectedTxn.source?.accountIdentifier || '---'}</span>
                                        </div>
                                    </div>

                                    {/* Seta */}
                                    <div style={{ paddingLeft: '14px', borderLeft: '2px dashed var(--border)', height: '20px', marginLeft: '16px', opacity: 0.5 }}></div>

                                    {/* Destino */}
                                    <div className="account-flow-item" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div className="flow-icon" style={{
                                            width: '32px', height: '32px', borderRadius: '50%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: '#f8f9fa',
                                            overflow: 'hidden'
                                        }}>
                                            <img
                                                src={selectedTxn.type === 'paypal_to_mpesa' ? mpesaLogo : paypalLogo}
                                                alt="Dest"
                                                style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Para (Destino)</span>
                                            <span style={{ fontWeight: 500 }}>{selectedTxn.destination?.accountIdentifier || '---'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-primary btn-block" onClick={() => setSelectedTxn(null)}>Fechar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default History

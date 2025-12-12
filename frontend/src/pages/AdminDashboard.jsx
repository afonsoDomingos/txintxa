import React from 'react'
import './Dashboard.css'

const AdminDashboard = () => {
    return (
        <div className="dashboard-container fade-in">
            <header className="dashboard-header">
                <div>
                    <h1>Painel do Administrador 🛡️</h1>
                    <p className="text-secondary">Visão geral do sistema Txintxa</p>
                </div>
            </header>

            <div className="dashboard-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(255, 123, 0, 0.1)', color: '#ff7b00' }}>👥</div>
                    <div>
                        <div className="stat-label">Usuários Totais</div>
                        <div className="stat-value">Simulado</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>💰</div>
                    <div>
                        <div className="stat-label">Volume Total</div>
                        <div className="stat-value">$0.00</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>⚠️</div>
                    <div>
                        <div className="stat-label">Pendentes</div>
                        <div className="stat-value">0</div>
                    </div>
                </div>
            </div>

            <div className="content-grid" style={{ marginTop: '2rem' }}>
                <div className="content-card">
                    <div className="card-header">
                        <h3>Transações Recentes</h3>
                    </div>
                    <div className="empty-state">
                        <p>Nenhuma transação para revisar no momento.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AdminDashboard

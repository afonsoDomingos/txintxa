import React, { useEffect, useState } from 'react';
import api from '../services/api';
import './Dashboard.css';

const AdminDashboard = () => {
    const [data, setData] = useState({
        totalUsers: 0,
        totalVolume: 0,
        pendingCount: 0,
        recentTransactions: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await api.get('/admin/dashboard');
                if (res.data.success) {
                    setData(res.data.data);
                }
            } catch (err) {
                console.error('Erro ao carregar admin dashboard', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    const { totalUsers, totalVolume, pendingCount, recentTransactions } = data;

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
                        <div className="stat-value">{loading ? '...' : totalUsers}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>💰</div>
                    <div>
                        <div className="stat-label">Volume Total (USD)</div>
                        <div className="stat-value">{loading ? '...' : `$${totalVolume.toFixed(2)}`}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>⚠️</div>
                    <div>
                        <div className="stat-label">Pendentes</div>
                        <div className="stat-value">{loading ? '...' : pendingCount}</div>
                    </div>
                </div>
            </div>

            <div className="content-grid" style={{ marginTop: '2rem' }}>
                <div className="content-card">
                    <div className="card-header">
                        <h3>Transações Recentes</h3>
                    </div>
                    {loading ? (
                        <p>Carregando...</p>
                    ) : recentTransactions.length === 0 ? (
                        <div className="empty-state"><p>Nenhuma transação para revisar no momento.</p></div>
                    ) : (
                        <table className="table-auto w-full">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="px-4 py-2">Usuário</th>
                                    <th className="px-4 py-2">Valor (USD)</th>
                                    <th className="px-4 py-2">Status</th>
                                    <th className="px-4 py-2">Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentTransactions.map((tx) => (
                                    <tr key={tx._id} className="border-t">
                                        <td className="px-4 py-2">{tx.user?.fullName || tx.user?.email}</td>
                                        <td className="px-4 py-2">${tx.amountUSD?.toFixed(2)}</td>
                                        <td className="px-4 py-2">{tx.status}</td>
                                        <td className="px-4 py-2">{new Date(tx.createdAt).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;

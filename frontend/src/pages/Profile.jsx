
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { userAPI } from '../services/api'
import { FiUser, FiMail, FiPhone, FiShield, FiLink, FiX, FiCheck, FiAlertCircle, FiCamera } from 'react-icons/fi'
import toast from 'react-hot-toast'
import './Profile.css'

const Profile = () => {
    const { user, updateUser, fetchUser } = useAuth()
    const [activeTab, setActiveTab] = useState('info')
    const [loading, setLoading] = useState(false)

    const [paypalEmail, setPaypalEmail] = useState('')
    const [mpesaPhone, setMpesaPhone] = useState('')
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        avatar: ''
    })

    const startEditing = () => {
        setEditForm({
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.email || '',
            phone: user?.phone || '',
            avatar: user?.avatar || ''
        })
        setIsEditing(true)
    }

    const handleAvatarChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            if (file.size > 1024 * 1024 * 5) { // 5MB
                toast.error('Imagem muito grande. Máximo 5MB.')
                return
            }

            const reader = new FileReader()
            reader.onloadend = () => {
                setEditForm(prev => ({ ...prev, avatar: reader.result }))
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSaveProfile = async () => {
        setLoading(true)
        try {
            // Primeiro envia para o backend
            await userAPI.updateProfile(editForm)

            // Depois atualiza o contexto local (ou chama fetchUser para garantir sincronia)
            await fetchUser()

            toast.success('Perfil atualizado com sucesso!')
            setIsEditing(false)
        } catch (error) {
            console.error(error)
            toast.error(error.response?.data?.message || 'Erro ao atualizar perfil')
        } finally {
            setLoading(false)
        }
    }

    const handleLinkPayPal = async () => {
        if (!paypalEmail) {
            toast.error('Digite o email do PayPal')
            return
        }
        setLoading(true)
        try {
            await userAPI.linkPayPal(paypalEmail)
            toast.success('PayPal vinculado com sucesso!')
            fetchUser()
        } catch (error) {
            console.error(error)
            toast.error(error.response?.data?.message || 'Erro ao vincular PayPal')
        } finally {
            setLoading(false)
        }
    }

    const handleUnlinkPayPal = async () => {
        if (!confirm('Tem certeza que deseja desvincular sua conta PayPal?')) return
        setLoading(true)
        try {
            await userAPI.unlinkPayPal()
            toast.success('PayPal desvinculado com sucesso!')
            setPaypalEmail('')
            fetchUser()
        } catch (error) {
            console.error(error)
            toast.error(error.response?.data?.message || 'Erro ao desvincular PayPal')
        } finally {
            setLoading(false)
        }
    }

    const handleLinkMPesa = async () => {
        if (!mpesaPhone) {
            toast.error('Digite o número do M-Pesa')
            return
        }
        setLoading(true)
        try {
            await userAPI.linkMPesa(mpesaPhone)
            toast.success('M-Pesa vinculado com sucesso!')
            fetchUser()
        } catch (error) {
            console.error(error)
            toast.error(error.response?.data?.message || 'Erro ao vincular M-Pesa')
        } finally {
            setLoading(false)
        }
    }

    const handleUnlinkMPesa = async () => {
        if (!confirm('Tem certeza que deseja desvincular sua conta M-Pesa?')) return
        setLoading(true)
        try {
            await userAPI.unlinkMPesa()
            toast.success('M-Pesa desvinculado com sucesso!')
            setMpesaPhone('')
            fetchUser()
        } catch (error) {
            console.error(error)
            toast.error(error.response?.data?.message || 'Erro ao desvincular M-Pesa')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="profile-page fade-in">
            <div className="profile-header">
                <div className="profile-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {user?.avatar ? (
                        <img src={user.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <span>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</span>
                    )}
                </div>
                <div className="profile-info">
                    <h1>{user?.firstName} {user?.lastName}</h1>
                    <p className="text-secondary">{user?.email}</p>
                    <div className="profile-badges">
                        {user?.emailVerified ? (
                            <span className="badge badge-completed"><FiCheck size={12} /> Email verificado</span>
                        ) : (
                            <span className="badge badge-pending"><FiAlertCircle size={12} /> Email não verificado</span>
                        )}
                        {user?.kycStatus === 'approved' && (
                            <span className="badge badge-completed"><FiShield size={12} /> KYC aprovado</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="profile-tabs">
                <button
                    className={`tab - btn ${activeTab === 'info' ? 'active' : ''} `}
                    onClick={() => setActiveTab('info')}
                >
                    <FiUser /> Informações
                </button>
                <button
                    className={`tab - btn ${activeTab === 'accounts' ? 'active' : ''} `}
                    onClick={() => setActiveTab('accounts')}
                >
                    <FiLink /> Contas
                </button>
                <button
                    className={`tab - btn ${activeTab === 'security' ? 'active' : ''} `}
                    onClick={() => setActiveTab('security')}
                >
                    <FiShield /> Segurança
                </button>
            </div>

            <div className="profile-content">
                {/* Info Tab */}
                {activeTab === 'info' && (
                    <div className="tab-content card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2>Informações Pessoais</h2>
                            {!isEditing && (
                                <button className="btn btn-sm btn-secondary" onClick={startEditing}>
                                    <FiUser /> Editar Perfil
                                </button>
                            )}
                        </div>

                        {isEditing ? (
                            <div className="edit-form-grid" style={{ display: 'grid', gap: '15px' }}>
                                {/* Avatar Upload */}
                                <div className="form-avatar-upload" style={{ textAlign: 'center', marginBottom: '10px' }}>
                                    <div className="avatar-preview" style={{
                                        width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden',
                                        margin: '0 auto 15px', background: 'var(--bg-input)', border: '2px solid var(--primary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        {editForm.avatar ? (
                                            <img src={editForm.avatar} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ fontSize: '2rem', color: 'var(--text-muted)' }}>
                                                {editForm.firstName?.charAt(0)}{editForm.lastName?.charAt(0)}
                                            </span>
                                        )}
                                    </div>
                                    <label htmlFor="avatar-upload" className="btn btn-sm btn-outline" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                                        <FiCamera /> Alterar Foto
                                    </label>
                                    <input
                                        id="avatar-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                        style={{ display: 'none' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Nome</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={editForm.firstName}
                                        onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Sobrenome</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={editForm.lastName}
                                        onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={editForm.email}
                                        onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Telefone</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={editForm.phone}
                                        onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                    />
                                </div>

                                <div className="form-actions" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button className="btn btn-primary" onClick={handleSaveProfile} disabled={loading}>
                                        Salvar Alterações
                                    </button>
                                    <button className="btn btn-secondary" onClick={() => setIsEditing(false)} disabled={loading}>
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="info-grid">
                                <div className="info-item">
                                    <label>Nome</label>
                                    <p>{user?.firstName} {user?.lastName}</p>
                                </div>
                                <div className="info-item">
                                    <label>Email</label>
                                    <p>{user?.email}</p>
                                </div>
                                <div className="info-item">
                                    <label>Telefone</label>
                                    <p>{user?.phone}</p>
                                </div>
                                <div className="info-item">
                                    <label>Status KYC</label>
                                    <p className={`kyc - status ${user?.kycStatus} `}>
                                        {user?.kycStatus === 'approved' ? 'Aprovado' :
                                            user?.kycStatus === 'submitted' ? 'Em análise' :
                                                user?.kycStatus === 'rejected' ? 'Rejeitado' : 'Pendente'}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="limits-section">
                            <h3>Seus Limites</h3>
                            <div className="limits-grid">
                                <div className="limit-item">
                                    <span className="limit-label">Limite Diário</span>
                                    <div className="limit-bar">
                                        <div
                                            className="limit-progress"
                                            style={{ width: `${(user?.limits?.dailyUsed / user?.limits?.dailyLimit) * 100}% ` }}
                                        ></div>
                                    </div>
                                    <span className="limit-value">
                                        ${user?.limits?.dailyUsed?.toFixed(0) || 0} / ${user?.limits?.dailyLimit || 500}
                                    </span>
                                </div>
                                <div className="limit-item">
                                    <span className="limit-label">Limite Semanal</span>
                                    <div className="limit-bar">
                                        <div
                                            className="limit-progress"
                                            style={{ width: `${(user?.limits?.weeklyUsed / user?.limits?.weeklyLimit) * 100}% ` }}
                                        ></div>
                                    </div>
                                    <span className="limit-value">
                                        ${user?.limits?.weeklyUsed?.toFixed(0) || 0} / ${user?.limits?.weeklyLimit || 2000}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Accounts Tab */}
                {activeTab === 'accounts' && (
                    <div className="tab-content card">
                        <h2>Contas Vinculadas</h2>

                        {/* PayPal */}
                        <div className="account-section">
                            <div className="account-header">
                                <div className="account-icon paypal">
                                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19a.796.796 0 0 0-.786.678l-.068.44-.549 3.48-.027.17a.263.263 0 0 1-.26.238z" />
                                    </svg>
                                </div>
                                <div className="account-info">
                                    <h3>PayPal</h3>
                                    {user?.paypalLinked ? (
                                        <p className="account-linked">
                                            <FiCheck /> Vinculado
                                        </p>
                                    ) : (
                                        <p className="account-not-linked">Não vinculado</p>
                                    )}
                                </div>
                            </div>

                            {user?.paypalLinked ? (
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={handleUnlinkPayPal}
                                    disabled={loading}
                                >
                                    <FiX /> Desvincular
                                </button>
                            ) : (
                                <div className="link-form">
                                    <input
                                        type="email"
                                        className="form-input"
                                        placeholder="Email do PayPal"
                                        value={paypalEmail}
                                        onChange={(e) => setPaypalEmail(e.target.value)}
                                    />
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleLinkPayPal}
                                        disabled={loading}
                                    >
                                        <FiLink /> Vincular
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* M-Pesa */}
                        <div className="account-section">
                            <div className="account-header">
                                <div className="account-icon mpesa">
                                    <span>M</span>
                                </div>
                                <div className="account-info">
                                    <h3>M-Pesa</h3>
                                    {user?.mpesaLinked ? (
                                        <p className="account-linked">
                                            <FiCheck /> Vinculado
                                        </p>
                                    ) : (
                                        <p className="account-not-linked">Não vinculado</p>
                                    )}
                                </div>
                            </div>

                            {user?.mpesaLinked ? (
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={handleUnlinkMPesa}
                                    disabled={loading}
                                >
                                    <FiX /> Desvincular
                                </button>
                            ) : (
                                <div className="link-form">
                                    <input
                                        type="tel"
                                        className="form-input"
                                        placeholder="Número M-Pesa (84 xxx xxxx)"
                                        value={mpesaPhone}
                                        onChange={(e) => setMpesaPhone(e.target.value)}
                                    />
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleLinkMPesa}
                                        disabled={loading}
                                    >
                                        <FiLink /> Vincular
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                    <div className="tab-content card">
                        <h2>Segurança</h2>

                        <div className="security-item">
                            <div className="security-info">
                                <h3>Alterar Senha</h3>
                                <p>Atualize sua senha regularmente para maior segurança.</p>
                            </div>
                            <button className="btn btn-secondary">Alterar</button>
                        </div>

                        <div className="security-item">
                            <div className="security-info">
                                <h3>Autenticação de Dois Fatores</h3>
                                <p>Adicione uma camada extra de segurança à sua conta.</p>
                            </div>
                            <button className="btn btn-secondary">Configurar</button>
                        </div>

                        <div className="security-item">
                            <div className="security-info">
                                <h3>Sessões Ativas</h3>
                                <p>Gerencie os dispositivos conectados à sua conta.</p>
                            </div>
                            <button className="btn btn-secondary">Ver Sessões</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Profile

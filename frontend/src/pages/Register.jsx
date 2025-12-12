import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FiUser, FiMail, FiPhone, FiLock, FiEye, FiEyeOff, FiCheck } from 'react-icons/fi'
import toast from 'react-hot-toast'

const Register = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        acceptTerms: false
    })
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const { register } = useAuth()
    const navigate = useNavigate()

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
    }

    const validateForm = () => {
        if (!formData.firstName || !formData.lastName) {
            toast.error('Preencha seu nome completo')
            return false
        }
        if (!formData.email.includes('@')) {
            toast.error('Email inválido')
            return false
        }
        if (formData.phone.length < 9) {
            toast.error('Número de telefone inválido')
            return false
        }
        if (formData.password.length < 8) {
            toast.error('Senha deve ter pelo menos 8 caracteres')
            return false
        }
        if (formData.password !== formData.confirmPassword) {
            toast.error('Senhas não coincidem')
            return false
        }
        if (!formData.acceptTerms) {
            toast.error('Aceite os termos de uso')
            return false
        }
        return true
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!validateForm()) return

        setLoading(true)

        try {
            await register({
                ...formData,
                acceptTerms: String(formData.acceptTerms)
            })
            toast.success('Conta criada! Verifique seu email.')
            navigate('/dashboard')
        } catch (error) {
            const message = error.response?.data?.message || 'Erro ao criar conta'
            toast.error(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fade-in">
            <h1 className="auth-title">Criar conta</h1>
            <p className="auth-subtitle">Comece a trocar valores hoje</p>

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                    <div className="form-group">
                        <label className="form-label">Nome</label>
                        <div className="input-wrapper">
                            <FiUser className="input-icon" />
                            <input
                                type="text"
                                name="firstName"
                                className="form-input"
                                placeholder="João"
                                value={formData.firstName}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Sobrenome</label>
                        <input
                            type="text"
                            name="lastName"
                            className="form-input"
                            placeholder="Silva"
                            value={formData.lastName}
                            onChange={handleChange}
                            required
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Email</label>
                    <div className="input-wrapper">
                        <FiMail className="input-icon" />
                        <input
                            type="email"
                            name="email"
                            className="form-input"
                            placeholder="seu@email.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Telefone (M-Pesa)</label>
                    <div className="input-wrapper">
                        <FiPhone className="input-icon" />
                        <input
                            type="tel"
                            name="phone"
                            className="form-input"
                            placeholder="84 123 4567"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Senha</label>
                    <div className="input-wrapper">
                        <FiLock className="input-icon" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            className="form-input"
                            placeholder="Mínimo 8 caracteres"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            style={{ paddingRight: '48px' }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: 'absolute',
                                right: '16px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer'
                            }}
                        >
                            {showPassword ? <FiEyeOff /> : <FiEye />}
                        </button>
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Confirmar Senha</label>
                    <div className="input-wrapper">
                        <FiLock className="input-icon" />
                        <input
                            type="password"
                            name="confirmPassword"
                            className="form-input"
                            placeholder="Repita a senha"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                    </div>
                </div>

                <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                    <label style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 'var(--space-sm)',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)'
                    }}>
                        <input
                            type="checkbox"
                            name="acceptTerms"
                            checked={formData.acceptTerms}
                            onChange={handleChange}
                            style={{ marginTop: '4px' }}
                        />
                        <span>
                            Li e aceito os <a href="/terms" target="_blank">Termos de Uso</a> e{' '}
                            <a href="/privacy" target="_blank">Política de Privacidade</a>
                        </span>
                    </label>
                </div>

                <button
                    type="submit"
                    className="btn btn-primary btn-block btn-lg"
                    disabled={loading}
                >
                    {loading ? (
                        <div className="loading-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    ) : (
                        <>
                            <FiCheck />
                            Criar Conta
                        </>
                    )}
                </button>
            </form>

            <p className="auth-link">
                Já tem uma conta? <Link to="/login">Entrar</Link>
            </p>
        </div>
    )
}

export default Register

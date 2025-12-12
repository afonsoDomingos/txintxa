import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'
import toast from 'react-hot-toast'

const Login = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const { login } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('') // Limpar erros anteriores

        if (!email || !password) {
            toast.error('Preencha todos os campos')
            return
        }

        setLoading(true)

        try {
            const response = await login(email, password)

            toast.success('Login realizado com sucesso!', {
                // ... estilos mantidos
                style: {
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 123, 0, 0.2)',
                    padding: '8px 16px',
                    fontSize: '0.875rem',
                    color: '#ff7b00',
                    fontWeight: '500',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                    maxWidth: 'fit-content'
                },
                iconTheme: {
                    primary: '#ff7b00',
                    secondary: '#fff',
                },
            })

            // Redirecionamento baseado no cargo (Role)
            const userRole = response.data?.user?.role;
            if (userRole === 'admin' || userRole === 'superadmin') {
                navigate('/admin');
            } else {
                navigate('/dashboard');
            }
        } catch (error) {
            console.error('Login error:', error)
            let message = 'Erro ao fazer login'

            if (error.response?.data?.message) {
                message = error.response.data.message
            } else if (error.message === 'Network Error' || !error.response) {
                message = 'Não foi possível conectar ao servidor. Verifique sua internet.'
            }

            setError(message)
            toast.error(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fade-in">
            <h1 className="auth-title">Bem-vindo de volta</h1>
            <p className="auth-subtitle">Entre na sua conta para continuar</p>

            {error && (
                <div className="alert alert-error mb-3" style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    padding: '10px',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                }}>
                    <span>⚠️</span>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label">Email</label>
                    <div className="input-wrapper">
                        <FiMail className="input-icon" />
                        <input
                            type="email"
                            className="form-input"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
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
                            className="form-input"
                            placeholder="Sua senha"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                            style={{ paddingRight: '48px' }}
                        />
                        <button
                            type="button"
                            className="input-toggle"
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

                <div style={{ textAlign: 'right', marginBottom: 'var(--space-lg)' }}>
                    <Link to="/forgot-password" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Esqueceu a senha?
                    </Link>
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
                        'Entrar'
                    )}
                </button>
            </form>

            <p className="auth-link">
                Não tem uma conta? <Link to="/register">Criar conta</Link>
            </p>
        </div>
    )
}

export default Login

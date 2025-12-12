import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { authAPI } from '../services/api'
import { FiCheckCircle, FiXCircle } from 'react-icons/fi'

const VerifyEmail = () => {
    const [searchParams] = useSearchParams()
    const [status, setStatus] = useState('loading')
    const token = searchParams.get('token')

    useEffect(() => {
        if (token) {
            verifyEmail()
        } else {
            setStatus('error')
        }
    }, [token])

    const verifyEmail = async () => {
        try {
            await authAPI.verifyEmail(token)
            setStatus('success')
        } catch (error) {
            setStatus('error')
        }
    }

    return (
        <div className="fade-in" style={{ textAlign: 'center' }}>
            {status === 'loading' && (
                <>
                    <div className="spinner" style={{ margin: '0 auto var(--space-lg)' }}></div>
                    <h2>Verificando email...</h2>
                </>
            )}

            {status === 'success' && (
                <>
                    <FiCheckCircle size={64} color="var(--success)" style={{ marginBottom: 'var(--space-lg)' }} />
                    <h2>Email Verificado!</h2>
                    <p className="text-secondary" style={{ marginBottom: 'var(--space-xl)' }}>
                        Seu email foi verificado com sucesso.
                    </p>
                    <Link to="/dashboard" className="btn btn-primary">
                        Ir para Dashboard
                    </Link>
                </>
            )}

            {status === 'error' && (
                <>
                    <FiXCircle size={64} color="var(--error)" style={{ marginBottom: 'var(--space-lg)' }} />
                    <h2>Erro na Verificação</h2>
                    <p className="text-secondary" style={{ marginBottom: 'var(--space-xl)' }}>
                        O link expirou ou é inválido.
                    </p>
                    <Link to="/login" className="btn btn-primary">
                        Fazer Login
                    </Link>
                </>
            )}
        </div>
    )
}

export default VerifyEmail

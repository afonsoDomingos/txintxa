import { Link } from 'react-router-dom'
import { FiHome, FiArrowLeft } from 'react-icons/fi'

const NotFound = () => {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: 'var(--space-lg)'
        }}>
            <div style={{ fontSize: '8rem', marginBottom: 'var(--space-lg)' }}>🔍</div>
            <h1 style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>404</h1>
            <p style={{
                fontSize: '1.25rem',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--space-xl)',
                maxWidth: '400px'
            }}>
                Página não encontrada. A página que você procura não existe ou foi movida.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                <Link to="/" className="btn btn-primary">
                    <FiHome />
                    Ir para Início
                </Link>
                <button onClick={() => window.history.back()} className="btn btn-secondary">
                    <FiArrowLeft />
                    Voltar
                </button>
            </div>
        </div>
    )
}

export default NotFound

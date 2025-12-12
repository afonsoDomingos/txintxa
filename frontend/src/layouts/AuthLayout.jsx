import { Outlet, Link } from 'react-router-dom'
import logoImg from '../assets/laranja.png'
import './AuthLayout.css'

const AuthLayout = () => {
    return (
        <div className="auth-layout">
            <div className="auth-background">
                <div className="auth-orb auth-orb-1"></div>
                <div className="auth-orb auth-orb-2"></div>
            </div>

            <div className="auth-container">
                <Link to="/" className="auth-logo">
                    <img src={logoImg} alt="Txintxa" className="logo-image" style={{ height: '40px' }} />
                    <span className="logo-text">Txintxa</span>
                </Link>

                <div className="auth-card">
                    <Outlet />
                </div>

                <p className="auth-footer">
                    © {new Date().getFullYear()} Txintxa. Todos os direitos reservados.
                </p>
            </div>
        </div>
    )
}

export default AuthLayout

import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { FiHome, FiRepeat, FiClock, FiUser, FiLogOut, FiMenu, FiX, FiSun, FiMoon } from 'react-icons/fi'
import { useState } from 'react'
import logoImg from '../assets/laranja.png'
import Assistant from '../components/Assistant'
import './MainLayout.css'

const MainLayout = () => {
    const { user, logout } = useAuth()
    const { theme, toggleTheme } = useTheme()
    const navigate = useNavigate()
    const [menuOpen, setMenuOpen] = useState(false)

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    const navItems = [
        { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
        { path: '/exchange', icon: FiRepeat, label: 'Trocar' },
        { path: '/history', icon: FiClock, label: 'Histórico' },
        { path: '/profile', icon: FiUser, label: 'Perfil' }
    ]

    return (
        <div className="main-layout">
            {/* Header */}
            <header className="header">
                <div className="header-container">
                    <NavLink to="/dashboard" className="logo">
                        <img src={logoImg} alt="Txintxa" className="logo-image" style={{ height: '32px' }} />
                        <span className="logo-text">Txintxa</span>
                    </NavLink>

                    {/* Desktop Nav */}
                    <nav className="nav-desktop">
                        {navItems.map(item => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            >
                                <item.icon />
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>

                    <div className="header-right">
                        <button
                            onClick={toggleTheme}
                            className="theme-toggle-btn"
                            title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-primary)',
                                marginRight: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '8px',
                                borderRadius: '50%',
                                transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            {theme === 'dark' ? <FiSun size={20} /> : <FiMoon size={20} />}
                        </button>

                        <div className="user-info">
                            <div className="user-avatar-small" style={{
                                width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', marginRight: '8px',
                                border: '1px solid rgba(0,0,0,0.1)'
                            }}>
                                <img
                                    src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=f3f4f6&color=374151`}
                                    alt="Profile"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div>
                            <span className="user-name">{user?.firstName}</span>
                            <button onClick={handleLogout} className="btn-logout" title="Sair">
                                <FiLogOut />
                            </button>
                        </div>

                        {/* Mobile Menu Toggle */}
                        <button
                            className="menu-toggle"
                            onClick={() => setMenuOpen(!menuOpen)}
                            aria-label="Menu"
                        >
                            {menuOpen ? <FiX /> : <FiMenu />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Nav */}
            <nav className={`nav-mobile ${menuOpen ? 'open' : ''}`}>
                {navItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        onClick={() => setMenuOpen(false)}
                    >
                        <item.icon />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
                <button onClick={handleLogout} className="nav-link logout">
                    <FiLogOut />
                    <span>Sair</span>
                </button>
            </nav>

            {/* Main Content */}
            <main className="main-content">
                <Outlet />
            </main>

            {/* Bottom Nav for Mobile */}
            <nav className="bottom-nav">
                {navItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
                    >
                        <item.icon />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <Assistant />
        </div>
    )
}

export default MainLayout

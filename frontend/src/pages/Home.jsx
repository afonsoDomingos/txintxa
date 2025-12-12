import logo from '../assets/laranja.png'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiShield, FiZap, FiDollarSign, FiSmartphone, FiGlobe, FiCheck } from 'react-icons/fi'
import mpesaLogo from '../assets/mpesa2.png'
import paypalLogo from '../assets/paypal2.png'
import './Home.css'

const Home = () => {
    const features = [
        {
            icon: FiZap,
            title: 'Transferências Rápidas',
            description: 'Processe suas transações em minutos, não dias.'
        },
        {
            icon: FiShield,
            title: 'Segurança Máxima',
            description: 'Criptografia de ponta a ponta e verificação 2FA.'
        },
        {
            icon: FiDollarSign,
            title: 'Taxas Competitivas',
            description: 'Apenas 2% + taxa de rede. Sem custos ocultos.'
        },
        {
            icon: FiSmartphone,
            title: 'Mobile-First',
            description: 'Design otimizado para uso no seu smartphone.'
        },
        {
            icon: FiGlobe,
            title: 'Taxa de Câmbio Real',
            description: 'Taxas atualizadas em tempo real do mercado.'
        },
        {
            icon: FiCheck,
            title: 'Conformidade Legal',
            description: 'Em conformidade com as leis do Banco de Moçambique.'
        }
    ]

    const steps = [
        { step: '01', title: 'Crie sua conta', description: 'Registre-se em menos de 2 minutos com verificação rápida.' },
        { step: '02', title: 'Vincule suas contas', description: 'Conecte seu PayPal e M-Pesa com segurança.' },
        { step: '03', title: 'Faça a troca', description: 'Escolha direção, valor e confirme. Simples assim!' }
    ]

    return (
        <div className="home">
            {/* Hero Section */}
            <section className="hero">
                <div className="hero-background">
                    <div className="hero-orb hero-orb-1"></div>
                    <div className="hero-orb hero-orb-2"></div>
                    <div className="hero-orb hero-orb-3"></div>
                </div>

                <header className="hero-header">
                    <Link to="/" className="logo">
                        <img src={logo} alt="Txintxa" style={{ height: '50px' }} />
                    </Link>
                    <nav className="hero-nav">
                        <Link to="/login" className="btn btn-secondary">Entrar</Link>
                        <Link to="/register" className="btn btn-primary">Criar Conta</Link>
                    </nav>
                </header>

                <div className="hero-content">
                    <div className="hero-badge">
                        <FiShield />
                        <span>Plataforma Segura e Licenciada</span>
                    </div>

                    <h1 className="hero-title">
                        Troque <span className="gradient-text">PayPal</span> por{' '}
                        <span className="gradient-text">M-Pesa</span>
                        <br />de forma rápida e segura
                    </h1>

                    <p className="hero-description">
                        A primeira plataforma de Moçambique para converter USD (PayPal) em MZN (M-Pesa)
                        e vice-versa. Taxas transparentes e transferências em minutos.
                    </p>

                    <div className="hero-cta">
                        <Link to="/register" className="btn btn-primary btn-lg">
                            Começar Agora
                            <FiArrowRight />
                        </Link>
                        <Link to="/login" className="btn btn-outline btn-lg">
                            Já tenho conta
                        </Link>
                    </div>

                    <div className="hero-stats">
                        <div className="stat">
                            <span className="stat-value">10K+</span>
                            <span className="stat-label">Usuários</span>
                        </div>
                        <div className="stat">
                            <span className="stat-value">$2M+</span>
                            <span className="stat-label">Transacionado</span>
                        </div>
                        <div className="stat">
                            <span className="stat-value">99.9%</span>
                            <span className="stat-label">Uptime</span>
                        </div>
                    </div>
                </div>

                {/* Exchange Preview */}
                <div className="exchange-preview">
                    <div className="preview-card">
                        <div className="preview-header">
                            <img src={paypalLogo} alt="PayPal" style={{ height: '30px' }} />
                            <span className="preview-arrow">→</span>
                            <img src={mpesaLogo} alt="M-Pesa" style={{ height: '30px' }} />
                        </div>
                        <div className="preview-body">
                            <div className="preview-row">
                                <span>Você envia</span>
                                <span className="preview-value">$100.00 USD</span>
                            </div>
                            <div className="preview-row">
                                <span>Taxa de câmbio</span>
                                <span>1 USD = 63.50 MZN</span>
                            </div>
                            <div className="preview-row">
                                <span>Taxa (2%)</span>
                                <span>-$2.00</span>
                            </div>
                            <div className="preview-row highlight">
                                <span>Você recebe</span>
                                <span className="preview-value">6,223.00 MZN</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features">
                <div className="container">
                    <h2 className="section-title">Por que escolher a Txintxa?</h2>
                    <p className="section-subtitle">
                        A plataforma mais confiável para suas transações internacionais
                    </p>

                    <div className="features-grid">
                        {features.map((feature, index) => (
                            <div key={index} className="feature-card">
                                <div className="feature-icon">
                                    <feature.icon />
                                </div>
                                <h3>{feature.title}</h3>
                                <p>{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it Works */}
            <section className="how-it-works">
                <div className="container">
                    <h2 className="section-title">Como funciona</h2>
                    <p className="section-subtitle">
                        Em apenas 3 passos simples
                    </p>

                    <div className="steps-grid">
                        {steps.map((item, index) => (
                            <div key={index} className="step-card">
                                <span className="step-number">{item.step}</span>
                                <h3>{item.title}</h3>
                                <p>{item.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="container">
                    <div className="cta-card">
                        <h2>Pronto para começar?</h2>
                        <p>Junte-se a milhares de moçambicanos que confiam na Txintxa</p>
                        <Link to="/register" className="btn btn-primary btn-lg">
                            Criar Conta Gratuita
                            <FiArrowRight />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Partners Section */}
            <section className="partners-section">
                <div className="container">
                    <p className="partners-title">Parceiros Oficiais</p>
                    <div className="partners-grid">
                        <a href="https://recuperaaqui.vercel.app/" target="_blank" rel="noopener noreferrer" className="partner-card">
                            <span className="partner-name">RPA Moçambique</span>
                        </a>
                        <a href="https://www.educinvest.co.mz/" target="_blank" rel="noopener noreferrer" className="partner-card">
                            <span className="partner-name">EducInvest</span>
                        </a>
                        <a href="#" className="partner-card">
                            <span className="partner-name">PayBoom</span>
                        </a>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer">
                <div className="container">
                    <div className="footer-content">
                        <div className="footer-brand">
                            <Link to="/" className="logo">
                                <img src={logo} alt="Txintxa" style={{ height: '40px' }} />
                            </Link>
                            <p>Plataforma de câmbio segura entre PayPal e M-Pesa para Moçambique.</p>
                        </div>

                        <div className="footer-links">
                            <div className="footer-column">
                                <h4>Produto</h4>
                                <a href="#">Como funciona</a>
                                <a href="#">Taxas</a>
                                <a href="#">Segurança</a>
                            </div>
                            <div className="footer-column">
                                <h4>Empresa</h4>
                                <a href="#">Sobre nós</a>
                                <a href="#">Contato</a>
                                <a href="#">Carreiras</a>
                            </div>
                            <div className="footer-column">
                                <h4>Legal</h4>
                                <a href="#">Termos de uso</a>
                                <a href="#">Privacidade</a>
                                <a href="#">Conformidade</a>
                            </div>
                        </div>
                    </div>

                    <div className="footer-bottom">
                        <p>© {new Date().getFullYear()} Txintxa. Todos os direitos reservados.</p>
                        <p className="footer-disclaimer">
                            Txintxa não é afiliada ao PayPal ou à Vodacom M-Pesa.
                            Sujeito às leis do Banco de Moçambique.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    )
}

export default Home

# 🔄 Txintxa - Plataforma de Câmbio PayPal ↔ M-Pesa

Uma plataforma financeira segura para trocas de moedas entre PayPal (USD) e M-Pesa (MZN).

## 📋 Funcionalidades

- ✅ Registro e login com verificação de e-mail/SMS
- ✅ KYC básico (verificação de identidade)
- ✅ Dashboard com saldos integrados
- ✅ Trocas PayPal → M-Pesa e M-Pesa → PayPal
- ✅ Taxa de câmbio em tempo real
- ✅ Confirmação via OTP
- ✅ Histórico de transações
- ✅ Taxas de transação configuráveis
- ✅ Limites diários/semanais

## 🛠️ Tecnologias

### Backend
- Node.js + Express.js
- MongoDB + Mongoose
- JWT para autenticação
- bcrypt para criptografia

### Frontend
- React 18+ com Vite
- React Router para navegação
- Axios para requisições
- CSS moderno (mobile-first)

### Integrações
- PayPal REST API
- Vodacom M-Pesa API
- ExchangeRate-API para câmbio
- Twilio para SMS/OTP
- SendGrid para emails

## 📁 Estrutura do Projeto

```
txintxa/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── utils/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── styles/
│   └── public/
└── docs/
```

## 🚀 Início Rápido

### Pré-requisitos
- Node.js 18+
- MongoDB
- Contas: PayPal Developer, Vodacom M-Pesa, Twilio, SendGrid

### Instalação

```bash
# Clone e instale dependências do backend
cd backend
npm install

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais

# Inicie o backend
npm run dev

# Em outro terminal, instale e inicie o frontend
cd frontend
npm install
npm run dev
```

## 📊 APIs e Endpoints

### Autenticação
- `POST /api/auth/register` - Registro de usuário
- `POST /api/auth/login` - Login
- `POST /api/auth/verify-email` - Verificar email
- `POST /api/auth/verify-otp` - Verificar OTP

### Usuário
- `GET /api/users/profile` - Perfil do usuário
- `PUT /api/users/profile` - Atualizar perfil
- `POST /api/users/kyc` - Submeter KYC

### Câmbio
- `GET /api/exchange/rates` - Taxa de câmbio atual
- `POST /api/exchange/quote` - Cotação de troca
- `POST /api/exchange/execute` - Executar troca

### Transações
- `GET /api/transactions` - Listar transações
- `GET /api/transactions/:id` - Detalhes da transação

## 🔒 Segurança

- HTTPS obrigatório
- JWT com expiração
- Rate limiting
- Proteção CSRF/XSS
- Criptografia de dados sensíveis
- Logs de auditoria

## ⚖️ Conformidade Legal

- Conformidade com leis do Banco de Moçambique
- GDPR para dados pessoais
- KYC/AML básico

## 💰 Modelo de Negócio

- Taxa: 2% + taxa de rede por transação
- Limites: $500 diário, $2000 semanal

## 📄 Licença

Proprietário - Todos os direitos reservados.

## 📞 Suporte

suporte@txintxa.co.mz

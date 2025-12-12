---
description: Como executar a plataforma Txintxa localmente
---

# Executar Txintxa Localmente

## Pré-requisitos
- Node.js 18+
- MongoDB (local ou Atlas)
- Credenciais de API (PayPal, M-Pesa, etc.)

## Backend

// turbo-all

1. Navegar para a pasta backend:
```bash
cd backend
```

2. Instalar dependências:
```bash
npm install
```

3. Copiar arquivo de ambiente:
```bash
copy .env.example .env
```

4. Editar `.env` com suas credenciais

5. Iniciar servidor de desenvolvimento:
```bash
npm run dev
```

O backend estará disponível em http://localhost:5000

## Frontend

1. Em outro terminal, navegar para a pasta frontend:
```bash
cd frontend
```

2. Instalar dependências:
```bash
npm install
```

3. Iniciar servidor de desenvolvimento:
```bash
npm run dev
```

O frontend estará disponível em http://localhost:5173

## Testar

- Acesse http://localhost:5173
- Crie uma conta de teste
- Em modo desenvolvimento, as contas são automaticamente verificadas
- Vincule contas PayPal e M-Pesa (use emails/telefones de teste)
- Faça uma transação de teste

## Notas

- Em desenvolvimento, as transações são simuladas
- O OTP é enviado via SMS (configure Twilio) ou use "123456" em dev
- Taxa de câmbio vem da ExchangeRate-API

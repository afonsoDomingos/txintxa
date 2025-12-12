const logger = require('../utils/logger');

const chat = async (req, res) => {
    try {
        const { message } = req.body;

        let reply = "";
        const lowerMsg = message ? message.toLowerCase() : "";

        // =========================================================
        // Lógica de Resposta Rápida (Cérebro da Txintxa - Sem IA Externa)
        // =========================================================

        // 1. Finanças e Taxas
        if (lowerMsg.includes('taxa') || lowerMsg.includes('quanto custa') || lowerMsg.includes('preço') || lowerMsg.includes('tarifa') || lowerMsg.includes('cobram')) {
            reply = "A nossa taxa é de apenas **2%** sobre o valor da troca. Sem custos escondidos! 💸 É a melhor cotação de Moçambique.";

        } else if (lowerMsg.includes('tempo') || lowerMsg.includes('demora') || lowerMsg.includes('quando') || lowerMsg.includes('horas')) {
            reply = "Somos rápidos! ⚡ As trocas geralmente levam de **5 a 30 minutos** para serem processadas automaticamente. Se demorar mais, verifique o status no histórico.";

        } else if (lowerMsg.includes('limite') || lowerMsg.includes('maximo') || lowerMsg.includes('máximo') || lowerMsg.includes('quanto posso')) {
            reply = "O limite inicial é de **$500 USD diários** e **$2000 USD semanais**. Complete seu KYC (verificação) no perfil para aumentar seus limites! 🚀";

        } else if (lowerMsg.includes('seguro') || lowerMsg.includes('confiável') || lowerMsg.includes('fraude') || lowerMsg.includes('garantia')) {
            reply = "Totalmente seguro! 🛡️ A Txintxa usa criptografia de ponta a ponta e seguimos todas as normas financeiras de Moçambique. Seu dinheiro está protegido conosco.";

        } else if (lowerMsg.includes('mpesa') || lowerMsg.includes('paypal') || lowerMsg.includes('trocar') || lowerMsg.includes('funciona')) {
            reply = "Você pode trocar de **PayPal para M-Pesa** e de **M-Pesa para PayPal** aqui na plataforma. Basta ir na aba 'Trocar', escolher o valor e confirmar. É simples! 💱";

            // 2. Problemas Comuns
        } else if (lowerMsg.includes('falhou') || lowerMsg.includes('erro') || lowerMsg.includes('não consigo') || lowerMsg.includes('problema') || lowerMsg.includes('cancelado')) {
            reply = "Sinto muito! 😔 Por favor, verifique se seu e-mail do PayPal está correto e é o mesmo da conta Txintxa. Se o problema continuar, nosso suporte humano resolve na hora!";

            // 3. Identidade e Personalidade
        } else if (lowerMsg.includes('quem é você') || lowerMsg.includes('quem e voce') || lowerMsg.includes('teu nome') || lowerMsg.includes('és um robô')) {
            reply = "Sou o Assistente Virtual da Txintxa! 🤖 Fui criado para facilitar suas operações de câmbio e tirar dúvidas 24h por dia.";

            // 4. Social (Small Talk)
        } else if (lowerMsg.includes('ola') || lowerMsg.includes('olá') || lowerMsg.includes('oi') || lowerMsg.includes('bom dia') || lowerMsg.includes('boa tarde') || lowerMsg.includes('boa noite') || lowerMsg.includes('hey')) {
            reply = "Olá! 👋 Bem-vindo à Txintxa. Como posso ajudar você hoje? Pergunte sobre taxas, limites ou como fazer uma troca.";

        } else if (lowerMsg.includes('obrigado') || lowerMsg.includes('valeu') || lowerMsg.includes('thanks') || lowerMsg.includes('agradecido')) {
            reply = "De nada! É um prazer ajudar. Se precisar de mais alguma coisa, estou por aqui! 🧡";

        } else if (lowerMsg.includes('tudo bem') || lowerMsg.includes('como vai')) {
            reply = "Tudo ótimo por aqui no servidor! E com você? Pronto para fazer bons negócios hoje? 💼";

            // 5. Assuntos Aleatórios (Tratamento Espirituoso)
        } else if (lowerMsg.includes('piada') || lowerMsg.includes('rir')) {
            reply = "Por que o dólar nunca vai à escola? Porque ele já é 'nota' 100! 💵 (Desculpe, sou melhor com câmbio do que com piadas!)";

        } else if (lowerMsg.includes('futebol') || lowerMsg.includes('jogo') || lowerMsg.includes('benfica') || lowerMsg.includes('sporting')) {
            reply = "Adoro ver números subindo, mas não acompanho futebol! Minha torcida é sempre para o seu saldo ficar positivo. ⚽💰";

        } else if (lowerMsg.includes('amor') || lowerMsg.includes('casar') || lowerMsg.includes('namoro')) {
            reply = "Sou muito focado no trabalho! Meu único compromisso é com a segurança das suas transações. 💍";

            // 6. Suporte Humano (Ultimo recurso - Gatilho forte)
        } else if (lowerMsg.includes('humano') || lowerMsg.includes('pessoa') || lowerMsg.includes('atendente') || lowerMsg.includes('whatsapp') || lowerMsg.includes('suporte') || lowerMsg.includes('ajuda')) {
            reply = "Entendi, você quer falar com gente de verdade. Você pode contatar nossa equipe de suporte pelo WhatsApp: **+258 84 000 0000**. Eles resolvem qualquer coisa! 📞";

        } else {
            // Fallback genérico educado
            const genericResponses = [
                "Essa é uma questão interessante! Ainda estou aprendendo sobre esse assunto, mas se for sobre câmbio, sou expert. Posso ajudar com algo da plataforma? 🤔",
                "Hmm, não tenho certeza sobre isso. Meu foco é garantir que você troque PayPal e M-Pesa com facilidade. Tem alguma dúvida sobre a Txintxa?",
                "Desculpe, não entendi muito bem. Poderia reformular? Estou aqui para ajudar com suas trocas e conta. 🧡"
            ];
            reply = genericResponses[Math.floor(Math.random() * genericResponses.length)];
        }

        // Simular delay natural de digitação (para parecer que está "pensando")
        await new Promise(resolve => setTimeout(resolve, 600));

        res.json({
            success: true,
            reply: reply
        });

    } catch (error) {
        logger.error('Erro no assistente:', error);
        res.status(500).json({ success: false, message: 'Ocorreu um erro ao processar sua mensagem.' });
    }
};

module.exports = { chat };

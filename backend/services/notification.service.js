/**
 * Serviço de Notificações (SMS e Email)
 */

const logger = require('../utils/logger');

// Tentar importar twilio e sendgrid (podem não estar configurados)
let twilio, sgMail;
try {
    twilio = require('twilio');
} catch (e) {
    logger.warn('Twilio não instalado');
}

try {
    sgMail = require('@sendgrid/mail');
} catch (e) {
    logger.warn('SendGrid não instalado');
}

class NotificationService {
    constructor() {
        // Configurar Twilio (apenas se credenciais válidas)
        const sid = process.env.TWILIO_ACCOUNT_SID;
        const token = process.env.TWILIO_AUTH_TOKEN;

        if (twilio && sid && token && sid.startsWith('AC')) {
            try {
                this.twilioClient = twilio(sid, token);
                logger.info('✅ Twilio configurado');
            } catch (error) {
                logger.warn('Twilio não configurado:', error.message);
            }
        } else {
            logger.warn('⚠️ Twilio não configurado - SMS desabilitado');
        }

        // Configurar SendGrid
        if (sgMail && process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.startsWith('SG.')) {
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);
            this.sgMailClient = sgMail;
            logger.info('✅ SendGrid configurado');
        } else {
            logger.warn('⚠️ SendGrid não configurado - Emails desabilitados');
        }

        this.fromPhone = process.env.TWILIO_PHONE_NUMBER;
        this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@txintxa.co.mz';
        this.fromName = process.env.SENDGRID_FROM_NAME || 'Txintxa';
    }

    /**
     * Enviar SMS
     */
    async sendSMS(to, message) {
        try {
            if (!this.twilioClient) {
                logger.warn('Twilio não configurado, SMS não enviado');
                return { success: false, reason: 'Twilio not configured' };
            }

            const result = await this.twilioClient.messages.create({
                body: message,
                from: this.fromPhone,
                to: this.formatPhoneForTwilio(to)
            });

            logger.info('SMS enviado:', {
                to: this.maskPhone(to),
                sid: result.sid,
                status: result.status
            });

            return {
                success: true,
                messageId: result.sid,
                status: result.status
            };
        } catch (error) {
            logger.error('Erro ao enviar SMS:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Enviar Email
     */
    async sendEmail(to, subject, htmlContent, plainText = null) {
        try {
            if (!this.sgMailClient) {
                logger.warn('SendGrid não configurado, email não enviado');
                return { success: false, reason: 'SendGrid not configured' };
            }

            const msg = {
                to,
                from: {
                    email: this.fromEmail,
                    name: this.fromName
                },
                subject,
                text: plainText || this.stripHtml(htmlContent),
                html: htmlContent
            };

            const result = await this.sgMailClient.send(msg);

            logger.info('Email enviado:', {
                to: this.maskEmail(to),
                subject,
                statusCode: result[0]?.statusCode
            });

            return {
                success: true,
                statusCode: result[0]?.statusCode
            };
        } catch (error) {
            logger.error('Erro ao enviar email:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Enviar código OTP via SMS
     */
    async sendOTP(phone, otp) {
        const message = `Txintxa: Seu código de verificação é ${otp}. Válido por 5 minutos. Não compartilhe este código.`;
        return this.sendSMS(phone, message);
    }

    /**
     * Enviar email de verificação
     */
    async sendVerificationEmail(email, name, verificationToken) {
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f4f4f4; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
                    .content { padding: 30px; }
                    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔄 Txintxa</h1>
                        <p>Plataforma de Câmbio</p>
                    </div>
                    <div class="content">
                        <h2>Olá, ${name}!</h2>
                        <p>Bem-vindo(a) à Txintxa! Para completar seu registro, por favor verifique seu email clicando no botão abaixo:</p>
                        <p style="text-align: center;">
                            <a href="${verificationUrl}" class="button">Verificar Email</a>
                        </p>
                        <p>Ou copie e cole o link abaixo no seu navegador:</p>
                        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
                        <p>Este link expira em 24 horas.</p>
                    </div>
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} Txintxa. Todos os direitos reservados.</p>
                        <p>Este email foi enviado para ${email}</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        return this.sendEmail(email, 'Verifique seu email - Txintxa', html);
    }

    /**
     * Enviar email de transação concluída
     */
    async sendTransactionEmail(email, name, transaction) {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f4f4f4; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
                    .content { padding: 30px; }
                    .status-success { color: #28a745; font-weight: bold; }
                    .status-failed { color: #dc3545; font-weight: bold; }
                    .details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    .details table { width: 100%; border-collapse: collapse; }
                    .details td { padding: 10px 0; border-bottom: 1px solid #eee; }
                    .details td:first-child { color: #666; }
                    .details td:last-child { text-align: right; font-weight: 500; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔄 Txintxa</h1>
                        <p>Confirmação de Transação</p>
                    </div>
                    <div class="content">
                        <h2>Olá, ${name}!</h2>
                        <p>Sua transação foi <span class="${transaction.status === 'completed' ? 'status-success' : 'status-failed'}">${transaction.status === 'completed' ? 'concluída com sucesso' : 'não processada'}</span>.</p>
                        
                        <div class="details">
                            <table>
                                <tr>
                                    <td>ID da Transação</td>
                                    <td>${transaction.transactionId}</td>
                                </tr>
                                <tr>
                                    <td>Tipo</td>
                                    <td>${transaction.type === 'paypal_to_mpesa' ? 'PayPal → M-Pesa' : 'M-Pesa → PayPal'}</td>
                                </tr>
                                <tr>
                                    <td>Valor Enviado</td>
                                    <td>${transaction.sourceAmount} ${transaction.sourceCurrency}</td>
                                </tr>
                                <tr>
                                    <td>Valor Recebido</td>
                                    <td>${transaction.netAmount} ${transaction.destinationCurrency}</td>
                                </tr>
                                <tr>
                                    <td>Taxa de Câmbio</td>
                                    <td>1 ${transaction.sourceCurrency} = ${transaction.exchangeRate} ${transaction.destinationCurrency}</td>
                                </tr>
                                <tr>
                                    <td>Taxas</td>
                                    <td>${transaction.fees.total} USD</td>
                                </tr>
                                <tr>
                                    <td>Data</td>
                                    <td>${new Date(transaction.completedAt || transaction.createdAt).toLocaleString('pt-MZ')}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <p>Obrigado por usar a Txintxa!</p>
                    </div>
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} Txintxa. Todos os direitos reservados.</p>
                        <p>Dúvidas? Contate-nos: suporte@txintxa.co.mz</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const subject = transaction.status === 'completed'
            ? `Transação Concluída - ${transaction.transactionId}`
            : `Transação Falhou - ${transaction.transactionId}`;

        return this.sendEmail(email, subject, html);
    }

    /**
     * Enviar SMS de transação
     */
    async sendTransactionSMS(phone, transaction) {
        let message;

        if (transaction.status === 'completed') {
            message = `Txintxa: Transação ${transaction.transactionId} concluída! ${transaction.sourceAmount} ${transaction.sourceCurrency} → ${transaction.netAmount} ${transaction.destinationCurrency}`;
        } else {
            message = `Txintxa: Transação ${transaction.transactionId} falhou. Entre em contato com o suporte.`;
        }

        return this.sendSMS(phone, message);
    }

    /**
     * Enviar email de reset de senha
     */
    async sendPasswordResetEmail(email, name, resetToken) {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f4f4f4; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
                    .content { padding: 30px; }
                    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔄 Txintxa</h1>
                        <p>Recuperação de Senha</p>
                    </div>
                    <div class="content">
                        <h2>Olá, ${name}!</h2>
                        <p>Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha:</p>
                        <p style="text-align: center;">
                            <a href="${resetUrl}" class="button">Redefinir Senha</a>
                        </p>
                        <p>Este link expira em 1 hora.</p>
                        <p>Se você não solicitou esta redefinição, ignore este email.</p>
                    </div>
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} Txintxa. Todos os direitos reservados.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        return this.sendEmail(email, 'Redefinir Senha - Txintxa', html);
    }

    // === UTILITÁRIOS ===

    formatPhoneForTwilio(phone) {
        let cleaned = phone.replace(/[\s\-\(\)]/g, '');
        if (!cleaned.startsWith('+')) {
            if (cleaned.startsWith('258')) {
                cleaned = '+' + cleaned;
            } else if (cleaned.startsWith('8')) {
                cleaned = '+258' + cleaned;
            }
        }
        return cleaned;
    }

    maskPhone(phone) {
        const formatted = phone.replace(/[\s\-\(\)]/g, '');
        if (formatted.length >= 9) {
            return formatted.slice(0, 6) + '***' + formatted.slice(-2);
        }
        return '***';
    }

    maskEmail(email) {
        const [localPart, domain] = email.split('@');
        const maskedLocal = localPart.slice(0, 2) + '***';
        return `${maskedLocal}@${domain}`;
    }

    stripHtml(html) {
        return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }
}

module.exports = new NotificationService();

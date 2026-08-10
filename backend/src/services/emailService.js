const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const sendEmail = async (to, subject, html) => {
  // Buscar configs SMTP no banco de dados (ignorando o .env)
  const configs = await prisma.configuracao.findMany({
    where: { chave: { in: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'] } }
  });
  
  const smtp = {};
  configs.forEach(c => { smtp[c.chave] = c.valor; });

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = smtp;

  // Se o SMTP_HOST estiver vazio, falhar o envio para não registrar falso positivo
  if (!SMTP_HOST) {
    console.log(`\n--- [TESTE] Tentativa de envio de E-MAIL abortada (SMTP não configurado) ---`);
    return { success: false, error: 'Configurações SMTP ausentes no banco de dados' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || '587', 10),
      secure: SMTP_PORT === '465',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: SMTP_FROM || '"Controle de Contratos" <nao-responda@hospital.com>',
      to,
      subject,
      html,
    });

    console.log(`E-mail enviado: ${info.messageId}`);
    return { success: true, error: null };
  } catch (error) {
    console.error('Erro ao enviar e-mail SMTP:', error);
    return { success: false, error: error.message || 'Erro desconhecido ao enviar e-mail' };
  }
};

module.exports = {
  sendEmail
};

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { sendEmail } = require('../services/emailService');
const { scheduleAlertJob } = require('../services/alertJob');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const envPath = path.resolve(__dirname, '../../.env');

// Get SMTP config
router.get('/smtp', (req, res) => {
  res.json({
    SMTP_HOST: process.env.SMTP_HOST || '',
    SMTP_PORT: process.env.SMTP_PORT || '587',
    SMTP_USER: process.env.SMTP_USER || '',
    SMTP_PASS: process.env.SMTP_PASS || '',
    SMTP_FROM: process.env.SMTP_FROM || ''
  });
});

// Save SMTP config
router.post('/smtp', (req, res) => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = req.body;
  
  // Atualizar `process.env` em memória
  process.env.SMTP_HOST = SMTP_HOST;
  process.env.SMTP_PORT = SMTP_PORT;
  process.env.SMTP_USER = SMTP_USER;
  process.env.SMTP_PASS = SMTP_PASS;
  process.env.SMTP_FROM = SMTP_FROM;

  // Atualizar arquivo `.env` físico
  try {
    let envFile = fs.readFileSync(envPath, 'utf-8');
    
    const updateEnvVar = (key, value) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const formattedValue = value.includes(' ') ? `"${value}"` : value;
      if (regex.test(envFile)) {
        envFile = envFile.replace(regex, `${key}=${formattedValue}`);
      } else {
        envFile += `\n${key}=${formattedValue}`;
      }
    };

    updateEnvVar('SMTP_HOST', SMTP_HOST);
    updateEnvVar('SMTP_PORT', SMTP_PORT);
    updateEnvVar('SMTP_USER', SMTP_USER);
    updateEnvVar('SMTP_PASS', SMTP_PASS);
    updateEnvVar('SMTP_FROM', SMTP_FROM);

    fs.writeFileSync(envPath, envFile, 'utf-8');
    res.json({ success: true, message: 'Configurações salvas com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao salvar configurações no arquivo .env' });
  }
});

// Test SMTP config
router.post('/smtp/test', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'E-mail de destino não fornecido' });
  }

  try {
    // Tenta enviar o e-mail usando as variáveis atuais do process.env
    const result = await sendEmail(
      email,
      'Teste de Configuração SMTP - Controle de Contratos',
      '<h2>Sucesso!</h2><p>Sua configuração de SMTP está funcionando corretamente.</p>'
    );
    
    if (result) {
      res.json({ success: true, message: 'E-mail de teste enviado com sucesso!' });
    } else {
      res.status(500).json({ error: 'Falha ao enviar e-mail. Verifique o console do servidor.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro de conexão SMTP: ' + error.message });
  }
});

// Get general configurations
router.get('/', async (req, res) => {
  try {
    const configs = await prisma.configuracao.findMany();
    const configMap = {};
    configs.forEach(c => {
      configMap[c.chave] = c.valor;
    });
    res.json(configMap);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

// Update general configurations
router.put('/', async (req, res) => {
  try {
    const data = req.body;
    const keys = Object.keys(data);
    
    for (const key of keys) {
      await prisma.configuracao.upsert({
        where: { chave: key },
        update: { valor: data[key] },
        create: { chave: key, valor: data[key] }
      });
    }

    // Se o horário do cron foi atualizado, reagendar imediatamente
    if (data.ALERT_CRON_TIME) {
      await scheduleAlertJob(data.ALERT_CRON_TIME);
    }

    res.json({ message: 'Configurações atualizadas' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

module.exports = router;

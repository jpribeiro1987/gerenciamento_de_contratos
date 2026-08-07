const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Obter todos os alertas
router.get('/', async (req, res) => {
  try {
    const historico = await prisma.historicoAlerta.findMany({
      include: {
        contrato: true
      },
      orderBy: { data_envio: 'desc' }
    });
    res.json(historico);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar histórico de e-mails' });
  }
});

// Limpar todos os alertas
router.delete('/', async (req, res) => {
  try {
    await prisma.historicoAlerta.deleteMany();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao limpar histórico de e-mails' });
  }
});

module.exports = router;

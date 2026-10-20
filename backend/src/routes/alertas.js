const express = require('express');

const router = express.Router();
const prisma = require('../prisma');

// Obter todos os alertas unificados
router.get('/', async (req, res) => {
  try {
    const historicoContratos = await prisma.historicoAlerta.findMany({
      include: { contrato: { select: { empresa: true } } },
    });
    const historicoItts = await prisma.historicoAlertaItt.findMany({
      include: { itt: { select: { titulo: true } } },
    });
    const historicoDocumentos = await prisma.historicoAlertaDocumento.findMany({
      include: { documento: { select: { titulo: true } } },
    });

    const unified = [
      ...historicoContratos.map(a => ({ ...a, tipo: 'Contrato', nome: a.contrato?.empresa || `ID: ${a.contratoId}` })),
      ...historicoItts.map(a => ({ ...a, tipo: 'ITT', nome: a.itt?.titulo || `ID: ${a.ittId}` })),
      ...historicoDocumentos.map(a => ({ ...a, tipo: 'Documento', nome: a.documento?.titulo || `ID: ${a.documentoId}` }))
    ];

    unified.sort((a, b) => new Date(b.data_envio) - new Date(a.data_envio));

    res.json(unified);
  } catch (error) {
    console.error("Erro no alertas:", error);
    res.status(500).json({ error: 'Erro ao buscar histórico de e-mails' });
  }
});

// Limpar todos os alertas
router.delete('/', async (req, res) => {
  try {
    await prisma.historicoAlerta.deleteMany();
    await prisma.historicoAlertaItt.deleteMany();
    await prisma.historicoAlertaDocumento.deleteMany();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao limpar histórico de e-mails' });
  }
});

module.exports = router;

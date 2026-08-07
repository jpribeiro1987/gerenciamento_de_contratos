const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();

const prisma = new PrismaClient();

// Get all sectors
router.get('/', async (req, res) => {
  try {
    const sectors = await prisma.setor.findMany({
      orderBy: { nome: 'asc' }
    });
    res.json(sectors);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar setores' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nome } = req.body;
    const setor = await prisma.setor.create({ data: { nome } });
    res.status(201).json(setor);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar setor' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;
    const setor = await prisma.setor.update({ where: { id: parseInt(id) }, data: { nome } });
    res.json(setor);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar setor' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Check if sector has contracts
    const count = await prisma.contrato.count({ where: { setorId: parseInt(id) } });
    if (count > 0) {
      return res.status(400).json({ error: 'Não é possível excluir um setor que possui contratos vinculados.' });
    }
    await prisma.setor.delete({ where: { id: parseInt(id) } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir setor' });
  }
});

module.exports = router;

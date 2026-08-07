const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const router = express.Router();

const prisma = new PrismaClient();

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await prisma.usuario.findMany({
      include: {
        setores: true
      },
      orderBy: { nome: 'asc' }
    });
    // Remove senhas antes de enviar ao front
    const safeUsers = users.map(u => {
      const { senha, ...rest } = u;
      return rest;
    });
    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// Create user
router.post('/', async (req, res) => {
  try {
    const { nome, email, perfil, setoresIds, senha } = req.body;
    
    // Hash the password, or use default 'mudar123'
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(senha || 'mudar123', salt);

    const user = await prisma.usuario.create({
      data: {
        nome,
        email,
        perfil,
        senha: hashedPassword,
        setores: {
          connect: setoresIds ? setoresIds.map(id => ({ id: parseInt(id) })) : []
        }
      },
      include: { setores: true }
    });
    
    const { senha: _, ...safeUser } = user;
    res.status(201).json(safeUser);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar usuário. E-mail pode já estar em uso.' });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, perfil, setoresIds, senha } = req.body;
    
    const dataToUpdate = {
      nome,
      email,
      perfil,
      setores: {
        set: setoresIds ? setoresIds.map(sid => ({ id: parseInt(sid) })) : []
      }
    };

    if (senha) {
      const salt = await bcrypt.genSalt(10);
      dataToUpdate.senha = await bcrypt.hash(senha, salt);
    }

    const user = await prisma.usuario.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
      include: { setores: true }
    });
    
    const { senha: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.usuario.delete({
      where: { id: parseInt(id) }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

module.exports = router;

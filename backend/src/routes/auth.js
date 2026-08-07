const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-2026';

router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    
    const user = await prisma.usuario.findUnique({
      where: { email },
      include: { setores: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }

    const isValidPassword = await bcrypt.compare(senha, user.senha);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        nome: user.nome, 
        email: user.email, 
        perfil: user.perfil,
        setores: user.setores.map(s => s.id) 
      }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil,
        setores: user.setores
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

module.exports = router;

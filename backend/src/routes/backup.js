const express = require('express');
const archiver = require('archiver');
const path = require('path');
const fs = require('fs');

const router = express.Router();

router.get('/', (req, res) => {
  try {
    // Definir nome do arquivo baseado na data atual
    const date = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
    const filename = `backup_contratos_${date}.zip`;

    // Configurar os headers para forçar o download
    res.attachment(filename);
    res.setHeader('Content-Type', 'application/zip');

    const archive = archiver('zip', {
      zlib: { level: 9 } // Nível máximo de compressão
    });

    // Se houver erro no processo de compressão, encerra a resposta
    archive.on('error', (err) => {
      res.status(500).send({ error: err.message });
    });

    // Enviar o zip diretamente como resposta (stream)
    archive.pipe(res);

    // 1. Adicionar o banco de dados
    const dbPath = path.join(__dirname, '../../prisma/dev.db');
    if (fs.existsSync(dbPath)) {
      archive.file(dbPath, { name: 'dev.db' });
    }

    // 2. Adicionar os uploads (se existirem)
    const uploadsPath = path.join(__dirname, '../../uploads');
    if (fs.existsSync(uploadsPath)) {
      archive.directory(uploadsPath, 'uploads');
    }

    // Finalizar o pacote (isso fechará o stream de resposta e fará o download terminar)
    archive.finalize();

  } catch (error) {
    console.error('Erro ao gerar backup:', error);
    res.status(500).json({ error: 'Erro ao gerar backup' });
  }
});

module.exports = router;

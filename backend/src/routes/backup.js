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
      console.error('Erro na compressão:', err);
      // Se headers já foram enviados, não dá pra mandar status(500) json
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
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

    // Finalizar o pacote
    archive.finalize();

  } catch (error) {
    console.error('Erro ao gerar backup:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro ao gerar backup', details: error.message, stack: error.stack });
    }
  }
});

const multer = require('multer');
const AdmZip = require('adm-zip');

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

router.post('/restore', upload.single('backup'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo de backup enviado.' });
    }

    const zip = new AdmZip(req.file.buffer);
    const tempDir = path.join(__dirname, '../../temp_restore');
    
    // Limpar diretório temporário se existir
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    // Extrair tudo para o tempDir
    zip.extractAllTo(tempDir, true);

    const dbSource = path.join(tempDir, 'dev.db');
    const uploadsSource = path.join(tempDir, 'uploads');
    
    if (!fs.existsSync(dbSource)) {
      return res.status(400).json({ error: 'Arquivo dev.db não encontrado no backup.' });
    }

    // 1. Substituir o banco de dados
    const dbTarget = path.join(__dirname, '../../prisma/dev.db');
    fs.copyFileSync(dbSource, dbTarget);

    // 2. Substituir a pasta de uploads
    const uploadsTarget = path.join(__dirname, '../../uploads');
    if (fs.existsSync(uploadsSource)) {
      if (!fs.existsSync(uploadsTarget)) {
        fs.mkdirSync(uploadsTarget, { recursive: true });
      }
      
      const files = fs.readdirSync(uploadsSource);
      for (const file of files) {
        fs.copyFileSync(path.join(uploadsSource, file), path.join(uploadsTarget, file));
      }
    }

    // Limpar tempDir
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Enviar sucesso
    res.json({ message: 'Backup restaurado com sucesso. Reinicie o servidor se necessário.' });

  } catch (error) {
    console.error('Erro na restauração:', error);
    res.status(500).json({ error: 'Erro ao restaurar backup', details: error.message });
  }
});

module.exports = router;

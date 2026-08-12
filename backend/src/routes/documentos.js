const express = require('express');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const { sendEmail } = require('../services/emailService');

const router = express.Router();
const prisma = new PrismaClient();

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // Limite de 10MB
});

// Get all Documentos
router.get('/', async (req, res) => {
  const { setorId } = req.query;
  
  try {
    const whereClause = setorId ? { setorId: parseInt(setorId) } : {};
    
    const documentos = await prisma.documento.findMany({
      where: whereClause,
      include: {
        setor: true,
        renovacoes: {
          orderBy: { criado_em: 'desc' },
          take: 1
        }
      },
      orderBy: { data_vigencia_fim: 'asc' }
    });

    const today = new Date();
    today.setHours(0,0,0,0);

    const updatedDocs = documentos.map(doc => {
      if (doc.status === 'CANCELADO' || doc.status === 'RENOVADO') {
        return doc;
      }
      
      if (!doc.data_vigencia_fim) {
        return doc;
      }

      const diffTime = new Date(doc.data_vigencia_fim).getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let calcStatus = 'VIGENTE';
      if (diffDays < 0) {
        calcStatus = 'VENCIDO';
      } else if (diffDays <= doc.dias_alerta) {
        calcStatus = 'A_VENCER';
      }

      return { ...doc, status: calcStatus };
    });

    res.json(updatedDocs);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar Documentos' });
  }
});

// Create new Documento
router.post('/', upload.single('pdf'), async (req, res) => {
  try {
    const data = req.body;
    
    let anexos = null;
    if (req.file) {
      anexos = req.file.mimetype + '|' + req.file.buffer.toString('base64');
    }

    const newDoc = await prisma.documento.create({
      data: {
        tipo: data.tipo || 'CND',
        orgao_emissor: data.orgao_emissor,
        titulo: data.titulo,
        setorId: parseInt(data.setorId),
        data_emissao: data.data_emissao ? new Date(data.data_emissao) : null,
        data_vigencia_fim: data.data_vigencia_fim ? new Date(data.data_vigencia_fim) : null,
        dias_alerta: data.dias_alerta ? parseInt(data.dias_alerta) : 30,
        status: data.status || 'VIGENTE',
        observacao: data.observacao,
        anexos: anexos
      }
    });
    res.status(201).json(newDoc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar Documento' });
  }
});

// Update Documento
router.put('/:id', upload.single('pdf'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const updateData = {};
    
    if (data.tipo !== undefined) updateData.tipo = data.tipo;
    if (data.orgao_emissor !== undefined) updateData.orgao_emissor = data.orgao_emissor;
    if (data.titulo !== undefined) updateData.titulo = data.titulo;
    if (data.setorId !== undefined) updateData.setorId = parseInt(data.setorId);
    if (data.data_emissao !== undefined) updateData.data_emissao = data.data_emissao ? new Date(data.data_emissao) : null;
    if (data.data_vigencia_fim !== undefined) updateData.data_vigencia_fim = data.data_vigencia_fim ? new Date(data.data_vigencia_fim) : null;
    if (data.dias_alerta !== undefined) updateData.dias_alerta = data.dias_alerta ? parseInt(data.dias_alerta) : 30;
    if (data.observacao !== undefined) updateData.observacao = data.observacao;
    if (data.status !== undefined) updateData.status = data.status;

    if (req.file) {
      updateData.anexos = req.file.mimetype + '|' + req.file.buffer.toString('base64');
    }

    const updated = await prisma.documento.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar Documento' });
  }
});

// Download/View PDF
router.get('/:id/anexo', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await prisma.documento.findUnique({ where: { id: parseInt(id) } });

    if (!doc || !doc.anexos) {
      return res.status(404).json({ error: 'Anexo não encontrado' });
    }

    let mimeType = 'application/pdf';
    let base64Data = doc.anexos;
    let extension = 'pdf';

    if (doc.anexos.includes('|')) {
      const parts = doc.anexos.split('|');
      mimeType = parts[0];
      base64Data = parts[1];
      if (mimeType.includes('msword')) extension = 'doc';
      if (mimeType.includes('wordprocessingml')) extension = 'docx';
    }

    const fileBuffer = Buffer.from(base64Data, 'base64');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="doc_${id}.${extension}"`);
    res.send(fileBuffer);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar anexo' });
  }
});

// Delete Documento PDF
router.delete('/:id/anexo', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.documento.update({
      where: { id: parseInt(id) },
      data: { anexos: null }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover anexo' });
  }
});

// Send manual alert email
router.post('/:id/alert-manual', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await prisma.documento.findUnique({
      where: { id: parseInt(id) },
      include: {
        setor: {
          include: { usuarios: true }
        }
      }
    });

    if (!doc) return res.status(404).json({ error: 'Documento não encontrado' });

    const emails = doc.setor.usuarios.map(u => u.email);
    const uniqueEmails = [...new Set(emails)].join(',');

    const configSubject = await prisma.configuracao.findUnique({ where: { chave: 'EMAIL_TEMPLATE_SUBJECT' } });
    const configBody = await prisma.configuracao.findUnique({ where: { chave: 'EMAIL_TEMPLATE_BODY' } });

    let subject = configSubject?.valor || `Alerta Manual: {{empresa}}`;
    let html = configBody?.valor || `<p>Atenção ao Documento <b>{{empresa}}</b> (Setor: {{setor}}).</p><p>Vencimento previsto para o dia {{data_vencimento}}.</p>`;

    const dataFormatada = doc.data_vigencia_fim 
      ? new Date(doc.data_vigencia_fim).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) 
      : 'Indeterminado';

    // Calculate days left
    let diffDays = '-';
    if (doc.data_vigencia_fim) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const diffTime = new Date(doc.data_vigencia_fim).getTime() - today.getTime();
      diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const diasAbs = Math.abs(diffDays);
    const prazoTexto = diffDays > 0 ? `vencerá em ${diasAbs} dias` :
                       diffDays === 0 ? `vence hoje` :
                       `venceu há ${diasAbs} dias`;

    subject = subject
      .replace(/vencer[áa] em {{dias}} dias/gi, prazoTexto)
      .replace(/{{tipo}}/g, 'Documento/CND')
      .replace(/{{empresa}}/g, doc.titulo)
      .replace(/{{setor}}/g, doc.setor.nome)
      .replace(/{{dias}}/g, diasAbs)
      .replace(/{{prazo_texto}}/g, prazoTexto)
      .replace(/{{data_vencimento}}/g, dataFormatada)
            .replace(/{{status_vencimento}}/g, diffDays >= 0 ? 'VENCERÁ' : 'VENCEU HÁ');

    html = html
      .replace(/vencer[áa] em {{dias}} dias/gi, prazoTexto)
      .replace(/{{tipo}}/g, 'Documento/CND')
      .replace(/{{empresa}}/g, doc.titulo)
      .replace(/{{setor}}/g, doc.setor.nome)
      .replace(/{{dias}}/g, diasAbs)
      .replace(/{{prazo_texto}}/g, prazoTexto)
      .replace(/{{data_vencimento}}/g, dataFormatada)
            .replace(/{{status_vencimento}}/g, diffDays >= 0 ? 'VENCERÁ' : 'VENCEU HÁ');

    const { success, error } = await sendEmail(uniqueEmails, subject, html);

    // Record manual alert
    await prisma.historicoAlertaDocumento.create({
      data: {
        documentoId: doc.id,
        destinatarios: uniqueEmails,
        status_envio: success ? 'SUCESSO_MANUAL' : 'ERRO_MANUAL',
        erro: error
      }
    });

    if (success) {
      res.json({ message: 'Alerta enviado com sucesso' });
    } else {
      res.status(500).json({ error: 'Falha ao enviar e-mail' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao enviar alerta manual' });
  }
});

// Delete Documento
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const parsedId = parseInt(id);

    await prisma.historicoAlertaDocumento.deleteMany({
      where: { documentoId: parsedId }
    });
    
    await prisma.renovacaoDocumento.deleteMany({
      where: { documentoId: parsedId }
    });

    await prisma.documento.delete({
      where: { id: parsedId }
    });
    
    res.status(204).send();
  } catch (error) {
    console.error("Erro ao excluir Documento:", error);
    res.status(500).json({ error: 'Erro ao excluir Documento' });
  }
});

// --- RENOVACOES ---

// Get all renovacoes for a Documento
router.get('/:id/renovacoes', async (req, res) => {
  try {
    const { id } = req.params;
    const renovacoes = await prisma.renovacaoDocumento.findMany({
      where: { documentoId: parseInt(id) },
      orderBy: { criado_em: 'desc' }
    });
    res.json(renovacoes);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar renovações' });
  }
});

// Create new renovacao
router.post('/:id/renovacoes', upload.single('pdf'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    let anexos = null;
    if (req.file) {
      anexos = req.file.mimetype + '|' + req.file.buffer.toString('base64');
    }

    const nova_data = new Date(data.nova_data_vigencia);

    // Create renovacao
    const renovacao = await prisma.renovacaoDocumento.create({
      data: {
        documentoId: parseInt(id),
        descricao: data.descricao,
        nova_data_vigencia: nova_data,
        anexos: anexos
      }
    });

    // Update parent Documento
    const updateData = { data_vigencia_fim: nova_data };
    
    const now = new Date();
    const diffTime = nova_data - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let novoStatus = 'VIGENTE';
    if (diffDays < 0) {
      novoStatus = 'VENCIDO';
    } else if (diffDays <= 30) {
      novoStatus = 'A_VENCER';
    }
    updateData.status = novoStatus;

    await prisma.documento.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.status(201).json(renovacao);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar renovação' });
  }
});

// Download/View Renovacao PDF
router.get('/renovacoes/:idRenovacao/anexo', async (req, res) => {
  try {
    const { idRenovacao } = req.params;
    const renovacao = await prisma.renovacaoDocumento.findUnique({ where: { id: parseInt(idRenovacao) } });

    if (!renovacao || !renovacao.anexos) {
      return res.status(404).json({ error: 'Anexo não encontrado' });
    }

    let mimeType = 'application/pdf';
    let base64Data = renovacao.anexos;
    let extension = 'pdf';

    if (renovacao.anexos.includes('|')) {
      const parts = renovacao.anexos.split('|');
      mimeType = parts[0];
      base64Data = parts[1];
      if (mimeType.includes('msword')) extension = 'doc';
      if (mimeType.includes('wordprocessingml')) extension = 'docx';
    }

    const fileBuffer = Buffer.from(base64Data, 'base64');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="renovacao_${idRenovacao}.${extension}"`);
    res.send(fileBuffer);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar anexo' });
  }
});

// Delete renovacao PDF
router.delete('/renovacoes/:idRenovacao/anexo', async (req, res) => {
  try {
    const { idRenovacao } = req.params;
    await prisma.renovacaoDocumento.update({
      where: { id: parseInt(idRenovacao) },
      data: { anexos: null }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover anexo da renovação' });
  }
});

// Update renovacao
router.put('/renovacoes/:idRenovacao', upload.single('pdf'), async (req, res) => {
  try {
    const { idRenovacao } = req.params;
    const data = req.body;
    
    const updateData = {};
    if (data.descricao !== undefined) updateData.descricao = data.descricao;
    if (data.nova_data_vigencia !== undefined) updateData.nova_data_vigencia = new Date(data.nova_data_vigencia);
    
    if (req.file) {
      updateData.anexos = req.file.mimetype + '|' + req.file.buffer.toString('base64');
    }

    const updated = await prisma.renovacaoDocumento.update({
      where: { id: parseInt(idRenovacao) },
      data: updateData
    });
    
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar renovação' });
  }
});

// Delete renovacao
router.delete('/renovacoes/:idRenovacao', async (req, res) => {
  try {
    const { idRenovacao } = req.params;
    await prisma.renovacaoDocumento.delete({
      where: { id: parseInt(idRenovacao) }
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao excluir renovação' });
  }
});

module.exports = router;

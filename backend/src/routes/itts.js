const express = require('express');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const { sendEmail } = require('../services/emailService');

const router = express.Router();
const prisma = new PrismaClient();

// Configuração do Multer para armazenamento em memória (para converter em Base64)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, fieldSize: 20 * 1024 * 1024 } // Limite de 20MB
});

// Get all ITTs
router.get('/', async (req, res) => {
  const { setorId } = req.query;
  
  try {
    const whereClause = setorId ? { setorId: parseInt(setorId) } : {};
    
    const itts = await prisma.itt.findMany({
      where: whereClause,
      include: {
        setor: true,
        revisoes: {
          orderBy: { criado_em: 'desc' },
          take: 1
        }
      },
      orderBy: { data_vigencia_fim: 'asc' }
    });

    // Calcular o status dinamicamente baseado na data de hoje
    const today = new Date();
    today.setHours(0,0,0,0);

    const updatedItts = itts.map(itt => {
      if (itt.status === 'CANCELADO' || itt.status === 'REVISADO' || itt.status === 'EM_ANALISE') {
        return itt;
      }
      
      if (!itt.data_vigencia_fim) {
        return itt;
      }

      const diffTime = new Date(itt.data_vigencia_fim).getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let calcStatus = 'VIGENTE';
      if (diffDays < 0) {
        calcStatus = 'VENCIDO';
      } else if (diffDays <= itt.dias_alerta) {
        calcStatus = 'A_VENCER';
      }

      return { ...itt, status: calcStatus };
    });

    res.json(updatedItts);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar ITTs' });
  }
});

// Create new ITT
router.post('/', upload.single('pdf'), async (req, res) => {
  try {
    const data = req.body;
    
    let anexos = null;
    if (req.file) {
      anexos = req.file.mimetype + '|' + req.file.buffer.toString('base64');
    }

    const newItt = await prisma.itt.create({
      data: {
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
    res.status(201).json(newItt);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar ITT' });
  }
});

// Update ITT
router.put('/:id', upload.single('pdf'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const updateData = {};
    
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

    const updated = await prisma.itt.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar ITT' });
  }
});

// Download/View PDF
router.get('/:id/anexo', async (req, res) => {
  try {
    const { id } = req.params;
    const itt = await prisma.itt.findUnique({ where: { id: parseInt(id) } });

    if (!itt || !itt.anexos) {
      return res.status(404).json({ error: 'Anexo não encontrado' });
    }

    let mimeType = 'application/pdf';
    let base64Data = itt.anexos;
    let extension = 'pdf';

    if (itt.anexos.includes('|')) {
      const parts = itt.anexos.split('|');
      mimeType = parts[0];
      base64Data = parts[1];
      if (mimeType.includes('msword')) extension = 'doc';
      if (mimeType.includes('wordprocessingml')) extension = 'docx';
    }

    const fileBuffer = Buffer.from(base64Data, 'base64');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="itt_${id}.${extension}"`);
    res.send(fileBuffer);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar anexo' });
  }
});

// Delete ITT PDF
router.delete('/:id/anexo', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.itt.update({
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
    const itt = await prisma.itt.findUnique({
      where: { id: parseInt(id) },
      include: {
        setor: {
          include: { usuarios: true }
        }
      }
    });

    if (!itt) return res.status(404).json({ error: 'ITT não encontrada' });

    const emails = itt.setor.usuarios.map(u => u.email);
    const uniqueEmails = [...new Set(emails)].join(',');

    const configSubject = await prisma.configuracao.findUnique({ where: { chave: 'EMAIL_TEMPLATE_SUBJECT_ITT' } });
    const configBody = await prisma.configuracao.findUnique({ where: { chave: 'EMAIL_TEMPLATE_BODY_ITT' } });

    let subject = configSubject?.valor || `Alerta Manual: {{empresa}}`;
    let html = configBody?.valor || `<p>Atenção à Instrução Técnica <b>{{empresa}}</b> (Setor: {{setor}}).</p><p>Revisão prevista para o dia {{data_vencimento}}.</p>`;

    const dataFormatada = itt.data_vigencia_fim 
      ? new Date(itt.data_vigencia_fim).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) 
      : 'Indeterminado';

    // Calculate days left
    let diffDays = '-';
    if (itt.data_vigencia_fim) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const diffTime = new Date(itt.data_vigencia_fim).getTime() - today.getTime();
      diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const diasAbs = Math.abs(diffDays);
    const prazoTexto = diffDays > 0 ? `tem revisão/vencimento em ${diasAbs} dias` :
                       diffDays === 0 ? `tem revisão/vencimento hoje` :
                       `já venceu/passou da revisão há ${diasAbs} dias`;

    subject = subject
      .replace(/tem revisão\/vencimento em {{dias}} dias/gi, prazoTexto)
      .replace(/vencer[áa] em {{dias}} dias/gi, prazoTexto)
      .replace(/{{tipo}}/g, 'Instrução Técnica (ITT)')
      .replace(/{{empresa}}/g, itt.titulo)
      .replace(/{{setor}}/g, itt.setor.nome)
      .replace(/{{dias}}/g, diasAbs)
      .replace(/{{prazo_texto}}/g, prazoTexto)
      .replace(/{{data_vencimento}}/g, dataFormatada)
            .replace(/{{status_vencimento}}/g, diffDays >= 0 ? 'VENCERÁ EM' : 'VENCEU HÁ');

    html = html
      .replace(/tem revisão\/vencimento em {{dias}} dias/gi, prazoTexto)
      .replace(/vencer[áa] em {{dias}} dias/gi, prazoTexto)
      .replace(/{{tipo}}/g, 'Instrução Técnica (ITT)')
      .replace(/{{empresa}}/g, itt.titulo)
      .replace(/{{setor}}/g, itt.setor.nome)
      .replace(/{{dias}}/g, diasAbs)
      .replace(/{{prazo_texto}}/g, prazoTexto)
      .replace(/{{data_vencimento}}/g, dataFormatada)
            .replace(/{{status_vencimento}}/g, diffDays >= 0 ? 'VENCERÁ EM' : 'VENCEU HÁ');

    const { success, error } = await sendEmail(uniqueEmails, subject, html);

    // Record manual alert
    await prisma.historicoAlertaItt.create({
      data: {
        ittId: itt.id,
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

// Delete ITT
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const parsedId = parseInt(id);

    await prisma.historicoAlertaItt.deleteMany({
      where: { ittId: parsedId }
    });
    
    await prisma.revisaoItt.deleteMany({
      where: { ittId: parsedId }
    });

    await prisma.itt.delete({
      where: { id: parsedId }
    });
    
    res.status(204).send();
  } catch (error) {
    console.error("Erro ao excluir ITT:", error);
    res.status(500).json({ error: 'Erro ao excluir ITT' });
  }
});

// --- REVISOES ---

// Get all revisoes for an ITT
router.get('/:id/revisoes', async (req, res) => {
  try {
    const { id } = req.params;
    const revisoes = await prisma.revisaoItt.findMany({
      where: { ittId: parseInt(id) },
      orderBy: { criado_em: 'desc' }
    });
    res.json(revisoes);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar revisões' });
  }
});

// Create new revisao
router.post('/:id/revisoes', upload.single('pdf'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    let anexos = null;
    if (req.file) {
      anexos = req.file.mimetype + '|' + req.file.buffer.toString('base64');
    }

    const nova_data = new Date(data.nova_data_vigencia);

    // Create revisao
    const revisao = await prisma.revisaoItt.create({
      data: {
        ittId: parseInt(id),
        descricao: data.descricao,
        nova_data_vigencia: nova_data,
        anexos: anexos
      }
    });

    // Update parent ITT
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

    await prisma.itt.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.status(201).json(revisao);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar revisão' });
  }
});

// Download/View Revisao PDF
router.get('/revisoes/:idRevisao/anexo', async (req, res) => {
  try {
    const { idRevisao } = req.params;
    const revisao = await prisma.revisaoItt.findUnique({ where: { id: parseInt(idRevisao) } });

    if (!revisao || !revisao.anexos) {
      return res.status(404).json({ error: 'Anexo não encontrado' });
    }

    let mimeType = 'application/pdf';
    let base64Data = revisao.anexos;
    let extension = 'pdf';

    if (revisao.anexos.includes('|')) {
      const parts = revisao.anexos.split('|');
      mimeType = parts[0];
      base64Data = parts[1];
      if (mimeType.includes('msword')) extension = 'doc';
      if (mimeType.includes('wordprocessingml')) extension = 'docx';
    }

    const fileBuffer = Buffer.from(base64Data, 'base64');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="revisao_${idRevisao}.${extension}"`);
    res.send(fileBuffer);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar anexo' });
  }
});

// Delete revisao PDF
router.delete('/revisoes/:idRevisao/anexo', async (req, res) => {
  try {
    const { idRevisao } = req.params;
    await prisma.revisaoItt.update({
      where: { id: parseInt(idRevisao) },
      data: { anexos: null }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover anexo da revisão' });
  }
});

// Update revisao
router.put('/revisoes/:idRevisao', upload.single('pdf'), async (req, res) => {
  try {
    const { idRevisao } = req.params;
    const data = req.body;
    
    const updateData = {};
    if (data.descricao !== undefined) updateData.descricao = data.descricao;
    if (data.nova_data_vigencia !== undefined) updateData.nova_data_vigencia = new Date(data.nova_data_vigencia);
    
    if (req.file) {
      updateData.anexos = req.file.mimetype + '|' + req.file.buffer.toString('base64');
    }

    const updated = await prisma.revisaoItt.update({
      where: { id: parseInt(idRevisao) },
      data: updateData
    });
    
    // Atualizar também a data principal da ITT se for a última revisão? (Opcional, mas geralmente desejável)
    // Para simplificar, focaremos apenas em atualizar a revisão em si neste endpoint.

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar revisão' });
  }
});

// Delete revisao
router.delete('/revisoes/:idRevisao', async (req, res) => {
  try {
    const { idRevisao } = req.params;
    await prisma.revisaoItt.delete({
      where: { id: parseInt(idRevisao) }
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao excluir revisão' });
  }
});

module.exports = router;

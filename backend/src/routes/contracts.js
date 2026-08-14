const express = require('express');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const { sendEmail } = require('../services/emailService');

const router = express.Router();
const prisma = new PrismaClient();

// Configuração do Multer para armazenamento em memória (para converter em Base64)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // Limite de 10MB
});

// Get all contracts
router.get('/', async (req, res) => {
  const { setorId } = req.query;
  
  try {
    const whereClause = setorId ? { setorId: parseInt(setorId) } : {};
    
    const contracts = await prisma.contrato.findMany({
      where: whereClause,
      include: {
        setor: true,
        aditivos: {
          orderBy: { criado_em: 'desc' },
          take: 1
        }
      },
      orderBy: { data_vigencia_fim: 'asc' }
    });

    // Calcular o status dinamicamente baseado na data de hoje
    const today = new Date();
    today.setHours(0,0,0,0);

    const updatedContracts = contracts.map(contract => {
      if (contract.status === 'ENCERRADO' || contract.status === 'RENOVADO') {
        return contract;
      }
      
      if (!contract.data_vigencia_fim) {
        return contract;
      }

      const diffTime = new Date(contract.data_vigencia_fim).getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let calcStatus = 'VIGENTE';
      if (diffDays < 0) {
        calcStatus = 'VENCIDO';
      } else if (diffDays <= contract.dias_alerta) {
        calcStatus = 'A_VENCER';
      }

      return { ...contract, status: calcStatus };
    });

    res.json(updatedContracts);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar contratos' });
  }
});

// Create new contract
router.post('/', upload.single('pdf'), async (req, res) => {
  try {
    const data = req.body;
    
    let anexos = null;
    if (req.file) {
      anexos = req.file.mimetype + '|' + req.file.buffer.toString('base64');
    }

    const newContract = await prisma.contrato.create({
      data: {
        empresa: data.empresa,
        setorId: parseInt(data.setorId),
        valor: data.valor ? parseFloat(data.valor) : null,
        data_contratacao: data.data_contratacao ? new Date(data.data_contratacao) : null,
        data_vigencia_fim: data.data_vigencia_fim ? new Date(data.data_vigencia_fim) : null,
        renovacao_automatica: data.renovacao_automatica === 'true',
        dias_alerta: data.dias_alerta ? parseInt(data.dias_alerta) : 30,
        prazo_rescisao_dias: data.prazo_rescisao_dias ? parseInt(data.prazo_rescisao_dias) : null,
        status: data.status || 'VIGENTE',
        observacao: data.observacao,
        anexos: anexos
      }
    });
    res.status(201).json(newContract);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar contrato' });
  }
});

// Update contract
router.put('/:id', upload.single('pdf'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const updateData = {};
    
    if (data.empresa !== undefined) updateData.empresa = data.empresa;
    if (data.setorId !== undefined) updateData.setorId = parseInt(data.setorId);
    if (data.valor !== undefined) updateData.valor = data.valor ? parseFloat(data.valor) : null;
    if (data.data_contratacao !== undefined) updateData.data_contratacao = data.data_contratacao ? new Date(data.data_contratacao) : null;
    if (data.data_vigencia_fim !== undefined) updateData.data_vigencia_fim = data.data_vigencia_fim ? new Date(data.data_vigencia_fim) : null;
    if (data.renovacao_automatica !== undefined) updateData.renovacao_automatica = data.renovacao_automatica === 'true' || data.renovacao_automatica === true;
    if (data.dias_alerta !== undefined) updateData.dias_alerta = data.dias_alerta ? parseInt(data.dias_alerta) : 30;
    if (data.prazo_rescisao_dias !== undefined) updateData.prazo_rescisao_dias = data.prazo_rescisao_dias ? parseInt(data.prazo_rescisao_dias) : null;
    if (data.observacao !== undefined) updateData.observacao = data.observacao;
    if (data.status !== undefined) updateData.status = data.status;

    if (req.file) {
      updateData.anexos = req.file.mimetype + '|' + req.file.buffer.toString('base64');
    }

    const updated = await prisma.contrato.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar contrato' });
  }
});

// Download/View PDF
router.get('/:id/anexo', async (req, res) => {
  try {
    const { id } = req.params;
    const contract = await prisma.contrato.findUnique({ where: { id: parseInt(id) } });

    if (!contract || !contract.anexos) {
      return res.status(404).json({ error: 'Anexo não encontrado' });
    }

    let mimeType = 'application/pdf';
    let base64Data = contract.anexos;
    let extension = 'pdf';

    if (contract.anexos.includes('|')) {
      const parts = contract.anexos.split('|');
      mimeType = parts[0];
      base64Data = parts[1];
      if (mimeType.includes('msword')) extension = 'doc';
      if (mimeType.includes('wordprocessingml')) extension = 'docx';
    }

    const fileBuffer = Buffer.from(base64Data, 'base64');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="contrato_${id}.${extension}"`);
    res.send(fileBuffer);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar anexo' });
  }
});

// Delete contract PDF
router.delete('/:id/anexo', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.contrato.update({
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
    const contract = await prisma.contrato.findUnique({
      where: { id: parseInt(id) },
      include: {
        setor: {
          include: { usuarios: true }
        }
      }
    });

    if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' });

    const emails = contract.setor.usuarios.map(u => u.email);
    const uniqueEmails = [...new Set(emails)].join(',');

    const configSubject = await prisma.configuracao.findUnique({ where: { chave: 'EMAIL_TEMPLATE_SUBJECT_CONTRATO' } });
    const configBody = await prisma.configuracao.findUnique({ where: { chave: 'EMAIL_TEMPLATE_BODY_CONTRATO' } });

    let subject = configSubject?.valor || `Alerta Manual de Contrato: {{empresa}}`;
    let html = configBody?.valor || `<p>Atenção ao contrato com a empresa <b>{{empresa}}</b> (Setor: {{setor}}).</p><p>Vencimento previsto para o dia {{data_vencimento}}.</p>`;

    const dataFormatada = contract.data_vigencia_fim 
      ? new Date(contract.data_vigencia_fim).toLocaleDateString('pt-BR') 
      : 'Indeterminado';

    // Calculate days left
    let diffDays = '-';
    if (contract.data_vigencia_fim) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const diffTime = new Date(contract.data_vigencia_fim).getTime() - today.getTime();
      diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const diasAbs = Math.abs(diffDays);
    const prazoTexto = diffDays > 0 ? `vencerá em ${diasAbs} dias` :
                       diffDays === 0 ? `vence hoje` :
                       `venceu há ${diasAbs} dias`;

    subject = subject
      .replace(/vencer[áa] em {{dias}} dias/gi, prazoTexto)
      .replace(/{{tipo}}/g, 'Contrato')
      .replace(/{{empresa}}/g, contract.empresa)
      .replace(/{{setor}}/g, contract.setor.nome)
      .replace(/{{dias}}/g, diasAbs)
      .replace(/{{prazo_texto}}/g, prazoTexto)
      .replace(/{{data_vencimento}}/g, dataFormatada)
            .replace(/{{status_vencimento}}/g, diffDays >= 0 ? 'VENCERÁ EM' : 'VENCEU HÁ');

    html = html
      .replace(/vencer[áa] em {{dias}} dias/gi, prazoTexto)
      .replace(/{{tipo}}/g, 'Contrato')
      .replace(/{{empresa}}/g, contract.empresa)
      .replace(/{{setor}}/g, contract.setor.nome)
      .replace(/{{dias}}/g, diasAbs)
      .replace(/{{prazo_texto}}/g, prazoTexto)
      .replace(/{{data_vencimento}}/g, dataFormatada)
            .replace(/{{status_vencimento}}/g, diffDays >= 0 ? 'VENCERÁ EM' : 'VENCEU HÁ');

    const { success, error } = await sendEmail(uniqueEmails, subject, html);

    // Record manual alert
    await prisma.historicoAlerta.create({
      data: {
        contratoId: contract.id,
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

// Delete contract
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const parsedId = parseInt(id);

    // Apagar manualmente os registros dependentes para evitar erro de Foreign Key do SQLite
    await prisma.historicoAlerta.deleteMany({
      where: { contratoId: parsedId }
    });
    
    await prisma.aditivo.deleteMany({
      where: { contratoId: parsedId }
    });

    await prisma.contrato.delete({
      where: { id: parsedId }
    });
    
    res.status(204).send();
  } catch (error) {
    console.error("Erro ao excluir contrato:", error);
    res.status(500).json({ error: 'Erro ao excluir contrato' });
  }
});

// --- ADITIVOS ---

// Get all aditivos for a contract
router.get('/:id/aditivos', async (req, res) => {
  try {
    const { id } = req.params;
    const aditivos = await prisma.aditivo.findMany({
      where: { contratoId: parseInt(id) },
      orderBy: { criado_em: 'desc' }
    });
    res.json(aditivos);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar aditivos' });
  }
});

// Create new aditivo
router.post('/:id/aditivos', upload.single('pdf'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    let anexos = null;
    if (req.file) {
      anexos = req.file.mimetype + '|' + req.file.buffer.toString('base64');
    }

    const nova_data = new Date(data.nova_data_vigencia);
    const novo_valor = data.novo_valor ? parseFloat(data.novo_valor) : null;

    // Create aditivo
    const aditivo = await prisma.aditivo.create({
      data: {
        contratoId: parseInt(id),
        descricao: data.descricao,
        nova_data_vigencia: nova_data,
        novo_valor: novo_valor,
        anexos: anexos
      }
    });

    // Update parent contract
    const updateData = { data_vigencia_fim: nova_data };
    if (novo_valor !== null) {
      updateData.valor = novo_valor;
    }
    // Also, update status to VIGENTE if it was VENCIDO or A_VENCER, depending on the new date
    const now = new Date();
    const diffTime = nova_data - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let novoStatus = 'VIGENTE';
    // We don't have dias_alerta here easily, so we just set to VIGENTE if it's in the future
    if (diffDays < 0) {
      novoStatus = 'VENCIDO';
    } else if (diffDays <= 30) { // Defaulting to 30 as a fallback
      novoStatus = 'A_VENCER';
    }
    updateData.status = novoStatus;

    await prisma.contrato.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.status(201).json(aditivo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar aditivo' });
  }
});

// Download/View Aditivo PDF
router.get('/aditivos/:idAditivo/anexo', async (req, res) => {
  try {
    const { idAditivo } = req.params;
    const aditivo = await prisma.aditivo.findUnique({ where: { id: parseInt(idAditivo) } });

    if (!aditivo || !aditivo.anexos) {
      return res.status(404).json({ error: 'Anexo não encontrado' });
    }

    let mimeType = 'application/pdf';
    let base64Data = aditivo.anexos;
    let extension = 'pdf';

    if (aditivo.anexos.includes('|')) {
      const parts = aditivo.anexos.split('|');
      mimeType = parts[0];
      base64Data = parts[1];
      if (mimeType.includes('msword')) extension = 'doc';
      if (mimeType.includes('wordprocessingml')) extension = 'docx';
    }

    const fileBuffer = Buffer.from(base64Data, 'base64');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="aditivo_${idAditivo}.${extension}"`);
    res.send(fileBuffer);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar anexo' });
  }
});

// Delete aditivo PDF
router.delete('/aditivos/:idAditivo/anexo', async (req, res) => {
  try {
    const { idAditivo } = req.params;
    await prisma.aditivo.update({
      where: { id: parseInt(idAditivo) },
      data: { anexos: null }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover anexo do aditivo' });
  }
});

module.exports = router;

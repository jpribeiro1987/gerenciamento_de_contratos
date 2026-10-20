const cron = require('node-cron');
const prisma = require('../prisma');
const { sendEmail } = require('./emailService');

let currentCronTask = null;

async function scheduleAlertJob(timeString = "06:00") {
  if (currentCronTask) {
    currentCronTask.stop();
  }

  const [hour, minute] = timeString.split(':');
  const cronExpression = `${parseInt(minute, 10)} ${parseInt(hour, 10)} * * *`;

  console.log(`[AlertJob] Agendando verificação diária para as ${timeString} (${cronExpression})`);
  
  currentCronTask = cron.schedule(cronExpression, async () => {
    console.log(`[AlertJob] Executando verificação diária... (${new Date().toLocaleString()})`);
    await checkContractsAndAlert();
    await checkIttsAndAlert();
    await checkDocumentosAndAlert();
  }, {
    timezone: "America/Sao_Paulo"
  });
}

async function checkContractsAndAlert() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeContracts = await prisma.contrato.findMany({
      where: {
        status: { in: ['VIGENTE', 'A_VENCER', 'VENCIDO'] },
        data_vigencia_fim: { not: null }
      },
      select: {
        id: true,
        empresa: true,
        status: true,
        data_vigencia_fim: true,
        dias_alerta: true,
        emails_cobranca: true,
        setor: { select: { id: true, nome: true } }
      }
    });

    for (const contract of activeContracts) {
      if (!contract.data_vigencia_fim) continue;

      const diffTime = contract.data_vigencia_fim.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= contract.dias_alerta) {
        if (contract.status === 'VIGENTE' && diffDays >= 0) {
          await prisma.contrato.update({
            where: { id: contract.id },
            data: { status: 'A_VENCER' }
          });
        } else if (contract.status !== 'VENCIDO' && diffDays < 0) {
          await prisma.contrato.update({
            where: { id: contract.id },
            data: { status: 'VENCIDO' }
          });
        }

        const lastAlert = await prisma.historicoAlerta.findFirst({
          where: { 
            contratoId: contract.id,
            status_envio: 'SUCESSO'
          },
          orderBy: { data_envio: 'desc' }
        });

        let shouldSend = !lastAlert || (new Date().getTime() - lastAlert.data_envio.getTime()) > (23 * 60 * 60 * 1000);

        if (shouldSend) {
          console.log(`[AlertJob] Enviando alerta para o contrato ${contract.id} (${contract.empresa})`);
          let emails = [];
          if (contract.emails_cobranca) {
            emails = contract.emails_cobranca.split(',').map(e => e.trim()).filter(e => e);
          }
          
          const uniqueEmails = [...new Set(emails)].join(',');
          if (!uniqueEmails) {
            console.log(`[AlertJob] Nenhum e-mail de cobrança configurado para o contrato ${contract.id}. Pulando envio.`);
            continue;
          }
          
          const configSubject = await prisma.configuracao.findUnique({ where: { chave: 'EMAIL_TEMPLATE_SUBJECT_CONTRATO' } });
          const configBody = await prisma.configuracao.findUnique({ where: { chave: 'EMAIL_TEMPLATE_BODY_CONTRATO' } });

          let subject = configSubject?.valor || `Alerta de Vencimento: Contrato {{empresa}}`;
          let html = configBody?.valor || `<p>O contrato com a empresa <b>{{empresa}}</b> (Setor: {{setor}}) vencerá em {{dias}} dias, no dia {{data_vencimento}}.</p><p>Por favor, providencie a renovação.</p>`;

          const dataFormatada = contract.data_vigencia_fim.toLocaleDateString('pt-BR');
          
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

          await prisma.historicoAlerta.create({
            data: {
              contratoId: contract.id,
              destinatarios: uniqueEmails,
              status_envio: success ? 'SUCESSO' : 'ERRO',
              erro: error
            }
          });
        } else {
          console.log(`[AlertJob] Pulando contrato ${contract.id} (${contract.empresa}) - Alerta diário já enviado hoje.`);
        }
      }
    }
  } catch (err) {
    console.error('Error running alert job:', err);
  }
}

async function checkIttsAndAlert() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeItts = await prisma.itt.findMany({
      where: {
        status: { in: ['VIGENTE', 'A_VENCER', 'VENCIDO'] },
        data_vigencia_fim: { not: null }
      },
      select: {
        id: true,
        titulo: true,
        status: true,
        data_vigencia_fim: true,
        dias_alerta: true,
        emails_cobranca: true,
        setor: { select: { id: true, nome: true } }
      }
    });

    for (const itt of activeItts) {
      if (!itt.data_vigencia_fim) continue;

      const diffTime = itt.data_vigencia_fim.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 90) {
        if (itt.status === 'VIGENTE' && diffDays >= 0) {
          await prisma.itt.update({
            where: { id: itt.id },
            data: { status: 'A_VENCER' }
          });
        } else if (itt.status !== 'VENCIDO' && diffDays < 0) {
          await prisma.itt.update({
            where: { id: itt.id },
            data: { status: 'VENCIDO' }
          });
        }

        const lastAlert = await prisma.historicoAlertaItt.findFirst({
          where: { 
            ittId: itt.id,
            status_envio: 'SUCESSO'
          },
          orderBy: { data_envio: 'desc' }
        });

        let shouldSend = false;

        if (diffDays > 0) {
          const isMarker = (diffDays === 90 || diffDays === 60 || diffDays === 30);
          if (isMarker) {
            shouldSend = true;
          } else if (!lastAlert) {
            shouldSend = true;
          } else {
            shouldSend = (new Date().getTime() - lastAlert.data_envio.getTime()) > (30 * 24 * 60 * 60 * 1000);
          }
        } else {
          shouldSend = !lastAlert || (new Date().getTime() - lastAlert.data_envio.getTime()) > (6.5 * 24 * 60 * 60 * 1000);
        }

        if (shouldSend) {
          console.log(`[AlertJob] Enviando alerta para ITT ${itt.id} (${itt.titulo})`);
          let emails = [];
          if (itt.emails_cobranca) {
            emails = itt.emails_cobranca.split(',').map(e => e.trim()).filter(e => e);
          }
          const uniqueEmails = [...new Set(emails)].join(',');
          if (!uniqueEmails) {
            console.log(`[AlertJob] Nenhum e-mail de cobrança configurado para a ITT ${itt.id}. Pulando envio.`);
            continue;
          }
          
          const configSubject = await prisma.configuracao.findUnique({ where: { chave: 'EMAIL_TEMPLATE_SUBJECT_ITT' } });
          const configBody = await prisma.configuracao.findUnique({ where: { chave: 'EMAIL_TEMPLATE_BODY_ITT' } });

          let subject = configSubject?.valor || `Alerta de Vencimento: ITT {{empresa}}`;
          let html = configBody?.valor || `<p>A Instrução Técnica <b>{{empresa}}</b> (Setor: {{setor}}) tem revisão/vencimento em {{dias}} dias, no dia {{data_vencimento}}.</p><p>Por favor, providencie a revisão.</p>`;

          const dataFormatada = itt.data_vigencia_fim.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
          
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

          await prisma.historicoAlertaItt.create({
            data: {
              ittId: itt.id,
              destinatarios: uniqueEmails,
              status_envio: success ? 'SUCESSO' : 'ERRO',
              erro: error
            }
          });
        } else {
          console.log(`[AlertJob] Pulando ITT ${itt.id} (${itt.titulo}) - E-mail já enviado recentemente ou fora da data alvo.`);
        }
      }
    }
  } catch (err) {
    console.error('Error running ITT alert job:', err);
  }
}

async function checkDocumentosAndAlert() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeDocs = await prisma.documento.findMany({
      where: {
        status: { in: ['VIGENTE', 'A_VENCER', 'VENCIDO'] },
        data_vigencia_fim: { not: null }
      },
      select: {
        id: true,
        titulo: true,
        status: true,
        data_vigencia_fim: true,
        dias_alerta: true,
        emails_cobranca: true,
        setor: { select: { id: true, nome: true } }
      }
    });

    for (const doc of activeDocs) {
      if (!doc.data_vigencia_fim) continue;

      const diffTime = doc.data_vigencia_fim.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= doc.dias_alerta) {
        if (doc.status === 'VIGENTE' && diffDays >= 0) {
          await prisma.documento.update({
            where: { id: doc.id },
            data: { status: 'A_VENCER' }
          });
        } else if (doc.status !== 'VENCIDO' && diffDays < 0) {
          await prisma.documento.update({
            where: { id: doc.id },
            data: { status: 'VENCIDO' }
          });
        }

        const lastAlert = await prisma.historicoAlertaDocumento.findFirst({
          where: { 
            documentoId: doc.id,
            status_envio: 'SUCESSO'
          },
          orderBy: { data_envio: 'desc' }
        });

        let shouldSend = !lastAlert || (new Date().getTime() - lastAlert.data_envio.getTime()) > (23 * 60 * 60 * 1000);

        if (shouldSend) {
          console.log(`[AlertJob] Enviando alerta para Documento ${doc.id} (${doc.titulo})`);
          let emails = [];
          if (doc.emails_cobranca) {
            emails = doc.emails_cobranca.split(',').map(e => e.trim()).filter(e => e);
          }
          const uniqueEmails = [...new Set(emails)].join(',');
          if (!uniqueEmails) {
            console.log(`[AlertJob] Nenhum e-mail de cobrança configurado para o documento ${doc.id}. Pulando envio.`);
            continue;
          }
          
          const configSubject = await prisma.configuracao.findUnique({ where: { chave: 'EMAIL_TEMPLATE_SUBJECT_DOC' } });
          const configBody = await prisma.configuracao.findUnique({ where: { chave: 'EMAIL_TEMPLATE_BODY_DOC' } });

          let subject = configSubject?.valor || `Alerta de Vencimento: Documento {{empresa}}`;
          let html = configBody?.valor || `<p>O Documento <b>{{empresa}}</b> (Setor: {{setor}}) vencerá em {{dias}} dias, no dia {{data_vencimento}}.</p><p>Por favor, providencie a renovação.</p>`;

          const dataFormatada = doc.data_vigencia_fim.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
          
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
            .replace(/{{status_vencimento}}/g, diffDays >= 0 ? 'VENCERÁ EM' : 'VENCEU HÁ');

          html = html
            .replace(/vencer[áa] em {{dias}} dias/gi, prazoTexto)
            .replace(/{{tipo}}/g, 'Documento/CND')
            .replace(/{{empresa}}/g, doc.titulo)
            .replace(/{{setor}}/g, doc.setor.nome)
            .replace(/{{dias}}/g, diasAbs)
            .replace(/{{prazo_texto}}/g, prazoTexto)
            .replace(/{{data_vencimento}}/g, dataFormatada)
            .replace(/{{status_vencimento}}/g, diffDays >= 0 ? 'VENCERÁ EM' : 'VENCEU HÁ');

          const { success, error } = await sendEmail(uniqueEmails, subject, html);

          await prisma.historicoAlertaDocumento.create({
            data: {
              documentoId: doc.id,
              destinatarios: uniqueEmails,
              status_envio: success ? 'SUCESSO' : 'ERRO',
              erro: error
            }
          });
        } else {
          console.log(`[AlertJob] Pulando Documento ${doc.id} (${doc.titulo}) - Alerta diário já enviado hoje.`);
        }
      }
    }
  } catch (err) {
    console.error('Error running Documento alert job:', err);
  }
}

async function migrateInitialEmailsCobranca() {
  try {
    const alreadyMigrated = await prisma.configuracao.findUnique({
      where: { chave: 'MIGRATED_EMAILS_COBRANCA_V1' }
    });
    if (alreadyMigrated?.valor === 'true') {
      return;
    }

    console.log('[Migration] Executando migração inicial única de e-mails de cobrança...');

    const setores = await prisma.setor.findMany({
      include: { usuarios: true }
    });

    const setorEmailMap = {};
    for (const setor of setores) {
      const nonSeedUsers = setor.usuarios.filter(u => u.email.toLowerCase() !== 'admin@hospital.com');
      const targetUsers = nonSeedUsers.length > 0 ? nonSeedUsers : setor.usuarios;

      let emails = targetUsers.map(u => u.email.trim()).filter(Boolean);
      if (setor.emails_cobranca) {
        const extra = setor.emails_cobranca.split(',').map(e => e.trim()).filter(Boolean);
        emails = emails.concat(extra);
      }

      const uniqueEmails = [...new Set(emails)].join(', ');
      if (uniqueEmails) {
        setorEmailMap[setor.id] = uniqueEmails;
      }
    }

    // Atualizar buscando apenas id e setorId (sem ler a coluna anexos pesada) e atualizando pela chave primária id
    const contratosPendentes = await prisma.contrato.findMany({
      where: { OR: [{ emails_cobranca: null }, { emails_cobranca: '' }] },
      select: { id: true, setorId: true }
    });
    const contratosPorSetor = {};
    for (const c of contratosPendentes) {
      if (setorEmailMap[c.setorId]) {
        if (!contratosPorSetor[c.setorId]) contratosPorSetor[c.setorId] = [];
        contratosPorSetor[c.setorId].push(c.id);
      }
    }
    for (const [setorId, ids] of Object.entries(contratosPorSetor)) {
      await prisma.contrato.updateMany({
        where: { id: { in: ids } },
        data: { emails_cobranca: setorEmailMap[setorId] }
      });
    }

    const ittsPendentes = await prisma.itt.findMany({
      where: { OR: [{ emails_cobranca: null }, { emails_cobranca: '' }] },
      select: { id: true, setorId: true }
    });
    const ittsPorSetor = {};
    for (const i of ittsPendentes) {
      if (setorEmailMap[i.setorId]) {
        if (!ittsPorSetor[i.setorId]) ittsPorSetor[i.setorId] = [];
        ittsPorSetor[i.setorId].push(i.id);
      }
    }
    for (const [setorId, ids] of Object.entries(ittsPorSetor)) {
      await prisma.itt.updateMany({
        where: { id: { in: ids } },
        data: { emails_cobranca: setorEmailMap[setorId] }
      });
    }

    const docsPendentes = await prisma.documento.findMany({
      where: { OR: [{ emails_cobranca: null }, { emails_cobranca: '' }] },
      select: { id: true, setorId: true }
    });
    const docsPorSetor = {};
    for (const d of docsPendentes) {
      if (setorEmailMap[d.setorId]) {
        if (!docsPorSetor[d.setorId]) docsPorSetor[d.setorId] = [];
        docsPorSetor[d.setorId].push(d.id);
      }
    }
    for (const [setorId, ids] of Object.entries(docsPorSetor)) {
      await prisma.documento.updateMany({
        where: { id: { in: ids } },
        data: { emails_cobranca: setorEmailMap[setorId] }
      });
    }

    await prisma.configuracao.upsert({
      where: { chave: 'MIGRATED_EMAILS_COBRANCA_V1' },
      update: { valor: 'true' },
      create: { chave: 'MIGRATED_EMAILS_COBRANCA_V1', valor: 'true' }
    });

    console.log('[Migration] Migração inicial de e-mails de cobrança concluída com sucesso!');
  } catch (err) {
    console.error('[Migration] Erro ao migrar e-mails de cobrança iniciais:', err);
  }
}

async function initJobs() {
  try {
    await migrateInitialEmailsCobranca();
    const config = await prisma.configuracao.findUnique({ where: { chave: 'ALERT_CRON_TIME' } });
    const timeString = config?.valor || '06:00';
    await scheduleAlertJob(timeString);
  } catch (err) {
    console.error('Failed to init alert job:', err);
  }
}

module.exports = { checkContractsAndAlert, checkIttsAndAlert, checkDocumentosAndAlert, scheduleAlertJob, initJobs };

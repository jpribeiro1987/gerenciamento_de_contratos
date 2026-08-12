const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { sendEmail } = require('./emailService');

const prisma = new PrismaClient();

let currentCronTask = null;

async function scheduleAlertJob(timeString = "06:00") {
  // Parar tarefa antiga se existir
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

// Removido o disparo automático no momento em que o servidor liga. 
// O robô agora só roda estritamente no horário agendado.

async function checkContractsAndAlert() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeContracts = await prisma.contrato.findMany({
      where: {
        status: { in: ['VIGENTE', 'A_VENCER', 'VENCIDO'] },
        data_vigencia_fim: { not: null }
      },
      include: {
        setor: {
          include: {
            usuarios: true
          }
        }
      }
    });

    for (const contract of activeContracts) {
      if (!contract.data_vigencia_fim) continue;

      const diffTime = contract.data_vigencia_fim.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= contract.dias_alerta) {
        
        // Update status if it's not already A_VENCER or VENCIDO
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

        // Check if we already sent an automatic email today
        const lastAlert = await prisma.historicoAlerta.findFirst({
          where: { 
            contratoId: contract.id,
            status_envio: 'SUCESSO'
          },
          orderBy: { data_envio: 'desc' }
        });

        // Disparo é DIÁRIO a partir dos "Dias p/ Alerta"
        let shouldSend = !lastAlert || (new Date().getTime() - lastAlert.data_envio.getTime()) > (23 * 60 * 60 * 1000);

        if (shouldSend) {
          console.log(`[AlertJob] Enviando alerta para o contrato ${contract.id} (${contract.empresa})`);
          const emails = contract.setor.usuarios.map(u => u.email);
          
          const uniqueEmails = [...new Set(emails)].join(',');
          
          // Get templates
          const configSubject = await prisma.configuracao.findUnique({ where: { chave: 'EMAIL_TEMPLATE_SUBJECT' } });
          const configBody = await prisma.configuracao.findUnique({ where: { chave: 'EMAIL_TEMPLATE_BODY' } });

          let subject = configSubject?.valor || `Alerta de Vencimento: Contrato {{empresa}}`;
          let html = configBody?.valor || `<p>O contrato com a empresa <b>{{empresa}}</b> (Setor: {{setor}}) vencerá em {{dias}} dias, no dia {{data_vencimento}}.</p><p>Por favor, providencie a renovação.</p>`;

          // Replace variables
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
      include: {
        setor: {
          include: {
            usuarios: true
          }
        }
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
          // Vencido (diffDays <= 0)
          shouldSend = !lastAlert || (new Date().getTime() - lastAlert.data_envio.getTime()) > (6.5 * 24 * 60 * 60 * 1000);
        }

        if (shouldSend) {
          console.log(`[AlertJob] Enviando alerta para ITT ${itt.id} (${itt.titulo})`);
          const emails = itt.setor.usuarios.map(u => u.email);
          const uniqueEmails = [...new Set(emails)].join(',');
          
          const configSubject = await prisma.configuracao.findUnique({ where: { chave: 'EMAIL_TEMPLATE_SUBJECT' } });
          const configBody = await prisma.configuracao.findUnique({ where: { chave: 'EMAIL_TEMPLATE_BODY' } });

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
      include: {
        setor: {
          include: { usuarios: true }
        }
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

        // Disparo é DIÁRIO a partir dos "Dias p/ Alerta"
        let shouldSend = !lastAlert || (new Date().getTime() - lastAlert.data_envio.getTime()) > (23 * 60 * 60 * 1000);

        if (shouldSend) {
          console.log(`[AlertJob] Enviando alerta para Documento ${doc.id} (${doc.titulo})`);
          const emails = doc.setor.usuarios.map(u => u.email);
          const uniqueEmails = [...new Set(emails)].join(',');
          
          const configSubject = await prisma.configuracao.findUnique({ where: { chave: 'EMAIL_TEMPLATE_SUBJECT' } });
          const configBody = await prisma.configuracao.findUnique({ where: { chave: 'EMAIL_TEMPLATE_BODY' } });

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

async function initJobs() {
  try {
    const config = await prisma.configuracao.findUnique({ where: { chave: 'ALERT_CRON_TIME' } });
    const timeString = config?.valor || '06:00';
    await scheduleAlertJob(timeString);
  } catch (err) {
    console.error('Failed to init alert job:', err);
  }
}

module.exports = { checkContractsAndAlert, checkIttsAndAlert, checkDocumentosAndAlert, scheduleAlertJob, initJobs };

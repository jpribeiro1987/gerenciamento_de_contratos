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
        status: { in: ['VIGENTE', 'A_VENCER'] },
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

      // Threshold hit
      if (diffDays <= contract.dias_alerta && diffDays >= 0) {
        
        // Update status if it's not already A_VENCER or VENCIDO
        if (contract.status === 'VIGENTE') {
          await prisma.contrato.update({
            where: { id: contract.id },
            data: { status: 'A_VENCER' }
          });
        }

        // Check if we already sent an automatic email recently to avoid spamming everyday
        const lastAlert = await prisma.historicoAlerta.findFirst({
          where: { 
            contratoId: contract.id,
            status_envio: 'SUCESSO' // Ignorar SUCESSO_MANUAL para não bloquear o robô
          },
          orderBy: { data_envio: 'desc' }
        });

        const shouldSend = !lastAlert || 
          (new Date().getTime() - lastAlert.data_envio.getTime()) > (7 * 24 * 60 * 60 * 1000); // 7 days interval

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
            .replace(/{{data_vencimento}}/g, dataFormatada);

          html = html
            .replace(/vencer[áa] em {{dias}} dias/gi, prazoTexto)
            .replace(/{{tipo}}/g, 'Contrato')
            .replace(/{{empresa}}/g, contract.empresa)
            .replace(/{{setor}}/g, contract.setor.nome)
            .replace(/{{dias}}/g, diasAbs)
            .replace(/{{prazo_texto}}/g, prazoTexto)
            .replace(/{{data_vencimento}}/g, dataFormatada);

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
          console.log(`[AlertJob] Pulando contrato ${contract.id} (${contract.empresa}) - E-mail já enviado nos últimos 7 dias.`);
        }
      } else if (diffDays < 0 && contract.status !== 'VENCIDO') {
        // Contract is expired
        await prisma.contrato.update({
          where: { id: contract.id },
          data: { status: 'VENCIDO' }
        });
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
        status: { in: ['VIGENTE', 'A_VENCER'] },
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

      if (diffDays <= itt.dias_alerta && diffDays >= 0) {
        if (itt.status === 'VIGENTE') {
          await prisma.itt.update({
            where: { id: itt.id },
            data: { status: 'A_VENCER' }
          });
        }

        const lastAlert = await prisma.historicoAlertaItt.findFirst({
          where: { 
            ittId: itt.id,
            status_envio: 'SUCESSO'
          },
          orderBy: { data_envio: 'desc' }
        });

        const shouldSend = !lastAlert || 
          (new Date().getTime() - lastAlert.data_envio.getTime()) > (7 * 24 * 60 * 60 * 1000);

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
            .replace(/{{data_vencimento}}/g, dataFormatada);

          html = html
            .replace(/tem revisão\/vencimento em {{dias}} dias/gi, prazoTexto)
            .replace(/vencer[áa] em {{dias}} dias/gi, prazoTexto)
            .replace(/{{tipo}}/g, 'Instrução Técnica (ITT)')
            .replace(/{{empresa}}/g, itt.titulo)
            .replace(/{{setor}}/g, itt.setor.nome)
            .replace(/{{dias}}/g, diasAbs)
            .replace(/{{prazo_texto}}/g, prazoTexto)
            .replace(/{{data_vencimento}}/g, dataFormatada);

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
          console.log(`[AlertJob] Pulando ITT ${itt.id} (${itt.titulo}) - E-mail já enviado nos últimos 7 dias.`);
        }
      } else if (diffDays < 0 && itt.status !== 'VENCIDO') {
        await prisma.itt.update({
          where: { id: itt.id },
          data: { status: 'VENCIDO' }
        });
      }
    }
  } catch (err) {
    console.error('Error running ITT alert job:', err);
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

module.exports = { checkContractsAndAlert, checkIttsAndAlert, scheduleAlertJob, initJobs };

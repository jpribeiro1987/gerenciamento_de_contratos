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
  }, {
    timezone: "America/Sao_Paulo"
  });
}

// Run on startup for demo purposes
setTimeout(() => {
  console.log('Running initial contract alert check...');
  checkContractsAndAlert();
}, 2000);

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
          
          subject = subject
            .replace(/{{empresa}}/g, contract.empresa)
            .replace(/{{setor}}/g, contract.setor.nome)
            .replace(/{{dias}}/g, diffDays)
            .replace(/{{data_vencimento}}/g, dataFormatada);

          html = html
            .replace(/{{empresa}}/g, contract.empresa)
            .replace(/{{setor}}/g, contract.setor.nome)
            .replace(/{{dias}}/g, diffDays)
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

async function initJobs() {
  try {
    const config = await prisma.configuracao.findUnique({ where: { chave: 'ALERT_CRON_TIME' } });
    const timeString = config?.valor || '06:00';
    await scheduleAlertJob(timeString);
  } catch (err) {
    console.error('Failed to init alert job:', err);
  }
}

module.exports = { checkContractsAndAlert, scheduleAlertJob, initJobs };

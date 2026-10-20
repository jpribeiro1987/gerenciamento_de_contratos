const prisma = require('../prisma');

let cachedSectorEmailsMap = null;

async function ensureInitialEmailsSnapshot() {
  if (cachedSectorEmailsMap !== null) {
    return cachedSectorEmailsMap;
  }

  try {
    const existingConfig = await prisma.configuracao.findUnique({
      where: { chave: 'INITIAL_SECTOR_EMAILS_MAP' }
    });

    if (existingConfig?.valor) {
      cachedSectorEmailsMap = JSON.parse(existingConfig.valor);
      return cachedSectorEmailsMap;
    }

    console.log('[Migration] Gerando snapshot inicial único de e-mails de cobrança...');
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

    await prisma.configuracao.upsert({
      where: { chave: 'INITIAL_SECTOR_EMAILS_MAP' },
      update: { valor: JSON.stringify(setorEmailMap) },
      create: { chave: 'INITIAL_SECTOR_EMAILS_MAP', valor: JSON.stringify(setorEmailMap) }
    });

    cachedSectorEmailsMap = setorEmailMap;
    console.log('[Migration] Snapshot inicial de e-mails de cobrança concluído instantaneamente!');
    return cachedSectorEmailsMap;
  } catch (err) {
    console.error('[Migration] Erro ao gerar snapshot inicial de e-mails:', err);
    return {};
  }
}

function resolveEmailsCobranca(item, sectorMap) {
  if (item.emails_cobranca !== null && item.emails_cobranca !== undefined) {
    return item.emails_cobranca;
  }
  return (sectorMap && sectorMap[item.setorId]) ? sectorMap[item.setorId] : '';
}

module.exports = { ensureInitialEmailsSnapshot, resolveEmailsCobranca };

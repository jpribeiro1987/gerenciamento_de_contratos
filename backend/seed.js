const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// Helper para converter data serial do Excel para JS Date
function excelDateToJSDate(serial) {
  if (!serial) return null;
  if (typeof serial === 'string') {
    // try to parse '2026-05-10' or '10/05/2026'
    const parts = serial.split('/');
    if (parts.length === 3) {
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    const d = new Date(serial);
    if (!isNaN(d.getTime())) return d;
    return null;
  }
  const utc_days  = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;                                        
  const date_info = new Date(utc_value * 1000);
  const fractional_day = serial - Math.floor(serial) + 0.0000001;
  let total_seconds = Math.floor(86400 * fractional_day);
  const seconds = total_seconds % 60;
  total_seconds -= seconds;
  const hours = Math.floor(total_seconds / (60 * 60));
  const minutes = Math.floor(total_seconds / 60) % 60;
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
}

async function main() {
  console.log('Verificando estado do banco de dados...');
  const anyUserExists = await prisma.usuario.findFirst();
  
  if (anyUserExists) {
    console.log('O banco de dados já possui dados. Poupando o Seed para não apagar os cadastros.');
    return;
  }

  console.log('Iniciando o Seed para criar o ambiente base...');
  
  const excelPath = 'C:\\Users\\T-GAMER\\Downloads\\CONTROLE DE CONTRATOS - 2026.xlsx';
  
  if (!fs.existsSync(excelPath)) {
    console.log('Planilha não encontrada no caminho do Windows. Inicializando apenas com o usuário Administrador.');
    const createdSetor = await prisma.setor.create({ data: { nome: 'Administração' } });
    await prisma.usuario.create({
      data: {
        nome: 'Administrador do Sistema',
        email: 'admin@hospital.com',
        perfil: 'ADMIN',
        setores: { connect: [{ id: createdSetor.id }] }
      }
    });
    console.log('Ambiente base criado com sucesso!');
    return;
  }

  const workbook = xlsx.readFile(excelPath);
  const sheet = workbook.Sheets['Planilha2'];
  
  if (!sheet) {
    throw new Error("A aba 'Planilha2' não foi encontrada.");
  }

  const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  const headerIndex = rawData.findIndex(row => row && row.includes('Empresa'));
  
  if (headerIndex === -1) {
    throw new Error("A coluna 'Empresa' não foi encontrada para definir o cabeçalho.");
  }

  const headers = rawData[headerIndex];
  const data = rawData.slice(headerIndex + 1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      if (h) obj[h] = row[i];
    });
    return obj;
  });
  
  console.log(`Encontrados ${data.length} registros no Excel.`);

  // 1. Extrair e criar setores dinamicamente
  const setorNames = new Set(data.map(r => r['Setor Resp.']).filter(Boolean));
  if (setorNames.size === 0) setorNames.add('Administração'); // fallback

  const setoresDb = {};
  for (const s of setorNames) {
    const created = await prisma.setor.create({ data: { nome: s.trim() } });
    setoresDb[s.trim()] = created.id;
  }

  // 2. Criar Admin User
  const adminIds = Object.values(setoresDb).map(id => ({ id }));
  await prisma.usuario.create({
    data: {
      nome: 'Administrador do Sistema',
      email: 'admin@hospital.com',
      perfil: 'ADMIN',
      setores: { connect: adminIds }
    }
  });

  // 3. Importar contratos
  let count = 0;
  for (const row of data) {
    const empresa = row['Empresa'];
    if (!empresa) continue; // Pular se a empresa for vazia

    const setorName = (row['Setor Resp.'] || 'Administração').trim();
    const setorId = setoresDb[setorName] || Object.values(setoresDb)[0];

    // Tratamento de valores numéricos
    let valor = 0;
    const rawValor = row['Valor do contrato'];
    if (typeof rawValor === 'number') valor = rawValor;
    else if (typeof rawValor === 'string') {
      const clean = rawValor.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.');
      const parsed = parseFloat(clean);
      valor = isNaN(parsed) ? 0 : parsed;
    }

    // Alertas
    let diasAlerta = 30;
    if (row['Alerta de 30 dias '] === 'SIM' || row['Alerta de 30 dias '] === 'Sim') diasAlerta = 30;
    else if (typeof row['Alerta de 30 dias '] === 'number') diasAlerta = row['Alerta de 30 dias '];

    const dataContratacao = excelDateToJSDate(row['Data da contratação']);
    const dataVigenciaFim = excelDateToJSDate(row['Data vigência ']);

    // Calcular status baseado na vigência
    let status = 'VIGENTE';
    if (dataVigenciaFim) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const diffDays = Math.ceil((dataVigenciaFim.getTime() - today.getTime()) / (1000 * 3600 * 24));
      if (diffDays < 0) status = 'VENCIDO';
      else if (diffDays <= diasAlerta) status = 'A_VENCER';
    }

    await prisma.contrato.create({
      data: {
        empresa,
        setorId,
        valor,
        valor_tipo: 'FIXO',
        prazo_rescisao_dias: parseInt(row['Prazo para recisão']) || 30,
        data_contratacao: dataContratacao,
        data_vigencia_fim: dataVigenciaFim,
        renovacao_automatica: row['Renovação automatica '] === 'SIM',
        dias_alerta: diasAlerta,
        observacao: row['Observação'] ? String(row['Observação']) : null,
        status: status
      }
    });
    count++;
  }

  console.log(`Migração completa! ${count} contratos importados.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

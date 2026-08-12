const fs = require('fs');
const files = [
  'backend/src/routes/contracts.js',
  'backend/src/routes/documentos.js',
  'backend/src/routes/itts.js',
  'backend/src/services/alertJob.js'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(/\.replace\(\/\{\{data_vencimento\}\}\/g,\s*dataFormatada\);/g, 
    ".replace(/{{data_vencimento}}/g, dataFormatada)\n            .replace(/{{status_vencimento}}/g, diffDays >= 0 ? 'VENCERÁ' : 'VENCEU HÁ');");
    
  fs.writeFileSync(file, content);
  console.log('Updated ' + file);
});

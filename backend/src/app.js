const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { checkContractsAndAlert, scheduleAlertJob } = require('./services/alertJob');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
const contractsRoutes = require('./routes/contracts');
const sectorsRoutes = require('./routes/sectors');
const configRoutes = require('./routes/config');
const documentosRoutes = require('./routes/documentos');
const backupRoutes = require('./routes/backup');
const usersRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const alertasRoutes = require('./routes/alertas');
const ittsRouter = require('./routes/itts');

app.use('/api/auth', authRoutes);
app.use('/api/setores', sectorsRoutes);
app.use('/api/contratos', contractsRoutes);
app.use('/api/usuarios', usersRoutes);
app.use('/api/config', configRoutes);
app.use('/api/documentos', documentosRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/alertas', alertasRoutes);
app.use('/api/itts', ittsRouter);

// Simple healthcheck
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Start background jobs
const { initJobs } = require('./services/alertJob');
initJobs();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import NovoContrato from './pages/NovoContrato';
import Contratos from './pages/Contratos';
import Itts from './pages/Itts';
import SetoresUsuarios from './pages/SetoresUsuarios';
import Login from './pages/Login';
import Configuracoes from './pages/Configuracoes';
import Relatorios from './pages/Relatorios';
import FilaEmails from './pages/FilaEmails';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'theme-light');

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    // Check local storage for existing session on startup
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (!user) {
    return (
      <div className={`app-container ${theme}`}>
        <Login onLoginSuccess={handleLoginSuccess} theme={theme} setTheme={setTheme} />
      </div>
    );
  }

  // Se o usuário for GESTOR, ele pode estar vinculado a 1 ou mais setores. 
  // Para fins da prop antiga `userSector`, podemos passar o primeiro setor dele, 
  // mas o ideal seria passar o array completo. Vou passar a prop `userSectors` também.
  const userRole = user.perfil;
  const userSector = user.setores && user.setores.length > 0 ? user.setores[0].id : null;

  return (
    <div className={`app-container ${theme}`}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userRole={userRole} onLogout={handleLogout} theme={theme} setTheme={setTheme} />
      <main className="main-content">
        {activeTab === 'dashboard' && <Dashboard userRole={userRole} userSector={userSector} />}
        {activeTab === 'novo_contrato' && <NovoContrato />}
        {activeTab === 'configuracoes' && <Configuracoes />}
        {activeTab === 'contratos' && <Contratos userRole={userRole} userSector={userSector} />}
        {activeTab === 'itts' && <Itts userRole={userRole} userSector={userSector} />}
        {activeTab === 'setores' && <SetoresUsuarios />}
        {activeTab === 'relatorios' && <Relatorios userRole={userRole} userSector={userSector} />}
        {activeTab === 'fila_emails' && <FilaEmails userRole={userRole} />}
      </main>
    </div>
  );
}

export default App;

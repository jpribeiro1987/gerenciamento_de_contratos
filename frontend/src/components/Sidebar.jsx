import React from 'react';
import { LayoutDashboard, FileText, Users, Settings, LogOut, Grid, PlusCircle, Moon, Sun, Printer, Mail } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, userRole, onLogout, theme, setTheme }) => {
  const toggleTheme = () => {
    setTheme(theme === 'theme-light' ? 'theme-dark' : 'theme-light');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-title" style={{ padding: '24px 24px 12px 24px', justifyContent: 'center' }}>
        <img src="/logo.png" alt="Logo Instituição" style={{ maxHeight: '60px', width: 'auto', objectFit: 'contain' }} 
             onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
        <div style={{ display: 'none', alignItems: 'center', gap: '8px' }}>
          <Grid size={24} />
          Sistema de Gestão de Contratos e Instruções Técnicas de Trabalho (ITT)
        </div>
      </div>
      
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <div 
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </div>

        {userRole === 'ADMIN' && (
          <div 
            className={`nav-item ${activeTab === 'novo_contrato' ? 'active' : ''}`}
            onClick={() => setActiveTab('novo_contrato')}
          >
            <PlusCircle size={20} />
            <span>Novo Contrato</span>
          </div>
        )}
        
        <div 
          className={`nav-item ${activeTab === 'contratos' ? 'active' : ''}`}
          onClick={() => setActiveTab('contratos')}
        >
          <FileText size={20} />
          <span>Contratos</span>
        </div>

        <div 
          className={`nav-item ${activeTab === 'itts' ? 'active' : ''}`}
          onClick={() => setActiveTab('itts')}
        >
          <FileText size={20} />
          <span>Instruções (ITT)</span>
        </div>

        <div 
          className={`nav-item ${activeTab === 'relatorios' ? 'active' : ''}`}
          onClick={() => setActiveTab('relatorios')}
        >
          <Printer size={20} />
          <span>Relatórios</span>
        </div>

        {userRole === 'ADMIN' && (
          <div 
            className={`nav-item ${activeTab === 'setores' ? 'active' : ''}`}
            onClick={() => setActiveTab('setores')}
          >
            <Users size={20} />
            <span>Setores & Usuários</span>
          </div>
        )}

        {userRole === 'ADMIN' && (
          <div 
            className={`nav-item ${activeTab === 'configuracoes' ? 'active' : ''}`}
            onClick={() => setActiveTab('configuracoes')}
          >
            <Settings size={20} />
            <span>Configurações</span>
          </div>
        )}

        {userRole === 'ADMIN' && (
          <div 
            className={`nav-item ${activeTab === 'fila_emails' ? 'active' : ''}`}
            onClick={() => setActiveTab('fila_emails')}
          >
            <Mail size={20} />
            <span>Fila de E-mails</span>
          </div>
        )}
      </nav>

      <div style={{ padding: '24px', borderTop: '1px solid var(--panel-border)', marginTop: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Perfil Atual</div>
          <div style={{ 
            background: 'rgba(0,0,0,0.2)', 
            padding: '8px 12px', 
            borderRadius: '6px', 
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'var(--primary)',
            textAlign: 'center'
          }}>
            {userRole}
          </div>
        </div>

        <button 
          onClick={toggleTheme}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
            padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--panel-border)',
            background: 'rgba(0,0,0,0.1)', color: 'var(--text-main)', cursor: 'pointer',
            fontSize: '0.95rem', fontWeight: 500, transition: 'all 0.2s ease', justifyContent: 'center',
            marginBottom: '12px'
          }}
        >
          {theme === 'theme-light' ? <Moon size={18} /> : <Sun size={18} />}
          <span>{theme === 'theme-light' ? 'Tema Escuro' : 'Tema Claro'}</span>
        </button>

        <button 
          onClick={onLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
            padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)',
            background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', cursor: 'pointer',
            fontSize: '0.95rem', fontWeight: 500, transition: 'all 0.2s ease', justifyContent: 'center'
          }}
        >
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

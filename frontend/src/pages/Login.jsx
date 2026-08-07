import React, { useState } from 'react';
import axios from 'axios';
import { Lock, Mail, Moon, Sun } from 'lucide-react';

const Login = ({ onLoginSuccess, theme, setTheme }) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('http://localhost:3000/api/auth/login', { email, senha });
      const { token, user } = res.data;
      
      // Save to localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Callback to update App.jsx state
      onLoginSuccess(user);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Erro ao conectar ao servidor.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'theme-light' ? 'theme-dark' : 'theme-light');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--bg-main)', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <button 
        onClick={toggleTheme}
        style={{
          position: 'absolute', top: '24px', right: '24px',
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--panel-border)',
          background: 'rgba(0,0,0,0.1)', color: 'var(--text-main)', cursor: 'pointer',
          fontSize: '0.9rem', fontWeight: 500, transition: 'all 0.2s ease'
        }}
      >
        {theme === 'theme-light' ? <Moon size={16} /> : <Sun size={16} />}
        <span>{theme === 'theme-light' ? 'Tema Escuro' : 'Tema Claro'}</span>
      </button>

      <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
        
        <div style={{ textAlign: 'center', width: '100%' }}>
          <img src="/logo.png" alt="Logo Instituição" style={{ maxWidth: '100%', maxHeight: '80px', objectFit: 'contain', marginBottom: '16px' }} 
               onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--primary)' }}>Sistema de Gestão de Contratos</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Faça login para acessar o sistema</p>
        </div>

        {error && (
          <div style={{ width: '100%', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.9rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="email" 
              placeholder="E-mail corporativo" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ ...inputStyle, paddingLeft: '44px', width: '100%' }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="password" 
              placeholder="Senha" 
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              style={{ ...inputStyle, paddingLeft: '44px', width: '100%' }}
            />
          </div>

          <button type="submit" disabled={loading} style={{ ...btnStyle, marginTop: '8px' }}>
            {loading ? 'Autenticando...' : 'Entrar'}
          </button>
        </form>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Esqueceu sua senha? Solicite ao administrador do sistema para redefini-la.
        </p>

      </div>
      
      <div style={{ position: 'absolute', bottom: '16px', width: '100%', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Desenvolvido por João Paulo Ribeiro
      </div>
    </div>
  );
};

const inputStyle = {
  background: 'rgba(0,0,0,0.2)',
  border: '1px solid var(--panel-border)',
  color: 'var(--text-main)',
  padding: '14px',
  borderRadius: '8px',
  outline: 'none',
  fontFamily: 'inherit',
  fontSize: '1rem',
  boxSizing: 'border-box'
};

const btnStyle = {
  background: 'var(--primary)',
  color: '#fff',
  border: 'none',
  padding: '14px',
  borderRadius: '8px',
  fontWeight: 600,
  fontSize: '1rem',
  cursor: 'pointer',
  transition: 'background 0.2s ease',
  width: '100%'
};

export default Login;

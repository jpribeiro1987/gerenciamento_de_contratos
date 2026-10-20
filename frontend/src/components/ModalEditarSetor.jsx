import React, { useState } from 'react';
import axios from 'axios';
import { X, Save } from 'lucide-react';

const ModalEditarSetor = ({ setor, onClose, onSave }) => {
  const [nome, setNome] = useState(setor?.nome || '');
  const [loading, setLoading] = useState(false);

  if (!setor) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nome) return;
    
    setLoading(true);
    try {
      await axios.put(`/api/setores/${setor.id}`, { nome });
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar setor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div className="glass-card" style={modalStyle}>
        <div className="flex-between" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.4rem', margin: 0 }}>Editar Setor</h2>
          <button onClick={onClose} style={closeBtnStyle}><X size={20}/></button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600 }}>Nome do Setor</label>
            <input 
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <button type="button" onClick={onClose} style={{ ...btnStyle, background: 'var(--panel-border)', color: 'var(--text-main)' }}>
              Cancelar
            </button>
            <button type="submit" style={btnStyle} disabled={loading}>
              <Save size={18} />
              {loading ? 'Salvando...' : 'Salvar Setor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Styles
const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000,
  padding: '20px'
};

const modalStyle = {
  width: '100%', maxWidth: '500px',
  background: 'var(--bg-color)',
  borderRadius: '12px',
  padding: '24px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  position: 'relative'
};

const closeBtnStyle = {
  background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
  padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'
};

const inputStyle = {
  padding: '10px 12px',
  borderRadius: '6px',
  border: '1px solid var(--panel-border)',
  background: 'rgba(0,0,0,0.1)',
  color: 'var(--text-main)',
  fontSize: '0.95rem'
};

const btnStyle = {
  display: 'flex', alignItems: 'center', gap: '8px',
  padding: '10px 20px',
  background: 'var(--primary)', color: '#fff',
  border: 'none', borderRadius: '6px',
  fontWeight: 600, cursor: 'pointer'
};

export default ModalEditarSetor;

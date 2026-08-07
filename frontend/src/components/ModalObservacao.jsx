import React, { useState } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';

const ModalObservacao = ({ contrato, onClose, onSave }) => {
  const [observacao, setObservacao] = useState(contrato?.observacao || '');
  const [loading, setLoading] = useState(false);

  if (!contrato) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.put(`/api/contratos/${contrato.id}`, { observacao });
      onSave(contrato.id, observacao);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar observação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div className="glass-card" style={modalStyle}>
        <div className="flex-between" style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Detalhes do Contrato</h2>
          <button onClick={onClose} style={closeBtnStyle}><X size={20}/></button>
        </div>
        
        <div style={{ marginBottom: '24px' }}>
          <p><strong>Empresa:</strong> {contrato.empresa}</p>
          <p><strong>Setor:</strong> {contrato.setor?.nome}</p>
          <p><strong>Status:</strong> {contrato.status}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontWeight: 600 }}>Observações / Anotações</label>
          <textarea 
            rows={5}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            style={inputStyle}
            placeholder="Digite algo sobre este contrato (ex: Renovação em andamento...)"
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', gap: '12px' }}>
          <button onClick={onClose} style={cancelBtnStyle}>Cancelar</button>
          <button onClick={handleSave} disabled={loading} style={saveBtnStyle}>
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};

const overlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 999
};

const modalStyle = {
  width: '100%',
  maxWidth: '500px',
  background: 'var(--bg-color)',
  padding: '24px',
};

const closeBtnStyle = {
  background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer'
};

const inputStyle = {
  background: 'rgba(0,0,0,0.2)',
  border: '1px solid var(--panel-border)',
  color: 'var(--text-main)',
  padding: '12px',
  borderRadius: '8px',
  outline: 'none',
  fontFamily: 'inherit',
  resize: 'vertical'
};

const cancelBtnStyle = {
  background: 'transparent',
  color: 'var(--text-main)',
  border: '1px solid var(--panel-border)',
  padding: '8px 16px',
  borderRadius: '8px',
  cursor: 'pointer'
};

const saveBtnStyle = {
  background: 'var(--primary)',
  color: '#fff',
  border: 'none',
  padding: '8px 16px',
  borderRadius: '8px',
  fontWeight: 600,
  cursor: 'pointer'
};

export default ModalObservacao;

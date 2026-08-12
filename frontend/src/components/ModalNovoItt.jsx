import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Save } from 'lucide-react';

const ModalNovoItt = ({ onClose, onSave }) => {
  const [setores, setSetores] = useState([]);
  const [formData, setFormData] = useState({
    titulo: '',
    setorId: '',
    data_emissao: '',
    data_vigencia_fim: '',
    dias_alerta: 30,
    status: 'VIGENTE',
    observacao: '',
    pdf: null
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get('/api/setores').then(res => setSetores(res.data));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
      return;
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined && formData[key] !== '') {
          payload.append(key, formData[key]);
        }
      });
      
      const res = await axios.post('/api/itts', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onSave(res.data);
      onClose();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar ITT');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div className="glass-card" style={modalStyle}>
        <div className="flex-between" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.4rem', margin: 0 }}>Nova ITT</h2>
          <button onClick={onClose} style={closeBtnStyle}><X size={24}/></button>
        </div>
        
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Título *</label>
              <input type="text" name="titulo" required value={formData.titulo} onChange={handleChange} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Setor Responsável *</label>
              <select name="setorId" required value={formData.setorId} onChange={handleChange} style={inputStyle}>
                <option value="">Selecione...</option>
                {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Data de Emissão</label>
              <input type="date" name="data_emissao" value={formData.data_emissao} onChange={handleChange} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Data Fim da Vigência</label>
              <input type="date" name="data_vigencia_fim" value={formData.data_vigencia_fim} onChange={handleChange} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Dias p/ Alerta</label>
              <input type="number" name="dias_alerta" value={formData.dias_alerta} onChange={handleChange} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Status</label>
              <select name="status" value={formData.status} onChange={handleChange} style={inputStyle}>
                <option value="VIGENTE">Vigente</option>
                <option value="A_VENCER">A Vencer</option>
                <option value="VENCIDO">Vencido</option>
                <option value="REVISADO">Revisado</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Observações</label>
              <textarea name="observacao" rows={3} value={formData.observacao} onChange={handleChange} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Anexar PDF da ITT</label>
              <input type="file" name="pdf" accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleChange} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', gap: '12px' }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancelar</button>
            <button type="submit" disabled={loading} style={saveBtnStyle}>
              {loading ? 'Salvando...' : <><Save size={18}/> Salvar ITT</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const overlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.6)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
};

const modalStyle = {
  width: '100%',
  maxWidth: '700px',
  background: 'var(--panel-bg)',
  padding: '32px',
  maxHeight: '90vh',
  overflowY: 'auto'
};

const closeBtnStyle = {
  background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer'
};

const labelStyle = {
  fontWeight: 500,
  fontSize: '0.9rem',
  color: 'var(--text-muted)'
};

const inputStyle = {
  background: 'rgba(0,0,0,0.2)',
  border: '1px solid var(--panel-border)',
  color: 'var(--text-main)',
  padding: '10px',
  borderRadius: '6px',
  outline: 'none',
  fontFamily: 'inherit'
};

const cancelBtnStyle = {
  background: 'transparent',
  color: 'var(--text-main)',
  border: '1px solid var(--panel-border)',
  padding: '10px 20px',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 500
};

const saveBtnStyle = {
  background: 'var(--primary)',
  color: '#fff',
  border: 'none',
  padding: '10px 20px',
  borderRadius: '8px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
};

export default ModalNovoItt;

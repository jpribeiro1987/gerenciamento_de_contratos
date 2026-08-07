import React, { useState, useEffect } from 'react';
import axios from 'axios';

const NovoContrato = () => {
  const [setores, setSetores] = useState([]);
  const [formData, setFormData] = useState({
    empresa: '',
    setorId: '',
    valor: '',
    prazo_rescisao_dias: 30,
    data_contratacao: '',
    data_vigencia_fim: '',
    dias_alerta: 30,
    renovacao_automatica: false,
    observacao: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    axios.get('http://localhost:3000/api/setores').then(res => setSetores(res.data));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file') {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
      return;
    }
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      const payload = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined && formData[key] !== '') {
          payload.append(key, formData[key]);
        }
      });
      
      await axios.post('http://localhost:3000/api/contratos', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess(true);
      setFormData({
        empresa: '', setorId: '', valor: '', prazo_rescisao_dias: 30,
        data_contratacao: '', data_vigencia_fim: '', dias_alerta: 30,
        renovacao_automatica: false, observacao: '', pdf: null
      });
      document.getElementById('fileInput').value = '';
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar contrato');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '24px' }}>Novo Contrato</h1>
      
      {success && (
        <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '8px', marginBottom: '24px', border: '1px solid rgba(16,185,129,0.2)' }}>
          Contrato salvo com sucesso!
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label>Empresa Fornecedora *</label>
            <input type="text" name="empresa" required value={formData.empresa} onChange={handleChange} style={inputStyle} />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label>Setor Responsável *</label>
            <select name="setorId" required value={formData.setorId} onChange={handleChange} style={inputStyle}>
              <option value="">Selecione...</option>
              {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label>Valor Mensal (R$)</label>
            <input type="number" step="0.01" name="valor" value={formData.valor} onChange={handleChange} style={inputStyle} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label>Data de Contratação</label>
            <input type="date" name="data_contratacao" value={formData.data_contratacao} onChange={handleChange} style={inputStyle} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label>Data Fim da Vigência</label>
            <input type="date" name="data_vigencia_fim" value={formData.data_vigencia_fim} onChange={handleChange} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label>Dias p/ Alerta de Vencimento</label>
            <input type="number" name="dias_alerta" value={formData.dias_alerta} onChange={handleChange} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label>Prazo p/ Rescisão (Dias)</label>
            <input type="number" name="prazo_rescisao_dias" value={formData.prazo_rescisao_dias} onChange={handleChange} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', paddingBottom: '12px' }}>
            <input type="checkbox" name="renovacao_automatica" checked={formData.renovacao_automatica} onChange={handleChange} style={{ width: '20px', height: '20px' }}/>
            <label>Renovação Automática</label>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label>Observação Inicial</label>
          <textarea name="observacao" rows={4} value={formData.observacao} onChange={handleChange} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label>Anexar Contrato (PDF)</label>
          <input type="file" id="fileInput" name="pdf" accept="application/pdf" onChange={handleChange} style={inputStyle} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? 'Salvando...' : 'Salvar Contrato'}
          </button>
        </div>

      </form>
    </div>
  );
};

const inputStyle = {
  background: 'rgba(0,0,0,0.2)',
  border: '1px solid var(--panel-border)',
  color: 'var(--text-main)',
  padding: '12px',
  borderRadius: '8px',
  outline: 'none',
  fontFamily: 'inherit'
};

const btnStyle = {
  background: 'var(--primary)',
  color: '#fff',
  border: 'none',
  padding: '12px 24px',
  borderRadius: '8px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 0.2s ease'
};

export default NovoContrato;

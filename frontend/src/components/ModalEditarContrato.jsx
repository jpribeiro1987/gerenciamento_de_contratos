import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Save, FileText, Plus, Trash2 } from 'lucide-react';

const ModalEditarContrato = ({ contrato, onClose, onSave }) => {
  const [setores, setSetores] = useState([]);
  const [formData, setFormData] = useState({ ...contrato });
  const [loading, setLoading] = useState(false);
  const [aditivos, setAditivos] = useState([]);
  const [novoAditivo, setNovoAditivo] = useState({ descricao: '', data_assinatura: '', nova_data_vigencia: '', novo_valor: '', pdf: null });
  const [loadingAditivo, setLoadingAditivo] = useState(false);

  useEffect(() => {
    axios.get('/api/setores').then(res => setSetores(res.data));
    
    if (!contrato) return;

    // Format dates for input type="date" (YYYY-MM-DD)
    const formatForInput = (dateString) => {
      if (!dateString) return '';
      return new Date(dateString).toISOString().split('T')[0];
    };

    setFormData({
      ...contrato,
      data_contratacao: formatForInput(contrato.data_contratacao),
      data_vigencia_fim: formatForInput(contrato.data_vigencia_fim),
      valor: contrato.valor || '',
      prazo_rescisao_dias: contrato.prazo_rescisao_dias || 30,
      dias_alerta: contrato.dias_alerta || 30,
      renovacao_automatica: !!contrato.renovacao_automatica,
      observacao: contrato.observacao || ''
    });

    fetchAditivos();
  }, [contrato]);

  const fetchAditivos = async () => {
    if (!contrato) return;
    try {
      const res = await axios.get(`/api/contratos/${contrato.id}/aditivos`);
      setAditivos(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAditivo = async (aditivoId) => {
    if (window.confirm('Tem certeza que deseja excluir este aditivo?')) {
      try {
        await axios.delete(`/api/contratos/${contrato.id}/aditivos/${aditivoId}`);
        fetchAditivos();
        onSave(); // atualiza a lista pai
      } catch (err) {
        console.error(err);
        alert('Erro ao excluir aditivo');
      }
    }
  };

  if (!contrato) return null;

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

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'anexos') return; // Do not send back the base64 string
        if (formData[key] !== null && formData[key] !== undefined && formData[key] !== '') {
          if ((key === 'pdf' || key === 'novo_pdf') && formData[key] instanceof File) { const safeName = formData[key].name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9.\-_ ]/g, ''); payload.append(key, formData[key], safeName); } else { payload.append(key, formData[key]); }
        }
      });
      
      const res = await axios.put(`/api/contratos/${contrato.id}`, payload);
      onSave(res.data);
      onClose();
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar contrato');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div className="glass-card" style={modalStyle}>
        <div className="flex-between" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.4rem', margin: 0 }}>Editar Contrato</h2>
          <button onClick={onClose} style={closeBtnStyle}><X size={24}/></button>
        </div>
        
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Empresa</label>
              <input type="text" name="empresa" required value={formData.empresa} onChange={handleChange} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Setor Responsável</label>
              <select name="setorId" required value={formData.setorId} onChange={handleChange} style={inputStyle}>
                <option value="">Selecione...</option>
                {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Valor Mensal (R$)</label>
              <input type="number" step="0.01" name="valor" value={formData.valor} onChange={handleChange} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Início</label>
              <input type="date" name="data_contratacao" value={formData.data_contratacao} onChange={handleChange} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Vencimento</label>
              <input type="date" name="data_vigencia_fim" value={formData.data_vigencia_fim} onChange={handleChange} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Dias p/ Alerta</label>
              <input type="number" name="dias_alerta" value={formData.dias_alerta} onChange={handleChange} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Prazo p/ Rescisão (Dias)</label>
              <input type="number" name="prazo_rescisao_dias" value={formData.prazo_rescisao_dias} onChange={handleChange} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', paddingBottom: '10px' }}>
              <input type="checkbox" name="renovacao_automatica" checked={formData.renovacao_automatica} onChange={handleChange} style={{ width: '18px', height: '18px' }}/>
              <label style={labelStyle}>Renovação Automática</label>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Status</label>
              <select name="status" value={formData.status || 'VIGENTE'} onChange={handleChange} style={inputStyle}>
                <option value="VIGENTE">Vigente</option>
                <option value="EM_ANALISE">Em Análise</option>
                <option value="A_VENCER">A Vencer</option>
                <option value="VENCIDO">Vencido</option>
                <option value="ENCERRADO">Encerrado</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '2 / span 2' }}>
              <label style={labelStyle}>Observações</label>
              <textarea name="observacao" rows={3} value={formData.observacao} onChange={handleChange} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Substituir PDF Anexo</label>
              <input type="file" name="pdf" accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleChange} style={inputStyle} />
              {contrato.anexos && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                  <a 
                    href={`/api/contratos/${contrato.id}/anexo`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none' }}
                  >
                    <FileText size={14} /> Visualizar PDF Atual
                  </a>
                  <button 
                    type="button"
                    onClick={async () => {
                      if (!window.confirm('Tem certeza que deseja excluir o PDF atual?')) return;
                      try {
                        await axios.delete(`/api/contratos/${contrato.id}/anexo`);
                        alert('PDF excluído com sucesso.');
                        onSave(); // trigger refresh
                      } catch (err) {
                        alert('Erro ao excluir PDF.');
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    <Trash2 size={14} /> Excluir PDF
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', gap: '12px' }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancelar</button>
            <button type="submit" disabled={loading} style={saveBtnStyle}>
              {loading ? 'Salvando...' : <><Save size={18}/> Salvar Dados do Contrato</>}
            </button>
          </div>
        </form>

        <hr style={{ border: 'none', borderTop: '1px solid var(--panel-border)', margin: '32px 0' }} />

        {/* SECÃO DE ADITIVOS */}
        <div>
          <h3 style={{ fontSize: '1.2rem', margin: '0 0 16px 0' }}>Aditivos do Contrato</h3>
          
          {/* Listar Aditivos Existentes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {aditivos.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhum aditivo registrado.</div>
            )}
            {aditivos.map(a => (
              <div key={a.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--panel-border)', position: 'relative' }}>
                <button 
                  onClick={() => handleDeleteAditivo(a.id)}
                  style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                  title="Excluir aditivo"
                >
                  <Trash2 size={16} />
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingRight: '24px' }}>
                  <div style={{ fontWeight: 600 }}>{a.descricao || 'Sem descrição'}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Assinado em: {new Date(a.data_assinatura || a.criado_em).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  <div>Nova Vigência: <span style={{ color: 'var(--text-main)' }}>{new Date(a.nova_data_vigencia).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span></div>
                  <div>Novo Valor: <span style={{ color: 'var(--text-main)' }}>{a.novo_valor ? `R$ ${a.novo_valor}` : '-'}</span></div>
                </div>
                {a.anexos && (
                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <a 
                      href={`/api/contratos/aditivos/${a.id}/anexo`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 8px', borderRadius: '4px' }}
                    >
                      <FileText size={14} /> Visualizar PDF
                    </a>
                    <button 
                      type="button"
                      onClick={async () => {
                        if (!window.confirm('Excluir PDF deste aditivo?')) return;
                        try {
                          await axios.delete(`/api/contratos/aditivos/${a.id}/anexo`);
                          fetchAditivos();
                        } catch (err) {
                          alert('Erro ao excluir PDF do aditivo.');
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      <Trash2 size={14} /> Excluir
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Form Novo Aditivo */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>Registrar Novo Aditivo</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={labelStyle}>Descrição *</label>
                <input 
                  type="text" 
                  value={novoAditivo.descricao} 
                  onChange={e => setNovoAditivo({...novoAditivo, descricao: e.target.value})} 
                  style={inputStyle} 
                  placeholder="Ex: Prorrogação 2026"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={labelStyle}>Data Assinatura *</label>
                <input 
                  type="date" 
                  value={novoAditivo.data_assinatura} 
                  onChange={e => setNovoAditivo({...novoAditivo, data_assinatura: e.target.value})} 
                  style={inputStyle} 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={labelStyle}>Nova Data de Vigência *</label>
                <input 
                  type="date" 
                  value={novoAditivo.nova_data_vigencia} 
                  onChange={e => setNovoAditivo({...novoAditivo, nova_data_vigencia: e.target.value})} 
                  style={inputStyle} 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={labelStyle}>Novo Valor (Opcional)</label>
                <input 
                  type="number" step="0.01"
                  value={novoAditivo.novo_valor} 
                  onChange={e => setNovoAditivo({...novoAditivo, novo_valor: e.target.value})} 
                  style={inputStyle} 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={labelStyle}>Anexar PDF do Aditivo</label>
                <input 
                  type="file" 
                  accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={e => setNovoAditivo({...novoAditivo, pdf: e.target.files[0]})} 
                  style={inputStyle} 
                  id="aditivoPdfInput"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={async () => {
                  if (!novoAditivo.descricao || !novoAditivo.nova_data_vigencia || !novoAditivo.data_assinatura) {
                    alert('Preencha a descrição, a data de assinatura e a nova data de vigência.');
                    return;
                  }
                  setLoadingAditivo(true);
                  try {
                    const payload = new FormData();
                    payload.append('descricao', novoAditivo.descricao);
                    payload.append('nova_data_vigencia', novoAditivo.nova_data_vigencia);
                    payload.append('data_assinatura', novoAditivo.data_assinatura);
                    if (novoAditivo.novo_valor) payload.append('novo_valor', novoAditivo.novo_valor);
                    if (novoAditivo.pdf) { const safeName = novoAditivo.pdf.name.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-zA-Z0-9.\\-_ ]/g, ''); payload.append('pdf', novoAditivo.pdf, safeName); }

                    await axios.post(`/api/contratos/${contrato.id}/aditivos`, payload);
                    
                    setNovoAditivo({ descricao: '', data_assinatura: '', nova_data_vigencia: '', novo_valor: '', pdf: null });
                    document.getElementById('aditivoPdfInput').value = '';
                    fetchAditivos();
                    
                    // Notifica a listagem pra atualizar o contrato original (vigência nova)
                    onSave();
                  } catch (err) {
                    console.error(err);
                    alert('Erro ao salvar aditivo.');
                  } finally {
                    setLoadingAditivo(false);
                  }
                }} 
                disabled={loadingAditivo} 
                style={{...saveBtnStyle, background: 'var(--success)'}}
              >
                {loadingAditivo ? 'Adicionando...' : <><Plus size={18}/> Adicionar Aditivo</>}
              </button>
            </div>
          </div>
        </div>
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

export default ModalEditarContrato;

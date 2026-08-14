import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Save, FileText, Plus, Trash2, Edit } from 'lucide-react';

const ModalEditarItt = ({ itt, onClose, onSave }) => {
  const [setores, setSetores] = useState([]);
  const [formData, setFormData] = useState({ ...itt });
  const [loading, setLoading] = useState(false);
  const [revisoes, setRevisoes] = useState([]);
  const [novaRevisao, setNovaRevisao] = useState({ descricao: '', nova_data_vigencia: '', pdf: null });
  const [loadingRevisao, setLoadingRevisao] = useState(false);
  const [editingRevisaoId, setEditingRevisaoId] = useState(null);
  const [editRevisaoData, setEditRevisaoData] = useState({ descricao: '', nova_data_vigencia: '', pdf: null });

  useEffect(() => {
    axios.get('/api/setores').then(res => setSetores(res.data));
    
    if (!itt) return;

    // Format dates for input type="date" (YYYY-MM-DD)
    const formatForInput = (dateString) => {
      if (!dateString) return '';
      return new Date(dateString).toISOString().split('T')[0];
    };

    setFormData({
      ...itt,
      data_emissao: formatForInput(itt.data_emissao),
      data_vigencia_fim: formatForInput(itt.data_vigencia_fim),
      dias_alerta: itt.dias_alerta || 30,
      status: itt.status || 'VIGENTE',
      observacao: itt.observacao || ''
    });

    fetchRevisoes();
  }, [itt]);

  const fetchRevisoes = async () => {
    if (!itt) return;
    try {
      const res = await axios.get(`/api/itts/${itt.id}/revisoes`);
      setRevisoes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  if (!itt) return null;

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
      
      const res = await axios.put(`/api/itts/${itt.id}`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onSave(res.data);
      onClose();
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar ITT');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div className="glass-card" style={modalStyle}>
        <div className="flex-between" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.4rem', margin: 0 }}>Editar ITT</h2>
          <button onClick={onClose} style={closeBtnStyle}><X size={24}/></button>
        </div>
        
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Título</label>
              <input type="text" name="titulo" required value={formData.titulo} onChange={handleChange} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}>Setor Responsável</label>
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
              <label style={labelStyle}>Vencimento (Vigência Fim)</label>
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
                <option value="EM_ANALISE">Em Análise</option>
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
              <label style={labelStyle}>Substituir PDF Anexo</label>
              <input type="file" name="pdf" accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleChange} style={inputStyle} />
              {itt.anexos && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                  <a 
                    href={`/api/itts/${itt.id}/anexo`} 
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
                        await axios.delete(`/api/itts/${itt.id}/anexo`);
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
              {loading ? 'Salvando...' : <><Save size={18}/> Salvar Dados da ITT</>}
            </button>
          </div>
        </form>

        <hr style={{ border: 'none', borderTop: '1px solid var(--panel-border)', margin: '32px 0' }} />

        {/* SECÃO DE REVISÕES */}
        <div>
          <h3 style={{ fontSize: '1.2rem', margin: '0 0 16px 0' }}>Revisões da ITT</h3>
          
          {/* Listar Revisões Existentes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {revisoes.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhuma revisão registrada.</div>
            )}
            {revisoes.map(r => (
              <div key={r.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                {editingRevisaoId === r.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input 
                      type="text" 
                      value={editRevisaoData.descricao} 
                      onChange={e => setEditRevisaoData({...editRevisaoData, descricao: e.target.value})} 
                      style={inputStyle} 
                      placeholder="Descrição"
                    />
                    <input 
                      type="date" 
                      value={editRevisaoData.nova_data_vigencia} 
                      onChange={e => setEditRevisaoData({...editRevisaoData, nova_data_vigencia: e.target.value})} 
                      style={inputStyle} 
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button 
                        type="button"
                        onClick={async () => {
                          try {
                            const payload = new FormData();
                            payload.append('descricao', editRevisaoData.descricao);
                            payload.append('nova_data_vigencia', editRevisaoData.nova_data_vigencia);
                            await axios.put(`/api/itts/revisoes/${r.id}`, payload);
                            setEditingRevisaoId(null);
                            fetchRevisoes();
                            onSave();
                          } catch (err) {
                            alert('Erro ao atualizar revisão');
                          }
                        }}
                        style={{...saveBtnStyle, padding: '4px 8px', fontSize: '0.85rem'}}
                      >Salvar</button>
                      <button type="button" onClick={() => setEditingRevisaoId(null)} style={{...cancelBtnStyle, padding: '4px 8px', fontSize: '0.85rem'}}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ fontWeight: 600 }}>{r.descricao || 'Sem descrição'}</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          type="button"
                          onClick={() => {
                            setEditingRevisaoId(r.id);
                            setEditRevisaoData({
                              descricao: r.descricao || '',
                              nova_data_vigencia: r.nova_data_vigencia ? new Date(r.nova_data_vigencia).toISOString().split('T')[0] : ''
                            });
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
                          title="Editar Revisão"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          type="button"
                          onClick={async () => {
                            if (!window.confirm('Deseja excluir totalmente esta revisão?')) return;
                            try {
                              await axios.delete(`/api/itts/revisoes/${r.id}`);
                              fetchRevisoes();
                              onSave();
                            } catch (err) {
                              alert('Erro ao excluir revisão.');
                            }
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                          title="Excluir Revisão Inteira"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      <div>Nova Vigência: <span style={{ color: 'var(--text-main)' }}>{new Date(r.nova_data_vigencia).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span></div>
                    </div>
                    {r.anexos && (
                      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <a 
                          href={`/api/itts/revisoes/${r.id}/anexo`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 8px', borderRadius: '4px' }}
                        >
                          <FileText size={14} /> Visualizar PDF
                        </a>
                        <button 
                          type="button"
                          onClick={async () => {
                            if (!window.confirm('Excluir apenas o PDF desta revisão?')) return;
                            try {
                              await axios.delete(`/api/itts/revisoes/${r.id}/anexo`);
                              fetchRevisoes();
                            } catch (err) {
                              alert('Erro ao excluir PDF da revisão.');
                            }
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} /> Remover PDF
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Form Nova Revisão */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>Registrar Nova Revisão</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={labelStyle}>Descrição *</label>
                <input 
                  type="text" 
                  value={novaRevisao.descricao} 
                  onChange={e => setNovaRevisao({...novaRevisao, descricao: e.target.value})} 
                  style={inputStyle} 
                  placeholder="Ex: Revisão 02 - Atualização de normas"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={labelStyle}>Nova Data de Vigência *</label>
                <input 
                  type="date" 
                  value={novaRevisao.nova_data_vigencia} 
                  onChange={e => setNovaRevisao({...novaRevisao, nova_data_vigencia: e.target.value})} 
                  style={inputStyle} 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={labelStyle}>Anexar PDF da Revisão</label>
                <input 
                  type="file" 
                  accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={e => setNovaRevisao({...novaRevisao, pdf: e.target.files[0]})} 
                  style={inputStyle} 
                  id="revisaoPdfInput"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={async () => {
                  if (!novaRevisao.descricao || !novaRevisao.nova_data_vigencia) {
                    alert('Preencha a descrição e a nova data de vigência.');
                    return;
                  }
                  setLoadingRevisao(true);
                  try {
                    const payload = new FormData();
                    payload.append('descricao', novaRevisao.descricao);
                    payload.append('nova_data_vigencia', novaRevisao.nova_data_vigencia);
                    if (novaRevisao.pdf) payload.append('pdf', novaRevisao.pdf);

                    await axios.post(`/api/itts/${itt.id}/revisoes`, payload, {
                      headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    
                    setNovaRevisao({ descricao: '', nova_data_vigencia: '', pdf: null });
                    document.getElementById('revisaoPdfInput').value = '';
                    fetchRevisoes();
                    
                    // Notifica a listagem pra atualizar o ITT original (vigência nova)
                    onSave();
                  } catch (err) {
                    console.error(err);
                    alert('Erro ao salvar revisão.');
                  } finally {
                    setLoadingRevisao(false);
                  }
                }} 
                disabled={loadingRevisao} 
                style={{...saveBtnStyle, background: 'var(--success)'}}
              >
                {loadingRevisao ? 'Adicionando...' : <><Plus size={18}/> Adicionar Revisão</>}
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

export default ModalEditarItt;

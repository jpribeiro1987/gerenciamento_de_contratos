import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, Edit, Trash2, AlertCircle, CheckCircle, Clock, FileText, Mail, Plus } from 'lucide-react';
import ModalEditarItt from '../components/ModalEditarItt';
import ModalNovoItt from '../components/ModalNovoItt';
import DocumentViewerModal from '../components/DocumentViewerModal';

const Itts = ({ userRole, userSector }) => {
  const [itts, setItts] = useState([]);
  const [filteredItts, setFilteredItts] = useState([]);
  const [search, setSearch] = useState('');
  const [editingItt, setEditingItt] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [viewerData, setViewerData] = useState(null);

  useEffect(() => {
    fetchItts();
  }, [userRole, userSector]);

  const fetchItts = async () => {
    try {
      const url = (userRole === 'ADMIN' || userRole === 'LEITURA') 
        ? '/api/itts' 
        : `/api/itts?setorId=${userSector}`;
      
      const res = await axios.get(url);
      setItts(res.data);
      setFilteredItts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredItts(itts);
    } else {
      const lower = search.toLowerCase();
      setFilteredItts(itts.filter(i => 
        i.titulo.toLowerCase().includes(lower) || 
        (i.setor?.nome || '').toLowerCase().includes(lower)
      ));
    }
  }, [search, itts]);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'VIGENTE': return <span className="badge badge-vigente"><CheckCircle size={12}/> Vigente</span>;
      case 'A_VENCER': return <span className="badge badge-a_vencer"><Clock size={12}/> A Vencer</span>;
      case 'VENCIDO': return <span className="badge badge-vencido"><AlertCircle size={12}/> Vencido</span>;
      case 'REVISADO': return <span className="badge badge-renovado"><CheckCircle size={12}/> Revisado</span>;
      case 'CANCELADO': return <span className="badge badge-vencido"><AlertCircle size={12}/> Cancelado</span>;
      case 'EM_ANALISE': return <span className="badge" style={{ background: '#3b82f6', color: '#fff' }}>Em Análise</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  const handleDelete = async (id, titulo) => {
    if (window.confirm(`Tem certeza que deseja excluir a ITT "${titulo}"?`)) {
      try {
        await axios.delete(`/api/itts/${id}`);
        setItts(itts.filter(i => i.id !== id));
      } catch (err) {
        console.error(err);
        alert('Erro ao excluir ITT.');
      }
    }
  };

  const handleSendAlert = async (id, titulo) => {
    if (window.confirm(`Deseja enviar um e-mail de alerta manual para a ITT "${titulo}"?`)) {
      try {
        await axios.post(`/api/itts/${id}/alert-manual`);
        alert('E-mail enviado com sucesso!');
      } catch (err) {
        console.error(err);
        alert('Erro ao enviar e-mail.');
      }
    }
  };

  const handleViewPdfs = async (itt) => {
    try {
      const res = await axios.get(`/api/itts/${itt.id}/revisoes`);
      const revisoes = res.data;
      
      const docs = [];
      revisoes.forEach((r) => {
        if (r.anexos) {
          docs.push({
            id: `revisao-${r.id}`,
            title: `Revisão - ${new Date(r.criado_em).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} (${r.descricao || 'Sem descrição'})`,
            url: `/api/itts/revisoes/${r.id}/anexo`,
            isWord: r.anexos.includes('msword') || r.anexos.includes('wordprocessingml')
          });
        }
      });

      if (itt.anexos) {
        docs.push({
          id: `original-${itt.id}`,
          title: 'ITT Original',
          url: `/api/itts/${itt.id}/anexo`,
          isWord: itt.anexos.includes('msword') || itt.anexos.includes('wordprocessingml')
        });
      }
      
      if (docs.length === 0) {
        alert('Nenhum PDF encontrado para esta ITT.');
        return;
      }
      
      setViewerData({
        title: `ITT: ${itt.titulo}`,
        documents: docs
      });
    } catch (err) {
      alert('Erro ao carregar documentos.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 600 }}>Instruções Técnicas de Trabalho (ITT)</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            Visualize, pesquise, crie ou edite as ITTs cadastradas no sistema.
          </p>
        </div>
        {userRole === 'ADMIN' && (
          <button 
            onClick={() => setIsCreating(true)}
            style={{
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
            }}
          >
            <Plus size={18} /> Nova ITT
          </button>
        )}
      </header>

      <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '12px 16px', borderRadius: '8px', color: 'var(--text-main)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <AlertCircle size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.95rem' }}>
          <strong>Regra de Alertas Automáticos:</strong> O sistema enviará notificações por e-mail aos responsáveis exatamente aos <strong>90, 60 e 30 dias</strong> antes da revisão/vencimento. Caso a ITT expire, um novo alerta será enviado a cada <strong>7 dias</strong> continuamente, até que a situação seja regularizada.
        </div>
      </div>

      <section className="glass-card" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Search size={20} color="var(--text-muted)" />
        <input 
          type="text" 
          placeholder="Pesquisar por título ou setor..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-main)',
            outline: 'none',
            flex: 1,
            fontSize: '1rem',
            fontFamily: 'inherit'
          }}
        />
      </section>

      <section className="glass-card table-container">
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Setor Resp.</th>
              <th>Emissão</th>
              <th>Vencimento</th>
              <th>Status</th>
              <th>Última Revisão</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredItts.map(i => (
              <tr key={i.id}>
                <td style={{ fontWeight: 500 }}>{i.titulo}</td>
                <td>{i.setor?.nome}</td>
                <td>{i.data_emissao ? new Date(i.data_emissao).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
                <td>{i.data_vigencia_fim ? new Date(i.data_vigencia_fim).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Indeterminado'}</td>
                <td>{getStatusBadge(i.status)}</td>
                <td>
                  {i.revisoes && i.revisoes.length > 0 ? (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Sim ({new Date(i.revisoes[0].criado_em).toLocaleDateString('pt-BR', { timeZone: 'UTC' })})
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Não</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    {(i.anexos || (i.revisoes && i.revisoes.length > 0)) && (
                      <button 
                        onClick={() => handleViewPdfs(i)}
                        style={{ ...iconBtnStyle, color: 'var(--primary)', textDecoration: 'none' }}
                        title="Visualizar PDFs"
                      >
                        <FileText size={18} />
                      </button>
                    )}
                    {userRole === 'ADMIN' && (
                      <>
                        <button 
                          onClick={() => setEditingItt(i)}
                          style={iconBtnStyle}
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleSendAlert(i.id, i.titulo)}
                          style={{ ...iconBtnStyle, color: 'var(--warning)' }}
                          title="Enviar Alerta Manual"
                        >
                          <Mail size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(i.id, i.titulo)}
                          style={{ ...iconBtnStyle, color: 'var(--danger)' }}
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredItts.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  Nenhuma ITT encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {editingItt && (
        <ModalEditarItt 
          itt={editingItt}
          onClose={() => setEditingItt(null)}
          onSave={() => {
            fetchItts();
          }}
        />
      )}
      {isCreating && (
        <ModalNovoItt 
          onClose={() => setIsCreating(false)}
          onSave={() => {
            fetchItts();
          }}
        />
      )}
      
      {viewerData && (
        <DocumentViewerModal
          title={viewerData.title}
          documents={viewerData.documents}
          onClose={() => setViewerData(null)}
        />
      )}
    </div>
  );
};

const iconBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-main)',
  cursor: 'pointer',
  padding: '6px',
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.2s'
};

export default Itts;

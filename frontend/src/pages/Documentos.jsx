import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, Edit, Trash2, AlertCircle, CheckCircle, Clock, FileText, Mail, Plus } from 'lucide-react';
import ModalEditarDocumento from '../components/ModalEditarDocumento';
import ModalNovoDocumento from '../components/ModalNovoDocumento';
import DocumentViewerModal from '../components/DocumentViewerModal';

const Documentos = ({ userRole, userSector }) => {
  const [documentos, setDocumentos] = useState([]);
  const [filteredDocumentos, setFilteredDocumentos] = useState([]);
  const [search, setSearch] = useState('');
  const [editingDoc, setEditingDoc] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [viewerData, setViewerData] = useState(null);

  useEffect(() => {
    fetchDocumentos();
  }, [userRole, userSector]);

  const fetchDocumentos = async () => {
    try {
      const url = userRole === 'ADMIN' 
        ? '/api/documentos' 
        : `/api/documentos?setorId=${userSector}`;
      
      const res = await axios.get(url);
      setDocumentos(res.data);
      setFilteredDocumentos(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredDocumentos(documentos);
    } else {
      const lower = search.toLowerCase();
      setFilteredDocumentos(documentos.filter(d => 
        d.titulo.toLowerCase().includes(lower) || 
        (d.setor?.nome || '').toLowerCase().includes(lower) ||
        (d.tipo || '').toLowerCase().includes(lower)
      ));
    }
  }, [search, documentos]);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'VIGENTE': return <span className="badge badge-vigente"><CheckCircle size={12}/> Vigente</span>;
      case 'A_VENCER': return <span className="badge badge-a_vencer"><Clock size={12}/> A Vencer</span>;
      case 'VENCIDO': return <span className="badge badge-vencido"><AlertCircle size={12}/> Vencido</span>;
      case 'RENOVADO': return <span className="badge badge-renovado"><CheckCircle size={12}/> Renovado</span>;
      case 'CANCELADO': return <span className="badge badge-vencido"><AlertCircle size={12}/> Cancelado</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  const handleDelete = async (id, titulo) => {
    if (window.confirm(`Tem certeza que deseja excluir o documento "${titulo}"?`)) {
      try {
        await axios.delete(`/api/documentos/${id}`);
        setDocumentos(documentos.filter(d => d.id !== id));
      } catch (err) {
        console.error(err);
        alert('Erro ao excluir Documento.');
      }
    }
  };

  const handleSendAlert = async (id, titulo) => {
    if (window.confirm(`Deseja enviar um e-mail de alerta manual para o documento "${titulo}"?`)) {
      try {
        await axios.post(`/api/documentos/${id}/alert-manual`);
        alert('E-mail enviado com sucesso!');
      } catch (err) {
        console.error(err);
        alert('Erro ao enviar e-mail.');
      }
    }
  };

  const handleViewPdfs = async (doc) => {
    try {
      const res = await axios.get(`/api/documentos/${doc.id}/renovacoes`);
      const renovacoes = res.data;
      
      const docs = [];
      renovacoes.forEach((r) => {
        if (r.anexos) {
          docs.push({
            id: `renovacao-${r.id}`,
            title: `Renovação - ${new Date(r.criado_em).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} (${r.descricao || 'Sem descrição'})`,
            url: `/api/documentos/renovacoes/${r.id}/anexo`,
            isWord: r.anexos.includes('msword') || r.anexos.includes('wordprocessingml')
          });
        }
      });

      if (doc.anexos) {
        docs.push({
          id: `original-${doc.id}`,
          title: 'Documento Original',
          url: `/api/documentos/${doc.id}/anexo`,
          isWord: doc.anexos.includes('msword') || doc.anexos.includes('wordprocessingml')
        });
      }
      
      if (docs.length === 0) {
        alert('Nenhum PDF encontrado para este documento.');
        return;
      }
      
      setViewerData({
        title: `${doc.tipo}: ${doc.titulo}`,
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
          <h1 style={{ fontSize: '1.8rem', fontWeight: 600 }}>CNDs, Alvarás e Documentos</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            Acompanhe o vencimento das certidões e adicione renovações.
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
            <Plus size={18} /> Novo Documento
          </button>
        )}
      </header>

      <section className="glass-card" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Search size={20} color="var(--text-muted)" />
        <input 
          type="text" 
          placeholder="Pesquisar por título, tipo ou setor..." 
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
              <th>Tipo</th>
              <th>Título / Descrição</th>
              <th>Órgão Emissor</th>
              <th>Setor Resp.</th>
              <th>Vencimento</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocumentos.map(d => (
              <tr key={d.id}>
                <td>
                  <span style={{ 
                    padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', fontSize: '0.8rem', fontWeight: 600 
                  }}>{d.tipo}</span>
                </td>
                <td style={{ fontWeight: 500 }}>{d.titulo}</td>
                <td>{d.orgao_emissor || '-'}</td>
                <td>{d.setor?.nome}</td>
                <td>{d.data_vigencia_fim ? new Date(d.data_vigencia_fim).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Indeterminado'}</td>
                <td>{getStatusBadge(d.status)}</td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    {(d.anexos || (d.renovacoes && d.renovacoes.length > 0)) && (
                      <button 
                        onClick={() => handleViewPdfs(d)}
                        style={{ ...iconBtnStyle, color: 'var(--primary)', textDecoration: 'none' }}
                        title="Visualizar PDFs"
                      >
                        <FileText size={18} />
                      </button>
                    )}
                    {userRole === 'ADMIN' && (
                      <>
                        <button 
                          onClick={() => setEditingDoc(d)}
                          style={iconBtnStyle}
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleSendAlert(d.id, d.titulo)}
                          style={{ ...iconBtnStyle, color: 'var(--warning)' }}
                          title="Enviar Alerta Manual"
                        >
                          <Mail size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(d.id, d.titulo)}
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
            {filteredDocumentos.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  Nenhum documento encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {editingDoc && (
        <ModalEditarDocumento 
          documento={editingDoc}
          onClose={() => setEditingDoc(null)}
          onSave={() => {
            fetchDocumentos();
          }}
        />
      )}
      {isCreating && (
        <ModalNovoDocumento 
          onClose={() => setIsCreating(false)}
          onSave={() => {
            fetchDocumentos();
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

export default Documentos;

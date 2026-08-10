import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, Edit, Trash2, AlertCircle, CheckCircle, Clock, FileText, Mail } from 'lucide-react';
import ModalEditarContrato from '../components/ModalEditarContrato';

const Contratos = ({ userRole, userSector }) => {
  const [contracts, setContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [search, setSearch] = useState('');
  const [editingContract, setEditingContract] = useState(null);

  useEffect(() => {
    fetchContracts();
  }, [userRole, userSector]);

  const fetchContracts = async () => {
    try {
      const url = userRole === 'ADMIN' 
        ? '/api/contratos' 
        : `/api/contratos?setorId=${userSector}`;
      
      const res = await axios.get(url);
      setContracts(res.data);
      setFilteredContracts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredContracts(contracts);
    } else {
      const lower = search.toLowerCase();
      setFilteredContracts(contracts.filter(c => 
        c.empresa.toLowerCase().includes(lower) || 
        (c.setor?.nome || '').toLowerCase().includes(lower)
      ));
    }
  }, [search, contracts]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'VIGENTE': return <span className="badge badge-vigente"><CheckCircle size={12}/> Vigente</span>;
      case 'A_VENCER': return <span className="badge badge-a_vencer"><Clock size={12}/> A Vencer</span>;
      case 'VENCIDO': return <span className="badge badge-vencido"><AlertCircle size={12}/> Vencido</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  const handleDelete = async (id, empresa) => {
    if (window.confirm(`Tem certeza que deseja excluir o contrato da empresa ${empresa}?`)) {
      try {
        await axios.delete(`/api/contratos/${id}`);
        setContracts(contracts.filter(c => c.id !== id));
      } catch (err) {
        console.error(err);
        alert('Erro ao excluir contrato.');
      }
    }
  };

  const handleSendAlert = async (id, empresa) => {
    if (window.confirm(`Deseja enviar um e-mail de alerta manual para o contrato da empresa ${empresa}?`)) {
      try {
        await axios.post(`/api/contratos/${id}/alert-manual`);
        alert('E-mail enviado com sucesso!');
      } catch (err) {
        console.error(err);
        alert('Erro ao enviar e-mail.');
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 600 }}>Gestão de Contratos</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
          Visualize, pesquise, edite ou remova os contratos cadastrados no sistema.
        </p>
      </header>

      <section className="glass-card" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Search size={20} color="var(--text-muted)" />
        <input 
          type="text" 
          placeholder="Pesquisar por empresa ou setor..." 
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
              <th>Empresa</th>
              <th>Setor Resp.</th>
              <th>Valor</th>
              <th>Vencimento</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredContracts.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: 500 }}>{c.empresa}</td>
                <td>{c.setor?.nome}</td>
                <td>{c.valor ? formatCurrency(c.valor) : '-'}</td>
                <td>{c.data_vigencia_fim ? new Date(c.data_vigencia_fim).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Indeterminado'}</td>
                <td>{getStatusBadge(c.status)}</td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    {c.anexos && (
                      <a 
                        href={`/api/contratos/${c.id}/anexo`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ ...iconBtnStyle, color: 'var(--primary)', textDecoration: 'none' }}
                        title="Visualizar PDF"
                      >
                        <FileText size={18} />
                      </a>
                    )}
                    {userRole === 'ADMIN' && (
                      <>
                        <button 
                          onClick={() => setEditingContract(c)}
                          style={iconBtnStyle}
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleSendAlert(c.id, c.empresa)}
                          style={{ ...iconBtnStyle, color: 'var(--warning)' }}
                          title="Enviar Alerta Manual"
                        >
                          <Mail size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(c.id, c.empresa)}
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
            {filteredContracts.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  Nenhum contrato encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {editingContract && (
        <ModalEditarContrato 
          contrato={editingContract}
          onClose={() => setEditingContract(null)}
          onSave={() => {
            fetchContracts(); // Recarrega os dados completos para pegar os Joins (ex: setor nome atualizado)
          }}
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

export default Contratos;

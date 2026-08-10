import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Printer, Filter } from 'lucide-react';

const Relatorios = ({ userRole, userSector }) => {
  const [contratos, setContratos] = useState([]);
  const [setores, setSetores] = useState([]);
  
  // Filtros
  const [filtroSetor, setFiltroSetor] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  useEffect(() => {
    fetchSetores();
    fetchContratos();
  }, []);

  const fetchSetores = async () => {
    try {
      const res = await axios.get('/api/setores');
      setSetores(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchContratos = async () => {
    try {
      const res = await axios.get('/api/contratos');
      setContratos(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadgeClass = (status) => {
    if (status === 'VIGENTE') return 'badge-vigente';
    if (status === 'A_VENCER') return 'badge-a_vencer';
    if (status === 'VENCIDO') return 'badge-vencido';
    return '';
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtragem local
  const contratosFiltrados = contratos.filter((c) => {
    // Gestor can only see their sector
    if (userRole === 'GESTOR' && userSector && c.setorId !== userSector) return false;
    
    // Explicit filter by sector
    if (filtroSetor && c.setorId.toString() !== filtroSetor) return false;

    // Filter by status
    if (filtroStatus && c.status !== filtroStatus) return false;

    // Filter by Date
    if (filtroDataInicio || filtroDataFim) {
      if (!c.data_vigencia_fim) return false; // Se não tem data e filtramos por data, tira.
      
      const dtVigencia = new Date(c.data_vigencia_fim);
      
      if (filtroDataInicio) {
        const dtInicio = new Date(filtroDataInicio + 'T00:00:00');
        if (dtVigencia < dtInicio) return false;
      }
      if (filtroDataFim) {
        const dtFim = new Date(filtroDataFim + 'T23:59:59');
        if (dtVigencia > dtFim) return false;
      }
    }
    
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Elemento visível apenas na impressão */}
      <div className="print-only" style={{ display: 'none', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #ccc', paddingBottom: '16px', marginBottom: '16px' }}>
          <img src="/logo.png" alt="Logo" style={{ maxHeight: '60px' }} />
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Relatório de Contratos</h2>
            <p style={{ margin: 0, color: '#666' }}>Emitido em: {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
        <div style={{ marginBottom: '16px', fontSize: '0.9rem', color: '#444' }}>
          <strong>Filtros aplicados:</strong> 
          {filtroSetor ? ` Setor: ${setores.find(s => s.id.toString() === filtroSetor)?.nome} |` : ' Todos os setores |'}
          {filtroStatus ? ` Status: ${filtroStatus} |` : ' Todos os status |'}
          {filtroDataInicio || filtroDataFim ? ` Vencimento: ${filtroDataInicio ? new Date(filtroDataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : '...'} a ${filtroDataFim ? new Date(filtroDataFim + 'T23:59:59').toLocaleDateString('pt-BR') : '...'}` : ' Sem limite de datas'}
        </div>
      </div>

      <header className="print-hide">
        <h1 style={{ fontSize: '1.8rem', fontWeight: 600 }}>Emissão de Relatórios</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
          Filtre os dados necessários e gere um relatório pronto para impressão.
        </p>
      </header>

      <div className="glass-card print-hide" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 600, fontSize: '1.1rem' }}>
          <Filter size={20} /> Filtros do Relatório
        </div>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          
          {userRole !== 'GESTOR' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 200px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Setor Responsável</label>
              <select 
                value={filtroSetor} 
                onChange={(e) => setFiltroSetor(e.target.value)}
                style={inputStyle}
              >
                <option value="">Todos os Setores</option>
                {setores.map(s => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 200px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Status</label>
            <select 
              value={filtroStatus} 
              onChange={(e) => setFiltroStatus(e.target.value)}
              style={inputStyle}
            >
              <option value="">Todos os Status</option>
              <option value="VIGENTE">Vigente</option>
              <option value="A_VENCER">A Vencer</option>
              <option value="VENCIDO">Vencido</option>
              <option value="RENOVADO">Renovado</option>
              <option value="ENCERRADO">Encerrado</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 200px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Vencimento (A partir de)</label>
            <input 
              type="date" 
              value={filtroDataInicio} 
              onChange={(e) => setFiltroDataInicio(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 200px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Vencimento (Até)</label>
            <input 
              type="date" 
              value={filtroDataFim} 
              onChange={(e) => setFiltroDataFim(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button 
            onClick={handlePrint}
            style={{
              background: 'var(--primary)', color: '#fff', border: 'none', 
              padding: '12px 24px', borderRadius: '8px', fontWeight: 600, 
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <Printer size={20}/> Imprimir Relatório
          </button>
        </div>
      </div>

      <div className="glass-card">
        <h2 className="print-hide" style={{ fontSize: '1.2rem', marginBottom: '16px' }}>
          Prévia dos Dados ({contratosFiltrados.length} encontrados)
        </h2>
        
        {contratosFiltrados.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
            Nenhum contrato encontrado com os filtros selecionados.
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Setor</th>
                  <th>Valor</th>
                  <th>Vencimento</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {contratosFiltrados.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.empresa}</td>
                    <td>{c.setor?.nome}</td>
                    <td>{c.valor ? `R$ ${c.valor}` : '-'}</td>
                    <td>{c.data_vigencia_fim ? new Date(c.data_vigencia_fim).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Indeterminado'}</td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .print-only {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};

const inputStyle = {
  background: 'rgba(0,0,0,0.1)',
  border: '1px solid var(--panel-border)',
  color: 'var(--text-main)',
  padding: '10px 12px',
  borderRadius: '6px',
  outline: 'none',
  fontFamily: 'inherit'
};

export default Relatorios;

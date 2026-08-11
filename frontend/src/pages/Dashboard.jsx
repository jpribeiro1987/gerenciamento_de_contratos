import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ModalObservacao from '../components/ModalObservacao';

const Dashboard = ({ userRole, userSector }) => {
  const [contracts, setContracts] = useState([]);
  const [itts, setItts] = useState([]);
  
  const [metrics, setMetrics] = useState({ total: 0, vencendo: 0, vencidos: 0, valorTotal: 0 });
  const [ittMetrics, setIttMetrics] = useState({ total: 0, vencendo: 0, vencidos: 0 });

  const [selectedContract, setSelectedContract] = useState(null);
  
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [ittSortConfig, setIttSortConfig] = useState({ key: null, direction: 'asc' });

  const sortedContracts = React.useMemo(() => {
    let sortableItems = [...contracts];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let aValue, bValue;
        switch (sortConfig.key) {
          case 'empresa':
            aValue = (a.empresa || '').toLowerCase(); 
            bValue = (b.empresa || '').toLowerCase(); 
            break;
          case 'setor':
            aValue = (a.setor?.nome || '').toLowerCase(); 
            bValue = (b.setor?.nome || '').toLowerCase(); 
            break;
          case 'valor':
            aValue = a.valor || 0; 
            bValue = b.valor || 0; 
            break;
          case 'vencimento':
            aValue = a.data_vigencia_fim ? new Date(a.data_vigencia_fim).getTime() : 9999999999999;
            bValue = b.data_vigencia_fim ? new Date(b.data_vigencia_fim).getTime() : 9999999999999;
            break;
          case 'status':
            aValue = (a.status || '').toLowerCase(); 
            bValue = (b.status || '').toLowerCase(); 
            break;
          default:
            return 0;
        }
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [contracts, sortConfig]);

  const sortedItts = React.useMemo(() => {
    let sortableItems = [...itts];
    if (ittSortConfig.key) {
      sortableItems.sort((a, b) => {
        let aValue, bValue;
        switch (ittSortConfig.key) {
          case 'titulo':
            aValue = (a.titulo || '').toLowerCase(); 
            bValue = (b.titulo || '').toLowerCase(); 
            break;
          case 'setor':
            aValue = (a.setor?.nome || '').toLowerCase(); 
            bValue = (b.setor?.nome || '').toLowerCase(); 
            break;
          case 'emissao':
            aValue = a.data_emissao ? new Date(a.data_emissao).getTime() : 0;
            bValue = b.data_emissao ? new Date(b.data_emissao).getTime() : 0;
            break;
          case 'vencimento':
            aValue = a.data_vigencia_fim ? new Date(a.data_vigencia_fim).getTime() : 9999999999999;
            bValue = b.data_vigencia_fim ? new Date(b.data_vigencia_fim).getTime() : 9999999999999;
            break;
          case 'status':
            aValue = (a.status || '').toLowerCase(); 
            bValue = (b.status || '').toLowerCase(); 
            break;
          default:
            return 0;
        }
        if (aValue < bValue) return ittSortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return ittSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [itts, ittSortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const requestIttSort = (key) => {
    let direction = 'asc';
    if (ittSortConfig.key === key && ittSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setIttSortConfig({ key, direction });
  };

  const renderSortIcon = (columnKey, isItt = false) => {
    const config = isItt ? ittSortConfig : sortConfig;
    if (config.key === columnKey) {
      return config.direction === 'asc' 
        ? <ChevronUp size={14} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '4px' }} /> 
        : <ChevronDown size={14} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '4px' }} />;
    }
    return <span style={{ display: 'inline-block', width: '18px' }}></span>;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const urlContratos = userRole === 'ADMIN' ? '/api/contratos' : `/api/contratos?setorId=${userSector}`;
        const urlItts = userRole === 'ADMIN' ? '/api/itts' : `/api/itts?setorId=${userSector}`;
        
        const [resContratos, resItts] = await Promise.all([
          axios.get(urlContratos),
          axios.get(urlItts)
        ]);
        
        const dataContratos = resContratos.data;
        const dataItts = resItts.data;
        
        setContracts(dataContratos);
        setItts(dataItts);
        
        // Compute metrics for Contratos
        setMetrics({
          total: dataContratos.length,
          vencendo: dataContratos.filter(c => c.status === 'A_VENCER').length,
          vencidos: dataContratos.filter(c => c.status === 'VENCIDO').length,
          valorTotal: dataContratos.reduce((acc, curr) => acc + (curr.valor || 0), 0)
        });

        // Compute metrics for ITTs
        setIttMetrics({
          total: dataItts.length,
          vencendo: dataItts.filter(i => i.status === 'A_VENCER').length,
          vencidos: dataItts.filter(i => i.status === 'VENCIDO').length,
        });

      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [userRole, userSector]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'VIGENTE': return <span className="badge badge-vigente"><CheckCircle size={12}/> Vigente</span>;
      case 'A_VENCER': return <span className="badge badge-a_vencer"><Clock size={12}/> A Vencer</span>;
      case 'VENCIDO': return <span className="badge badge-vencido"><AlertCircle size={12}/> Vencido</span>;
      case 'REVISADO': return <span className="badge badge-renovado"><CheckCircle size={12}/> Revisado</span>;
      case 'CANCELADO': return <span className="badge badge-vencido"><AlertCircle size={12}/> Cancelado</span>;
      case 'RENOVADO': return <span className="badge badge-renovado"><CheckCircle size={12}/> Renovado</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  const STATUS_COLORS = { 
    'VIGENTE': '#10B981', 
    'A VENCER': '#F59E0B', 
    'VENCIDO': '#EF4444',
    'RENOVADO': '#3B82F6',
    'REVISADO': '#3B82F6',
    'ENCERRADO': '#6B7280',
    'CANCELADO': '#6B7280'
  };

  const getStatusData = (dataArray) => {
    const counts = {};
    dataArray.forEach(item => {
      const status = item.status === 'A_VENCER' ? 'A VENCER' : item.status;
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] })).filter(d => d.value > 0);
  };

  const contratoStatusData = getStatusData(contracts);
  const ittStatusData = getStatusData(itts);

  let sectorData = [];
  if (userRole === 'ADMIN') {
    const sectorMap = {};
    contracts.forEach(c => {
      const setorNome = c.setor?.nome || 'Sem Setor';
      if (!sectorMap[setorNome]) sectorMap[setorNome] = 0;
      sectorMap[setorNome] += (c.valor || 0);
    });
    sectorData = Object.keys(sectorMap).map(key => ({
      name: key,
      Valor: sectorMap[key]
    })).sort((a,b) => b.Valor - a.Valor).slice(0, 5);
  }

  const ittsAVencer = itts.filter(i => i.status === 'A_VENCER' || i.status === 'VENCIDO');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header className="flex-between">
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 600 }}>Visão Geral</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            {userRole === 'ADMIN' ? 'Todos os setores, contratos e ITTs da organização.' : 'Contratos e ITTs do seu setor.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff' }}>
            {userRole === 'ADMIN' ? 'AD' : 'GS'}
          </div>
        </div>
      </header>

      {/* METRICS ROW 1: Contratos */}
      <section>
        <h3 style={{ marginBottom: '16px', fontSize: '1.2rem' }}>Métricas de Contratos</h3>
        <div className="metrics-grid">
          <div className="glass-card metric-card">
            <span className="metric-title">Total de Contratos</span>
            <span className="metric-value">{metrics.total}</span>
          </div>
          <div className="glass-card metric-card">
            <span className="metric-title">Vencendo (30 dias)</span>
            <span className={`metric-value ${metrics.vencendo > 0 ? 'warning' : ''}`}>{metrics.vencendo}</span>
          </div>
          <div className="glass-card metric-card">
            <span className="metric-title">Vencidos</span>
            <span className={`metric-value ${metrics.vencidos > 0 ? 'danger' : ''}`}>{metrics.vencidos}</span>
          </div>
          <div className="glass-card metric-card">
            <span className="metric-title">Valor Total Mensal</span>
            <span className="metric-value">{formatCurrency(metrics.valorTotal)}</span>
          </div>
        </div>
      </section>

      {/* METRICS ROW 2: ITTs */}
      <section>
        <h3 style={{ marginBottom: '16px', fontSize: '1.2rem' }}>Métricas de ITTs</h3>
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="glass-card metric-card">
            <span className="metric-title">Total de ITTs</span>
            <span className="metric-value">{ittMetrics.total}</span>
          </div>
          <div className="glass-card metric-card">
            <span className="metric-title">Vencendo</span>
            <span className={`metric-value ${ittMetrics.vencendo > 0 ? 'warning' : ''}`}>{ittMetrics.vencendo}</span>
          </div>
          <div className="glass-card metric-card">
            <span className="metric-title">Vencidos</span>
            <span className={`metric-value ${ittMetrics.vencidos > 0 ? 'danger' : ''}`}>{ittMetrics.vencidos}</span>
          </div>
        </div>
      </section>

      {/* CHARTS */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        
        {/* Status Chart - Contratos */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: 600 }}>Contratos por Status</div>
          <div style={{ flex: 1, minHeight: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={contratoStatusData}
                  cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {contratoStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#8884d8'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', borderRadius: '8px', color: 'var(--text-main)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Chart - ITTs */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: 600 }}>ITTs por Status</div>
          <div style={{ flex: 1, minHeight: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ittStatusData}
                  cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {ittStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#8884d8'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', borderRadius: '8px', color: 'var(--text-main)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sector Cost Chart (Admin only) */}
        {userRole === 'ADMIN' && (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
            <div style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: 600 }}>Maiores Custos por Setor (Contratos)</div>
            <div style={{ flex: 1, minHeight: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(val) => `R$ ${val/1000}k`} />
                  <Tooltip 
                    formatter={(val) => formatCurrency(val)}
                    contentStyle={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', borderRadius: '8px', color: 'var(--text-main)' }}
                  />
                  <Bar dataKey="Valor" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </section>

      {/* ITTs a Vencer Section */}
      {ittsAVencer.length > 0 && (
        <section className="glass-card table-container" style={{ borderLeft: '4px solid var(--warning)' }}>
          <div style={{ marginBottom: '24px', fontSize: '1.1rem', fontWeight: 600, color: 'var(--warning)' }}>
            <AlertCircle size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
            Atenção: ITTs a Vencer ou Vencidas
          </div>
          <table>
            <thead>
              <tr>
                <th>Título</th>
                <th>Setor Resp.</th>
                <th>Vencimento</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {ittsAVencer.map(i => (
                <tr key={i.id}>
                  <td style={{ fontWeight: 500 }}>{i.titulo}</td>
                  <td>{i.setor?.nome}</td>
                  <td>{i.data_vigencia_fim ? new Date(i.data_vigencia_fim).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
                  <td>{getStatusBadge(i.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* TABLES ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Contratos Table */}
        <section className="glass-card table-container">
          <div style={{ marginBottom: '24px', fontSize: '1.1rem', fontWeight: 600 }}>
            Lista de Contratos
          </div>
          <table>
            <thead>
              <tr>
                <th onClick={() => requestSort('empresa')} style={{ cursor: 'pointer', userSelect: 'none' }}>Empresa {renderSortIcon('empresa')}</th>
                <th onClick={() => requestSort('setor')} style={{ cursor: 'pointer', userSelect: 'none' }}>Setor {renderSortIcon('setor')}</th>
                <th onClick={() => requestSort('vencimento')} style={{ cursor: 'pointer', userSelect: 'none' }}>Vencimento {renderSortIcon('vencimento')}</th>
                <th onClick={() => requestSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>Status {renderSortIcon('status')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedContracts.slice(0, 10).map(c => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedContract(c)}>
                  <td style={{ fontWeight: 500, maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.empresa}</td>
                  <td style={{ maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.setor?.nome}</td>
                  <td>{c.data_vigencia_fim ? new Date(c.data_vigencia_fim).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
                  <td>{getStatusBadge(c.status)}</td>
                </tr>
              ))}
              {sortedContracts.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Nenhum contrato encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* ITTs Table */}
        <section className="glass-card table-container">
          <div style={{ marginBottom: '24px', fontSize: '1.1rem', fontWeight: 600 }}>
            Lista de ITTs
          </div>
          <table>
            <thead>
              <tr>
                <th onClick={() => requestIttSort('titulo')} style={{ cursor: 'pointer', userSelect: 'none' }}>Título {renderSortIcon('titulo', true)}</th>
                <th onClick={() => requestIttSort('setor')} style={{ cursor: 'pointer', userSelect: 'none' }}>Setor {renderSortIcon('setor', true)}</th>
                <th onClick={() => requestIttSort('vencimento')} style={{ cursor: 'pointer', userSelect: 'none' }}>Vencimento {renderSortIcon('vencimento', true)}</th>
                <th onClick={() => requestIttSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>Status {renderSortIcon('status', true)}</th>
              </tr>
            </thead>
            <tbody>
              {sortedItts.slice(0, 10).map(i => (
                <tr key={i.id}>
                  <td style={{ fontWeight: 500, maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.titulo}</td>
                  <td style={{ maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.setor?.nome}</td>
                  <td>{i.data_vigencia_fim ? new Date(i.data_vigencia_fim).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
                  <td>{getStatusBadge(i.status)}</td>
                </tr>
              ))}
              {sortedItts.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Nenhuma ITT encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

      </div>

      <ModalObservacao 
        contrato={selectedContract} 
        onClose={() => setSelectedContract(null)}
        onSave={(id, obs) => {
          setContracts(prev => prev.map(c => c.id === id ? { ...c, observacao: obs } : c));
        }}
      />
    </div>
  );
};

export default Dashboard;


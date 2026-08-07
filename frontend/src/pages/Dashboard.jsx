import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ModalObservacao from '../components/ModalObservacao';

const Dashboard = ({ userRole, userSector }) => {
  const [contracts, setContracts] = useState([]);
  const [metrics, setMetrics] = useState({ total: 0, vencendo: 0, vencidos: 0, valorTotal: 0 });
  const [selectedContract, setSelectedContract] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

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

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (columnKey) => {
    if (sortConfig.key === columnKey) {
      return sortConfig.direction === 'asc' 
        ? <ChevronUp size={14} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '4px' }} /> 
        : <ChevronDown size={14} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '4px' }} />;
    }
    return <span style={{ display: 'inline-block', width: '18px' }}></span>;
  };

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const url = userRole === 'ADMIN' 
          ? 'http://localhost:3000/api/contratos' 
          : `http://localhost:3000/api/contratos?setorId=${userSector}`;
        
        const res = await axios.get(url);
        const data = res.data;
        
        setContracts(data);
        
        // Compute metrics
        const total = data.length;
        const vencendo = data.filter(c => c.status === 'A_VENCER').length;
        const vencidos = data.filter(c => c.status === 'VENCIDO').length;
        const valorTotal = data.reduce((acc, curr) => acc + (curr.valor || 0), 0);
        
        setMetrics({ total, vencendo, vencidos, valorTotal });
      } catch (err) {
        console.error(err);
      }
    };
    fetchContracts();
  }, [userRole, userSector]);

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

  const statusData = [
    { name: 'VIGENTE', value: contracts.filter(c => c.status === 'VIGENTE').length },
    { name: 'A VENCER', value: contracts.filter(c => c.status === 'A_VENCER').length },
    { name: 'VENCIDO', value: contracts.filter(c => c.status === 'VENCIDO').length },
    { name: 'RENOVADO', value: contracts.filter(c => c.status === 'RENOVADO').length },
    { name: 'ENCERRADO', value: contracts.filter(c => c.status === 'ENCERRADO').length }
  ].filter(d => d.value > 0);

  const STATUS_COLORS = { 
    'VIGENTE': '#10B981', 
    'A VENCER': '#F59E0B', 
    'VENCIDO': '#EF4444',
    'RENOVADO': '#3B82F6',
    'ENCERRADO': '#6B7280'
  };

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
    })).sort((a,b) => b.Valor - a.Valor).slice(0, 5); // top 5
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header className="flex-between">
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 600 }}>Visão Geral</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            {userRole === 'ADMIN' ? 'Todos os setores e contratos da organização.' : 'Contratos do seu setor.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff' }}>
            {userRole === 'ADMIN' ? 'AD' : 'GS'}
          </div>
        </div>
      </header>

      <section className="metrics-grid">
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
      </section>

      {/* CHARTS */}
      <section style={{ display: 'grid', gridTemplateColumns: userRole === 'ADMIN' ? '1fr 1.5fr' : '1fr', gap: '24px' }}>
        
        {/* Status Chart */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: 600 }}>Contratos por Status</div>
          <div style={{ flex: 1, minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#8884d8'} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', borderRadius: '8px', color: 'var(--text-main)' }}
                  itemStyle={{ color: 'var(--text-main)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sector Cost Chart (Admin only) */}
        {userRole === 'ADMIN' && (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: 600 }}>Maiores Custos por Setor (Top 5)</div>
            <div style={{ flex: 1, minHeight: '300px' }}>
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

      <section className="glass-card table-container">
        <div style={{ marginBottom: '24px', fontSize: '1.1rem', fontWeight: 600 }}>
          Lista de Contratos
        </div>
        <table>
          <thead>
            <tr>
              <th onClick={() => requestSort('empresa')} style={{ cursor: 'pointer', userSelect: 'none' }}>Empresa {renderSortIcon('empresa')}</th>
              <th onClick={() => requestSort('setor')} style={{ cursor: 'pointer', userSelect: 'none' }}>Setor Resp. {renderSortIcon('setor')}</th>
              <th onClick={() => requestSort('valor')} style={{ cursor: 'pointer', userSelect: 'none' }}>Valor {renderSortIcon('valor')}</th>
              <th onClick={() => requestSort('vencimento')} style={{ cursor: 'pointer', userSelect: 'none' }}>Vencimento {renderSortIcon('vencimento')}</th>
              <th onClick={() => requestSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>Status {renderSortIcon('status')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedContracts.map(c => (
              <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedContract(c)}>
                <td style={{ fontWeight: 500 }}>{c.empresa}</td>
                <td>{c.setor?.nome}</td>
                <td>{c.valor ? formatCurrency(c.valor) : '-'}</td>
                <td>{c.data_vigencia_fim ? new Date(c.data_vigencia_fim).toLocaleDateString('pt-BR') : 'Indeterminado'}</td>
                <td>{getStatusBadge(c.status)}</td>
              </tr>
            ))}
            {sortedContracts.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  Nenhum contrato encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

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

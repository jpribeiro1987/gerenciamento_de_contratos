import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Mail, CheckCircle, AlertCircle, RefreshCw, Info, Trash2 } from 'lucide-react';

const FilaEmails = ({ userRole }) => {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAlertas();
  }, []);

  const fetchAlertas = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/alertas');
      setAlertas(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAlertas = async () => {
    if (window.confirm('Tem certeza que deseja limpar todo o histórico de e-mails? Esta ação não pode ser desfeita.')) {
      try {
        await axios.delete('/api/alertas');
        setAlertas([]);
        alert('Fila limpa com sucesso!');
      } catch (err) {
        console.error(err);
        alert('Erro ao limpar a fila.');
      }
    }
  };

  if (userRole !== 'ADMIN') {
    return (
      <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-muted)' }}>
        Acesso restrito.
      </div>
    );
  }

  const getStatusBadge = (status, erro) => {
    if (status === 'SUCESSO' || status === 'SUCESSO_MANUAL') {
      return <span className="badge badge-vigente" title="Enviado com sucesso"><CheckCircle size={12}/> Sucesso</span>;
    } else {
      return <span className="badge badge-vencido" title={erro || 'Erro ao enviar'}><AlertCircle size={12}/> Erro</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header className="flex-between">
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 600 }}>Fila de E-mails</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            Histórico de alertas enviados (automáticos e manuais) para os contratos.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={handleClearAlertas} 
            style={{
              background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)', padding: '10px 16px',
              borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
              fontWeight: 500
            }}
            disabled={loading || alertas.length === 0}
          >
            <Trash2 size={18} />
            Limpar Fila
          </button>
          <button 
            onClick={fetchAlertas} 
            style={{
              background: 'var(--primary)', color: '#fff', border: 'none', padding: '10px 16px',
              borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
              fontWeight: 500
            }}
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </header>

      <section className="glass-card table-container">
        <table>
          <thead>
            <tr>
              <th>Data de Envio</th>
              <th>Item Enviado</th>
              <th>Destinatários</th>
              <th>Status</th>
              <th>Erro (se houver)</th>
            </tr>
          </thead>
          <tbody>
            {alertas.map(a => (
              <tr key={a.id}>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {new Date(a.data_envio).toLocaleString('pt-BR')}
                  {a.status_envio.includes('MANUAL') && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '4px' }}>Disparo Manual</div>
                  )}
                </td>
                <td style={{ fontWeight: 500 }}>
                  {a.nome}
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.tipo}</div>
                </td>
                <td style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={a.destinatarios}>
                  {a.destinatarios}
                </td>
                <td>{getStatusBadge(a.status_envio, a.erro)}</td>
                <td style={{ color: 'var(--danger)', fontSize: '0.9rem', maxWidth: '300px' }}>
                  {a.erro ? a.erro : '-'}
                </td>
              </tr>
            ))}
            {alertas.length === 0 && !loading && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  Nenhum registro de e-mail encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default FilaEmails;

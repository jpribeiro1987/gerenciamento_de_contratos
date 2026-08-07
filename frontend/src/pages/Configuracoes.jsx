import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Mail, Server, Clock } from 'lucide-react';

const Configuracoes = () => {
  const [config, setConfig] = useState({
    EMAIL_TEMPLATE_SUBJECT: '',
    EMAIL_TEMPLATE_BODY: '',
    ALERT_CRON_TIME: '06:00'
  });
  const [smtpConfig, setSmtpConfig] = useState({
    SMTP_HOST: '',
    SMTP_PORT: '587',
    SMTP_USER: '',
    SMTP_PASS: '',
    SMTP_FROM: ''
  });
  
  const [testEmail, setTestEmail] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [loadingSmtp, setLoadingSmtp] = useState(false);
  const [loadingTest, setLoadingTest] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchSmtpConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/config');
      setConfig({
        EMAIL_TEMPLATE_SUBJECT: res.data.EMAIL_TEMPLATE_SUBJECT || 'Alerta de Vencimento: Contrato {{empresa}}',
        EMAIL_TEMPLATE_BODY: res.data.EMAIL_TEMPLATE_BODY || '<p>O contrato com a empresa <b>{{empresa}}</b> (Setor: {{setor}}) vencerá em {{dias}} dias, no dia {{data_vencimento}}.</p><p>Por favor, providencie a renovação.</p>',
        ALERT_CRON_TIME: res.data.ALERT_CRON_TIME || '06:00'
      });
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSmtpConfig = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/config/smtp');
      setSmtpConfig(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSmtpChange = (e) => {
    const { name, value } = e.target;
    setSmtpConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put('http://localhost:3000/api/config', config);
      alert('Template salvo com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar template.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSmtp = async (e) => {
    e.preventDefault();
    setLoadingSmtp(true);
    try {
      const res = await axios.post('http://localhost:3000/api/config/smtp', smtpConfig);
      alert(res.data.message || 'Configurações SMTP salvas!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar configurações SMTP.');
    } finally {
      setLoadingSmtp(false);
    }
  };

  const handleTestEmail = async (e) => {
    e.preventDefault();
    if (!testEmail) return alert('Digite um e-mail para teste');
    setLoadingTest(true);
    try {
      const res = await axios.post('http://localhost:3000/api/config/smtp/test', { email: testEmail });
      alert(res.data.message || 'E-mail de teste enviado!');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Erro ao enviar e-mail de teste.');
    } finally {
      setLoadingTest(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '800px', paddingBottom: '40px' }}>
      <header>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 600 }}>Configurações do Sistema</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
          Gerencie os templates de e-mail e configurações de SMTP (Apenas Admin).
        </p>
      </header>

      {/* SMTP Config Section */}
      <div className="glass-card">
        <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Server size={20} color="var(--primary)" /> Configuração SMTP
        </h2>
        
        <form onSubmit={handleSaveSmtp} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: '1 / span 2' }}>
            <label style={{ fontWeight: 500, color: 'var(--text-muted)' }}>Servidor SMTP (Host)</label>
            <input 
              type="text" 
              name="SMTP_HOST" 
              value={smtpConfig.SMTP_HOST} 
              onChange={handleSmtpChange} 
              placeholder="ex: smtp.gmail.com"
              style={{
                background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', 
                color: 'var(--text-main)', padding: '12px', borderRadius: '6px', outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 500, color: 'var(--text-muted)' }}>Porta</label>
            <input 
              type="text" 
              name="SMTP_PORT" 
              value={smtpConfig.SMTP_PORT} 
              onChange={handleSmtpChange} 
              placeholder="ex: 587"
              style={{
                background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', 
                color: 'var(--text-main)', padding: '12px', borderRadius: '6px', outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 500, color: 'var(--text-muted)' }}>E-mail Remetente (From)</label>
            <input 
              type="email" 
              name="SMTP_FROM" 
              value={smtpConfig.SMTP_FROM} 
              onChange={handleSmtpChange} 
              placeholder="ex: alertas@hospital.com"
              style={{
                background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', 
                color: 'var(--text-main)', padding: '12px', borderRadius: '6px', outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 500, color: 'var(--text-muted)' }}>Usuário SMTP</label>
            <input 
              type="text" 
              name="SMTP_USER" 
              value={smtpConfig.SMTP_USER} 
              onChange={handleSmtpChange} 
              style={{
                background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', 
                color: 'var(--text-main)', padding: '12px', borderRadius: '6px', outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 500, color: 'var(--text-muted)' }}>Senha SMTP</label>
            <input 
              type="password" 
              name="SMTP_PASS" 
              value={smtpConfig.SMTP_PASS} 
              onChange={handleSmtpChange} 
              style={{
                background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', 
                color: 'var(--text-main)', padding: '12px', borderRadius: '6px', outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', gridColumn: '1 / span 2' }}>
            <button 
              type="submit" 
              disabled={loadingSmtp} 
              style={{
                background: 'var(--primary)', color: '#fff', border: 'none', 
                padding: '12px 24px', borderRadius: '8px', fontWeight: 600, 
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              {loadingSmtp ? 'Salvando...' : <><Save size={20}/> Salvar SMTP</>}
            </button>
          </div>
        </form>

        <div style={{ borderTop: '1px solid var(--panel-border)', marginTop: '24px', paddingTop: '24px' }}>
          <h4 style={{ margin: '0 0 12px 0' }}>Disparar E-mail de Teste</h4>
          <form onSubmit={handleTestEmail} style={{ display: 'flex', gap: '12px' }}>
            <input 
              type="email" 
              placeholder="Digite seu e-mail para receber o teste..." 
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              style={{
                flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', 
                color: 'var(--text-main)', padding: '12px', borderRadius: '6px', outline: 'none'
              }}
            />
            <button 
              type="submit" 
              disabled={loadingTest} 
              style={{
                background: 'var(--secondary)', color: '#fff', border: 'none', 
                padding: '0 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer'
              }}
            >
              {loadingTest ? 'Enviando...' : 'Testar SMTP'}
            </button>
          </form>
        </div>
      </div>

      {/* Email Template Section */}
      <div className="glass-card">
        <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Mail size={20} color="var(--primary)" /> Automação e Alertas
        </h2>
        
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--primary)' }}>Variáveis Disponíveis</h4>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Você pode utilizar as tags abaixo no Assunto ou no Corpo do e-mail. Elas serão substituídas pelos dados do contrato no momento do envio:
            <br/><br/>
            <code>{`{{empresa}}`}</code> : Nome da Empresa<br/>
            <code>{`{{setor}}`}</code> : Nome do Setor Responsável<br/>
            <code>{`{{dias}}`}</code> : Dias restantes para o vencimento<br/>
            <code>{`{{data_vencimento}}`}</code> : Data de vigência formatada (ex: 31/12/2026)
          </p>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 500, color: 'var(--text-muted)' }}>
              <Clock size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
              Horário da Verificação Diária (Robô Automático)
            </label>
            <input 
              type="time" 
              name="ALERT_CRON_TIME" 
              value={config.ALERT_CRON_TIME} 
              onChange={handleChange} 
              required
              style={{
                background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', 
                color: 'var(--text-main)', padding: '12px', borderRadius: '6px', outline: 'none', width: '150px'
              }}
            />
            <small style={{ color: 'var(--text-muted)' }}>Horário em que o sistema varrerá os contratos e enviará os alertas.</small>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px', borderTop: '1px solid var(--panel-border)', paddingTop: '16px' }}>
            <label style={{ fontWeight: 500, color: 'var(--text-muted)' }}>Assunto do E-mail</label>
            <input 
              type="text" 
              name="EMAIL_TEMPLATE_SUBJECT" 
              value={config.EMAIL_TEMPLATE_SUBJECT} 
              onChange={handleChange} 
              required
              style={{
                background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', 
                color: 'var(--text-main)', padding: '12px', borderRadius: '6px', outline: 'none'
              }}
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 500, color: 'var(--text-muted)' }}>Corpo do E-mail (HTML permitido)</label>
            <textarea 
              name="EMAIL_TEMPLATE_BODY" 
              value={config.EMAIL_TEMPLATE_BODY} 
              onChange={handleChange} 
              rows={8}
              required
              style={{
                background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', 
                color: 'var(--text-main)', padding: '12px', borderRadius: '6px', outline: 'none', resize: 'vertical',
                fontFamily: 'monospace', fontSize: '0.95rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button 
              type="submit" 
              disabled={loading} 
              style={{
                background: 'var(--primary)', color: '#fff', border: 'none', 
                padding: '12px 24px', borderRadius: '8px', fontWeight: 600, 
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              {loading ? 'Salvando...' : <><Save size={20}/> Salvar Configurações</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Configuracoes;

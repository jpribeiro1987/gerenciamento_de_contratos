import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Mail } from 'lucide-react';

const SeletorEmailsCobranca = ({ value = '', onChange }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [selectedUserEmails, setSelectedUserEmails] = useState([]);
  const [extraEmailsText, setExtraEmailsText] = useState('');
  const lastEmittedRef = useRef(null);

  useEffect(() => {
    axios.get('/api/usuarios')
      .then(res => setUsuarios(res.data || []))
      .catch(err => console.error('Erro ao carregar usuários para cobrança:', err));
  }, []);

  // Sincronizar quando a prop `value` mudar externamente (ex: carregar modal de edição ou limpar formulário) ou quando `usuarios` carregar
  useEffect(() => {
    if (value === lastEmittedRef.current && usuarios.length > 0) {
      return;
    }

    const allEmails = (value || '')
      .split(',')
      .map(e => e.trim())
      .filter(Boolean);

    if (usuarios.length === 0) {
      return;
    }

    const userEmailMap = new Map(usuarios.map(u => [u.email.toLowerCase(), u.email]));
    const matched = [];
    const extras = [];

    allEmails.forEach(email => {
      const canonical = userEmailMap.get(email.toLowerCase());
      if (canonical) {
        if (!matched.includes(canonical)) matched.push(canonical);
      } else {
        extras.push(email);
      }
    });

    setSelectedUserEmails(matched);
    setExtraEmailsText(extras.join(', '));
    lastEmittedRef.current = value || '';
  }, [value, usuarios]);

  const emitChange = (userEmailsList, extraText) => {
    const extras = (extraText || '')
      .split(',')
      .map(e => e.trim())
      .filter(Boolean);
    const combined = [...new Set([...userEmailsList, ...extras])].join(', ');
    lastEmittedRef.current = combined;
    onChange(combined);
  };

  const handleToggleUserEmail = (email) => {
    const exists = selectedUserEmails.includes(email);
    const nextSelected = exists
      ? selectedUserEmails.filter(e => e !== email)
      : [...selectedUserEmails, email];
    setSelectedUserEmails(nextSelected);
    emitChange(nextSelected, extraEmailsText);
  };

  const handleExtraChange = (e) => {
    const nextText = e.target.value;
    setExtraEmailsText(nextText);
    emitChange(selectedUserEmails, nextText);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      padding: '14px',
      background: 'rgba(0,0,0,0.15)',
      border: '1px solid var(--panel-border)',
      borderRadius: '8px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary)' }}>
        <Mail size={16} />
        <span>Destinatários de E-mail de Cobrança / Alerta</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Selecione os usuários que devem receber os alertas deste registro:
        </span>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '8px',
          maxHeight: '140px',
          overflowY: 'auto',
          padding: '8px',
          background: 'rgba(0,0,0,0.15)',
          borderRadius: '6px',
          border: '1px solid var(--panel-border)'
        }}>
          {usuarios.length === 0 ? (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nenhum usuário cadastrado.</span>
          ) : (
            usuarios.map(u => (
              <label
                key={u.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  borderRadius: '4px',
                  background: selectedUserEmails.includes(u.email) ? 'rgba(79, 70, 229, 0.15)' : 'transparent'
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedUserEmails.includes(u.email)}
                  onChange={() => handleToggleUserEmail(u.email)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${u.nome} (${u.email})`}>
                  <strong>{u.nome}</strong> <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({u.email})</span>
                </span>
              </label>
            ))
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Outros e-mails de cobrança (opcional, separados por vírgula):
        </label>
        <input
          type="text"
          placeholder="Ex: financeiro@empresa.com, gestor@hospital.com"
          value={extraEmailsText}
          onChange={handleExtraChange}
          style={{
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid var(--panel-border)',
            color: 'var(--text-main)',
            padding: '10px',
            borderRadius: '6px',
            outline: 'none',
            fontFamily: 'inherit',
            fontSize: '0.9rem'
          }}
        />
      </div>
    </div>
  );
};

export default SeletorEmailsCobranca;

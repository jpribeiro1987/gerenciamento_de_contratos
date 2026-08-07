import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Edit, Trash2, Plus, Users, Building } from 'lucide-react';

const SetoresUsuarios = () => {
  const [activeTab, setActiveTab] = useState('setores');
  
  // States para Setores
  const [setores, setSetores] = useState([]);
  const [newSetorNome, setNewSetorNome] = useState('');
  
  // States para Usuários
  const [usuarios, setUsuarios] = useState([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userFormData, setUserFormData] = useState({
    nome: '', email: '', perfil: 'GESTOR', setoresIds: [], senha: ''
  });

  useEffect(() => {
    fetchSetores();
    fetchUsuarios();
  }, []);

  const fetchSetores = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/setores');
      setSetores(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchUsuarios = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/usuarios');
      setUsuarios(res.data);
    } catch (err) { console.error(err); }
  };

  // --- Funções de Setores ---
  const handleAddSetor = async (e) => {
    e.preventDefault();
    if (!newSetorNome) return;
    try {
      await axios.post('http://localhost:3000/api/setores', { nome: newSetorNome });
      setNewSetorNome('');
      fetchSetores();
    } catch (err) { alert('Erro ao criar setor'); }
  };

  const handleDeleteSetor = async (id) => {
    if (window.confirm('Excluir setor?')) {
      try {
        await axios.delete(`http://localhost:3000/api/setores/${id}`);
        fetchSetores();
      } catch (err) { alert('Erro ao excluir. O setor pode ter contratos vinculados.'); }
    }
  };

  // --- Funções de Usuários ---
  const handleUserChange = (e) => {
    setUserFormData({ ...userFormData, [e.target.name]: e.target.value });
  };

  const handleSetorCheck = (id) => {
    setUserFormData(prev => {
      const ids = prev.setoresIds;
      if (ids.includes(id)) return { ...prev, setoresIds: ids.filter(i => i !== id) };
      return { ...prev, setoresIds: [...ids, id] };
    });
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await axios.put(`http://localhost:3000/api/usuarios/${editingUser.id}`, userFormData);
      } else {
        await axios.post('http://localhost:3000/api/usuarios', userFormData);
      }
      setShowUserForm(false);
      setEditingUser(null);
      setUserFormData({ nome: '', email: '', perfil: 'GESTOR', setoresIds: [], senha: '' });
      fetchUsuarios();
    } catch (err) { alert('Erro ao salvar usuário.'); }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserFormData({
      nome: user.nome,
      email: user.email,
      perfil: user.perfil,
      setoresIds: user.setores.map(s => s.id),
      senha: ''
    });
    setShowUserForm(true);
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm('Excluir usuário?')) {
      try {
        await axios.delete(`http://localhost:3000/api/usuarios/${id}`);
        fetchUsuarios();
      } catch (err) { alert('Erro ao excluir usuário.'); }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 600 }}>Setores & Usuários</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
          Gerencie a estrutura da organização e os acessos.
        </p>
      </header>

      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--panel-border)' }}>
        <button 
          style={{ ...tabStyle, borderBottom: activeTab === 'setores' ? '2px solid var(--primary)' : 'none', color: activeTab === 'setores' ? 'var(--primary)' : 'var(--text-muted)' }}
          onClick={() => setActiveTab('setores')}
        >
          <Building size={18} /> Setores
        </button>
        <button 
          style={{ ...tabStyle, borderBottom: activeTab === 'usuarios' ? '2px solid var(--primary)' : 'none', color: activeTab === 'usuarios' ? 'var(--primary)' : 'var(--text-muted)' }}
          onClick={() => setActiveTab('usuarios')}
        >
          <Users size={18} /> Usuários
        </button>
      </div>

      {activeTab === 'setores' && (
        <section className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <form onSubmit={handleAddSetor} style={{ display: 'flex', gap: '12px' }}>
            <input 
              type="text" 
              placeholder="Nome do Novo Setor" 
              value={newSetorNome}
              onChange={e => setNewSetorNome(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
              required
            />
            <button type="submit" style={btnStyle}><Plus size={18} /> Adicionar</button>
          </form>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--panel-border)', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>Setor</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {setores.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px' }}>{s.nome}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button onClick={() => handleDeleteSetor(s.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {activeTab === 'usuarios' && (
        <section className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {!showUserForm && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => {
                setEditingUser(null);
                setUserFormData({ nome: '', email: '', perfil: 'GESTOR', setoresIds: [], senha: '' });
                setShowUserForm(true);
              }} style={btnStyle}>
                <Plus size={18} /> Novo Usuário
              </button>
            </div>
          )}

          {showUserForm && (
            <form onSubmit={handleSaveUser} style={{ background: 'rgba(0,0,0,0.1)', padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <input type="text" name="nome" placeholder="Nome Completo" value={userFormData.nome} onChange={handleUserChange} style={inputStyle} required />
                <input type="email" name="email" placeholder="E-mail" value={userFormData.email} onChange={handleUserChange} style={inputStyle} required />
                <input 
                  type="password" 
                  name="senha" 
                  placeholder={editingUser ? "Nova Senha (deixe em branco para manter)" : "Senha de Acesso"} 
                  value={userFormData.senha} 
                  onChange={handleUserChange} 
                  style={inputStyle} 
                  required={!editingUser} 
                />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label>Perfil</label>
                <select name="perfil" value={userFormData.perfil} onChange={handleUserChange} style={inputStyle}>
                  <option value="GESTOR">Gestor de Setor</option>
                  <option value="ADMIN">Administrador (Acesso Total)</option>
                </select>
              </div>

              {userFormData.perfil === 'GESTOR' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  <label>Setores Vinculados (Permissão de visualização)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    {setores.map(s => (
                      <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={userFormData.setoresIds.includes(s.id)}
                          onChange={() => handleSetorCheck(s.id)}
                        /> {s.nome}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowUserForm(false)} style={{ ...btnStyle, background: 'transparent', border: '1px solid var(--panel-border)' }}>Cancelar</button>
                <button type="submit" style={btnStyle}>Salvar</button>
              </div>
            </form>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--panel-border)', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>Nome</th>
                <th style={{ padding: '12px' }}>E-mail</th>
                <th style={{ padding: '12px' }}>Perfil</th>
                <th style={{ padding: '12px' }}>Setores</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px' }}>{u.nome}</td>
                  <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{u.email}</td>
                  <td style={{ padding: '12px' }}>
                    <span className="badge" style={{ background: u.perfil === 'ADMIN' ? 'rgba(79,70,229,0.2)' : 'rgba(16,185,129,0.2)' }}>
                      {u.perfil}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '0.85rem' }}>
                    {u.perfil === 'ADMIN' ? 'Todos' : u.setores.map(s => s.nome).join(', ')}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button onClick={() => handleEditUser(u)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleDeleteUser(u.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

    </div>
  );
};

const tabStyle = {
  background: 'transparent',
  border: 'none',
  padding: '12px 24px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '1rem',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  transition: 'all 0.2s'
};

const inputStyle = {
  background: 'rgba(0,0,0,0.2)',
  border: '1px solid var(--panel-border)',
  color: 'var(--text-main)',
  padding: '12px',
  borderRadius: '8px',
  outline: 'none',
  fontFamily: 'inherit'
};

const btnStyle = {
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

export default SetoresUsuarios;

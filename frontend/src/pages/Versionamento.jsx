import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { GitBranch, CheckCircle2, Sparkles, Wrench, ShieldCheck, Plus, Trash2 } from 'lucide-react';

const DEFAULT_RELEASES = [
  {
    versao: 'v2.4.0',
    data: '20/10/2026',
    titulo: 'Destinatários de Cobrança por Registro & Controle de Versionamento',
    tipo: 'NOVO RECURSO',
    itens: [
      'Novo seletor de Destinatários de E-mail de Cobrança diretamente no cadastro e edição de Contratos, ITTs e CNDs/Documentos (seleção de usuários via checkboxes + campo para outros e-mails extras).',
      'Desvinculação do disparo de e-mails de cobrança do cadastro de acesso ao setor (o vínculo de setor agora atua exclusivamente para permissão de visualização no sistema).',
      'Rotina de migração inteligente única na primeira atualização do servidor, mantendo pré-selecionados os e-mails dos usuários nos registros já existentes.',
      'Nova aba de Versionamento e Histórico de Atualizações do sistema.'
    ]
  },
  {
    versao: 'v2.3.1',
    data: '19/10/2026',
    titulo: 'Filtro "Em Análise" nos Relatórios',
    tipo: 'MELHORIA',
    itens: [
      'Adicionada a opção de filtrar registros com o status "Em Análise" na tela de Emissão de Relatórios.',
      'Formatação visual da etiqueta "EM ANÁLISE" na prévia e na versão de impressão dos relatórios.'
    ]
  },
  {
    versao: 'v2.3.0',
    data: '09/10/2026',
    titulo: 'Responsividade Mobile, PWA (Instalação no Chrome) e Segurança no Login',
    tipo: 'NOVO RECURSO',
    itens: [
      'Layout 100% responsivo para acesso pelo navegador do celular e tablets, mantendo todas as funcionalidades.',
      'Suporte a PWA (Progressive Web App), permitindo instalar o sistema como aplicativo pelo navegador Google Chrome no computador ou celular.',
      'Implementação de verificação CAPTCHA matemático na tela de login para proteção contra acessos automatizados.',
      'Ajuste de proporção e centralização da logomarca institucional no menu lateral.'
    ]
  },
  {
    versao: 'v2.2.0',
    data: '08/10/2026',
    titulo: 'Unidades de Medida Dinâmicas e Métricas no Dashboard',
    tipo: 'NOVO RECURSO',
    itens: [
      'Campo de Unidade Contratada no cadastro e edição de contratos (Valor Mensal, Valor Semestral, Valor Anual, Unidade, Por Kilo, etc.).',
      'Gerenciamento dinâmico das Unidades de Medida na aba de Configurações.',
      'Soma separada dos valores contratados por unidade de medida nos cartões do Dashboard e nova coluna na listagem de Contratos.',
      'Inclusão do Manual do Sistema, redesign da tela de login e melhoria na exibição dos gráficos do Dashboard.'
    ]
  },
  {
    versao: 'v2.1.0',
    data: '23/09/2026',
    titulo: 'Otimização de Performance e Backup de Grandes Volumes',
    tipo: 'MELHORIA',
    itens: [
      'Otimização expressiva no carregamento das listagens de Contratos, ITTs e Documentos (carregamento sob demanda de anexos pesados).',
      'Melhoria no download e restauração de Backup Completo (.zip) para suportar grandes volumes de anexos sem sobrecarga de memória.'
    ]
  },
  {
    versao: 'v2.0.0',
    data: '20/08/2026',
    titulo: 'Gestão Completa de Aditivos, Fila Unificada e Status "Em Análise"',
    tipo: 'NOVO RECURSO',
    itens: [
      'Criação, edição e exclusão de Aditivos de Contratos com data de assinatura obrigatória e atualização automática de vigência.',
      'Unificação da Fila de E-mails para auditoria conjunta de alertas de Contratos, ITTs e Documentos.',
      'Adição do status "Em Análise", templates de e-mail independentes por módulo e perfil de acesso "Somente Leitura".',
      'Suporte a anexos em formatos DOC, DOCX e PDF com sanitização automática de nomes de arquivos.'
    ]
  },
  {
    versao: 'v1.0.0',
    data: '01/08/2026',
    titulo: 'Lançamento Inicial do Sistema',
    tipo: 'LANÇAMENTO',
    itens: [
      'Módulos de gestão de Contratos, Instruções Técnicas de Trabalho (ITT) e CNDs & Documentos.',
      'Controle de acesso por perfis (ADMIN e GESTOR) e vinculação por setores.',
      'Robô diário de verificação de vencimentos e envio automático de alertas por e-mail via SMTP.',
      'Emissão de relatórios para impressão e módulo de Backup/Restauração.'
    ]
  }
];

const Versionamento = ({ userRole }) => {
  const [customReleases, setCustomReleases] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [novaVersao, setNovaVersao] = useState({
    versao: '',
    data: new Date().toLocaleDateString('pt-BR'),
    titulo: '',
    tipo: 'MELHORIA',
    itensTexto: ''
  });

  useEffect(() => {
    axios.get('/api/config').then(res => {
      if (res.data.HISTORICO_VERSOES_CUSTOM) {
        try {
          setCustomReleases(JSON.parse(res.data.HISTORICO_VERSOES_CUSTOM));
        } catch (e) {
          console.error('Erro ao ler histórico customizado:', e);
        }
      }
    }).catch(err => console.error(err));
  }, []);

  const allReleases = [...customReleases, ...DEFAULT_RELEASES];
  const currentVersion = allReleases[0]?.versao || 'v2.4.0';

  const handleAddRelease = async (e) => {
    e.preventDefault();
    const itens = novaVersao.itensTexto
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    if (!novaVersao.versao || !novaVersao.titulo || itens.length === 0) {
      alert('Preencha a versão, o título e pelo menos um item de atualização.');
      return;
    }

    const novoRegistro = {
      id: Date.now(),
      versao: novaVersao.versao,
      data: novaVersao.data || new Date().toLocaleDateString('pt-BR'),
      titulo: novaVersao.titulo,
      tipo: novaVersao.tipo,
      itens
    };

    const atualizados = [novoRegistro, ...customReleases];
    try {
      await axios.post('/api/config', {
        HISTORICO_VERSOES_CUSTOM: JSON.stringify(atualizados)
      });
      setCustomReleases(atualizados);
      setShowForm(false);
      setNovaVersao({
        versao: '',
        data: new Date().toLocaleDateString('pt-BR'),
        titulo: '',
        tipo: 'MELHORIA',
        itensTexto: ''
      });
    } catch (err) {
      alert('Erro ao salvar registro de versão.');
    }
  };

  const handleDeleteCustom = async (id) => {
    if (!window.confirm('Deseja remover esta nota de versão personalizada?')) return;
    const atualizados = customReleases.filter(r => r.id !== id);
    try {
      await axios.post('/api/config', {
        HISTORICO_VERSOES_CUSTOM: JSON.stringify(atualizados)
      });
      setCustomReleases(atualizados);
    } catch (err) {
      alert('Erro ao remover registro de versão.');
    }
  };

  const getBadgeStyle = (tipo) => {
    if (tipo === 'NOVO RECURSO') {
      return { background: 'rgba(79, 70, 229, 0.15)', color: 'var(--primary)', border: '1px solid rgba(79, 70, 229, 0.3)' };
    }
    if (tipo === 'CORREÇÃO') {
      return { background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)', border: '1px solid rgba(245, 158, 11, 0.3)' };
    }
    return { background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.3)' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header className="flex-between" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 600 }}>Versionamento do Sistema</h1>
            <span className="badge" style={{ background: 'var(--primary)', color: '#fff', fontSize: '0.85rem', padding: '4px 12px' }}>
              Versão Atual: {currentVersion}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            Histórico completo de atualizações, melhorias e novos recursos implementados.
          </p>
        </div>

        {userRole === 'ADMIN' && (
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              background: 'var(--primary)',
              color: '#fff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Plus size={18} />
            {showForm ? 'Cancelar' : 'Registrar Atualização'}
          </button>
        )}
      </header>

      {showForm && userRole === 'ADMIN' && (
        <form onSubmit={handleAddRelease} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Nova Nota de Atualização</h3>
          <div className="grid-3-col">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Versão *</label>
              <input
                type="text"
                placeholder="Ex: v2.5.0"
                value={novaVersao.versao}
                onChange={e => setNovaVersao({ ...novaVersao, versao: e.target.value })}
                style={inputStyle}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Data *</label>
              <input
                type="text"
                placeholder="DD/MM/AAAA"
                value={novaVersao.data}
                onChange={e => setNovaVersao({ ...novaVersao, data: e.target.value })}
                style={inputStyle}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Categoria</label>
              <select
                value={novaVersao.tipo}
                onChange={e => setNovaVersao({ ...novaVersao, tipo: e.target.value })}
                style={inputStyle}
              >
                <option value="NOVO RECURSO">Novo Recurso</option>
                <option value="MELHORIA">Melhoria</option>
                <option value="CORREÇÃO">Correção</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Título da Atualização *</label>
            <input
              type="text"
              placeholder="Resumo principal da atualização"
              value={novaVersao.titulo}
              onChange={e => setNovaVersao({ ...novaVersao, titulo: e.target.value })}
              style={inputStyle}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Itens implementados (um por linha) *</label>
            <textarea
              rows={4}
              placeholder="Descreva cada mudança em uma linha..."
              value={novaVersao.itensTexto}
              onChange={e => setNovaVersao({ ...novaVersao, itensTexto: e.target.value })}
              style={{ ...inputStyle, resize: 'vertical' }}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="submit" style={{
              background: 'var(--success)',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer'
            }}>
              Salvar Versão
            </button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {allReleases.map((rel, index) => (
          <section
            key={rel.id || rel.versao}
            className="glass-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              borderLeft: index === 0 ? '4px solid var(--primary)' : '4px solid var(--panel-border)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  color: index === 0 ? 'var(--primary)' : 'var(--text-main)'
                }}>
                  <GitBranch size={18} />
                  {rel.versao}
                </span>
                <span className="badge" style={getBadgeStyle(rel.tipo)}>
                  {rel.tipo}
                </span>
                {index === 0 && (
                  <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)' }}>
                    ATUAL
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  Data: {rel.data}
                </span>
                {rel.id && userRole === 'ADMIN' && (
                  <button
                    onClick={() => handleDeleteCustom(rel.id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                    title="Excluir nota personalizada"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>
              {rel.titulo}
            </h3>

            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              {rel.itens.map((item, idx) => (
                <li key={idx} style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid var(--primary)', marginTop: '8px' }}>
        <h4 style={{ fontSize: '1.1rem', color: 'var(--text-main)', margin: 0, fontWeight: 600 }}>Responsável Técnico & Desenvolvimento</h4>
        <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.05rem' }}><strong>João Paulo Ribeiro da Silveira</strong></p>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>Bacharel em Administração | Analista de Sistemas</p>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>Registro Técnico: CRT-MG 08683250660</p>
      </section>
    </div>
  );
};

const inputStyle = {
  background: 'rgba(0,0,0,0.2)',
  border: '1px solid var(--panel-border)',
  color: 'var(--text-main)',
  padding: '10px 12px',
  borderRadius: '8px',
  outline: 'none',
  fontFamily: 'inherit'
};

export default Versionamento;

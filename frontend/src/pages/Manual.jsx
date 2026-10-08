import React from 'react';
import { BookOpen } from 'lucide-react';

const Manual = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 600 }}>Manual do Sistema</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
          Guia de uso e boas práticas para administradores.
        </p>
      </header>

      <section className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', lineHeight: '1.6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', marginBottom: '8px' }}>
          <BookOpen size={24} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Bem-vindo ao Gerenciador</h2>
        </div>
        
        <p>Este sistema foi desenvolvido para gerenciar Contratos, Instruções Técnicas de Trabalho (ITTs) e Documentos (CNDs) de forma automatizada. Ele monitora prazos e envia alertas de vencimento por e-mail para os responsáveis.</p>

        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginTop: '16px', color: 'var(--text-main)' }}>1. Setores e Usuários</h3>
        <p>
          Antes de cadastrar contratos, certifique-se de configurar a estrutura da empresa na aba <b>Setores & Usuários</b>.<br/>
          - <b>Setores:</b> Você pode cadastrar os setores e definir "E-mails extras p/ cobrança" (e-mails que receberão alertas daquele setor mesmo sem estarem vinculados a uma conta).<br/>
          - <b>Usuários:</b> Crie contas de acesso (ADMIN, GESTOR ou LEITURA) e vincule os usuários a um ou mais setores. O Gestor só enxerga os itens do setor dele.
        </p>

        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginTop: '16px', color: 'var(--text-main)' }}>2. Contratos, ITTs e Documentos</h3>
        <p>
          As abas de gerenciamento funcionam de forma semelhante. Você pode adicionar um novo item e vincular um arquivo em PDF.<br/>
          - <b>Aditivos e Revisões:</b> Caso um contrato sofra aditivo ou uma ITT seja revisada, você não precisa criar um novo registro. Basta clicar no ícone de Adicionar (página com "+") na linha do item para inserir a nova versão e o novo vencimento.<br/>
          - <b>Download:</b> Clique no ícone de documento azul na tabela para baixar ou visualizar o PDF da última versão. Se não houver arquivo, o botão não será exibido.<br/>
          - <b>Alerta Manual:</b> O ícone de carta amarela dispara um e-mail de alerta na hora para o setor responsável, informando o vencimento.
        </p>

        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginTop: '16px', color: 'var(--text-main)' }}>3. Alertas Automáticos</h3>
        <p>
          O sistema conta com um "robô" que roda todos os dias automaticamente pela manhã.<br/>
          - Ele verifica os prazos definidos em cada contrato/documento (campo "Dias p/ Alerta").<br/>
          - Se estiver dentro do prazo, ele dispara o e-mail sozinho para os responsáveis e muda o status para "A VENCER".<br/>
          - Após o vencimento, ele enviará lembretes periódicos alertando que o item está "VENCIDO".
        </p>

        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginTop: '16px', color: 'var(--text-main)' }}>4. Fila de E-mails</h3>
        <p>
          A aba <b>Fila de E-mails</b> funciona como um log de auditoria. Lá você pode verificar todos os e-mails que o sistema disparou, quando foram enviados, para quem foram e se houve algum erro de servidor no momento do envio.
        </p>

        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginTop: '16px', color: 'var(--text-main)' }}>5. Configurações e Backup</h3>
        <p>
          Na aba <b>Configurações</b> (visível apenas para ADMIN), você pode:<br/>
          - Customizar o servidor de e-mail (SMTP) responsável pelos disparos.<br/>
          - Modificar os textos e variáveis usadas nos e-mails de alerta.<br/>
          - Fazer o <b>Download do Backup Completo</b>: Baixa todos os PDFs e o banco de dados em um arquivo .zip.<br/>
          - Restaurar Backup: Permite subir um backup gerado anteriormente para recuperar dados perdidos.
        </p>

      </section>

      <section className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid var(--primary)', marginTop: '8px' }}>
        <h4 style={{ fontSize: '1.1rem', color: 'var(--text-main)', margin: 0, fontWeight: 600 }}>Sobre o Desenvolvedor</h4>
        <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.05rem' }}><strong>João Paulo Ribeiro da Silveira</strong></p>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>Bacharel em Administração | Analista de Sistemas</p>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>Registro Técnico: CRT-MG 08683250660</p>
      </section>
    </div>
  );
};

export default Manual;

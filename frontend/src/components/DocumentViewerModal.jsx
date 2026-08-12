import React, { useState } from 'react';
import { X, FileText, Download } from 'lucide-react';

// documents: Array of { id, title, url }
const DocumentViewerModal = ({ title, documents, onClose }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!documents || documents.length === 0) return null;

  const selectedDoc = documents[selectedIndex];

  return (
    <div style={overlayStyle}>
      <div className="glass-card" style={modalStyle}>
        <div style={headerStyle}>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Visualizar: {title}</h2>
          <button onClick={onClose} style={closeBtnStyle}><X size={24}/></button>
        </div>

        <div style={containerStyle}>
          {/* Sidebar / List */}
          <div style={sidebarStyle}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Documentos ({documents.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {documents.map((doc, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedIndex(index)}
                    style={{
                      ...tabBtnStyle,
                      background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                      border: isSelected ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid transparent',
                      color: isSelected ? 'var(--text-main)' : 'var(--text-muted)'
                    }}
                  >
                    <FileText size={16} />
                    <span style={{ textAlign: 'left', flex: 1 }}>{doc.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PDF Viewer */}
          <div style={viewerContainerStyle}>
            <div style={viewerHeaderStyle}>
              <span style={{ fontWeight: 600 }}>{selectedDoc.title}</span>
              <a 
                href={selectedDoc.url} 
                download 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem' }}
              >
                <Download size={16} /> Abrir nova guia
              </a>
            </div>
            {selectedDoc.isWord ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                <FileText size={64} style={{ marginBottom: '16px', color: 'var(--primary)' }} />
                <h3 style={{ marginBottom: '8px' }}>Documento do Word</h3>
                <p style={{ marginBottom: '24px' }}>Este formato não pode ser visualizado diretamente no navegador.</p>
                <a 
                  href={selectedDoc.url}
                  download
                  style={{
                    background: 'var(--primary)', color: '#fff', padding: '10px 24px', borderRadius: '8px',
                    textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  <Download size={18} /> Baixar Arquivo
                </a>
              </div>
            ) : (
              <iframe 
                src={selectedDoc.url} 
                style={{ width: '100%', height: '100%', border: 'none', background: '#333' }}
                title={selectedDoc.title}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const overlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.7)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
};

const modalStyle = {
  width: '95%',
  maxWidth: '1200px',
  height: '90vh',
  background: 'var(--panel-bg)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  padding: '0'
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px 24px',
  borderBottom: '1px solid var(--panel-border)'
};

const closeBtnStyle = {
  background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer'
};

const containerStyle = {
  display: 'flex',
  flex: 1,
  overflow: 'hidden'
};

const sidebarStyle = {
  width: '300px',
  background: 'rgba(0,0,0,0.1)',
  borderRight: '1px solid var(--panel-border)',
  padding: '16px',
  overflowY: 'auto'
};

const tabBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '10px 12px',
  borderRadius: '6px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  fontSize: '0.95rem'
};

const viewerContainerStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  background: '#1e1e1e'
};

const viewerHeaderStyle = {
  padding: '12px 24px',
  background: 'var(--panel-bg)',
  borderBottom: '1px solid var(--panel-border)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

export default DocumentViewerModal;

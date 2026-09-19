'use client';

import { useState } from 'react';

// VS Code Dark+ Syntax Tokenizer
function highlightLine(line) {
  if (!line && line !== '') return <span>&nbsp;</span>;
  if (line === '') return <span>&nbsp;</span>;

  const trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
    return <span style={{ color: '#6a9955', fontStyle: 'italic' }}>{line}</span>;
  }

  const regex = /(\/\/[^\n]*|\#[^\n]*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b(?:return|if|else|try|catch|except|finally|throw|for|while|await|async|exit)\b|\b(?:const|let|var|function|def|class|import|from|package|func|type|struct|interface|as|in|of)\b|\b(?:true|false|null|nil|None)\b|\b(?:string|int|float|bool|error|Promise|BaseModel|FastAPI|Request|Response|JSONResponse|OpenResultPayload|CloseResultPayload|ResultPayload)\b|\b\d+\b|\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\()|\b[a-zA-Z_$][a-zA-Z0-9_$]*\b|[{}()\[\].,:;=+\-*/%&|<>!]+|\s+)/g;

  const parts = [];
  let match;

  while ((match = regex.exec(line)) !== null) {
    const token = match[0];
    let color = '#d4d4d4'; // default text color
    let fontStyle = 'normal';

    if (token.startsWith('//') || token.startsWith('#')) {
      color = '#6a9955';
      fontStyle = 'italic';
    } else if (token.startsWith('"') || token.startsWith("'") || token.startsWith('`')) {
      color = '#ce9178'; // VS Code string coral
    } else if (/^(return|if|else|try|catch|except|finally|throw|for|while|await|async|exit)$/.test(token)) {
      color = '#c586c0'; // VS Code purple control flow
    } else if (/^(const|let|var|function|def|class|import|from|package|func|type|struct|interface|as|in|of)$/.test(token)) {
      color = '#569cd6'; // VS Code blue keywords
    } else if (/^(true|false|null|nil|None)$/.test(token)) {
      color = '#569cd6'; // VS Code constants
    } else if (/^(string|int|float|bool|error|Promise|BaseModel|FastAPI|Request|Response|JSONResponse|OpenResultPayload|CloseResultPayload|ResultPayload)$/.test(token)) {
      color = '#4ec9b0'; // VS Code teal types
    } else if (/^\d+$/.test(token)) {
      color = '#b5cea8'; // VS Code numbers
    } else if (match.index + token.length < line.length && line[match.index + token.length] === '(') {
      color = '#dcdcaa'; // VS Code yellow function call
    } else if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(token)) {
      color = '#9cdcfe'; // VS Code variable / identifiers
    }

    parts.push(
      <span key={parts.length} style={{ color, fontStyle }}>
        {token}
      </span>
    );
  }

  return parts.length > 0 ? parts : <span>{line}</span>;
}

export default function VSCodeBlock({ tabs, activeTab, onTabChange }) {
  const [copied, setCopied] = useState(false);

  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];
  const lines = currentTab?.code?.split('\n') || [];

  const handleCopy = () => {
    if (navigator?.clipboard && currentTab?.code) {
      navigator.clipboard.writeText(currentTab.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      style={{
        background: '#1e1e1e',
        border: '1px solid #333333',
        borderRadius: '8px',
        overflow: 'hidden',
        margin: '16px 0 24px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
        fontFamily: "'SF Mono', 'Fira Code', 'Fira Mono', Consolas, Menlo, Monaco, monospace",
      }}
    >
      {/* VS Code Title / Tab Bar */}
      <div
        style={{
          background: '#252526',
          borderBottom: '1px solid #1e1e1e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px 0 10px',
          minHeight: '38px',
          overflowX: 'auto',
        }}
      >
        {/* Left: Window Controls + Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Mac Window Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
            <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#ff5f56', display: 'inline-block' }}></span>
            <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#ffbd2e', display: 'inline-block' }}></span>
            <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#27c93f', display: 'inline-block' }}></span>
          </div>

          {/* VS Code File Tabs */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    background: isActive ? '#1e1e1e' : '#2d2d2d',
                    color: isActive ? '#ffffff' : '#969696',
                    border: 'none',
                    borderTop: isActive ? '2px solid #007acc' : '2px solid transparent',
                    borderRight: '1px solid #1e1e1e',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 120ms ease',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.color = '#cccccc';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.color = '#969696';
                  }}
                >
                  {/* Small Language Icon Indicator */}
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: tab.iconColor || '#569cd6',
                      display: 'inline-block',
                    }}
                  ></span>
                  <span>{tab.filename || tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Copy Button */}
        <button
          onClick={handleCopy}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: copied ? 'rgba(39, 201, 63, 0.15)' : '#2d2d2d',
            color: copied ? '#27c93f' : '#cccccc',
            border: copied ? '1px solid #27c93f' : '1px solid #3c3c3c',
            borderRadius: '4px',
            padding: '4px 10px',
            fontSize: '11px',
            cursor: 'pointer',
            transition: 'all 150ms ease',
            fontFamily: 'inherit',
          }}
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Editor Body with Line Numbers */}
      <div
        style={{
          padding: '14px 0',
          overflowX: 'auto',
          fontSize: '13px',
          lineHeight: '1.65',
        }}
      >
        <div style={{ display: 'table', width: '100%' }}>
          {lines.map((line, idx) => (
            <div
              key={idx}
              style={{
                display: 'table-row',
                transition: 'background 100ms ease',
              }}
              className="vscode-line-row"
            >
              {/* Line Number Gutter */}
              <div
                style={{
                  display: 'table-cell',
                  width: '46px',
                  paddingRight: '16px',
                  paddingLeft: '14px',
                  textAlign: 'right',
                  color: '#858585',
                  userSelect: 'none',
                  fontSize: '12px',
                  verticalAlign: 'top',
                }}
              >
                {idx + 1}
              </div>

              {/* Code Content */}
              <div
                style={{
                  display: 'table-cell',
                  paddingRight: '20px',
                  whiteSpace: 'pre',
                  verticalAlign: 'top',
                }}
              >
                {highlightLine(line)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* VS Code Bottom Status Bar */}
      <div
        style={{
          background: '#007acc',
          color: '#ffffff',
          fontSize: '11px',
          padding: '2px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
          letterSpacing: '0.02em',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="6" y1="3" x2="6" y2="15" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
            main*
          </span>
          <span>0 errors, 0 warnings</span>
          <span style={{ opacity: 0.9 }}>{currentTab?.langName || 'JavaScript'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span>Ln {lines.length}, Col 1</span>
          <span>Spaces: 2</span>
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  );
}

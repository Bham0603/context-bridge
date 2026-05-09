'use client';

import { useState } from 'react';
import { Session, PLATFORM_META, PlatformType } from '@/lib/types';
import { generateResumePrompt, generateCompactPrompt } from '@/lib/generatePrompt';

interface ResumePromptProps {
  session: Session | null;
}

export default function ResumePrompt({ session }: ResumePromptProps) {
  const [mode, setMode] = useState<'full' | 'compact'>('full');
  const [copied, setCopied] = useState(false);

  if (!session) {
    return (
      <div className="prompt-panel">
        <div className="prompt-panel-header">
          <h3>Resume Prompt</h3>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No Session Selected</h3>
          <p>Select a session to generate a resume prompt you can paste into any AI.</p>
        </div>
      </div>
    );
  }

  const prompt = mode === 'full' ? generateResumePrompt(session) : generateCompactPrompt(session);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for non-secure contexts
      const textarea = document.createElement('textarea');
      textarea.value = prompt;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  function handleExportJSON() {
    if (!session) return;
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contextbridge-${session.platform}-${session.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const platforms = Object.entries(PLATFORM_META).filter(
    ([key]) => key !== session.platform
  );

  return (
    <div className="prompt-panel">
      <div className="prompt-panel-header">
        <h3>Resume Prompt</h3>
        <div className="prompt-tabs">
          <button
            className={`prompt-tab ${mode === 'full' ? 'active' : ''}`}
            onClick={() => setMode('full')}
            id="tab-full"
          >
            Full
          </button>
          <button
            className={`prompt-tab ${mode === 'compact' ? 'active' : ''}`}
            onClick={() => setMode('compact')}
            id="tab-compact"
          >
            Compact
          </button>
        </div>
      </div>

      <div className="prompt-content">
        <div className="prompt-block">{prompt}</div>

        {/* Transfer Links */}
        <div style={{ marginTop: '20px' }}>
          <div
            className="sidebar-label"
            style={{ padding: '0 0 8px', fontSize: '11px' }}
          >
            Transfer to
          </div>
          <div className="transfer-grid">
            {platforms.map(([key, meta]) => (
              <a
                key={key}
                className="transfer-link"
                href={meta.url}
                target="_blank"
                rel="noopener noreferrer"
                id={`transfer-${key}`}
              >
                <span className="transfer-dot" style={{ background: meta.color }} />
                {meta.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="prompt-actions">
        <button
          className={`btn btn-primary ${copied ? 'success' : ''}`}
          onClick={handleCopy}
          id="copy-prompt"
        >
          {copied ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy to Clipboard
            </>
          )}
        </button>
        <button className="btn btn-secondary" onClick={handleExportJSON} id="export-json">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export JSON
        </button>
      </div>
    </div>
  );
}

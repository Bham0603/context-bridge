'use client';

import { Session, PLATFORM_META, PlatformType } from '@/lib/types';

interface ChatViewerProps {
  session: Session | null;
}

export default function ChatViewer({ session }: ChatViewerProps) {
  if (!session) {
    return (
      <div className="main-panel">
        <div className="empty-state">
          <div className="empty-state-icon">💬</div>
          <h3>Select a Session</h3>
          <p>Choose a captured conversation from the sidebar to view its messages here.</p>
        </div>
      </div>
    );
  }

  const meta = PLATFORM_META[session.platform as PlatformType] || {
    label: session.platform,
    color: '#666',
    icon: '💬',
  };

  const dateStr = new Date(session.capturedAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  function renderMessageText(text: string) {
    // Simple formatting: detect code blocks and render them
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, i) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const codeContent = part.slice(3, -3);
        // Remove optional language identifier from first line
        const lines = codeContent.split('\n');
        const firstLine = lines[0].trim();
        const isLangId = /^[a-zA-Z]+$/.test(firstLine) && firstLine.length < 20;
        const code = isLangId ? lines.slice(1).join('\n') : codeContent;

        return (
          <pre key={i}>
            <code>{code.trim()}</code>
          </pre>
        );
      }

      // Handle inline code
      const inlineParts = part.split(/(`[^`]+`)/g);
      return (
        <span key={i}>
          {inlineParts.map((ip, j) => {
            if (ip.startsWith('`') && ip.endsWith('`')) {
              return <code key={j}>{ip.slice(1, -1)}</code>;
            }
            return ip;
          })}
        </span>
      );
    });
  }

  return (
    <div className="main-panel">
      <div className="main-panel-header">
        <div className="main-panel-title">
          <span className="platform-tag" style={{ background: meta.color }}>
            {meta.icon} {meta.label}
          </span>
          <h2>{session.title}</h2>
        </div>
        <div className="main-panel-actions">
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {dateStr} · {session.msgCount} messages
          </span>
        </div>
      </div>
      <div className="chat-viewer" id="chat-viewer">
        {session.messages.map((message, index) => (
          <div
            key={index}
            className="message"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className={`message-avatar ${message.role}`}>
              {message.role === 'user' ? 'U' : 'A'}
            </div>
            <div className="message-body">
              <div className={`message-role ${message.role}`}>
                {message.role === 'user' ? 'You' : 'Assistant'}
              </div>
              <div className="message-text">
                {renderMessageText(message.text)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

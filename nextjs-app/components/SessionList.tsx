'use client';

import { useState } from 'react';
import { Session, PLATFORM_META, PlatformType } from '@/lib/types';

interface SessionListProps {
  sessions: Session[];
  selectedId: string | null;
  onSelect: (session: Session) => void;
  onDelete: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function SessionList({
  sessions,
  selectedId,
  onSelect,
  onDelete,
  searchQuery,
  onSearchChange,
}: SessionListProps) {
  function getTimeAgo(dateStr: string) {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  function getPlatformMeta(platform: string) {
    return PLATFORM_META[platform as PlatformType] || { label: platform, color: '#666', icon: '💬' };
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            id="search-sessions"
          />
        </div>
      </div>
      <div className="sidebar-list">
        <div className="sidebar-label">
          Sessions ({sessions.length})
        </div>
        {sessions.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <div className="empty-state-icon">🔍</div>
            <p style={{ fontSize: '12px' }}>
              {searchQuery ? 'No sessions match your search' : 'No sessions captured yet'}
            </p>
          </div>
        ) : (
          sessions.map((session, index) => {
            const meta = getPlatformMeta(session.platform);
            return (
              <div
                key={session.id}
                className={`session-card ${selectedId === session.id ? 'active' : ''}`}
                onClick={() => onSelect(session)}
                style={{ animationDelay: `${index * 0.03}s`, animation: 'slideRight 0.3s ease both' }}
                id={`session-${session.id}`}
              >
                <div
                  className="session-card-icon"
                  style={{ background: meta.color }}
                >
                  {meta.icon}
                </div>
                <div className="session-card-info">
                  <div className="session-card-title">{session.title}</div>
                  <div className="session-card-meta">
                    <span>{meta.label}</span>
                    <span className="dot" />
                    <span>{getTimeAgo(session.capturedAt)}</span>
                    <span className="dot" />
                    <span>{session.msgCount} msgs</span>
                  </div>
                </div>
                <button
                  className="session-card-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(session.id);
                  }}
                  title="Delete session"
                  id={`delete-${session.id}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-2 14H7L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                  </svg>
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

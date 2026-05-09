'use client';

import { useState, useEffect, useCallback } from 'react';
import { Session } from '@/lib/types';
import SessionList from '@/components/SessionList';
import ChatViewer from '@/components/ChatViewer';
import ResumePrompt from '@/components/ResumePrompt';

export default function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      const params = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
      const res = await fetch(`/api/sessions${params}`);
      if (res.ok) {
        const data: Session[] = await res.json();
        setSessions(data);
        // If selected session is no longer in the list, deselect
        if (selectedSession && !data.find((s) => s.id === selectedSession.id)) {
          setSelectedSession(null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSessions();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Delete session
  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/sessions?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        if (selectedSession?.id === id) {
          setSelectedSession(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }

  // Compute stats
  const totalMessages = sessions.reduce((sum, s) => sum + s.msgCount, 0);
  const platforms = new Set(sessions.map((s) => s.platform)).size;

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="app-header-left">
          <div className="app-logo">
            <div className="app-logo-icon">
              <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
                <circle cx="5" cy="14" r="4" fill="#7c3aed" opacity="0.9" />
                <circle cx="23" cy="14" r="4" fill="#06b6d4" opacity="0.9" />
                <path
                  d="M9 14 C 14 6, 14 6, 19 14"
                  stroke="url(#bg)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M9 14 C 14 22, 14 22, 19 14"
                  stroke="url(#bg)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.3"
                />
                <defs>
                  <linearGradient id="bg" x1="9" y1="14" x2="19" y2="14">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="app-logo-text">ContextBridge</span>
          </div>
          <div className="stats-bar">
            <div className="stat">
              <span className="stat-value">{sessions.length}</span>
              <span className="stat-label">Sessions</span>
            </div>
            <div className="stat">
              <span className="stat-value">{totalMessages}</span>
              <span className="stat-label">Messages</span>
            </div>
            <div className="stat">
              <span className="stat-value">{platforms}</span>
              <span className="stat-label">Platforms</span>
            </div>
          </div>
        </div>
        <div className="app-header-right">
          <button
            className="btn btn-ghost"
            onClick={fetchSessions}
            title="Refresh sessions"
            id="refresh-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="app-body">
        {/* Sidebar */}
        <SessionList
          sessions={sessions}
          selectedId={selectedSession?.id || null}
          onSelect={setSelectedSession}
          onDelete={handleDelete}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Chat Viewer */}
        <ChatViewer session={selectedSession} />

        {/* Resume Prompt Panel */}
        <ResumePrompt session={selectedSession} />
      </div>
    </div>
  );
}

// ContextBridge Popup — Logic
// Handles platform detection, capture triggering, session display, and resume prompt modal.

const PLATFORM_LABELS = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
  copilot: 'Copilot',
};

const PLATFORM_ABBREV = {
  chatgpt: 'GPT',
  claude: 'CL',
  gemini: 'GEM',
  perplexity: 'PPX',
  copilot: 'COP',
};

// ─── DOM Refs ──────────────────────────────────────────────────────────────────

const statusDot = document.getElementById('status-dot');
const platformLabel = document.getElementById('platform-label');
const captureBtn = document.getElementById('capture-btn');
const captureBtnText = document.getElementById('capture-btn-text');
const sessionsList = document.getElementById('sessions-list');
const sessionsCount = document.getElementById('sessions-count');
const emptyState = document.getElementById('empty-state');
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const promptDisplay = document.getElementById('prompt-display');
const btnCopy = document.getElementById('btn-copy');

let currentPlatform = null;

// ─── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  detectPlatform();
  loadSessions();
});

// ─── Platform Detection ────────────────────────────────────────────────────────

function detectPlatform() {
  chrome.runtime.sendMessage({ type: 'GET_PLATFORM_INFO' }, (response) => {
    if (response?.platform) {
      currentPlatform = response.platform;
      statusDot.classList.add('active');
      statusDot.classList.remove('inactive');
      platformLabel.textContent = `On ${PLATFORM_LABELS[response.platform]}`;
      captureBtn.disabled = false;
    } else {
      statusDot.classList.add('inactive');
      statusDot.classList.remove('active');
      platformLabel.textContent = 'Not on a supported AI platform';
      captureBtn.disabled = true;
    }
  });
}

// ─── Capture ───────────────────────────────────────────────────────────────────

captureBtn.addEventListener('click', () => {
  if (captureBtn.disabled) return;

  captureBtnText.textContent = 'Capturing...';
  captureBtn.disabled = true;

  chrome.runtime.sendMessage({ type: 'TRIGGER_CAPTURE' }, (response) => {
    if (response?.success) {
      captureBtn.classList.add('success');
      captureBtnText.textContent = '✓ Captured!';
      loadSessions();
      setTimeout(() => {
        captureBtn.classList.remove('success');
        captureBtnText.textContent = 'Capture This Conversation';
        captureBtn.disabled = false;
      }, 2000);
    } else {
      captureBtn.classList.add('error');
      captureBtnText.textContent = response?.error || 'Capture failed';
      setTimeout(() => {
        captureBtn.classList.remove('error');
        captureBtnText.textContent = 'Capture This Conversation';
        captureBtn.disabled = false;
      }, 2500);
    }
  });
});

// ─── Load Sessions ─────────────────────────────────────────────────────────────

function loadSessions() {
  chrome.runtime.sendMessage({ type: 'GET_SESSIONS' }, (response) => {
    const sessions = response?.sessions || [];
    sessionsCount.textContent = sessions.length;
    renderSessions(sessions.slice(0, 8)); // Show last 8 in popup
  });
}

function renderSessions(sessions) {
  if (sessions.length === 0) {
    emptyState.style.display = 'flex';
    // Remove non-empty-state children
    Array.from(sessionsList.children).forEach((child) => {
      if (child !== emptyState) child.remove();
    });
    return;
  }

  emptyState.style.display = 'none';
  // Clear old session cards
  Array.from(sessionsList.children).forEach((child) => {
    if (child !== emptyState) child.remove();
  });

  sessions.forEach((session, index) => {
    const card = createSessionCard(session, index);
    sessionsList.appendChild(card);
  });
}

function createSessionCard(session, index) {
  const card = document.createElement('div');
  card.className = 'session-card';
  card.style.animationDelay = `${index * 0.05}s`;

  const timeAgo = getTimeAgo(session.capturedAt);
  const abbrev = PLATFORM_ABBREV[session.platform] || session.platform?.slice(0, 3).toUpperCase() || '???';

  card.innerHTML = `
    <div class="session-card-top">
      <div class="platform-badge ${session.platform}">${abbrev}</div>
      <div class="session-info">
        <div class="session-title">${escapeHtml(session.title || 'Untitled Session')}</div>
        <div class="session-meta">
          <span>${timeAgo}</span>
          <span>·</span>
          <span>${session.msgCount || session.messages?.length || 0} msgs</span>
        </div>
      </div>
    </div>
    <div class="session-actions">
      <button class="btn-prompt" data-id="${session.id}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Resume Prompt
      </button>
      <button class="btn-delete" data-id="${session.id}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14H7L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        Delete
      </button>
    </div>
  `;

  // Toggle expand
  card.querySelector('.session-card-top').addEventListener('click', () => {
    card.classList.toggle('expanded');
  });

  // Resume prompt button
  card.querySelector('.btn-prompt').addEventListener('click', (e) => {
    e.stopPropagation();
    showResumePrompt(session.id);
  });

  // Delete button
  card.querySelector('.btn-delete').addEventListener('click', (e) => {
    e.stopPropagation();
    deleteSession(session.id, card);
  });

  return card;
}

// ─── Resume Prompt Modal ───────────────────────────────────────────────────────

function showResumePrompt(sessionId) {
  chrome.runtime.sendMessage({ type: 'GET_RESUME_PROMPT', sessionId }, (response) => {
    if (response?.prompt) {
      promptDisplay.textContent = response.prompt;
      modalOverlay.classList.add('active');
    }
  });
}

modalClose.addEventListener('click', () => {
  modalOverlay.classList.remove('active');
});

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) {
    modalOverlay.classList.remove('active');
  }
});

btnCopy.addEventListener('click', () => {
  const text = promptDisplay.textContent;
  navigator.clipboard.writeText(text).then(() => {
    btnCopy.classList.add('copied');
    btnCopy.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
      Copied!
    `;
    setTimeout(() => {
      btnCopy.classList.remove('copied');
      btnCopy.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy to Clipboard
      `;
    }, 2000);
  });
});

// ─── Delete Session ────────────────────────────────────────────────────────────

function deleteSession(sessionId, cardElement) {
  chrome.runtime.sendMessage({ type: 'DELETE_SESSION', sessionId }, (response) => {
    if (response?.success) {
      cardElement.style.opacity = '0';
      cardElement.style.transform = 'translateX(-20px)';
      cardElement.style.transition = 'all 0.3s ease';
      setTimeout(() => {
        cardElement.remove();
        loadSessions();
      }, 300);
    }
  });
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getTimeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

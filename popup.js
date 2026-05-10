// ContextBridge Popup — Logic v2.0
// Handles platform detection, capture, session display, routing, and critique.

const PLATFORM_LABELS = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
  deepseek: 'DeepSeek',
};

const PLATFORM_ABBREV = {
  chatgpt: 'GPT',
  claude: 'CL',
  gemini: 'GEM',
  perplexity: 'PPX',
  deepseek: 'DSK',
};

// ─── DOM Refs ──────────────────────────────────────────────────────────────────

const statusDot = document.getElementById('status-dot');
const platformLabel = document.getElementById('platform-label');
const captureBtn = document.getElementById('capture-btn');
const captureBtnText = document.getElementById('capture-btn-text');
const sessionsList = document.getElementById('sessions-list');
const sessionsCount = document.getElementById('sessions-count');
const emptyState = document.getElementById('empty-state');

// Resume prompt modal
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const promptDisplay = document.getElementById('prompt-display');
const btnCopy = document.getElementById('btn-copy');

// Route modal
const routeModalOverlay = document.getElementById('route-modal-overlay');
const routeModalClose = document.getElementById('route-modal-close');
const routeModalTitle = document.getElementById('route-modal-title');
const routeDesc = document.getElementById('route-desc');
const platformPicker = document.getElementById('platform-picker');
const routeStatus = document.getElementById('route-status');

// Critique modal
const critiqueModalOverlay = document.getElementById('critique-modal-overlay');
const critiqueModalClose = document.getElementById('critique-modal-close');
const critiquePlatformPicker = document.getElementById('critique-platform-picker');
const critiquePreviewSection = document.getElementById('critique-preview-section');
const critiquePreview = document.getElementById('critique-preview');
const critiqueCopyBtn = document.getElementById('critique-copy-btn');
const btnRouteCritique = document.getElementById('btn-route-critique');
const critiqueTargetLabel = document.getElementById('critique-target-label');
const critiqueStatus = document.getElementById('critique-status');

let currentPlatform = null;
let activeRouteSessionId = null;
let activeCritiqueSessionId = null;
let activeCritiqueTarget = null;

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
    renderSessions(sessions.slice(0, 8));
  });
}

function renderSessions(sessions) {
  if (sessions.length === 0) {
    emptyState.style.display = 'flex';
    Array.from(sessionsList.children).forEach((child) => {
      if (child !== emptyState) child.remove();
    });
    return;
  }

  emptyState.style.display = 'none';
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
        Resume
      </button>
      <button class="btn-route" data-id="${session.id}" data-platform="${session.platform}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        Route To
      </button>
      <button class="btn-critique" data-id="${session.id}" data-platform="${session.platform}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        Critique
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

  // Route-to button
  card.querySelector('.btn-route').addEventListener('click', (e) => {
    e.stopPropagation();
    showRouteModal(session.id, session.platform);
  });

  // Critique button
  card.querySelector('.btn-critique').addEventListener('click', (e) => {
    e.stopPropagation();
    showCritiqueModal(session.id, session.platform);
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
  if (e.target === modalOverlay) modalOverlay.classList.remove('active');
});

btnCopy.addEventListener('click', () => {
  copyAndFeedback(promptDisplay.textContent, btnCopy);
});

// ─── Route Modal ───────────────────────────────────────────────────────────────

function showRouteModal(sessionId, sourcePlatform) {
  activeRouteSessionId = sessionId;
  routeStatus.textContent = '';
  routeStatus.className = 'route-status';

  // Disable the source platform chip (can't route to same platform)
  platformPicker.querySelectorAll('.platform-chip').forEach((chip) => {
    chip.classList.remove('disabled', 'selected');
    if (chip.dataset.platform === sourcePlatform) {
      chip.classList.add('disabled');
    }
  });

  routeModalOverlay.classList.add('active');
}

routeModalClose.addEventListener('click', () => {
  routeModalOverlay.classList.remove('active');
});

routeModalOverlay.addEventListener('click', (e) => {
  if (e.target === routeModalOverlay) routeModalOverlay.classList.remove('active');
});

// Handle platform chip clicks for routing
platformPicker.addEventListener('click', (e) => {
  const chip = e.target.closest('.platform-chip');
  if (!chip || chip.classList.contains('disabled')) return;

  const targetPlatform = chip.dataset.platform;

  // Visual feedback
  platformPicker.querySelectorAll('.platform-chip').forEach((c) => c.classList.remove('selected'));
  chip.classList.add('selected');

  // Show routing status
  routeStatus.className = 'route-status routing';
  routeStatus.innerHTML = `<span class="spinner"></span> Routing to ${PLATFORM_LABELS[targetPlatform]}...`;

  // Send route command
  chrome.runtime.sendMessage({
    type: 'ROUTE_TO_PLATFORM',
    sessionId: activeRouteSessionId,
    targetPlatform,
  }, (response) => {
    if (response?.success) {
      routeStatus.className = 'route-status success';
      routeStatus.textContent = `✓ Prompt injected into ${PLATFORM_LABELS[targetPlatform]}`;
      setTimeout(() => { routeModalOverlay.classList.remove('active'); }, 1500);
    } else {
      routeStatus.className = 'route-status success';
      routeStatus.textContent = `✓ Tab opened — paste prompt if needed`;
      setTimeout(() => { routeModalOverlay.classList.remove('active'); }, 2000);
    }
  });
});

// ─── Critique Modal ────────────────────────────────────────────────────────────

function showCritiqueModal(sessionId, sourcePlatform) {
  activeCritiqueSessionId = sessionId;
  activeCritiqueTarget = null;
  critiquePreviewSection.style.display = 'none';
  critiqueStatus.textContent = '';
  critiqueStatus.className = 'route-status';

  // Disable the source platform chip
  critiquePlatformPicker.querySelectorAll('.platform-chip').forEach((chip) => {
    chip.classList.remove('disabled', 'selected');
    if (chip.dataset.platform === sourcePlatform) {
      chip.classList.add('disabled');
    }
  });

  critiqueModalOverlay.classList.add('active');
}

critiqueModalClose.addEventListener('click', () => {
  critiqueModalOverlay.classList.remove('active');
});

critiqueModalOverlay.addEventListener('click', (e) => {
  if (e.target === critiqueModalOverlay) critiqueModalOverlay.classList.remove('active');
});

// Handle platform chip clicks for critique
critiquePlatformPicker.addEventListener('click', (e) => {
  const chip = e.target.closest('.platform-chip');
  if (!chip || chip.classList.contains('disabled')) return;

  const targetPlatform = chip.dataset.platform;
  activeCritiqueTarget = targetPlatform;

  // Visual feedback
  critiquePlatformPicker.querySelectorAll('.platform-chip').forEach((c) => c.classList.remove('selected'));
  chip.classList.add('selected');

  // Update label
  critiqueTargetLabel.textContent = PLATFORM_LABELS[targetPlatform];

  // Generate critique preview
  chrome.runtime.sendMessage({
    type: 'GET_CRITIQUE_PROMPT',
    sessionId: activeCritiqueSessionId,
    targetPlatform,
  }, (response) => {
    if (response?.prompt) {
      critiquePreview.textContent = response.prompt;
      critiquePreviewSection.style.display = 'block';
    }
  });
});

// Copy critique
critiqueCopyBtn.addEventListener('click', () => {
  copyAndFeedback(critiquePreview.textContent, critiqueCopyBtn);
});

// Route critique to target
btnRouteCritique.addEventListener('click', () => {
  if (!activeCritiqueTarget || !activeCritiqueSessionId) return;

  critiqueStatus.className = 'route-status routing';
  critiqueStatus.innerHTML = `<span class="spinner"></span> Sending critique to ${PLATFORM_LABELS[activeCritiqueTarget]}...`;

  chrome.runtime.sendMessage({
    type: 'ROUTE_CRITIQUE',
    sessionId: activeCritiqueSessionId,
    targetPlatform: activeCritiqueTarget,
  }, (response) => {
    if (response?.success) {
      critiqueStatus.className = 'route-status success';
      critiqueStatus.textContent = `✓ Critique sent to ${PLATFORM_LABELS[activeCritiqueTarget]}`;
      setTimeout(() => { critiqueModalOverlay.classList.remove('active'); }, 1500);
    } else {
      critiqueStatus.className = 'route-status success';
      critiqueStatus.textContent = `✓ Tab opened — review critique prompt`;
      setTimeout(() => { critiqueModalOverlay.classList.remove('active'); }, 2000);
    }
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

function copyAndFeedback(text, button) {
  navigator.clipboard.writeText(text).then(() => {
    const origHTML = button.innerHTML;
    button.classList.add('copied');
    button.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
      Copied!
    `;
    setTimeout(() => {
      button.classList.remove('copied');
      button.innerHTML = origHTML;
    }, 2000);
  });
}

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

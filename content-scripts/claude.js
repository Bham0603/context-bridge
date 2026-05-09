// ContextBridge — Claude Content Script
// Scrapes conversations from claude.ai

(() => {
  const PLATFORM = 'claude';

  // ─── Selector Strategies ──────────────────────────────────────────────────────

  function extractMessages() {
    let messages = [];

    // Strategy 1: data-testid attributes
    messages = tryStrategy1();
    if (messages.length > 0) return messages;

    // Strategy 2: role-based class patterns
    messages = tryStrategy2();
    if (messages.length > 0) return messages;

    // Strategy 3: Content block containers
    messages = tryStrategy3();
    if (messages.length > 0) return messages;

    return messages;
  }

  function tryStrategy1() {
    const messages = [];
    // Collect all message elements in document order
    const allMsgs = document.querySelectorAll(
      '[data-testid="user-message"], [data-testid="ai-message"], [data-testid*="human-turn"], [data-testid*="ai-turn"]'
    );
    allMsgs.forEach((el) => {
      const testId = el.getAttribute('data-testid') || '';
      const role = testId.includes('user') || testId.includes('human') ? 'user' : 'assistant';
      const text = cleanText(el.innerText);
      if (text) {
        messages.push({ role, text, platform: PLATFORM });
      }
    });
    return messages;
  }

  function tryStrategy2() {
    const messages = [];
    const humanTurns = document.querySelectorAll('[class*="human"], [class*="Human"], [class*="user-message"]');
    const aiTurns = document.querySelectorAll('[class*="assistant"], [class*="Assistant"], [class*="ai-message"]');

    // Build an ordered list from DOM position
    const all = [];
    humanTurns.forEach((el) => all.push({ el, role: 'user' }));
    aiTurns.forEach((el) => all.push({ el, role: 'assistant' }));

    // Sort by DOM position
    all.sort((a, b) => {
      const pos = a.el.compareDocumentPosition(b.el);
      return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

    all.forEach(({ el, role }) => {
      const text = cleanText(el.innerText);
      if (text) {
        messages.push({ role, text, platform: PLATFORM });
      }
    });

    return messages;
  }

  function tryStrategy3() {
    const messages = [];
    // Look for alternating content blocks in the main conversation area
    const mainContent = document.querySelector('[class*="conversation"], main, [role="main"]');
    if (!mainContent) return messages;

    const blocks = mainContent.querySelectorAll('[class*="Message"], [class*="message"], [class*="turn"]');
    blocks.forEach((el, index) => {
      const text = cleanText(el.innerText);
      if (text) {
        // Heuristic: odd/even alternation, starting with user
        const role = index % 2 === 0 ? 'user' : 'assistant';
        messages.push({ role, text, platform: PLATFORM });
      }
    });
    return messages;
  }

  // ─── Title Extraction ─────────────────────────────────────────────────────────

  function extractTitle() {
    const docTitle = document.title.replace(' - Claude', '').replace('Claude', '').trim();
    if (docTitle && docTitle.length > 2) return docTitle;
    return 'Claude Conversation';
  }

  // ─── Capture ──────────────────────────────────────────────────────────────────

  function captureConversation() {
    const messages = extractMessages();
    if (messages.length === 0) {
      return { success: false, error: 'No messages found. Make sure a conversation is open.' };
    }

    const session = {
      id: `${PLATFORM}-${Date.now()}`,
      platform: PLATFORM,
      title: extractTitle(),
      messages,
      capturedAt: new Date().toISOString(),
      url: window.location.href,
      msgCount: messages.length,
    };

    chrome.runtime.sendMessage({ type: 'SAVE_SESSION', session });
    return { success: true, msgCount: messages.length, title: session.title };
  }

  // ─── Message Listener ────────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CAPTURE_NOW') {
      sendResponse(captureConversation());
    }
    return true;
  });

  function cleanText(text) {
    if (!text) return '';
    return text.replace(/\n{3,}/g, '\n\n').trim();
  }

  console.log('[ContextBridge] Claude content script loaded.');
})();

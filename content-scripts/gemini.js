// ContextBridge — Gemini Content Script
// Scrapes conversations from gemini.google.com

(() => {
  const PLATFORM = 'gemini';

  // ─── Selector Strategies ──────────────────────────────────────────────────────

  function extractMessages() {
    let messages = [];

    // Strategy 1: Custom elements (user-query, model-response)
    messages = tryStrategy1();
    if (messages.length > 0) return messages;

    // Strategy 2: Query/response class patterns
    messages = tryStrategy2();
    if (messages.length > 0) return messages;

    // Strategy 3: Message content containers
    messages = tryStrategy3();
    if (messages.length > 0) return messages;

    return messages;
  }

  function tryStrategy1() {
    const messages = [];
    const all = [];

    document.querySelectorAll('user-query').forEach((el) => {
      all.push({ el, role: 'user' });
    });
    document.querySelectorAll('model-response').forEach((el) => {
      all.push({ el, role: 'assistant' });
    });

    // Sort by DOM order
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

  function tryStrategy2() {
    const messages = [];
    const all = [];

    document.querySelectorAll('[class*="query-text"], [class*="query-content"]').forEach((el) => {
      all.push({ el, role: 'user' });
    });
    document.querySelectorAll('[class*="response-text"], [class*="response-content"], [class*="model-response"]').forEach((el) => {
      all.push({ el, role: 'assistant' });
    });

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
    const turns = document.querySelectorAll('[class*="conversation-turn"], [class*="turn-container"], [class*="message-content"]');
    turns.forEach((el, index) => {
      const text = cleanText(el.innerText);
      if (text) {
        messages.push({ role: index % 2 === 0 ? 'user' : 'assistant', text, platform: PLATFORM });
      }
    });
    return messages;
  }

  // ─── Title Extraction ─────────────────────────────────────────────────────────

  function extractTitle() {
    const docTitle = document.title.replace(' - Google Gemini', '').replace('Gemini', '').trim();
    if (docTitle && docTitle.length > 2) return docTitle;
    return 'Gemini Conversation';
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

  console.log('[ContextBridge] Gemini content script loaded.');
})();

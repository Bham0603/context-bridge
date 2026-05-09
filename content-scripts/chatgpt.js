// ContextBridge — ChatGPT Content Script
// Scrapes conversations from chatgpt.com / chat.openai.com

(() => {
  const PLATFORM = 'chatgpt';

  // ─── Selector Strategies (ordered by reliability) ─────────────────────────────

  function extractMessages() {
    let messages = [];

    // Strategy 1: data-message-author-role attribute
    messages = tryStrategy1();
    if (messages.length > 0) return messages;

    // Strategy 2: article elements with role indicators
    messages = tryStrategy2();
    if (messages.length > 0) return messages;

    // Strategy 3: Generic turn-based containers
    messages = tryStrategy3();
    if (messages.length > 0) return messages;

    return messages;
  }

  function tryStrategy1() {
    const messages = [];
    const elements = document.querySelectorAll('[data-message-author-role]');
    elements.forEach((el) => {
      const role = el.getAttribute('data-message-author-role');
      const mappedRole = role === 'user' ? 'user' : 'assistant';
      const textEl = el.querySelector('.markdown, .whitespace-pre-wrap, [class*="markdown"]') || el;
      const text = cleanText(textEl.innerText);
      if (text) {
        messages.push({ role: mappedRole, text, platform: PLATFORM });
      }
    });
    return messages;
  }

  function tryStrategy2() {
    const messages = [];
    const articles = document.querySelectorAll('article[data-testid]');
    articles.forEach((el) => {
      const testId = el.getAttribute('data-testid') || '';
      let role = 'assistant';
      if (testId.includes('user') || el.querySelector('[data-message-author-role="user"]')) {
        role = 'user';
      }
      const text = cleanText(el.innerText);
      if (text) {
        messages.push({ role, text, platform: PLATFORM });
      }
    });
    return messages;
  }

  function tryStrategy3() {
    const messages = [];
    // Look for turn containers
    const turns = document.querySelectorAll('[class*="agent-turn"], [class*="user-turn"], [class*="ConversationItem"]');
    turns.forEach((el) => {
      const className = el.className || '';
      const role = className.includes('user') ? 'user' : 'assistant';
      const text = cleanText(el.innerText);
      if (text) {
        messages.push({ role, text, platform: PLATFORM });
      }
    });
    return messages;
  }

  // ─── Title Extraction ─────────────────────────────────────────────────────────

  function extractTitle() {
    // Try active sidebar item
    const activeNav = document.querySelector('nav a.bg-token-sidebar-surface-secondary, nav [class*="active"] a');
    if (activeNav) {
      const title = activeNav.innerText?.trim();
      if (title && title.length > 2) return title;
    }

    // Fallback to document title
    const docTitle = document.title.replace(' - ChatGPT', '').replace('ChatGPT', '').trim();
    if (docTitle) return docTitle;

    return 'ChatGPT Conversation';
  }

  // ─── Capture Function ────────────────────────────────────────────────────────

  function captureConversation() {
    const messages = extractMessages();
    if (messages.length === 0) {
      return { success: false, error: 'No messages found on this page. Make sure a conversation is open.' };
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

    chrome.runtime.sendMessage({ type: 'SAVE_SESSION', session }, (response) => {
      console.log('[ContextBridge] Session saved:', session.title);
    });

    return { success: true, msgCount: messages.length, title: session.title };
  }

  // ─── Message Listener ────────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CAPTURE_NOW') {
      const result = captureConversation();
      sendResponse(result);
    }
    return true;
  });

  // ─── Utils ────────────────────────────────────────────────────────────────────

  function cleanText(text) {
    if (!text) return '';
    return text.replace(/\n{3,}/g, '\n\n').trim();
  }

  console.log('[ContextBridge] ChatGPT content script loaded.');
})();

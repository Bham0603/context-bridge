// ContextBridge — Copilot Content Script
// Scrapes conversations from copilot.microsoft.com

(() => {
  const PLATFORM = 'copilot';

  // ─── Selector Strategies ──────────────────────────────────────────────────────

  function extractMessages() {
    let messages = [];

    // Strategy 1: Message group containers
    messages = tryStrategy1();
    if (messages.length > 0) return messages;

    // Strategy 2: Generic message class patterns
    messages = tryStrategy2();
    if (messages.length > 0) return messages;

    // Strategy 3: Chat turn containers
    messages = tryStrategy3();
    if (messages.length > 0) return messages;

    return messages;
  }

  function tryStrategy1() {
    const messages = [];
    // Copilot uses cib-message-group or similar Web Components
    const groups = document.querySelectorAll('cib-message-group, [class*="MessageGroup"]');
    groups.forEach((group) => {
      const source = group.getAttribute('source') || '';
      const role = source === 'user' ? 'user' : 'assistant';

      const messageEls = group.querySelectorAll('cib-message, [class*="message-content"]');
      messageEls.forEach((el) => {
        // Copilot may use Shadow DOM — try to access it
        let text = '';
        if (el.shadowRoot) {
          const inner = el.shadowRoot.querySelector('[class*="content"], .ac-textBlock');
          text = cleanText(inner?.innerText || el.innerText);
        } else {
          text = cleanText(el.innerText);
        }
        if (text) {
          messages.push({ role, text, platform: PLATFORM });
        }
      });
    });
    return messages;
  }

  function tryStrategy2() {
    const messages = [];
    const all = [];

    document.querySelectorAll('[class*="user-message"], [class*="UserMessage"], [class*="request"]').forEach((el) => {
      all.push({ el, role: 'user' });
    });
    document.querySelectorAll('[class*="bot-message"], [class*="BotMessage"], [class*="response"]').forEach((el) => {
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
    // Generic: look for anything with "message" in class
    const els = document.querySelectorAll('[class*="message"]');
    const seen = new Set();

    els.forEach((el) => {
      const text = cleanText(el.innerText);
      if (text && text.length > 10 && !seen.has(text)) {
        seen.add(text);
        // Heuristic: shorter messages tend to be user, longer are assistant
        const role = text.length < 200 ? 'user' : 'assistant';
        messages.push({ role, text, platform: PLATFORM });
      }
    });
    return messages;
  }

  // ─── Title Extraction ─────────────────────────────────────────────────────────

  function extractTitle() {
    const docTitle = document.title.replace(' - Microsoft Copilot', '').replace('Copilot', '').trim();
    if (docTitle && docTitle.length > 2) return docTitle;
    return 'Copilot Conversation';
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

  console.log('[ContextBridge] Copilot content script loaded.');
})();

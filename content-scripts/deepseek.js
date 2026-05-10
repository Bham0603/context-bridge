// ContextBridge — DeepSeek Content Script
// Scrapes conversations from chat.deepseek.com
// Supports: CAPTURE_NOW, INJECT_PROMPT, WAIT_FOR_RESPONSE

(() => {
  const PLATFORM = 'deepseek';

  // ─── Selector Strategies (ordered by reliability) ─────────────────────────────

  function extractMessages() {
    let messages = [];

    // Strategy 1: data attributes on message containers
    messages = tryStrategy1();
    if (messages.length > 0) return messages;

    // Strategy 2: class-based role identification
    messages = tryStrategy2();
    if (messages.length > 0) return messages;

    // Strategy 3: Generic turn containers
    messages = tryStrategy3();
    if (messages.length > 0) return messages;

    return messages;
  }

  function tryStrategy1() {
    const messages = [];
    // DeepSeek uses div containers with role-based classes
    const userEls = document.querySelectorAll('[class*="user-message"], [class*="fbb737a4"], [data-role="user"]');
    const assistantEls = document.querySelectorAll('[class*="assistant-message"], [class*="f9bf7997"], [data-role="assistant"]');

    const all = [];
    userEls.forEach((el) => all.push({ el, role: 'user' }));
    assistantEls.forEach((el) => all.push({ el, role: 'assistant' }));

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
    // Look for markdown rendered content blocks inside conversation
    const container = document.querySelector('[class*="conversation"], [class*="chat-container"], main');
    if (!container) return messages;

    const turns = container.querySelectorAll('[class*="msg"], [class*="turn"], [class*="message"]');
    const seen = new Set();

    turns.forEach((el) => {
      const text = cleanText(el.innerText);
      if (!text || text.length < 3 || seen.has(text)) return;
      seen.add(text);

      // Check for role indicators in class names or parent
      const classes = (el.className || '') + (el.parentElement?.className || '');
      let role = 'assistant';
      if (classes.match(/user|human|request|query/i)) {
        role = 'user';
      }
      messages.push({ role, text, platform: PLATFORM });
    });

    return messages;
  }

  function tryStrategy3() {
    const messages = [];
    // Fallback: find the chat scroll area and look for alternating blocks
    const chatArea = document.querySelector('[class*="scroll"], [class*="chat"], main');
    if (!chatArea) return messages;

    const blocks = chatArea.querySelectorAll('.markdown, [class*="markdown"], [class*="content"]');
    const seen = new Set();

    blocks.forEach((el, index) => {
      const text = cleanText(el.innerText);
      if (text && text.length > 5 && !seen.has(text)) {
        seen.add(text);
        messages.push({ role: index % 2 === 0 ? 'user' : 'assistant', text, platform: PLATFORM });
      }
    });
    return messages;
  }

  // ─── Title Extraction ─────────────────────────────────────────────────────────

  function extractTitle() {
    // Try sidebar active item
    const activeNav = document.querySelector('[class*="active"] [class*="title"], nav [class*="selected"]');
    if (activeNav) {
      const title = activeNav.innerText?.trim();
      if (title && title.length > 2) return title;
    }

    const docTitle = document.title.replace(' - DeepSeek', '').replace('DeepSeek', '').trim();
    if (docTitle && docTitle.length > 2) return docTitle;
    return 'DeepSeek Conversation';
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

  // ─── Input Injection ──────────────────────────────────────────────────────────

  function injectPrompt(text) {
    // Strategy 1: textarea
    let input = document.querySelector('textarea#chat-input, textarea[placeholder], textarea');
    if (input) {
      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      nativeSetter.call(input, text);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.focus();
      return { success: true, method: 'textarea' };
    }

    // Strategy 2: contenteditable
    input = document.querySelector('[contenteditable="true"]');
    if (input) {
      input.focus();
      input.innerHTML = '';
      document.execCommand('insertText', false, text);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return { success: true, method: 'contenteditable' };
    }

    return { success: false, error: 'Could not find input field on DeepSeek' };
  }

  // ─── Response Detection ───────────────────────────────────────────────────────

  function waitForResponse(timeoutMs = 60000) {
    return new Promise((resolve) => {
      const chatArea = document.querySelector('[class*="conversation"], [class*="chat"], main') || document.body;
      let settled = false;
      let debounceTimer = null;

      const observer = new MutationObserver(() => {
        // Reset debounce — wait for streaming to finish (1.5s of no changes)
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (!settled) {
            settled = true;
            observer.disconnect();
            const msgs = extractMessages();
            const lastAssistant = [...msgs].reverse().find((m) => m.role === 'assistant');
            resolve({ success: true, response: lastAssistant?.text?.slice(0, 500) || '' });
          }
        }, 1500);
      });

      observer.observe(chatArea, { childList: true, subtree: true, characterData: true });

      // Timeout fallback
      setTimeout(() => {
        if (!settled) {
          settled = true;
          observer.disconnect();
          resolve({ success: false, error: 'Response detection timed out' });
        }
      }, timeoutMs);
    });
  }

  // ─── Message Listener ────────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CAPTURE_NOW') {
      sendResponse(captureConversation());
    } else if (message.type === 'INJECT_PROMPT') {
      const result = injectPrompt(message.text);
      sendResponse(result);
    } else if (message.type === 'WAIT_FOR_RESPONSE') {
      waitForResponse(message.timeout || 60000).then(sendResponse);
      return true; // async
    }
    return true;
  });

  // ─── Utils ────────────────────────────────────────────────────────────────────

  function cleanText(text) {
    if (!text) return '';
    return text.replace(/\n{3,}/g, '\n\n').trim();
  }

  console.log('[ContextBridge] DeepSeek content script loaded.');
})();

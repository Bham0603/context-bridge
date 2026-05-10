// ContextBridge — Claude Content Script
// Scrapes conversations from claude.ai
// Supports: CAPTURE_NOW, INJECT_PROMPT, WAIT_FOR_RESPONSE

(() => {
  const PLATFORM = 'claude';

  function extractMessages() {
    let messages = tryStrategy1();
    if (messages.length > 0) return messages;
    messages = tryStrategy2();
    if (messages.length > 0) return messages;
    messages = tryStrategy3();
    return messages;
  }

  function tryStrategy1() {
    const messages = [];
    const allMsgs = document.querySelectorAll(
      '[data-testid="user-message"], [data-testid="ai-message"], [data-testid*="human-turn"], [data-testid*="ai-turn"]'
    );
    allMsgs.forEach((el) => {
      const testId = el.getAttribute('data-testid') || '';
      const role = testId.includes('user') || testId.includes('human') ? 'user' : 'assistant';
      const text = cleanText(el.innerText);
      if (text) messages.push({ role, text, platform: PLATFORM });
    });
    return messages;
  }

  function tryStrategy2() {
    const messages = [];
    const humanTurns = document.querySelectorAll('[class*="human"], [class*="Human"], [class*="user-message"]');
    const aiTurns = document.querySelectorAll('[class*="assistant"], [class*="Assistant"], [class*="ai-message"]');
    const all = [];
    humanTurns.forEach((el) => all.push({ el, role: 'user' }));
    aiTurns.forEach((el) => all.push({ el, role: 'assistant' }));
    all.sort((a, b) => {
      const pos = a.el.compareDocumentPosition(b.el);
      return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
    all.forEach(({ el, role }) => {
      const text = cleanText(el.innerText);
      if (text) messages.push({ role, text, platform: PLATFORM });
    });
    return messages;
  }

  function tryStrategy3() {
    const messages = [];
    const mainContent = document.querySelector('[class*="conversation"], main, [role="main"]');
    if (!mainContent) return messages;
    const blocks = mainContent.querySelectorAll('[class*="Message"], [class*="message"], [class*="turn"]');
    blocks.forEach((el, index) => {
      const text = cleanText(el.innerText);
      if (text) messages.push({ role: index % 2 === 0 ? 'user' : 'assistant', text, platform: PLATFORM });
    });
    return messages;
  }

  function extractTitle() {
    const docTitle = document.title.replace(' - Claude', '').replace('Claude', '').trim();
    if (docTitle && docTitle.length > 2) return docTitle;
    return 'Claude Conversation';
  }

  function captureConversation() {
    const messages = extractMessages();
    if (messages.length === 0) return { success: false, error: 'No messages found. Make sure a conversation is open.' };
    const session = {
      id: `${PLATFORM}-${Date.now()}`, platform: PLATFORM, title: extractTitle(),
      messages, capturedAt: new Date().toISOString(), url: window.location.href, msgCount: messages.length,
    };
    chrome.runtime.sendMessage({ type: 'SAVE_SESSION', session });
    return { success: true, msgCount: messages.length, title: session.title };
  }

  // ─── Input Injection ──────────────────────────────────────────────────────────

  function injectPrompt(text) {
    let input = document.querySelector('[contenteditable="true"].ProseMirror, [contenteditable="true"]');
    if (input) {
      input.focus();
      input.innerHTML = '<p></p>';
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(input);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('insertText', false, text);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return { success: true, method: 'prosemirror' };
    }
    input = document.querySelector('textarea');
    if (input) {
      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      nativeSetter.call(input, text);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
      return { success: true, method: 'textarea' };
    }
    return { success: false, error: 'Could not find input field on Claude' };
  }

  // ─── Response Detection ───────────────────────────────────────────────────────

  function waitForResponse(timeoutMs = 60000) {
    return new Promise((resolve) => {
      const chatArea = document.querySelector('[class*="conversation"], main') || document.body;
      let settled = false;
      let debounceTimer = null;
      const observer = new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (!settled) {
            settled = true;
            observer.disconnect();
            const msgs = extractMessages();
            const last = [...msgs].reverse().find((m) => m.role === 'assistant');
            resolve({ success: true, response: last?.text?.slice(0, 500) || '' });
          }
        }, 1500);
      });
      observer.observe(chatArea, { childList: true, subtree: true, characterData: true });
      setTimeout(() => { if (!settled) { settled = true; observer.disconnect(); resolve({ success: false, error: 'Timed out' }); } }, timeoutMs);
    });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CAPTURE_NOW') sendResponse(captureConversation());
    else if (message.type === 'INJECT_PROMPT') sendResponse(injectPrompt(message.text));
    else if (message.type === 'WAIT_FOR_RESPONSE') { waitForResponse(message.timeout || 60000).then(sendResponse); return true; }
    return true;
  });

  function cleanText(text) { if (!text) return ''; return text.replace(/\n{3,}/g, '\n\n').trim(); }
  console.log('[ContextBridge] Claude content script loaded.');
})();

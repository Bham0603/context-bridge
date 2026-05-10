// ContextBridge — Gemini Content Script
// Scrapes conversations from gemini.google.com
// Supports: CAPTURE_NOW, INJECT_PROMPT, WAIT_FOR_RESPONSE

(() => {
  const PLATFORM = 'gemini';

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
    const all = [];
    document.querySelectorAll('user-query').forEach((el) => all.push({ el, role: 'user' }));
    document.querySelectorAll('model-response').forEach((el) => all.push({ el, role: 'assistant' }));
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

  function tryStrategy2() {
    const messages = [];
    const all = [];
    document.querySelectorAll('[class*="query-text"], [class*="query-content"]').forEach((el) => all.push({ el, role: 'user' }));
    document.querySelectorAll('[class*="response-text"], [class*="response-content"], [class*="model-response"]').forEach((el) => all.push({ el, role: 'assistant' }));
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
    const turns = document.querySelectorAll('[class*="conversation-turn"], [class*="turn-container"], [class*="message-content"]');
    turns.forEach((el, index) => {
      const text = cleanText(el.innerText);
      if (text) messages.push({ role: index % 2 === 0 ? 'user' : 'assistant', text, platform: PLATFORM });
    });
    return messages;
  }

  function extractTitle() {
    const docTitle = document.title.replace(' - Google Gemini', '').replace('Gemini', '').trim();
    if (docTitle && docTitle.length > 2) return docTitle;
    return 'Gemini Conversation';
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
    // Strategy 1: Gemini's rich text editor
    let input = document.querySelector('.ql-editor, [contenteditable="true"], rich-textarea [contenteditable]');
    if (input) {
      input.focus();
      input.innerHTML = '';
      document.execCommand('insertText', false, text);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return { success: true, method: 'contenteditable' };
    }
    // Strategy 2: textarea
    input = document.querySelector('textarea');
    if (input) {
      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      nativeSetter.call(input, text);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
      return { success: true, method: 'textarea' };
    }
    return { success: false, error: 'Could not find input field on Gemini' };
  }

  // ─── Response Detection ───────────────────────────────────────────────────────

  function waitForResponse(timeoutMs = 60000) {
    return new Promise((resolve) => {
      const chatArea = document.querySelector('main, [class*="conversation"]') || document.body;
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
  console.log('[ContextBridge] Gemini content script loaded.');
})();

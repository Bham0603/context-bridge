// ContextBridge — Perplexity Content Script
// Scrapes conversations from perplexity.ai
// Supports: CAPTURE_NOW, INJECT_PROMPT, WAIT_FOR_RESPONSE

(() => {
  const PLATFORM = 'perplexity';

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
    const main = document.querySelector('main, [class*="thread"], [class*="conversation"]');
    if (!main) return messages;
    const sections = main.querySelectorAll('[class*="block"], [class*="group"], [class*="result"], [class*="Thread"]');
    sections.forEach((section) => {
      const query = section.querySelector('[class*="query"], [class*="Query"], h2, [class*="question"]');
      const answer = section.querySelector('.prose, [class*="answer"], [class*="Answer"], [class*="markdown"]');
      if (query) {
        const text = cleanText(query.innerText);
        if (text) messages.push({ role: 'user', text, platform: PLATFORM });
      }
      if (answer) {
        const text = cleanText(answer.innerText);
        if (text) messages.push({ role: 'assistant', text, platform: PLATFORM });
      }
    });
    return messages;
  }

  function tryStrategy2() {
    const messages = [];
    document.querySelectorAll('[class*="AnswerBlock"], [class*="SearchResult"]').forEach((block) => {
      const heading = block.querySelector('h2, h3, [class*="heading"]');
      if (heading) {
        const text = cleanText(heading.innerText);
        if (text) messages.push({ role: 'user', text, platform: PLATFORM });
      }
      const prose = block.querySelector('.prose, [class*="markdown"], [class*="content"]');
      if (prose) {
        const text = cleanText(prose.innerText);
        if (text) messages.push({ role: 'assistant', text, platform: PLATFORM });
      }
    });
    return messages;
  }

  function tryStrategy3() {
    const messages = [];
    document.querySelectorAll('.prose').forEach((el) => {
      const text = cleanText(el.innerText);
      if (text) messages.push({ role: 'assistant', text, platform: PLATFORM });
    });
    return messages;
  }

  function extractTitle() {
    const docTitle = document.title.replace(' - Perplexity', '').replace('Perplexity', '').trim();
    if (docTitle && docTitle.length > 2) return docTitle;
    return 'Perplexity Search';
  }

  function captureConversation() {
    const messages = extractMessages();
    if (messages.length === 0) return { success: false, error: 'No content found. Make sure a search thread is open.' };
    const session = {
      id: `${PLATFORM}-${Date.now()}`, platform: PLATFORM, title: extractTitle(),
      messages, capturedAt: new Date().toISOString(), url: window.location.href, msgCount: messages.length,
    };
    chrome.runtime.sendMessage({ type: 'SAVE_SESSION', session });
    return { success: true, msgCount: messages.length, title: session.title };
  }

  // ─── Input Injection ──────────────────────────────────────────────────────────

  function injectPrompt(text) {
    // Strategy 1: Perplexity search textarea
    let input = document.querySelector('textarea[placeholder], textarea');
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
    return { success: false, error: 'Could not find input field on Perplexity' };
  }

  // ─── Response Detection ───────────────────────────────────────────────────────

  function waitForResponse(timeoutMs = 60000) {
    return new Promise((resolve) => {
      const chatArea = document.querySelector('main') || document.body;
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
  console.log('[ContextBridge] Perplexity content script loaded.');
})();

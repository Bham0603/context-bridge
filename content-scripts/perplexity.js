// ContextBridge — Perplexity Content Script
// Scrapes conversations from perplexity.ai

(() => {
  const PLATFORM = 'perplexity';

  // ─── Selector Strategies ──────────────────────────────────────────────────────

  function extractMessages() {
    let messages = [];

    // Strategy 1: Prose blocks for answers + query displays
    messages = tryStrategy1();
    if (messages.length > 0) return messages;

    // Strategy 2: Answer/query containers
    messages = tryStrategy2();
    if (messages.length > 0) return messages;

    // Strategy 3: Generic conversation blocks
    messages = tryStrategy3();
    if (messages.length > 0) return messages;

    return messages;
  }

  function tryStrategy1() {
    const messages = [];
    // Perplexity uses a Q&A format — find query/answer pairs
    const queryBlocks = document.querySelectorAll('[class*="QueryText"], [class*="query-text"], textarea[class*="search"]');
    const answerBlocks = document.querySelectorAll('.prose, [class*="Answer"], [class*="answer-text"], [class*="AnswerContent"]');

    // Try to pair them by proximity in the DOM
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
    // Direct answer/query selectors
    document.querySelectorAll('[class*="AnswerBlock"], [class*="SearchResult"]').forEach((block) => {
      // The question might be in a heading
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
    // Fallback: just find .prose elements and treat as answers, with user queries from inputs
    const proseBlocks = document.querySelectorAll('.prose');
    proseBlocks.forEach((el, index) => {
      const text = cleanText(el.innerText);
      if (text) {
        messages.push({ role: 'assistant', text, platform: PLATFORM });
      }
    });
    return messages;
  }

  // ─── Title Extraction ─────────────────────────────────────────────────────────

  function extractTitle() {
    const docTitle = document.title.replace(' - Perplexity', '').replace('Perplexity', '').trim();
    if (docTitle && docTitle.length > 2) return docTitle;
    return 'Perplexity Search';
  }

  // ─── Capture ──────────────────────────────────────────────────────────────────

  function captureConversation() {
    const messages = extractMessages();
    if (messages.length === 0) {
      return { success: false, error: 'No content found. Make sure a search thread is open.' };
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

  console.log('[ContextBridge] Perplexity content script loaded.');
})();

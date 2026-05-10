// ContextBridge — Background Service Worker (MV3)
// Handles session storage, resume prompt generation, cross-AI routing, and critique generation.

// ─── Platform URLs ──────────────────────────────────────────────────────────────

const PLATFORM_URLS = {
  chatgpt: 'https://chatgpt.com/',
  claude: 'https://claude.ai/new',
  gemini: 'https://gemini.google.com/app',
  perplexity: 'https://www.perplexity.ai/',
  deepseek: 'https://chat.deepseek.com/',
};

const PLATFORM_LABELS = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
  deepseek: 'DeepSeek',
};

// ─── Context Signal Extraction ──────────────────────────────────────────────────

function extractContextSignals(messages) {
  const allText = messages.map((m) => m.text).join('\n');

  const techPatterns = {
    JavaScript: /\b(javascript|\.js|node\.?js|npm|yarn|express|react|next\.?js|vue|angular|svelte)\b/i,
    TypeScript: /\b(typescript|\.tsx?|tsc)\b/i,
    Python: /\b(python|\.py|pip|django|flask|fastapi|pandas|numpy|pytorch|tensorflow)\b/i,
    Rust: /\b(rust|cargo|\.rs)\b/i,
    Go: /\b(golang|go\.mod|\.go)\b/i,
    Java: /\b(java(?!script)|\.java|spring|maven|gradle)\b/i,
    SQL: /\b(sql|postgres|mysql|sqlite|bigquery|prisma|sequelize)\b/i,
    Shell: /\b(bash|shell|\.sh|zsh|powershell)\b/i,
    Docker: /\b(docker|dockerfile|container|kubernetes|k8s)\b/i,
    CSS: /\b(css|scss|sass|tailwind|styled-components)\b/i,
  };

  const detectedTech = [];
  for (const [name, pattern] of Object.entries(techPatterns)) {
    if (pattern.test(allText)) detectedTech.push(name);
  }

  const fileMatches = allText.match(/(?:^|\s)([\w\-./]+\.\w{1,6})(?:\s|$|:|,|\))/gm) || [];
  const files = [...new Set(
    fileMatches.map((f) => f.trim().replace(/[,:)]/g, ''))
      .filter((f) => f.includes('.') && !f.startsWith('http') && f.length < 80)
  )].slice(0, 15);

  const lastUserMessages = messages.filter((m) => m.role === 'user').slice(-3).map((m) => m.text);
  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');
  const totalUser = messages.filter((m) => m.role === 'user').length;
  const totalAssistant = messages.filter((m) => m.role === 'assistant').length;

  return { technologies: detectedTech, files, lastUserMessages, lastAssistantResponse: lastAssistantMsg?.text || '', totalUser, totalAssistant };
}

// ─── Resume Prompt Generator ───────────────────────────────────────────────────

function generateResumePrompt(session) {
  const dateStr = new Date(session.capturedAt).toLocaleString();
  const signals = extractContextSignals(session.messages);

  const messagesBlock = session.messages
    .map((m, i) => {
      const role = m.role === 'user' ? 'USER' : 'ASSISTANT';
      return `[${role}] (message ${i + 1}/${session.msgCount}):\n${m.text}`;
    })
    .join('\n\n---\n\n');

  const summary = session.summary || '(No AI-generated summary — full conversation included below)';
  const techSection = signals.technologies.length > 0 ? `Technologies    : ${signals.technologies.join(', ')}` : '';
  const filesSection = signals.files.length > 0 ? `Files Discussed : ${signals.files.join(', ')}` : '';

  const lastUserReq = signals.lastUserMessages.length > 0
    ? signals.lastUserMessages[signals.lastUserMessages.length - 1].slice(0, 300)
    : '';
  const currentTaskSection = lastUserReq
    ? `\nLast User Request (abbreviated):\n"${lastUserReq}${lastUserReq.length >= 300 ? '...' : ''}"`
    : '';

  return `=== CONTEXTBRIDGE TRANSFER ===
You are receiving a full conversation history from another AI platform.
Your job is to seamlessly continue this conversation as if you were the original assistant.
Read ALL context below before responding.

=== SESSION METADATA ===
Source Platform  : ${session.platform}
Source URL       : ${session.url}
Topic            : ${session.title}
Captured         : ${dateStr}
Total Messages   : ${session.msgCount} (${signals.totalUser} user, ${signals.totalAssistant} assistant)
${techSection}
${filesSection}

=== CONTEXT SUMMARY ===
${summary}

=== CURRENT STATE ===
The conversation reached the following point:${currentTaskSection}

The assistant's last response covered:
"${signals.lastAssistantResponse.slice(0, 400)}${signals.lastAssistantResponse.length >= 400 ? '...' : ''}"

=== FULL CONVERSATION HISTORY ===
Below is the complete, unedited conversation. Every message is preserved in order.

${messagesBlock}

=== RESUME INSTRUCTIONS ===
You are now the assistant continuing this conversation. Follow these rules strictly:

1. CONTINUITY: All context, decisions, code snippets, and agreements from above are established facts.
2. STYLE MATCHING: Match the technical depth, tone, and formatting style used.
3. CONTEXT AWARENESS: Reference specific earlier decisions when relevant.
4. NO INTRODUCTIONS: Do not say "Hello" or summarize. Simply continue naturally.
5. CODE CONVENTIONS: Continue using the same language, framework, and patterns.
6. UNFINISHED WORK: If mid-task, acknowledge and continue from that exact point.
7. ASSUME FULL CONTEXT: Never say "I don't have context about..." — you DO.

The user's next message continues directly from the last [USER] turn above.
=== END CONTEXTBRIDGE ===`;
}

// ─── Critique Prompt Generator ──────────────────────────────────────────────────

function generateCritiquePrompt(session, targetPlatform) {
  const sourcePlatform = PLATFORM_LABELS[session.platform] || session.platform;
  const targetLabel = PLATFORM_LABELS[targetPlatform] || targetPlatform;
  const signals = extractContextSignals(session.messages);

  const lastUserMsg = signals.lastUserMessages.length > 0
    ? signals.lastUserMessages[signals.lastUserMessages.length - 1]
    : '(No user message found)';

  const lastAssistantResp = signals.lastAssistantResponse || '(No assistant response found)';
  const techContext = signals.technologies.length > 0
    ? `\nTechnical Context: ${signals.technologies.join(', ')}`
    : '';

  return `=== CONTEXTBRIDGE CROSS-AI CRITIQUE REQUEST ===

You (${targetLabel}) are being asked to perform an expert critique of a response from ${sourcePlatform}.
${techContext}

ORIGINAL USER REQUEST:
"${lastUserMsg}"

${sourcePlatform.toUpperCase()}'S RESPONSE:
"${lastAssistantResp}"

CRITIQUE INSTRUCTIONS:
Analyze the above response across these dimensions:

1. **Accuracy**: Are the claims factually correct? Flag any errors with specifics.
2. **Completeness**: Did it fully address the user's request? What's missing?
3. **Reasoning Quality**: Is the logic sound? Are there gaps in the reasoning chain?
4. **Code Quality** (if applicable): Is the code correct, efficient, and idiomatic? Are there bugs, edge cases, or security issues?
5. **Better Alternatives**: What would YOU do differently? Provide your improved version.

Format your critique as:
- ✅ **Strengths** (what ${sourcePlatform} got right)
- ⚠️ **Issues** (what's wrong, incomplete, or could be better)
- 🔄 **Your Improved Response** (your full alternative answer to the original question)

Be specific — cite exact parts of the response. Be constructively critical, not dismissive.
=== END CRITIQUE REQUEST ===`;
}

// ─── Storage Helpers ────────────────────────────────────────────────────────────

async function getSessions() {
  const result = await chrome.storage.local.get('sessions');
  return result.sessions || [];
}

async function saveSession(session) {
  const sessions = await getSessions();
  const existingIndex = sessions.findIndex((s) => s.id === session.id);
  if (existingIndex >= 0) {
    sessions[existingIndex] = session;
  } else {
    sessions.unshift(session);
  }
  await chrome.storage.local.set({ sessions });
  updateBadge(sessions.length);
  return session;
}

async function deleteSession(sessionId) {
  let sessions = await getSessions();
  sessions = sessions.filter((s) => s.id !== sessionId);
  await chrome.storage.local.set({ sessions });
  updateBadge(sessions.length);
  return true;
}

function updateBadge(count) {
  const text = count > 0 ? String(count) : '';
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: '#7c3aed' });
}

// ─── Routing Helper ─────────────────────────────────────────────────────────────

function routeToplatform(targetPlatform, promptText) {
  return new Promise((resolve) => {
    const url = PLATFORM_URLS[targetPlatform];
    if (!url) {
      resolve({ success: false, error: `Unknown platform: ${targetPlatform}` });
      return;
    }

    chrome.tabs.create({ url, active: true }, (tab) => {
      const tabId = tab.id;

      // Wait for the tab to finish loading, then inject the prompt
      const onUpdated = (updatedTabId, changeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(onUpdated);

          // Wait a bit for JS frameworks to initialize
          setTimeout(() => {
            chrome.tabs.sendMessage(tabId, { type: 'INJECT_PROMPT', text: promptText }, (response) => {
              if (chrome.runtime.lastError) {
                // Content script might not be ready — try injecting it first
                chrome.scripting.executeScript({
                  target: { tabId },
                  files: [`content-scripts/${targetPlatform}.js`],
                }, () => {
                  setTimeout(() => {
                    chrome.tabs.sendMessage(tabId, { type: 'INJECT_PROMPT', text: promptText }, (retryResponse) => {
                      resolve(retryResponse || { success: false, error: 'Injection failed after retry' });
                    });
                  }, 1000);
                });
              } else {
                resolve(response || { success: true });
              }
            });
          }, 2000);
        }
      };

      chrome.tabs.onUpdated.addListener(onUpdated);

      // Timeout for the whole operation
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve({ success: false, error: 'Tab loading timed out', tabId });
      }, 30000);
    });
  });
}

// ─── Message Listener ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'SAVE_SESSION': {
      saveSession(message.session).then((saved) => {
        sendResponse({ success: true, session: saved });
      });
      return true;
    }

    case 'GET_SESSIONS': {
      getSessions().then((sessions) => {
        sendResponse({ sessions });
      });
      return true;
    }

    case 'DELETE_SESSION': {
      deleteSession(message.sessionId).then(() => {
        sendResponse({ success: true });
      });
      return true;
    }

    case 'GET_RESUME_PROMPT': {
      getSessions().then((sessions) => {
        const session = sessions.find((s) => s.id === message.sessionId);
        if (session) {
          sendResponse({ prompt: generateResumePrompt(session) });
        } else {
          sendResponse({ prompt: null, error: 'Session not found' });
        }
      });
      return true;
    }

    case 'ROUTE_TO_PLATFORM': {
      // Route a session's resume prompt to a target AI platform
      getSessions().then((sessions) => {
        const session = sessions.find((s) => s.id === message.sessionId);
        if (!session) {
          sendResponse({ success: false, error: 'Session not found' });
          return;
        }
        const promptText = generateResumePrompt(session);
        routeToplatform(message.targetPlatform, promptText).then((result) => {
          sendResponse(result);
        });
      });
      return true;
    }

    case 'GET_CRITIQUE_PROMPT': {
      // Generate a critique prompt without routing
      getSessions().then((sessions) => {
        const session = sessions.find((s) => s.id === message.sessionId);
        if (session) {
          sendResponse({ prompt: generateCritiquePrompt(session, message.targetPlatform) });
        } else {
          sendResponse({ prompt: null, error: 'Session not found' });
        }
      });
      return true;
    }

    case 'ROUTE_CRITIQUE': {
      // Generate critique prompt and route to target platform
      getSessions().then((sessions) => {
        const session = sessions.find((s) => s.id === message.sessionId);
        if (!session) {
          sendResponse({ success: false, error: 'Session not found' });
          return;
        }
        const critiqueText = generateCritiquePrompt(session, message.targetPlatform);
        routeToplatform(message.targetPlatform, critiqueText).then((result) => {
          sendResponse(result);
        });
      });
      return true;
    }

    case 'TRIGGER_CAPTURE': {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'CAPTURE_NOW' }, (response) => {
            sendResponse(response || { error: 'No response from content script' });
          });
        } else {
          sendResponse({ error: 'No active tab found' });
        }
      });
      return true;
    }

    case 'GET_PLATFORM_INFO': {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0]?.url || '';
        let platform = null;
        if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) platform = 'chatgpt';
        else if (url.includes('claude.ai')) platform = 'claude';
        else if (url.includes('gemini.google.com')) platform = 'gemini';
        else if (url.includes('perplexity.ai')) platform = 'perplexity';
        else if (url.includes('chat.deepseek.com')) platform = 'deepseek';
        sendResponse({ platform, url: tabs[0]?.url });
      });
      return true;
    }
  }
});

// ─── Init ───────────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  getSessions().then((sessions) => {
    updateBadge(sessions.length);
  });
  console.log('ContextBridge v2.0 installed — routing, critique, and 5-platform support ready.');
});

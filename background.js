// ContextBridge — Background Service Worker (MV3)
// Handles session storage, resume prompt generation, and message routing.

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
Read this carefully — it contains all decisions, code, requirements, and context.

${messagesBlock}

=== RESUME INSTRUCTIONS ===
You are now the assistant continuing this conversation. Follow these rules strictly:

1. CONTINUITY: All context, decisions, code snippets, architectural choices, naming conventions, 
   and agreements from the conversation above are established facts. Do NOT re-explain, 
   re-introduce, or contradict them.

2. STYLE MATCHING: Match the technical depth, tone, verbosity, and formatting style the 
   previous assistant used. If it gave detailed code examples, you should too.

3. CONTEXT AWARENESS: You have full knowledge of everything discussed above. Reference 
   specific earlier decisions when relevant. Use the same variable names, function names, 
   and terminology.

4. NO INTRODUCTIONS: Do not say "Hello" or introduce yourself. 
   Do not summarize the conversation unless the user asks. Simply continue naturally.

5. CODE CONVENTIONS: If code was written above, continue using the same language, framework,
   naming conventions, file structure, import patterns, and error handling patterns.

6. UNFINISHED WORK: If the last assistant response was mid-task or promised follow-up, 
   acknowledge that and continue from that exact point.

7. ASSUME FULL CONTEXT: Never say "I don't have context about..." — you DO have full 
   context from the conversation history above.

The user's next message continues directly from the last [USER] turn above.
=== END CONTEXTBRIDGE ===`;
}

// ─── Storage Helpers ────────────────────────────────────────────────────────────

async function getSessions() {
  const result = await chrome.storage.local.get('sessions');
  return result.sessions || [];
}

async function saveSession(session) {
  const sessions = await getSessions();
  // Check for duplicates by id
  const existingIndex = sessions.findIndex((s) => s.id === session.id);
  if (existingIndex >= 0) {
    sessions[existingIndex] = session;
  } else {
    sessions.unshift(session); // newest first
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

// ─── Message Listener ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'SAVE_SESSION': {
      saveSession(message.session).then((saved) => {
        sendResponse({ success: true, session: saved });
      });
      return true; // async response
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

    case 'TRIGGER_CAPTURE': {
      // Forward capture command to the content script in the active tab
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
      // Check if the current tab is on a supported platform
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0]?.url || '';
        let platform = null;
        if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) platform = 'chatgpt';
        else if (url.includes('claude.ai')) platform = 'claude';
        else if (url.includes('gemini.google.com')) platform = 'gemini';
        else if (url.includes('perplexity.ai')) platform = 'perplexity';
        else if (url.includes('copilot.microsoft.com')) platform = 'copilot';
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
  console.log('ContextBridge installed — ready to bridge your AI context.');
});

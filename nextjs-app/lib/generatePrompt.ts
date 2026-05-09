import { Session, Message, PLATFORM_META, PlatformType } from './types';

/**
 * Extracts key context signals from the conversation:
 * - Programming languages / frameworks mentioned
 * - Key decisions that were made
 * - The current task / what was being worked on
 * - Files or project structure discussed
 * - Unresolved questions or next steps
 */
function extractContextSignals(messages: Message[]) {
  const allText = messages.map((m) => m.text).join('\n');

  // Detect programming languages & frameworks
  const techPatterns: Record<string, RegExp> = {
    JavaScript: /\b(javascript|\.js|node\.?js|npm|yarn|express|react|next\.?js|vue|angular|svelte)\b/i,
    TypeScript: /\b(typescript|\.tsx?|tsc)\b/i,
    Python: /\b(python|\.py|pip|django|flask|fastapi|pandas|numpy|pytorch|tensorflow)\b/i,
    Rust: /\b(rust|cargo|\.rs)\b/i,
    Go: /\b(golang|go\.mod|\.go)\b/i,
    Java: /\b(java(?!script)|\.java|spring|maven|gradle)\b/i,
    'C#': /\b(c#|csharp|\.cs|dotnet|\.net|asp\.net)\b/i,
    'C/C++': /\b(c\+\+|cpp|\.cpp|\.c\b|cmake|gcc|clang)\b/i,
    Ruby: /\b(ruby|\.rb|rails|gem)\b/i,
    PHP: /\b(php|laravel|symfony|composer)\b/i,
    SQL: /\b(sql|postgres|mysql|sqlite|bigquery|prisma|sequelize|drizzle)\b/i,
    Shell: /\b(bash|shell|\.sh|zsh|powershell)\b/i,
    Docker: /\b(docker|dockerfile|container|kubernetes|k8s)\b/i,
    CSS: /\b(css|scss|sass|tailwind|styled-components)\b/i,
    HTML: /\b(html|dom|jsx|tsx)\b/i,
  };

  const detectedTech: string[] = [];
  for (const [name, pattern] of Object.entries(techPatterns)) {
    if (pattern.test(allText)) {
      detectedTech.push(name);
    }
  }

  // Extract file paths and project structure mentions
  const filePatterns = allText.match(/(?:^|\s)([\w\-./]+\.\w{1,6})(?:\s|$|:|,|\))/gm) || [];
  const files = [...new Set(
    filePatterns
      .map((f) => f.trim().replace(/[,:)]/g, ''))
      .filter((f) => f.includes('.') && !f.startsWith('http') && f.length < 80)
  )].slice(0, 15);

  // Detect the last topic / current task from the last few user messages
  const lastUserMessages = messages
    .filter((m) => m.role === 'user')
    .slice(-3)
    .map((m) => m.text);

  // Detect what the last assistant response was doing
  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');

  return {
    technologies: detectedTech,
    files,
    lastUserMessages,
    lastAssistantResponse: lastAssistantMsg?.text || '',
    totalUserMessages: messages.filter((m) => m.role === 'user').length,
    totalAssistantMessages: messages.filter((m) => m.role === 'assistant').length,
  };
}

/**
 * Generates a ContextBridge Resume Prompt from a captured session.
 * This is the portable context block that can be pasted into any AI platform.
 * Contains ALL information needed for seamless continuation.
 */
export function generateResumePrompt(session: Session): string {
  const dateStr = new Date(session.capturedAt).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const signals = extractContextSignals(session.messages);
  const platformLabel = PLATFORM_META[session.platform as PlatformType]?.label || session.platform;

  const messagesBlock = session.messages
    .map((m, i) => {
      const role = m.role === 'user' ? 'USER' : 'ASSISTANT';
      return `[${role}] (message ${i + 1}/${session.msgCount}):\n${m.text}`;
    })
    .join('\n\n---\n\n');

  const summary =
    session.summary || '(No AI-generated summary — full conversation included below)';

  // Build technology context section
  const techSection = signals.technologies.length > 0
    ? `Technologies    : ${signals.technologies.join(', ')}`
    : '';

  // Build files section
  const filesSection = signals.files.length > 0
    ? `Files Discussed : ${signals.files.join(', ')}`
    : '';

  // Build the current task context from last user messages
  const currentContext = signals.lastUserMessages.length > 0
    ? signals.lastUserMessages[signals.lastUserMessages.length - 1].slice(0, 300)
    : '';

  const currentTaskSection = currentContext
    ? `\nLast User Request (abbreviated):\n"${currentContext}${currentContext.length >= 300 ? '...' : ''}"`
    : '';

  return `=== CONTEXTBRIDGE TRANSFER ===
You are receiving a full conversation history from another AI platform.
Your job is to seamlessly continue this conversation as if you were the original assistant.
Read ALL context below before responding.

=== SESSION METADATA ===
Source Platform  : ${platformLabel}
Source URL       : ${session.url}
Topic            : ${session.title}
Captured         : ${dateStr}
Total Messages   : ${session.msgCount} (${signals.totalUserMessages} user, ${signals.totalAssistantMessages} assistant)
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
   previous assistant used. If it gave detailed code examples, you should too. If it was 
   concise, be concise.

3. CONTEXT AWARENESS: You have full knowledge of everything discussed above. Reference 
   specific earlier decisions when relevant. Use the same variable names, function names, 
   and terminology.

4. NO INTRODUCTIONS: Do not say "Hello", "Sure!", "Of course!", or introduce yourself. 
   Do not summarize the conversation unless the user asks. Simply continue naturally.

5. CODE CONVENTIONS: If code was written above, continue using the same:
   - Language and framework
   - Naming conventions (camelCase, snake_case, etc.)
   - File structure and import patterns
   - Error handling patterns
   - Testing approach (if established)

6. UNFINISHED WORK: If the last assistant response was mid-task or promised follow-up, 
   acknowledge that and continue from that exact point.

7. ASSUME FULL CONTEXT: Never say "I don't have context about..." — you DO have full 
   context from the conversation history above.

The user's next message continues directly from the last [USER] turn above.
=== END CONTEXTBRIDGE ===`;
}

/**
 * Generates a compact resume prompt (first 2 + last 4 messages)
 * for conversations that are too long, while preserving all critical context.
 */
export function generateCompactPrompt(session: Session): string {
  const dateStr = new Date(session.capturedAt).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const signals = extractContextSignals(session.messages);
  const platformLabel = PLATFORM_META[session.platform as PlatformType]?.label || session.platform;

  let selectedMessages = session.messages;
  let truncationNote = '';

  if (session.messages.length > 6) {
    const first2 = session.messages.slice(0, 2);
    const last4 = session.messages.slice(-4);
    selectedMessages = [...first2, ...last4];
    const skipped = session.messages.length - 6;
    truncationNote = `\n\n[... ${skipped} intermediate messages omitted — the conversation evolved through multiple iterations on the topic above. Key decisions and context from those messages are reflected in the later messages below ...]\n`;
  }

  const firstBlock = selectedMessages
    .slice(0, Math.min(2, selectedMessages.length))
    .map((m, i) => `[${m.role === 'user' ? 'USER' : 'ASSISTANT'}]:\n${m.text}`)
    .join('\n\n---\n\n');

  const lastBlock = selectedMessages.length > 2
    ? selectedMessages
        .slice(2)
        .map((m) => `[${m.role === 'user' ? 'USER' : 'ASSISTANT'}]:\n${m.text}`)
        .join('\n\n---\n\n')
    : '';

  const summary =
    session.summary || '(No AI-generated summary — key messages included below)';

  const techSection = signals.technologies.length > 0
    ? `Technologies    : ${signals.technologies.join(', ')}`
    : '';

  const filesSection = signals.files.length > 0
    ? `Files Discussed : ${signals.files.join(', ')}`
    : '';

  return `=== CONTEXTBRIDGE TRANSFER (COMPACT) ===
You are receiving a condensed conversation history from another AI platform.
Your job is to seamlessly continue this conversation.

=== SESSION METADATA ===
Source Platform  : ${platformLabel}
Source URL       : ${session.url}
Topic            : ${session.title}
Captured         : ${dateStr}
Total Messages   : ${session.msgCount} (showing ${selectedMessages.length} key messages)
${techSection}
${filesSection}

=== CONTEXT SUMMARY ===
${summary}

=== KEY CONVERSATION EXCERPTS ===
Opening messages (how the conversation started):

${firstBlock}
${truncationNote}
Most recent messages (current state of the conversation):

${lastBlock}

=== RESUME INSTRUCTIONS ===
You are now the assistant continuing this conversation. Follow these rules:

1. All context, decisions, and code from above are established — do NOT re-explain them
2. Match the previous assistant's technical depth, style, and formatting
3. Use the same variable names, conventions, and terminology from the conversation
4. Do NOT introduce yourself or summarize — just continue naturally
5. The user's next message continues from the last [USER] turn above
6. Never say "I don't have context" — you have the key excerpts above plus the summary
7. If code conventions were established, continue using them exactly

=== END CONTEXTBRIDGE ===`;
}

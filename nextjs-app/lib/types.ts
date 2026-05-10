export interface Message {
  role: 'user' | 'assistant';
  text: string;
  platform: string;
}

export interface Session {
  id: string;
  platform: string;
  title: string;
  messages: Message[];
  capturedAt: string;
  url: string;
  msgCount: number;
  summary?: string;
}

export type PlatformType = 'chatgpt' | 'claude' | 'gemini' | 'perplexity' | 'deepseek';

export const PLATFORM_META: Record<PlatformType, { label: string; color: string; icon: string; url: string }> = {
  chatgpt: {
    label: 'ChatGPT',
    color: '#10a37f',
    icon: '🤖',
    url: 'https://chatgpt.com',
  },
  claude: {
    label: 'Claude',
    color: '#d97706',
    icon: '🧠',
    url: 'https://claude.ai',
  },
  gemini: {
    label: 'Gemini',
    color: '#4285f4',
    icon: '✨',
    url: 'https://gemini.google.com',
  },
  perplexity: {
    label: 'Perplexity',
    color: '#20b8cd',
    icon: '🔍',
    url: 'https://perplexity.ai',
  },
  deepseek: {
    label: 'DeepSeek',
    color: '#4D6BFE',
    icon: '🔮',
    url: 'https://chat.deepseek.com',
  },
};

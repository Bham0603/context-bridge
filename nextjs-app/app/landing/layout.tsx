import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ContextBridge — Switch AI Platforms Without Starting Over',
  description:
    'Free Chrome extension to capture, route, and critique AI conversations across ChatGPT, Claude, Gemini, Perplexity & DeepSeek. Never lose context again.',
  openGraph: {
    title: 'ContextBridge — Switch AI Platforms Without Starting Over',
    description:
      'Free Chrome extension to capture, route, and critique AI conversations across ChatGPT, Claude, Gemini, Perplexity & DeepSeek.',
    type: 'website',
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ContextBridge — Dashboard',
  description: 'Switch AI platforms without starting over. Manage captured sessions, generate resume prompts, and maintain continuity across ChatGPT, Claude, Gemini, and more.',
  openGraph: {
    title: 'ContextBridge Dashboard',
    description: 'Switch AI platforms without starting over.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

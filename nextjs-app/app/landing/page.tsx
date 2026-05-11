'use client';

import { useEffect } from 'react';
import './landing.css';

function BridgeLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <circle cx="5" cy="14" r="4" fill="#1a9a8a" opacity="0.9" />
      <circle cx="23" cy="14" r="4" fill="#1a9a8a" opacity="0.5" />
      <path d="M9 14 C 14 6, 14 6, 19 14" stroke="#1a9a8a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M9 14 C 14 22, 14 22, 19 14" stroke="#1a9a8a" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.3" />
    </svg>
  );
}

export default function LandingPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('v'); }),
      { threshold: 0.12 }
    );
    document.querySelectorAll('.rv').forEach((el) => observer.observe(el));

    const nav = document.getElementById('main-nav');
    const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener('scroll', onScroll); };
  }, []);

  return (
    <>
      {/* ═══ NAV ═══ */}
      <nav className="nav" id="main-nav">
        <div className="nav-left">
          <BridgeLogo />
          <span className="nav-logo">contextbridge</span>
        </div>
        <div className="nav-right">
          <a href="#features" className="nav-pill hide-mobile">Features</a>
          <a href="#install" className="nav-pill primary">Download</a>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="hero">
        <div className="hero-bg" aria-hidden="true" />
        <h1 className="rv">
          Context transfer<br />
          is <em>here.</em>
        </h1>
        <p className="hero-sub rv rv-d1">
          Switch between ChatGPT, Claude, Gemini, Perplexity &amp; DeepSeek
          without losing a single message.
        </p>
        <div className="hero-actions rv rv-d2">
          <a href="#install" className="btn-download">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download for Chrome
          </a>
          <a href="#features" className="btn-outline">Learn more</a>
        </div>
        <p className="hero-note rv rv-d3">
          Free &amp; open source. Works with 5 AI platforms.
        </p>
      </section>

      {/* ═══ PLATFORMS ═══ */}
      <div className="platforms rv">
        {[
          { name: 'ChatGPT', color: '#10a37f' },
          { name: 'Claude', color: '#d97706' },
          { name: 'Gemini', color: '#4285f4' },
          { name: 'Perplexity', color: '#20b8cd' },
          { name: 'DeepSeek', color: '#4D6BFE' },
        ].map((p) => (
          <span key={p.name} className="platform">
            <span className="pdot" style={{ background: p.color }} />
            {p.name}
          </span>
        ))}
      </div>

      {/* ═══ FEATURES ═══ */}
      <section className="features" id="features">

        {/* Card 1: Context Capture — wide with demo */}
        <div className="fcard wide rv">
          <div className="fcard-content">
            <span className="fcard-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              One click
            </span>
            <h3>Capture any conversation</h3>
            <p>
              One click captures your entire AI conversation — every message,
              code block, decision, and context signal — packaged for seamless transfer.
            </p>
          </div>
          <div className="fcard-demo">
            <div className="fcard-demo-box">
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>Route to any AI</div>
              <div className="demo-platforms">
                {[
                  { name: 'ChatGPT', color: '#10a37f' },
                  { name: 'Claude', color: '#d97706' },
                  { name: 'Gemini', color: '#4285f4' },
                ].map((p) => (
                  <span key={p.name} className="demo-chip">
                    <span className="pdot" style={{ background: p.color }} />
                    {p.name}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(26,154,138,0.08)', border: '1px solid rgba(26,154,138,0.15)', fontSize: '12px', color: 'var(--teal)', fontFamily: 'var(--sans)' }}>
                ✓ Context preserved · Resume prompt ready
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Smart Resume Prompts */}
        <div className="fcard rv">
          <div className="fcard-visual" aria-hidden="true" />
          <div className="fcard-content">
            <span className="fcard-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Structured
            </span>
            <h3>Smart resume prompts</h3>
            <p>
              Auto-generated prompts that carry your full context — tech stack,
              file references, decisions, and conversation history — so the next AI
              picks up exactly where you left off.
            </p>
          </div>
        </div>

        {/* Two-column grid: Routing + Critique */}
        <div className="fgrid">
          <div className="fcard rv">
            <div className="fcard-content">
              <span className="fcard-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                Instant
              </span>
              <h3>Multi-tab routing</h3>
              <p>
                Route your conversation to any AI platform in one click.
                Opens the target, injects context, ready to continue.
              </p>
            </div>
          </div>

          <div className="fcard rv rv-d1">
            <div className="fcard-content">
              <span className="fcard-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Second opinion
              </span>
              <h3>Cross-AI critique</h3>
              <p>
                Send any AI&apos;s response to a rival for expert analysis across
                accuracy, reasoning, and code quality.
              </p>
            </div>
          </div>
        </div>

        {/* Two-column grid: Signals + Privacy */}
        <div className="fgrid">
          <div className="fcard rv">
            <div className="fcard-content">
              <span className="fcard-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                Automatic
              </span>
              <h3>Context signals</h3>
              <p>
                Detects technologies, file references, and patterns automatically
                to create rich metadata for every session.
              </p>
            </div>
          </div>

          <div className="fcard rv rv-d1">
            <div className="fcard-content">
              <span className="fcard-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Local only
              </span>
              <h3>Privacy first</h3>
              <p>
                No cloud sync. No telemetry. No third-party servers.
                Everything stays in your browser.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="how-section" id="how">
        <h2 className="how-title rv">Three steps. <em>That&apos;s it.</em></h2>
        <div className="how-steps">
          {[
            { n: '1', title: 'Capture', desc: 'Visit any supported AI and click the ContextBridge button. Your full conversation is captured with all context.' },
            { n: '2', title: 'Route', desc: 'Choose where to continue — ChatGPT, Claude, Gemini, Perplexity, or DeepSeek. One click opens the target AI.' },
            { n: '3', title: 'Continue', desc: 'The resume prompt is injected automatically. The new AI has your full context. Just keep going.' },
          ].map((s, i) => (
            <div key={i} className={`how-step rv rv-d${i + 1}`}>
              <div className="how-num">{s.n}</div>
              <div className="how-text">
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="cta" id="install">
        <div className="cta-bg" aria-hidden="true" />
        <div className="cta-icon rv">
          <BridgeLogo size={48} />
        </div>
        <h2 className="rv rv-d1">Available <em>now.</em></h2>
        <p className="cta-sub rv rv-d2">
          Free Chrome extension. One download,<br />
          all your AI platforms connected.
        </p>
        <div className="cta-actions rv rv-d3">
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="btn-download">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download for Chrome
          </a>
          <a href="#how" className="btn-outline">Set-up Guide</a>
        </div>
        <p className="cta-req rv">Chrome or Chromium-based browser required.</p>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="footer">
        <span>© 2026 ContextBridge</span>
        <span>Chrome Extension for AI Workflows</span>
        <div className="footer-links">
          <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="#features">Features</a>
        </div>
      </footer>
    </>
  );
}

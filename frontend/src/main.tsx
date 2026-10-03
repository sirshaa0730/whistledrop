import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Home } from './pages/Home';
import { Submit } from './pages/Submit';
import { Track } from './pages/Track';
import { Moderator } from './pages/Moderator';
import { Privacy } from './pages/Privacy';
import { Security } from './pages/Security';
import './style.css';

type Page = 'home' | 'submit' | 'track' | 'moderator' | 'privacy' | 'security';
const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

function App() {
  const [page, setPage] = useState<Page>('home');
  const [trackCode, setTrackCode] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  function navigate(next: Page) {
    setPage(next); setMenuOpen(false); window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function trackCase(code: string) {
    setTrackCode(code); navigate('track');
  }

  return <div className="app-frame">
    <header className="site-header">
      <div className="header-inner">
        <button className="brand-button" onClick={() => navigate('home')} aria-label="WhistleDrop home">
          <BrandMark />
          <span>WhistleDrop</span>
        </button>
        <button className="menu-toggle" aria-expanded={menuOpen} aria-controls="site-navigation" onClick={() => setMenuOpen(!menuOpen)}><span className="sr-only">{menuOpen ? 'Close' : 'Open'} navigation</span><span aria-hidden="true">{menuOpen ? '×' : '☰'}</span></button>
        <nav id="site-navigation" className={`site-navigation${menuOpen ? ' is-open' : ''}`} aria-label="Main navigation">
          <button className={page === 'submit' ? 'nav-active' : ''} onClick={() => navigate('submit')}>Submit report</button>
          <button className={page === 'track' ? 'nav-active' : ''} onClick={() => navigate('track')}>Track report</button>
          <a href={`${apiBase}/docs`} target="_blank" rel="noreferrer">API docs <span aria-hidden="true">↗</span></a>
          <button className="nav-moderator" onClick={() => navigate('moderator')}>Moderator access</button>
        </nav>
      </div>
    </header>

    <main className={`page-main page-${page}`}>
      {page === 'home' && <Home go={next => navigate(next)} />}
      {page === 'submit' && <Submit onTrack={trackCase} />}
      {page === 'track' && <Track initialCode={trackCode} />}
      {page === 'moderator' && <Moderator />}
      {page === 'privacy' && <Privacy />}
      {page === 'security' && <Security />}
    </main>

    <footer className="site-footer">
      <div className="footer-main"><div className="footer-brand"><button className="brand-button" onClick={() => navigate('home')}><BrandMark small /><span>WhistleDrop</span></button><p>Privacy-first anonymous reporting.</p></div>
        <nav className="footer-links" aria-label="Footer navigation"><button onClick={() => navigate('submit')}>Submit report</button><button onClick={() => navigate('track')}>Track report</button><button onClick={() => navigate('privacy')}>Privacy</button><button onClick={() => navigate('security')}>Security</button><a href={`${apiBase}/docs`} target="_blank" rel="noreferrer">API documentation <span aria-hidden="true">↗</span></a></nav>
      </div><div className="footer-bottom"><span>WhistleDrop</span><span>Share only what you feel safe sharing.</span></div>
    </footer>
  </div>;
}

function BrandMark({ small = false }: { small?: boolean }) {
  return <svg className={`brand-mark${small ? ' small-mark' : ''}`} viewBox="0 0 34 34" aria-hidden="true"><path d="M17 3.5C13 9 7.5 14.6 7.5 20.1a9.5 9.5 0 0 0 19 0C26.5 14.6 21 9 17 3.5Z"/><path d="M12.1 21.4c.5 2.1 2 3.5 4.2 3.9M18.8 12.7l2.7 1.7"/></svg>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

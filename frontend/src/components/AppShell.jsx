import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  FileCheck2,
  FileCog,
  FileSearch2,
  Sparkles,
  Home,
  Menu,
  X,
  Settings,
} from 'lucide-react';

const links = [
  { to: '/', label: 'Overview', icon: Home },
  { to: '/jd-checker', label: 'JD Checker', icon: FileCheck2 },
  { to: '/resume-screener', label: 'Resume Screener', icon: FileSearch2 },
  { to: '/resume-optimizer', label: 'Resume Optimizer', icon: FileCog },
  { to: '/ai-suggester', label: 'AI Suggester', icon: Sparkles },
];

export default function AppShell({ children }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink className="brand" to="/" onClick={() => setOpen(false)}>
          <span className="brand-mark">V</span>
          <span className="brand-name"><b>Vee</b>Bee</span>
        </NavLink>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {links.filter((x) => x.to !== '/').map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="top-actions">
          <button type="button" className="ghost-pill hide-mobile" onClick={() => navigate('/')}>
            <span>⌘ K</span>
          </button>
          <a
            className="icon-link hide-mobile github-link"
            href="https://github.com/DMSVIKAS/DMSVIKAS"
            target="_blank"
            rel="noreferrer"
            aria-label="Open GitHub"
          >
            GH
          </a>
          <button type="button" className="gradient-btn compact" onClick={() => navigate('/jd-checker')}>
            Start analysis <ArrowUpRight size={17} />
          </button>
          <button type="button" className="menu-btn" onClick={() => setOpen(!open)} aria-label="Toggle navigation">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {open && (
        <div className="mobile-drawer">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)} className="mobile-link">
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
          <div className="mobile-link muted-link"><Settings size={17} /> Settings</div>
        </div>
      )}

      <main>{children}</main>

      {location.pathname !== '/' && (
        <footer className="footer">
          <div>
            <div className="brand footer-brand">
              <span className="brand-mark small">V</span>
              <span className="brand-name"><b>Vee</b>Bee</span>
            </div>
            <p>AI resume intelligence for candidates who want more than a generic score.</p>
          </div>
          <div className="footer-meta">
            <span>Evidence-first</span>
            <span>API-ready</span>
            <span>© 2026 VeeBee</span>
          </div>
        </footer>
      )}
    </div>
  );
}

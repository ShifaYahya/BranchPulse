import { useState, type ReactNode } from 'react';
import { Logo } from './Logo';
import { IMenu, IX } from './Icons';
import { useStore } from '../lib/store';

const APP_NAV = [
  { path: '/overview', label: 'Overview' },
  { path: '/explain', label: 'Explain' },
  { path: '/compare', label: 'Compare' },
  { path: '/actions', label: 'Actions' },
  { path: '/records', label: 'Records' },
  { path: '/data', label: 'Data' },
  { path: '/settings', label: 'Settings' },
];

const SITE_NAV = [
  { path: '/how', label: 'How it works' },
  { path: '/guide', label: 'File guide' },
  { path: '/privacy', label: 'Privacy' },
];

export const APP_PATHS = APP_NAV.map((n) => n.path);

export function Header({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  const { hasData, ws } = useStore();
  const inApp = APP_PATHS.includes(path);
  const items = inApp ? APP_NAV : SITE_NAV;
  const openTasks = ws.actions.filter((a) => a.status !== 'done').length;

  return (
    <header className="site-header">
      <div className="container">
        <Logo />
        <nav className="nav" aria-label="Main">
          {items.map((n) => (
            <a key={n.path} href={`#${n.path}`} className={path === n.path ? 'active' : ''}>
              {n.label}
              {n.path === '/actions' && openTasks > 0 && (
                <span className="pill pill-lime" style={{ marginLeft: 6, padding: '0 7px', fontSize: 11.5 }}>
                  {openTasks}
                </span>
              )}
            </a>
          ))}
        </nav>
        <div className="header-end">
          {!inApp && (
            <a className="btn btn-primary btn-sm" href={hasData ? '#/overview' : '#/data'}>
              {hasData ? 'Open dashboard' : 'Start free'}
            </a>
          )}
          {inApp && ws.settings.businessName && (
            <span className="pill hide-sm" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {ws.settings.businessName}
            </span>
          )}
          <button className="btn btn-quiet menu-btn" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
            {open ? <IX /> : <IMenu />}
          </button>
        </div>
      </div>
      <nav className={`mobile-nav ${open ? 'open' : ''}`} aria-label="Mobile">
        {(inApp ? APP_NAV : [...SITE_NAV, { path: '/overview', label: 'Dashboard' }]).map((n) => (
          <a key={n.path} href={`#${n.path}`} className={path === n.path ? 'active' : ''} onClick={() => setOpen(false)}>
            {n.label}
          </a>
        ))}
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer no-print">
      <div className="container row between" style={{ alignItems: 'flex-start', gap: 28 }}>
        <div style={{ maxWidth: 360 }}>
          <Logo />
          <p className="small muted" style={{ marginTop: 10 }}>
            Plain-English explanations of branch performance, backed by your own records. Your files stay in your browser.
          </p>
        </div>
        <div className="row" style={{ gap: 40, alignItems: 'flex-start' }}>
          <div className="stack small" style={{ ['--gap' as string]: '8px' }}>
            <strong>Product</strong>
            <a href="#/overview">Dashboard</a>
            <a href="#/explain">Explain a branch</a>
            <a href="#/actions">Action tracker</a>
          </div>
          <div className="stack small" style={{ ['--gap' as string]: '8px' }}>
            <strong>Help</strong>
            <a href="#/how">How it works</a>
            <a href="#/guide">File guide</a>
            <a href="#/privacy">Privacy</a>
          </div>
        </div>
      </div>
      <div className="container tiny faint" style={{ marginTop: 26 }}>
        © {new Date().getFullYear()} BranchPulse. Estimates are based on the data you provide and are meant to guide decisions, not replace your judgement.
      </div>
    </footer>
  );
}

export function Page({ title, intro, actions, children }: { title: string; intro?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="page">
      <div className="container">
        <div className="page-head">
          <div>
            <h1>{title}</h1>
            {intro && <p>{intro}</p>}
          </div>
          {actions && <div className="row no-print">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

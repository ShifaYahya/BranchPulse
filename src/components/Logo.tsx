export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#111614" />
      <rect x="12" y="38" width="7" height="14" rx="2" fill="#3d4a43" />
      <rect x="23" y="30" width="7" height="22" rx="2" fill="#3d4a43" />
      <rect x="34" y="34" width="7" height="18" rx="2" fill="#e2552f" />
      <rect x="45" y="22" width="7" height="30" rx="2" fill="#3d4a43" />
      <path d="M8 24h11l5-10 7 20 5-10h20" stroke="#c6f25a" strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <a className="brand" href="#/" aria-label="BranchPulse home">
      <LogoMark />
      <span>
        Branch<span style={{ color: 'var(--forest-2)' }}>Pulse</span>
      </span>
    </a>
  );
}

export default function Icon({ kind }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (kind === 'dashboard') return <svg {...common}><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/></svg>;
  if (kind === 'users') return <svg {...common}><path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1"/><circle cx="9" cy="7" r="3"/><path d="M22 19v-1a4 4 0 0 0-3-3.87"/><path d="M16 3.13a3 3 0 0 1 0 5.74"/></svg>;
  if (kind === 'resorts') return <svg {...common}><path d="M3 21h18"/><path d="M5 21V9l7-4 7 4v12"/><path d="M9 14h6"/></svg>;
  if (kind === 'feeds') return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10"/><path d="M7 12h10"/><path d="M7 16h6"/></svg>;
  if (kind === 'reels') return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m9 9 6 3-6 3z"/></svg>;
  if (kind === 'map') return <svg {...common}><path d="M12 22s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>;
  if (kind === 'tables') return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M9 4v16"/></svg>;
  if (kind === 'logs') return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16l4-3 4 3 4-3 4 3V8z"/><path d="M14 2v6h6"/></svg>;
  if (kind === 'settings') return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V22a2 2 0 1 1-4 0v-.08a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H2a2 2 0 1 1 0-4h.08a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.55V2a2 2 0 1 1 4 0v.08a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H22a2 2 0 1 1 0 4h-.08a1.7 1.7 0 0 0-1.55 1z"/></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="3"/></svg>;
}

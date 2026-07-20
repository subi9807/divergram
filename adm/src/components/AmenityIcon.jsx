export default function AmenityIcon({ kind }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  switch (kind) {
    case 'wifi':
      return <svg {...common}><path d="M5 8a14 14 0 0 1 14 0"/><path d="M8.5 11.5a9 9 0 0 1 7 0"/><path d="M12 15h0"/><path d="M2.5 5.5a19 19 0 0 1 19 0"/></svg>;
    case 'parking':
      return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg>;
    case 'shower':
      return <svg {...common}><path d="M12 3c2.5 3 4 4.7 4 7a4 4 0 1 1-8 0c0-2.3 1.5-4 4-7z"/><path d="M5 18c2.2-1.3 4.5-2 7-2s4.8.7 7 2"/></svg>;
    case 'locker':
      return <svg {...common}><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 4v16"/><path d="M9 12h4"/></svg>;
    case 'towel':
      return <svg {...common}><path d="M7 4h10v16H7z"/><path d="M9 7h6"/><path d="M9 11h6"/><path d="M9 15h4"/></svg>;
    case 'gear':
      return <svg {...common}><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M4.9 4.9l2.1 2.1"/><path d="M17 17l2.1 2.1"/><path d="M2 12h3"/><path d="M19 12h3"/><path d="M4.9 19.1 7 17"/><path d="M17 7l2.1-2.1"/></svg>;
    case 'dive':
      return <svg {...common}><path d="M12 3v18"/><path d="M3 12h18"/><path d="M7 7h10v10H7z"/></svg>;
    case 'food':
      return <svg {...common}><path d="M6 4v8"/><path d="M9 4v8"/><path d="M6 8h3"/><path d="M12 4v16"/><path d="M17 4h3l-1 16h-2z"/></svg>;
    case 'wellness':
      return <svg {...common}><path d="M12 5a7 7 0 1 0 7 7"/><path d="M12 2v4"/><path d="M8 4.5l2 3"/><path d="M16 4.5l-2 3"/></svg>;
    case 'fitness':
      return <svg {...common}><path d="M5 9v6"/><path d="M19 9v6"/><path d="M8 8v8"/><path d="M16 8v8"/><path d="M8 12h8"/></svg>;
    case 'water':
      return <svg {...common}><path d="M4 17c3-2 5-3 8-3s5 .7 8 3"/><path d="M7 14c2-4 4-6 5-10 1 4 3 6 5 10"/><path d="M12 4v3"/></svg>;
    case 'boat':
      return <svg {...common}><path d="M3 15h18l-2 4H5z"/><path d="M6 15V8h8l4 4"/><path d="M12 8v7"/></svg>;
    case 'shuttle':
      return <svg {...common}><path d="M5 17h14"/><path d="M7 17v-5h10v5"/><path d="M8 12 12 7l4 5"/><circle cx="8" cy="17" r="1.5"/><circle cx="16" cy="17" r="1.5"/></svg>;
    case 'room':
      return <svg {...common}><rect x="4" y="5" width="16" height="12" rx="2"/><path d="M8 17v2"/><path d="M16 17v2"/><path d="M8 9h8"/><path d="M8 12h5"/></svg>;
    case 'camera':
      return <svg {...common}><rect x="5" y="7" width="14" height="10" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M7 7l1-2h8l1 2"/></svg>;
    case 'family':
      return <svg {...common}><circle cx="8" cy="7" r="2"/><circle cx="16" cy="7" r="2"/><path d="M8 9v8"/><path d="M16 9v8"/><path d="M5 12h14"/><path d="M10 15a4 4 0 0 0 4 0"/></svg>;
    case 'safety':
      return <svg {...common}><path d="M12 2 4 6v6c0 5 4 8 8 10 4-2 8-5 8-10V6z"/><path d="M12 7v6"/><path d="M9 10h6"/></svg>;
    case 'tour':
      return <svg {...common}><path d="M6 19h12"/><path d="M8 17V7l5 3 3-2v11"/><path d="M6 7h2"/><path d="M14 6h4"/></svg>;
    case 'smoke':
      return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M7 7l10 10"/><path d="M9 14c1.5-1 1.5-3 0-4s-1.5-3 0-4"/></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="4"/></svg>;
  }
}

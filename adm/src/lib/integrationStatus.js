const priority = { degraded: 0, not_configured: 1, configured: 2, operational: 3 };
export function serviceHealth(serviceId, rows) {
  const matches = rows.filter(row => row.id === serviceId || (serviceId === 'infobip' && row.id.startsWith('infobip-')));
  if (!matches.length) return null;
  const worst = [...matches].sort((a, b) => (priority[a.status] ?? 0) - (priority[b.status] ?? 0))[0];
  return { ...worst, detail: matches.map(row => matches.length > 1 ? `${row.name}: ${row.detail}` : row.detail).join(' · ') };
}

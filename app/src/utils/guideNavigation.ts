export async function getGuideNeighbors<T extends { id: string; title: string }>(
  id: string,
  fetchPage: (offset: number) => Promise<{ data: T[]; nextOffset: number | null }>,
) {
  const rows: T[] = [];
  const seen = new Set<string>();
  let offset = 0;
  while (true) {
    const page = await fetchPage(offset);
    for (const row of page.data) {
      if (!seen.has(row.id)) { seen.add(row.id); rows.push(row); }
    }
    const index = rows.findIndex(row => row.id === id);
    const ended = page.nextOffset === null || page.nextOffset <= offset;
    if ((index >= 0 && index < rows.length - 1) || ended) {
      return { previous: index > 0 ? rows[index - 1] : null, next: index >= 0 ? rows[index + 1] ?? null : null };
    }
    offset = page.nextOffset!;
  }
}

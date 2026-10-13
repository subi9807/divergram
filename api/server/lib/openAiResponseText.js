export function extractOpenAiResponseText(payload) {
  const direct = String(payload?.output_text || '').trim();
  if (direct) return direct;

  const parts = [];
  for (const output of Array.isArray(payload?.output) ? payload.output : []) {
    for (const content of Array.isArray(output?.content) ? output.content : []) {
      if (content?.type !== 'output_text' && content?.type !== 'text') continue;
      const text = String(content?.text || '').trim();
      if (text) parts.push(text);
    }
  }
  return parts.join('\n').trim();
}

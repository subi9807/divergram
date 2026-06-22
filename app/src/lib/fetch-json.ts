export async function readJsonResponse<T = any>(response: Response): Promise<T> {
  const text = await response.text();
  const trimmed = text.trim();
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();

  if (!trimmed) return {} as T;

  if (contentType.includes('application/json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed) as T;
    } catch {
      throw new Error('invalid_json_response');
    }
  }

  const snippet = trimmed.replace(/\s+/g, ' ').slice(0, 120);
  throw new Error(snippet ? `unexpected_response:${snippet}` : `unexpected_response:${response.status}`);
}

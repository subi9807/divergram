export function verifySessionToken(jwt, token, secret) {
  const payload = jwt.verify(token, secret);
  // Legacy sessions have no type; scoped tokens must never act as sessions.
  if (!payload || typeof payload !== 'object' || !payload.sub || payload.purpose || payload.scope ||
      (payload.tokenType && payload.tokenType !== 'session')) throw new Error('invalid_session_token');
  return payload;
}

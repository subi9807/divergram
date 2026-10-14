export const EMAIL_COMPANY_NAME = 'METAbyTREE';

export function stripEmailBrandMarkdown(value) {
  return String(value || '')
    .replace(/\*{1,3}(METAbyTREE)\*{1,3}/gi, '$1')
    .trim();
}

export function normalizeEmailSender(value, fallbackAddress = '') {
  const sender = stripEmailBrandMarkdown(value || fallbackAddress);
  if (!sender || sender.includes('<')) return sender;
  return `${EMAIL_COMPANY_NAME} <${sender}>`;
}

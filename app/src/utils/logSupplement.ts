export interface LogSupplement {
  resortName: string;
  temperature: string;
  visibility: string;
  buddy: string;
}

export function readLogSupplement(post: Record<string, unknown>): LogSupplement {
  return {
    resortName: String(post.resort ?? ''),
    temperature: String(post.waterTemperature ?? ''),
    visibility: String(post.visibility ?? ''),
    buddy: String(post.buddyName ?? ''),
  };
}

export function countLogSupplement(form: LogSupplement): number {
  return [form.resortName, form.temperature, form.visibility, form.buddy]
    .filter(value => value.trim() !== '').length;
}

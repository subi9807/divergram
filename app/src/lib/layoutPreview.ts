type LayoutPreviewAuth = {
  token?: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
  };
  sessionExpiresAt?: string;
};

type LayoutPreviewPayload = {
  tutorialDone?: boolean;
  auth?: LayoutPreviewAuth;
};

function readEnvPreview(): LayoutPreviewPayload | null {
  if (!__DEV__) return null;
  const raw = String(process.env.EXPO_PUBLIC_LAYOUT_PREVIEW_JSON || '').trim();
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw);
    return payload && typeof payload === 'object' ? (payload as LayoutPreviewPayload) : null;
  } catch {
    return null;
  }
}

function readWindowPreview(): LayoutPreviewPayload | null {
  if (typeof window === 'undefined') return null;
  const payload = (window as any).__DIVERGRAM_LAYOUT_PREVIEW__ as LayoutPreviewPayload | undefined;
  if (!payload || typeof payload !== 'object') return null;
  return payload;
}

export function getLayoutPreviewPayload(): LayoutPreviewPayload | null {
  return readWindowPreview() || readEnvPreview();
}

export function isLayoutPreviewEnabled(): boolean {
  return Boolean(getLayoutPreviewPayload());
}

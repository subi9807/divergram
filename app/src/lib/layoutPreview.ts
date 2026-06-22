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

function readWindowPreview(): LayoutPreviewPayload | null {
  if (typeof window === 'undefined') return null;
  const payload = (window as any).__DIVERGRAM_LAYOUT_PREVIEW__ as LayoutPreviewPayload | undefined;
  if (!payload || typeof payload !== 'object') return null;
  return payload;
}

export function getLayoutPreviewPayload(): LayoutPreviewPayload | null {
  return readWindowPreview();
}

export function isLayoutPreviewEnabled(): boolean {
  return Boolean(readWindowPreview());
}


export type AppleWalletPassRequest = {
  licenseId: string;
  userId: string;
};

export type AppleWalletPassResponse = {
  ready: boolean;
  message: string;
  passUrl?: string;
};

export async function requestAppleWalletPass(_: AppleWalletPassRequest): Promise<AppleWalletPassResponse> {
  const baseUrl = String(process.env.EXPO_PUBLIC_API_BASE_URL || '').trim();
  if (!baseUrl) {
    return {
      ready: false,
      message: 'Apple Wallet 연동 준비 중입니다.',
    };
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/wallet/apple-pass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(_),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ready: false,
        message: String(payload?.message || 'Apple Wallet 연동 준비 중입니다.'),
      };
    }

    return {
      ready: true,
      message: String(payload?.message || 'Apple Wallet 패스가 준비되었습니다.'),
      passUrl: String(payload?.passUrl || payload?.url || '').trim() || undefined,
    };
  } catch {
    return {
      ready: false,
      message: 'Apple Wallet 연동 준비 중입니다.',
    };
  }
}

export type LoginProvider = 'google' | 'apple' | 'kakao' | 'facebook' | 'email';

export async function ensureProviderConnected(_provider: LoginProvider): Promise<boolean> {
  // TODO: 계정 연결 상태 서버 검증
  return true;
}

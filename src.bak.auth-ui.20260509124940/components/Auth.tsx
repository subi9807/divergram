import { useState } from 'react';
import { Instagram } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState<'personal' | 'resort'>('personal');
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password, username.trim(), accountType);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);

    const DEMO_PASSWORDS = ['Password123!', 'Demo1234!'];
    const candidateEmails = [
      'demo@divergram.app',
      'demo@divergram.com',
      'demo@instagram.com',
      'minji.kim1@divergram.com',
    ];

    try {
      // 1) 기존 테스트 계정 먼저 시도 (email/password 조합 다각도로)
      for (const email of candidateEmails) {
        for (const pw of DEMO_PASSWORDS) {
          try {
            await signIn(email, pw);
            return;
          } catch {
            // 다음 후보로 진행
          }
        }
      }

      // 2) 기본 데모 계정 생성 시도
      try {
        await signUp('demo@divergram.app', 'Password123!', 'demo_user', 'personal');
        await signIn('demo@divergram.app', 'Password123!');
        return;
      } catch {
        // 이미 존재/충돌 가능 -> 임시 데모 계정으로 폴백
      }

      // 3) 항상 동작하도록 임시 데모 계정 생성 후 로그인
      const stamp = Date.now().toString().slice(-6);
      const tempEmail = `demo+${stamp}@divergram.app`;
      const tempUsername = `demo_${stamp}`;
      await signUp(tempEmail, 'Password123!', tempUsername, 'personal');
      await signIn(tempEmail, 'Password123!');
    } catch (err: any) {
      setError(err?.message || '테스트 계정 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Instagram className="h-16 w-16" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Divergram</h2>
        </div>

        <form className="mt-8 space-y-6 bg-white p-8 border border-gray-300 rounded" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="이메일"
            />

            {!isLogin && (
              <>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="사용자 이름"
                />
                <div className="rounded border border-gray-300 p-3 text-sm">
                  <p className="mb-2 text-gray-600">계정 유형</p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={accountType === 'personal'} onChange={() => setAccountType('personal')} />
                      개인
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={accountType === 'resort'} onChange={() => setAccountType('resort')} />
                      리조트
                    </label>
                  </div>
                </div>
              </>
            )}

            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="비밀번호"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-semibold rounded-md text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? '처리 중...' : isLogin ? '로그인' : '가입하기'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">또는</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-semibold rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
          >
            테스트 계정으로 로그인
          </button>
          <p className="text-xs text-gray-500 text-center">
            테스트 계정 기본값: demo@divergram.app / Password123!
          </p>
        </form>

        <div className="text-center bg-white p-4 border border-gray-300 rounded">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-500 hover:text-blue-600 text-sm font-semibold"
          >
            {isLogin ? '계정이 없으신가요? 가입하기' : '계정이 있으신가요? 로그인'}
          </button>
        </div>
      </div>
    </div>
  );
}

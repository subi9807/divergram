import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const oauthProviders = [
  { id: 'google' as const, label: 'Google로 계속하기', mark: 'G' },
  { id: 'apple' as const, label: 'Apple로 계속하기', mark: '' },
  { id: 'facebook' as const, label: 'Facebook으로 계속하기', mark: 'f' },
];

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState<'personal' | 'resort'>('personal');
  const { signIn, signUp } = useAuth();

  useEffect(() => {
    document.documentElement.classList.add('dg-auth-active');
    return () => document.documentElement.classList.remove('dg-auth-active');
  }, []);

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

  const handleOAuth = (provider: 'google' | 'apple' | 'facebook') => {
    setError('');
    const redirect = window.location.href;
    window.location.href = 'https://api.divergram.com/api/auth/oauth/' + provider + '/start?redirect=' + encodeURIComponent(redirect);
  };

  return (
    <div className="fixed inset-0 h-[100dvh] overflow-hidden bg-gradient-to-b from-sky-50 via-white to-blue-50 px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1rem)] flex items-center justify-center">
      <div className="w-full max-w-[540px]">
        <div className="text-center mb-8 max-[420px]:mb-5 max-[760px]:mb-5">
          <img src="/assets/logo/divergram-logo-blue.png" alt="Divergram" className="mx-auto h-24 w-24 rounded-[1.7rem] object-cover shadow-2xl shadow-sky-200/80 max-[420px]:h-20 max-[420px]:w-20 max-[760px]:h-20 max-[760px]:w-20" />
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-gray-950 max-[420px]:mt-3 max-[420px]:text-3xl max-[760px]:mt-3 max-[760px]:text-3xl">Divergram</h1>
          <p className="mt-3 text-lg font-medium text-gray-500 max-[420px]:mt-2 max-[420px]:text-sm max-[760px]:mt-2 max-[760px]:text-sm">다이버들의 로그북과 순간을 한곳에</p>
        </div>

        <div className="bg-white/95 backdrop-blur rounded-[2.2rem] border-2 border-gray-200 shadow-2xl shadow-slate-200/80 p-6 sm:p-8 max-[420px]:p-5 max-[760px]:p-5">
          <div className="grid grid-cols-2 rounded-[1.7rem] bg-gray-100 p-1.5 mb-6 max-[420px]:mb-4 max-[760px]:mb-4">
            <button type="button" onClick={() => setIsLogin(true)} className={`h-16 rounded-[1.35rem] text-xl font-extrabold transition max-[420px]:h-12 max-[420px]:text-base max-[760px]:h-12 max-[760px]:text-base ${isLogin ? 'bg-white shadow-lg text-gray-950' : 'text-gray-500'}`}>로그인</button>
            <button type="button" onClick={() => setIsLogin(false)} className={`h-16 rounded-[1.35rem] text-xl font-extrabold transition max-[420px]:h-12 max-[420px]:text-base max-[760px]:h-12 max-[760px]:text-base ${!isLogin ? 'bg-white shadow-lg text-gray-950' : 'text-gray-500'}`}>회원가입</button>
          </div>

          <div className="space-y-5 max-[420px]:space-y-3 max-[760px]:space-y-3">
            {oauthProviders.map((provider) => (
              <button
                key={provider.id}
                type="button"
                onClick={() => handleOAuth(provider.id)}
                disabled={loading}
                className="w-full h-16 rounded-[1.45rem] border-2 border-gray-300 bg-white hover:bg-gray-50 transition flex items-center justify-center gap-5 text-xl font-extrabold text-gray-800 disabled:opacity-50 max-[420px]:h-11 max-[420px]:gap-3 max-[420px]:text-sm max-[760px]:h-11 max-[760px]:gap-3 max-[760px]:text-sm"
              >
                <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 max-[420px]:h-7 max-[420px]:w-7 max-[760px]:h-7 max-[760px]:w-7 ${provider.id === 'facebook' ? 'bg-[#1877F2] text-white' : provider.id === 'apple' ? 'bg-black text-white' : 'bg-white border-2 border-gray-200 text-[#4285F4]'}`}>{provider.mark}</span>
                {provider.label}
              </button>
            ))}
          </div>

          <div className="relative my-7 max-[420px]:my-4 max-[760px]:my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-lg font-medium max-[420px]:text-sm max-[760px]:text-sm"><span className="px-5 bg-white text-gray-400">또는 이메일로 {isLogin ? '로그인' : '가입'}</span></div>
          </div>

          <form className="space-y-5 max-[420px]:space-y-3 max-[760px]:space-y-3" onSubmit={handleSubmit}>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">{error}</div>}

            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-16 rounded-[1.45rem] border-2 border-gray-300 px-6 text-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400 max-[420px]:h-11 max-[420px]:px-4 max-[420px]:text-base max-[760px]:h-11 max-[760px]:px-4 max-[760px]:text-base" placeholder="이메일" />

            {!isLogin && (
              <>
                <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full h-16 rounded-[1.45rem] border-2 border-gray-300 px-6 text-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400 max-[420px]:h-11 max-[420px]:px-4 max-[420px]:text-base max-[760px]:h-11 max-[760px]:px-4 max-[760px]:text-base" placeholder="사용자 이름" />
                <div className="rounded-2xl border border-gray-200 p-4 text-sm">
                  <p className="mb-3 text-gray-600 font-medium">계정 유형</p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`rounded-xl border p-3 cursor-pointer ${accountType === 'personal' ? 'border-sky-400 bg-sky-50' : 'border-gray-200'}`}>
                      <input className="mr-2" type="radio" checked={accountType === 'personal'} onChange={() => setAccountType('personal')} />개인 다이버
                    </label>
                    <label className={`rounded-xl border p-3 cursor-pointer ${accountType === 'resort' ? 'border-sky-400 bg-sky-50' : 'border-gray-200'}`}>
                      <input className="mr-2" type="radio" checked={accountType === 'resort'} onChange={() => setAccountType('resort')} />리조트
                    </label>
                  </div>
                </div>
              </>
            )}

            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-16 rounded-[1.45rem] border-2 border-gray-300 px-6 text-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400 max-[420px]:h-11 max-[420px]:px-4 max-[420px]:text-base max-[760px]:h-11 max-[760px]:px-4 max-[760px]:text-base" placeholder="비밀번호" />

            <button type="submit" disabled={loading} className="w-full h-16 rounded-[1.45rem] bg-sky-500 hover:bg-sky-600 text-white text-xl font-extrabold transition disabled:opacity-50 max-[420px]:h-12 max-[420px]:text-base max-[760px]:h-12 max-[760px]:text-base">
              {loading ? '처리 중...' : isLogin ? '로그인' : '가입하기'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

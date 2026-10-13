import type { ReactNode } from 'react';
import { ExternalLink, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';

const SUPPORT_EMAIL = 'support@divergram.com';

export default function AccountDeletionGuide() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dff6ff_0,#f7fbff_38%,#ffffff_75%)] px-5 py-10 text-slate-900">
      <article className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-[0_24px_80px_rgba(14,116,144,0.14)]">
        <header className="bg-gradient-to-br from-[#012b54] via-[#064f87] to-[#0096c7] px-7 py-10 text-white md:px-12">
          <img
            src="/assets/logo/divergram-logo-blue.png"
            alt="Divergram"
            className="mb-6 h-16 w-16 rounded-2xl bg-white/95 p-1 shadow-lg"
          />
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-200">Account control</p>
          <h1 className="mt-3 text-3xl font-black md:text-4xl">Divergram 계정 삭제 안내</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-sky-50 md:text-base">
            앱에서 계정 삭제를 요청할 수 있으며, 탈퇴 후 30일 이내에는 다시 로그인하여 계정을 복구할 수 있습니다.
          </p>
        </header>

        <div className="space-y-8 px-7 py-9 md:px-12">
          <section className="grid gap-4 md:grid-cols-3">
            <InfoCard icon={<Trash2 />} title="삭제 요청" text="앱의 설정에서 직접 요청합니다." />
            <InfoCard icon={<RotateCcw />} title="30일 복구" text="유예기간 내 로그인하면 복구할 수 있습니다." />
            <InfoCard icon={<ShieldCheck />} title="보호 조치" text="법정 보관 정보는 분리하여 관리합니다." />
          </section>

          <section>
            <h2 className="text-xl font-extrabold">앱에서 요청하는 방법</h2>
            <ol className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
              <li><strong>1.</strong> Divergram에 로그인합니다.</li>
              <li><strong>2.</strong> 오른쪽 상단 전체 메뉴에서 <strong>설정</strong>을 선택합니다.</li>
              <li><strong>3.</strong> <strong>계정 관리 → 계정 삭제</strong>로 이동합니다.</li>
              <li><strong>4.</strong> 안내되는 요청일과 복구 가능 마지막 날짜를 확인한 뒤 삭제를 요청합니다.</li>
            </ol>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="font-extrabold text-amber-950">30일 복구 기간</h2>
            <p className="mt-2 text-sm leading-7 text-amber-900">
              삭제 요청 직후 계정은 비활성화됩니다. 요청일로부터 30일 이내에 다시 로그인하면 계정 복구 화면으로
              이동하며, 복구 버튼을 눌러 탈퇴를 철회할 수 있습니다. 복구 기간에는 다른 앱 기능을 이용할 수 없습니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold">삭제되는 정보</h2>
            <ul className="mt-4 grid gap-2 text-sm leading-7 text-slate-700 md:grid-cols-2">
              <li>• 계정과 프로필 정보</li>
              <li>• SNS 로그인 연결 정보</li>
              <li>• 푸시 토큰과 개인 환경설정</li>
              <li>• 다이빙 로그 및 라이선스 정보</li>
              <li>• 게시물, 릴스, 업로드 미디어</li>
              <li>• 서비스 이용 중 생성된 개인 데이터</li>
            </ul>
            <p className="mt-4 text-xs leading-6 text-slate-500">
              다른 이용자의 권리 보호, 분쟁 대응 또는 관계 법령 준수를 위해 보존이 필요한 기록은 법정 기간 동안
              접근이 제한된 별도 영역에 보관된 후 파기될 수 있습니다. 백업 데이터는 정해진 백업 순환 주기에 따라
              안전하게 만료됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-extrabold">계정을 유지하면서 데이터만 삭제하기</h2>
            <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-700">
              <li>• 프로필 사진과 소개: <strong>프로필 → 프로필 편집</strong></li>
              <li>• 게시물과 릴스: 해당 콘텐츠의 <strong>더보기 → 삭제</strong></li>
              <li>• 다이빙 로그: <strong>프로필 → 총 다이빙 → 로그 선택 → 삭제</strong></li>
              <li>• 알림과 환경설정: <strong>전체 메뉴 → 알림 또는 설정</strong></li>
            </ul>
            <p className="mt-4 text-xs leading-6 text-slate-500">
              앱에서 직접 삭제할 수 없는 데이터는 고객지원으로 데이터 종류와 가입 이메일을 보내 요청할 수 있습니다.
            </p>
          </section>

          <section className="rounded-2xl bg-slate-950 p-6 text-white">
            <h2 className="text-lg font-extrabold">앱에 로그인할 수 없나요?</h2>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              가입한 이메일 주소, 로그인 제공자, 삭제 요청 사유를 포함해 고객지원으로 요청해 주세요.
              본인 확인 후 계정 삭제 절차를 안내합니다.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Divergram 계정 삭제 요청')}`}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-sky-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-400"
            >
              {SUPPORT_EMAIL}
              <ExternalLink size={16} />
            </a>
          </section>

          <footer className="flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-6 text-xs text-slate-500">
            <a className="hover:text-sky-700" href="/privacy">개인정보처리방침</a>
            <a className="hover:text-sky-700" href="/terms">이용약관</a>
            <span>서비스: Divergram</span>
            <span>운영 문의: {SUPPORT_EMAIL}</span>
          </footer>
        </div>
      </article>
    </main>
  );
}

function InfoCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-5">
      <div className="mb-4 inline-flex rounded-xl bg-white p-3 text-sky-700 shadow-sm">{icon}</div>
      <h2 className="font-extrabold">{title}</h2>
      <p className="mt-2 text-xs leading-6 text-slate-600">{text}</p>
    </div>
  );
}

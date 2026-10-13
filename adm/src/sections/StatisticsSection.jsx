import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const METRICS = [
  ['active_now', '현재 접속', '최근 2분 내 활동', 'live'],
  ['total_users', '전체 회원', '누적 가입 계정', 'users'],
  ['new_users_7d', '신규 회원', '최근 7일', 'new'],
  ['posts', '게시물', '누적 피드·릴스', 'posts'],
  ['comments', '댓글', '누적 작성 댓글', 'comments'],
  ['likes', '좋아요', '누적 반응', 'likes'],
];

function relativeTime(value) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 10) return '방금 전';
  if (seconds < 60) return `${seconds}초 전`;
  return `${Math.floor(seconds / 60)}분 전`;
}

function routeLabel(value) {
  return String(value || '').replace(/^\/(\(tabs\)\/)?/, '') || '앱 홈';
}

export default function StatisticsSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [, setClock] = useState(Date.now());

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setData(await api('/api/admin/statistics'));
      setError('');
    } catch (loadError) {
      setError(String(loadError?.message || loadError));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const poller = window.setInterval(() => void load(true), 15_000);
    const ticker = window.setInterval(() => setClock(Date.now()), 5_000);
    return () => { window.clearInterval(poller); window.clearInterval(ticker); };
  }, [load]);

  const activeUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return data?.activeUsers || [];
    return (data?.activeUsers || []).filter((user) => [user.full_name, user.username, user.email, user.platform, user.current_route]
      .some((value) => String(value || '').toLowerCase().includes(keyword)));
  }, [data?.activeUsers, query]);
  const maxDaily = Math.max(1, ...(data?.daily || []).flatMap((row) => [Number(row.signups || 0), Number(row.posts || 0)]));

  return <div className="statistics-page">
    <section className="statistics-hero">
      <div><span className="statistics-kicker">LIVE OPERATIONS</span><h2>서비스 통계와 실시간 접속</h2><p>핵심 활동 지표와 현재 앱을 사용 중인 회원을 한 화면에서 확인합니다.</p></div>
      <div className="statistics-live-state"><i />15초 자동 갱신</div>
      <button type="button" className="ui-button ui-button--primary" onClick={() => void load()} disabled={loading}>{loading ? '불러오는 중' : '지금 새로고침'}</button>
    </section>
    {error && <p className="error">통계를 불러오지 못했습니다: {error}</p>}
    <section className="statistics-summary" aria-label="핵심 통계">
      {METRICS.map(([key, label, description, tone]) => <article key={key} className={`statistics-metric statistics-metric--${tone}`}><span>{label}</span><strong>{Number(data?.summary?.[key] || 0).toLocaleString()}</strong><small>{description}</small></article>)}
    </section>
    <div className="statistics-grid">
      <section className="statistics-card statistics-active-card">
        <header><div><span className="statistics-card-kicker">ONLINE NOW</span><h3>현재 접속자</h3></div><strong>{Number(data?.summary?.active_now || 0)}명</strong></header>
        <div className="statistics-platforms">{(data?.platforms || []).map((item) => <span key={item.platform}>{String(item.platform).toUpperCase()} <b>{item.count}</b></span>)}</div>
        <input className="statistics-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름, 사용자명, 이메일, 화면 검색" />
        <div className="statistics-active-list">
          {activeUsers.map((user) => <article key={user.user_id}>
            <div className="statistics-avatar">{user.avatar_url ? <img src={user.avatar_url} alt="" /> : String(user.full_name || user.username || user.email || 'D').slice(0, 1).toUpperCase()}<i /></div>
            <div className="statistics-person"><strong>{user.full_name || user.username || 'Diver'}</strong><span>@{user.username || '-'} · {user.email}</span></div>
            <div className="statistics-device"><strong>{String(user.platform || 'unknown').toUpperCase()}</strong><span>v{user.app_version || '-'} ({user.build_number || '-'})</span></div>
            <div className="statistics-route"><strong>{routeLabel(user.current_route)}</strong><span>{relativeTime(user.last_seen_at)}</span></div>
          </article>)}
          {!loading && activeUsers.length === 0 && <p className="statistics-empty">현재 조건에 맞는 접속자가 없습니다.</p>}
        </div>
      </section>
      <section className="statistics-card statistics-trend-card">
        <header><div><span className="statistics-card-kicker">14 DAY TREND</span><h3>가입과 게시 활동</h3></div></header>
        <div className="statistics-legend"><span><i className="signup" />가입</span><span><i className="post" />게시물</span></div>
        <div className="statistics-bars">{(data?.daily || []).map((row) => <div key={row.day} title={`${row.day} 가입 ${row.signups}, 게시물 ${row.posts}`}><div className="statistics-bar-pair"><i className="signup" style={{ height: `${Math.max(3, Number(row.signups || 0) / maxDaily * 100)}%` }} /><i className="post" style={{ height: `${Math.max(3, Number(row.posts || 0) / maxDaily * 100)}%` }} /></div><span>{new Date(row.day).getDate()}</span></div>)}</div>
        <div className="statistics-secondary"><span>교육 신청</span><strong>{Number(data?.summary?.education_applications || 0).toLocaleString()}건</strong></div>
        <small className="statistics-generated">기준 시각 {data?.generatedAt ? new Date(data.generatedAt).toLocaleTimeString('ko-KR') : '-'}</small>
      </section>
    </div>
  </div>;
}

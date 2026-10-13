import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

const PERIODS = [7, 30, 90];

function money(value) {
  return `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
}

function channelSummary(data, name) {
  const rows = data?.latest?.channels || [];
  const matched = rows.filter((row) => String(row.channel || '').startsWith(name));
  return {
    quantity: matched.reduce((sum, row) => sum + Number(row.quantity || 0), 0),
    cost: matched.reduce((sum, row) => sum + (row.currency === 'USD' ? Number(row.cost || 0) : 0), 0),
  };
}

export default function MessagingUsageSection() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api(`/api/admin/communication-usage?days=${days}`));
      setError('');
    } catch (loadError) {
      setError(String(loadError?.message || loadError));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  const requestRefresh = async () => {
    setRefreshing(true);
    try {
      await api('/api/admin/communication-usage/refresh', { method: 'POST', body: { days } });
      setError('');
      window.setTimeout(() => void load(), 2500);
    } catch (refreshError) {
      setError(String(refreshError?.message || refreshError));
    } finally {
      setRefreshing(false);
    }
  };

  const sms = channelSummary(data, 'SMS');
  const email = channelSummary(data, 'EMAIL');
  const latest = data?.latest;

  return <div className="messaging-usage-page">
    <section className="messaging-usage-hero">
      <div><span>INFOBIP BILLING</span><h2>메시지 사용량과 비용</h2><p>회원 인증에 사용한 SMS·이메일의 실제 청구 데이터를 USD 기준으로 확인합니다.</p></div>
      <div className="messaging-usage-actions">
        <div className="messaging-periods" aria-label="조회 기간">{PERIODS.map((period) => <button type="button" key={period} className={days === period ? 'active' : ''} onClick={() => setDays(period)}>{period}일</button>)}</div>
        <button type="button" className="ui-button ui-button--primary" onClick={requestRefresh} disabled={refreshing || !data?.configured}>{refreshing ? '집계 요청 중' : 'Infobip 새로고침'}</button>
      </div>
    </section>

    {error && <p className="error">사용량을 불러오지 못했습니다: {error}</p>}
    {!loading && !data?.configured && <p className="messaging-usage-notice is-warning">운영 서버의 Infobip Billing API 설정이 필요합니다.</p>}
    {latest?.status === 'pending' && <p className="messaging-usage-notice">Infobip에서 청구 데이터를 집계하고 있습니다. 보통 잠시 후 결과가 반영됩니다.</p>}

    <section className="messaging-usage-summary">
      <article className="is-total"><span>총 사용 금액</span><strong>{money(latest?.spendUsd)}</strong><small>USD · {latest?.provisional ? '현재 월 잠정 금액' : '정산 데이터'}</small></article>
      <article><span>SMS</span><strong>{Number(sms.quantity).toLocaleString()}건</strong><small>{money(sms.cost)} USD</small></article>
      <article><span>Email</span><strong>{Number(email.quantity).toLocaleString()}건</strong><small>{money(email.cost)} USD</small></article>
      <article><span>전체 청구 단위</span><strong>{Number(latest?.quantity || 0).toLocaleString()}</strong><small>메시지·메시지 파트 기준</small></article>
    </section>

    <section className="messaging-usage-card">
      <header><div><span>DAILY COST</span><h3>일별 사용 내역</h3></div><small>{latest?.receivedAt ? `최근 반영 ${new Date(latest.receivedAt).toLocaleString('ko-KR')}` : '아직 반영된 집계가 없습니다.'}</small></header>
      <div className="messaging-usage-table">
        <div className="messaging-usage-row is-head"><span>날짜</span><span>사용량</span><span>통화</span><span>비용</span></div>
        {(latest?.daily || []).map((row) => <div className="messaging-usage-row" key={`${row.day}-${row.currency}`}><strong>{row.day}</strong><span>{Number(row.quantity || 0).toLocaleString()}</span><span>{row.currency}</span><strong>{row.currency === 'USD' ? money(row.cost) : `${row.cost} ${row.currency}`}</strong></div>)}
        {!loading && !(latest?.daily || []).length && <p className="messaging-usage-empty">선택한 기간에 반영된 청구 데이터가 없습니다.</p>}
      </div>
      <footer>Infobip 청구 데이터는 UTC 기준이며 현재 월 금액은 다음 달 5일까지 조정될 수 있습니다. 최종 회계 금액은 Infobip 인보이스와 대조하세요.</footer>
    </section>
  </div>;
}

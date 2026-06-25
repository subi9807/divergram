import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const EMPTY_FORM = {
  title: '',
  placement: 'feed_inline',
  status: 'draft',
  note: '',
  actionLabel: '운영 확인',
  targetUrl: '',
  sortOrder: 0,
  isActive: true,
  startAt: '',
  endAt: '',
};

const STATUS_OPTIONS = [
  ['draft', '초안'],
  ['ready', '준비'],
  ['active', '노출'],
  ['paused', '중지'],
  ['archived', '보관'],
];

const PLACEMENT_OPTIONS = [
  ['feed_inline', '피드 중간'],
  ['reel_inline', '릴스 중간'],
  ['map_banner', '지도 배너'],
];

function formatDate(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function AdsSection({ adSlots = [], adminKey, refresh }) {
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const selectedSlot = useMemo(() => adSlots.find((item) => item.id === editingId) || null, [adSlots, editingId]);
  const activeCount = useMemo(() => adSlots.filter((item) => item.is_active).length, [adSlots]);

  useEffect(() => {
    if (!editingId) {
      setForm(EMPTY_FORM);
      return;
    }
    if (!selectedSlot) return;
    setForm({
      title: selectedSlot.title || '',
      placement: selectedSlot.placement || 'feed_inline',
      status: selectedSlot.status || 'draft',
      note: selectedSlot.note || '',
      actionLabel: selectedSlot.action_label || '운영 확인',
      targetUrl: selectedSlot.target_url || '',
      sortOrder: Number(selectedSlot.sort_order || 0),
      isActive: Boolean(selectedSlot.is_active ?? true),
      startAt: selectedSlot.start_at ? String(selectedSlot.start_at).slice(0, 16) : '',
      endAt: selectedSlot.end_at ? String(selectedSlot.end_at).slice(0, 16) : '',
    });
  }, [editingId, selectedSlot]);

  const startCreate = () => {
    setEditingId('');
    setForm(EMPTY_FORM);
    setError('');
  };

  const startEdit = (slot) => {
    setEditingId(slot.id);
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = {
        ...form,
        sortOrder: Number(form.sortOrder || 0),
        startAt: form.startAt || null,
        endAt: form.endAt || null,
      };
      await api(editingId ? `/api/admin/ads/${editingId}` : '/api/admin/ads', {
        adminKey,
        method: editingId ? 'PATCH' : 'POST',
        body: payload,
      });
      await refresh();
      startCreate();
    } catch (e) {
      setError(e.message || '광고 슬롯 저장 실패');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (slot) => {
    if (!confirm(`'${slot.title || slot.id}' 슬롯을 삭제할까?`)) return;
    setBusy(true);
    setError('');
    try {
      await api(`/api/admin/ads/${slot.id}`, { adminKey, method: 'DELETE' });
      await refresh();
      if (editingId === slot.id) startCreate();
    } catch (e) {
      setError(e.message || '광고 슬롯 삭제 실패');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (slot) => {
    setBusy(true);
    setError('');
    try {
      await api(`/api/admin/ads/${slot.id}`, {
        adminKey,
        method: 'PATCH',
        body: { isActive: !slot.is_active, status: !slot.is_active ? 'ready' : 'paused' },
      });
      await refresh();
    } catch (e) {
      setError(e.message || '광고 슬롯 상태 변경 실패');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card admin-section">
      <div className="section-head">
        <div>
          <h2>광고 운영</h2>
          <p>피드/릴스/지도 노출 슬롯을 생성하고 운영 상태까지 관리할 수 있어.</p>
        </div>
        <div className="section-head-meta">
          <span className="badge">슬롯 {adSlots.length}</span>
          <span className="badge active">활성 {activeCount}</span>
          <span className="badge active">실서버 반영</span>
        </div>
      </div>

      <div className="split-grid">
        <form className="panel ad-form" onSubmit={submit}>
          <div className="panel-head">
            <strong>{editingId ? '광고 슬롯 수정' : '광고 슬롯 등록'}</strong>
            {editingId && <button type="button" className="chip" onClick={startCreate}>새로 만들기</button>}
          </div>
          <div className="field-grid">
            <label><span>제목</span><input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="예: 제주 다이빙 시즌 프로모션" /></label>
            <label><span>노출 위치</span><select value={form.placement} onChange={(e) => setForm((prev) => ({ ...prev, placement: e.target.value }))}>{PLACEMENT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label><span>상태</span><select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label><span>정렬값</span><input type="number" value={form.sortOrder} onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))} /></label>
            <label><span>버튼 문구</span><input value={form.actionLabel} onChange={(e) => setForm((prev) => ({ ...prev, actionLabel: e.target.value }))} placeholder="예: 자세히 보기" /></label>
            <label><span>목적 URL</span><input value={form.targetUrl} onChange={(e) => setForm((prev) => ({ ...prev, targetUrl: e.target.value }))} placeholder="https://..." /></label>
            <label><span>시작 시각</span><input type="datetime-local" value={form.startAt} onChange={(e) => setForm((prev) => ({ ...prev, startAt: e.target.value }))} /></label>
            <label><span>종료 시각</span><input type="datetime-local" value={form.endAt} onChange={(e) => setForm((prev) => ({ ...prev, endAt: e.target.value }))} /></label>
          </div>
          <label className="textarea-field"><span>메모</span><textarea rows={5} value={form.note} onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="운영 메모를 적어줘." /></label>
          <label className="switch-row"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} /><span>활성화</span></label>
          <div className="preview-box">
            <span className="muted">미리보기</span>
            <div className="preview-card">
              <strong>{form.title || '광고 제목 미리보기'}</strong>
              <p>{form.note || '운영 메모가 여기에 보입니다.'}</p>
              <div className="preview-pill-row">
                <span className="badge active">{PLACEMENT_OPTIONS.find(([value]) => value === form.placement)?.[1] || form.placement}</span>
                <span className="badge">{form.status || 'draft'}</span>
                <span className="badge">{form.isActive ? '활성' : '비활성'}</span>
              </div>
              <button type="button" className="sm" disabled>{form.actionLabel || '운영 확인'}</button>
              {form.targetUrl ? <small>{form.targetUrl}</small> : <small>목적 URL 없음</small>}
            </div>
          </div>
          <div className="detail-actions">
            <button type="submit" disabled={busy}>{busy ? '저장 중...' : editingId ? '수정 저장' : '슬롯 등록'}</button>
            <button type="button" onClick={startCreate} disabled={busy}>초기화</button>
          </div>
          {error && <p className="error">{error}</p>}
        </form>

        <div className="panel">
          <div className="panel-head">
            <strong>등록된 슬롯</strong>
            <span className="muted">{adSlots.length}건</span>
          </div>
          <div className="ad-list">
            {adSlots.length === 0 ? (
              <div className="empty-box">아직 등록된 광고 슬롯이 없어.</div>
            ) : adSlots.map((slot) => (
              <div key={slot.id} className={editingId === slot.id ? 'ad-item active' : 'ad-item'}>
                <div className="ad-item-top">
                  <div>
                    <strong>{slot.title || slot.id}</strong>
                    <p>{slot.placement} · {slot.action_label || '운영 확인'}</p>
                  </div>
                  <span className={slot.is_active ? 'badge active' : 'badge'}>{slot.is_active ? '노출중' : '중지됨'}</span>
                </div>
                <div className="ad-item-meta">
                  <span>정렬 {slot.sort_order ?? 0}</span>
                  <span>{slot.status || 'draft'}</span>
                  <span>{slot.is_active ? '활성' : '비활성'}</span>
                  <span>{slot.target_url || '-'}</span>
                  <span>{formatDate(slot.updated_at || slot.created_at)}</span>
                </div>
                <div className="actions">
                  <button type="button" className="sm" onClick={() => startEdit(slot)} disabled={busy}>수정</button>
                  <button type="button" className="sm" onClick={() => toggleActive(slot)} disabled={busy}>{slot.is_active ? '노출 중단' : '노출 시작'}</button>
                  <button type="button" className="sm" onClick={() => remove(slot)} disabled={busy}>삭제</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

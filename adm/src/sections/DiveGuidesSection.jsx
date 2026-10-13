import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const LANGUAGES = [
  ['ko', '한국어'], ['en', 'English'], ['ja', '日本語'], ['zh', '中文'],
];
const CATEGORIES = [
  ['safety', '안전'], ['equipment', '장비'], ['skills', '다이빙 기술'], ['environment', '바다 환경'],
  ['travel', '여행'], ['marine_life', '해양생물'], ['news', '소식'],
];

const emptyTranslations = () => Object.fromEntries(LANGUAGES.map(([locale]) => [locale, { title: '', summary: '', body: '' }]));
const emptyDraft = () => ({ category: 'skills', translations: emptyTranslations(), coverImageUrl: '', videoUrl: '', status: 'draft', featured: false, sortOrder: 0 });

function categoryLabel(category) {
  return CATEGORIES.find(([key]) => key === category)?.[1] || category;
}

export default function DiveGuidesSection() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState(null);
  const [language, setLanguage] = useState('ko');

  const load = async () => {
    setLoading(true);
    setMessage('');
    try {
      const result = await api('/api/admin/dive-guides');
      setRows(Array.isArray(result?.data) ? result.data : []);
    } catch (error) {
      setMessage(error.message || '가이드를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => !needle || [row.translations?.ko?.title, row.translations?.en?.title, categoryLabel(row.category)].join(' ').toLowerCase().includes(needle));
  }, [query, rows]);

  const openNew = () => { setEditor({ id: '', ...emptyDraft() }); setLanguage('ko'); setMessage(''); };
  const openEdit = (row) => {
    setEditor({ ...emptyDraft(), ...row, translations: { ...emptyTranslations(), ...(row.translations || {}) } });
    setLanguage('ko');
    setMessage('');
  };
  const patchEditor = (patch) => setEditor((current) => ({ ...current, ...patch }));
  const patchCopy = (field, value) => setEditor((current) => ({ ...current, translations: { ...current.translations, [language]: { ...current.translations[language], [field]: value } } }));

  const uploadMedia = async (file) => {
    if (!file || !editor) return;
    setUploading(true);
    setMessage('');
    try {
      const form = new FormData();
      form.append('file', file);
      const result = await api('/api/uploads', { method: 'POST', body: form });
      const url = String(result?.data?.url || '').trim();
      if (!url) throw new Error('업로드 URL을 받지 못했습니다.');
      if (String(file.type || '').startsWith('video/')) patchEditor({ videoUrl: url });
      else patchEditor({ coverImageUrl: url });
    } catch (error) {
      setMessage(error.message || '미디어 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const save = async (status = editor?.status || 'draft') => {
    if (!editor || saving) return;
    setSaving(true);
    setMessage('');
    try {
      const payload = { ...editor, status };
      const result = editor.id
        ? await api(`/api/admin/dive-guides/${encodeURIComponent(editor.id)}`, { method: 'PATCH', body: payload })
        : await api('/api/admin/dive-guides', { method: 'POST', body: payload });
      setEditor(result?.data || null);
      setMessage(status === 'published' ? '가이드가 앱에 발행되었습니다.' : '초안이 저장되었습니다.');
      await load();
    } catch (error) {
      setMessage(String(error.message || '').includes('dive_guide_not_publishable') ? '발행하려면 4개 언어의 제목·본문과 이미지 또는 영상이 필요합니다.' : (error.message || '저장하지 못했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`“${row.translations?.ko?.title || row.id}” 가이드를 삭제할까요?`)) return;
    try {
      await api(`/api/admin/dive-guides/${encodeURIComponent(row.id)}`, { method: 'DELETE' });
      if (editor?.id === row.id) setEditor(null);
      await load();
    } catch (error) {
      setMessage(error.message || '삭제하지 못했습니다.');
    }
  };

  const copy = editor?.translations?.[language] || { title: '', summary: '', body: '' };

  return (
    <div className="admin-section dive-guide-admin">
      <section className="dive-guide-admin-head">
        <div><p className="section-kicker">DIVERGRAM EDITORIAL</p><h2>다이빙 가이드</h2><p>앱에 노출할 안전·장비·기술·해양 정보를 직접 작성하고 발행합니다.</p></div>
        <button type="button" onClick={openNew}>새 가이드 작성</button>
      </section>
      {message ? <div className="dive-guide-message">{message}</div> : null}
      <section className="card dive-guide-library">
        <div className="dive-guide-toolbar"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제목 또는 카테고리 검색" /><button className="ghost" type="button" onClick={load}>새로고침</button><span>총 {filtered.length}건</span></div>
        {loading ? <div className="operation-empty"><strong>가이드를 불러오는 중입니다.</strong></div> : null}
        <div className="dive-guide-grid">
          {filtered.map((row) => <article key={row.id} className="dive-guide-card">
            <div className="dive-guide-card-media">{row.coverImageUrl ? <img src={row.coverImageUrl} alt="" /> : <span>{row.videoUrl ? 'VIDEO' : 'MEDIA'}</span>}<em className={`is-${row.status}`}>{row.status === 'published' ? '발행' : '초안'}</em></div>
            <div className="dive-guide-card-body"><small>{categoryLabel(row.category)}{row.featured ? ' · 추천' : ''}</small><strong>{row.translations?.ko?.title || row.translations?.en?.title || '제목 없음'}</strong><p>{row.translations?.ko?.summary || row.translations?.en?.summary || '요약 없음'}</p><div><button className="sm" type="button" onClick={() => openEdit(row)}>수정</button><button className="sm danger" type="button" onClick={() => remove(row)}>삭제</button></div></div>
          </article>)}
        </div>
        {!loading && !filtered.length ? <div className="operation-empty"><strong>등록된 다이빙 가이드가 없습니다.</strong><span>새 가이드를 작성해 앱에 정보를 제공해 보세요.</span></div> : null}
      </section>

      {editor ? <div className="modal-backdrop"><section className="modal-panel dive-guide-editor">
        <header><div><p className="section-kicker">GUIDE EDITOR</p><h3>{editor.id ? '다이빙 가이드 수정' : '새 다이빙 가이드'}</h3><p>초안 저장 후 네 언어 원고를 모두 작성하면 발행할 수 있습니다.</p></div><button className="ghost" type="button" onClick={() => setEditor(null)}>닫기</button></header>
        <div className="dive-guide-editor-scroll">
          <div className="dive-guide-editor-options"><label>카테고리<select value={editor.category} onChange={(event) => patchEditor({ category: event.target.value })}>{CATEGORIES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>정렬<input type="number" value={editor.sortOrder} onChange={(event) => patchEditor({ sortOrder: Number(event.target.value || 0) })} /></label><label className="dive-guide-check"><input type="checkbox" checked={editor.featured} onChange={(event) => patchEditor({ featured: event.target.checked })} />추천 가이드</label></div>
          <div className="dive-guide-media-fields"><label>대표 이미지 URL<input value={editor.coverImageUrl} onChange={(event) => patchEditor({ coverImageUrl: event.target.value })} placeholder="https://..." /></label><label>영상 URL<input value={editor.videoUrl} onChange={(event) => patchEditor({ videoUrl: event.target.value })} placeholder="https://..." /></label><label className={`image-upload-button ${uploading ? 'disabled' : ''}`}><input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" disabled={uploading} onChange={(event) => uploadMedia(event.target.files?.[0])} /><span>{uploading ? '업로드 중...' : '이미지·영상 업로드'}</span></label></div>
          {editor.coverImageUrl ? <img className="dive-guide-editor-preview" src={editor.coverImageUrl} alt="대표 이미지 미리보기" /> : null}
          <div className="dive-guide-language-tabs">{LANGUAGES.map(([key, label]) => <button type="button" key={key} className={language === key ? 'active' : ''} onClick={() => setLanguage(key)}>{label}<span>{editor.translations?.[key]?.title && editor.translations?.[key]?.body ? '완료' : '미완료'}</span></button>)}</div>
          <div className="dive-guide-copy-fields"><label>제목<input value={copy.title} maxLength="160" onChange={(event) => patchCopy('title', event.target.value)} /></label><label>요약<textarea value={copy.summary} maxLength="500" rows="3" onChange={(event) => patchCopy('summary', event.target.value)} /></label><label>본문<textarea value={copy.body} maxLength="20000" rows="12" onChange={(event) => patchCopy('body', event.target.value)} /></label></div>
        </div>
        <footer><button className="ghost" type="button" disabled={saving} onClick={() => save('draft')}>초안 저장</button><button type="button" disabled={saving || uploading} onClick={() => save('published')}>{saving ? '저장 중...' : '앱에 발행'}</button></footer>
      </section></div> : null}
    </div>
  );
}


import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import Pagination from '../components/Pagination';

const STATUS = { pending: '검수 대기', approved: '승인', rejected: '제외' };

export default function ResortImportsSection() {
  const [items,setItems] = useState([]); const [status,setStatus] = useState('pending');
  const [page,setPage] = useState(1); const [pageSize,setPageSize] = useState(30); const [total,setTotal] = useState(0); const [query,setQuery] = useState('');
  const [busy,setBusy] = useState(''); const [error,setError] = useState('');
  const totalPages = Math.max(1,Math.ceil(total/pageSize));
  const load = async () => { try { setError(''); const result = await api(`/api/admin/resort-imports?status=${status}&page=${page}&limit=${pageSize}&q=${encodeURIComponent(query)}`); setItems(result.items||[]); setTotal(result.total||0); } catch(e) { setError(e.message||'조회 실패'); } };
  useEffect(() => { void load(); },[status,page,pageSize]);
  const action = async (id,kind) => { try { setBusy(`${id}:${kind}`); if(kind==='approve') await api(`/api/admin/resort-imports/${id}/approve`,{method:'POST'}); else if(kind==='images') await api(`/api/admin/resort-imports/${id}/discover-images`,{method:'POST'}); else await api(`/api/admin/resort-imports/${id}`,{method:'PATCH',body:{status:'rejected'}}); await load(); } catch(e) { setError(e.message||'처리 실패'); } finally { setBusy(''); } };
  return <div className="admin-section resort-import-section">
    <section className="operation-page-head"><div><p className="section-kicker">PRIVATE REVIEW</p><h2>리조트 수집 데이터</h2><p>좌표가 검증된 후보만 표시되며, 승인 전에는 앱에 노출되지 않습니다.</p></div><div className="operation-page-actions"><span className="badge">{total.toLocaleString()}건</span><button onClick={load}>새로고침</button></div></section>
    <section className="card operation-data-card">
      <div className="resort-import-notice"><strong>출처와 이미지 권리 확인</strong><span>원문 링크는 항상 보존합니다. 원문 사진은 후보만 수집하며 이용 권리 확인 전에는 공개 리조트로 복사되지 않습니다.</span></div>
      <div className="resort-import-toolbar"><div>{Object.keys(STATUS).map(key=><button key={key} className={status===key?'active':''} onClick={()=>{setStatus(key);setPage(1);}}>{STATUS[key]}</button>)}</div><form onSubmit={(e)=>{e.preventDefault();setPage(1);void load();}}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="리조트명, 주소, 국가 검색"/><button>검색</button></form></div>
      {error && <p className="error">{error}</p>}
      <div className="resort-import-grid">{items.map(item=><article key={item.id} className="resort-import-card">
        <div className="resort-import-card-head"><div><span>{item.country_code||item.country||'--'}</span><h3>{item.name}</h3></div><span className={`badge ${item.status}`}>{STATUS[item.status]}</span></div>
        <p>{item.address||'주소 없음'}</p><dl><div><dt>좌표</dt><dd>{Number(item.latitude).toFixed(5)}, {Number(item.longitude).toFixed(5)}</dd></div><div><dt>인증</dt><dd>{(item.certifications||[]).join(', ')||'-'}</dd></div><div><dt>사진 후보</dt><dd>{(item.source_image_urls||[]).length}장 · 권리 {item.image_rights_status}</dd></div></dl>
        <a href={item.source_url} target="_blank" rel="noreferrer">출처: {item.source} 원문 보기</a>
        {item.source_image_urls?.[0] && <img src={item.source_image_urls[0]} alt="검수용 원문 후보"/>}
        {item.status==='pending' && <div className="resort-import-actions"><button disabled={!!busy} onClick={()=>action(item.id,'images')}>사진 후보 확인</button><button disabled={!!busy} onClick={()=>action(item.id,'reject')}>제외</button><button className="primary" disabled={!!busy} onClick={()=>action(item.id,'approve')}>리조트 승인</button></div>}
      </article>)}</div>
      {!items.length && <div className="resort-import-empty">해당 상태의 데이터가 없습니다.</div>}
      <Pagination page={page} totalPages={totalPages} setPage={setPage} total={total} pageSize={pageSize} setPageSize={setPageSize} label="리조트 후보"/>
    </section>
  </div>;
}

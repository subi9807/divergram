export default function LogsSection({ logs }) {
  return <div className="card"><h2>감사 로그</h2><table><thead><tr><th>시간</th><th>Action</th><th>Target User</th><th>Detail</th></tr></thead><tbody>{logs.map((l)=><tr key={l.id}><td>{new Date(l.created_at).toLocaleString()}</td><td>{l.action}</td><td>{l.target_user_id||'-'}</td><td><code>{JSON.stringify(l.detail)}</code></td></tr>)}</tbody></table></div>;
}

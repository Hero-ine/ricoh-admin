'use client';
import { useEffect, useRef, useState } from 'react';
import { LoginPage, IncidentPage, FaultPage } from './secondary-pages';
import { AdminSidebar } from './admin-sidebar';
import { Radio, RadioGroup } from '@/components/base/radio/radio';
import './recipient-controls.css';
import { MonitorStats } from './monitor-stats';
import { RiAddLine, RiSearchLine, RiSendPlaneLine, RiPencilLine, RiDeleteBinLine, RiCloseLine, RiCheckLine, RiErrorWarningLine } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { Select, SelectItem } from '@/components/base/select/select';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@/components/base/table/table';
import './data-table.css';
import './workspace.css';
import { Switch } from '@/components/base/switch/switch';

type Result = 'accepted' | 'failed' | 'unknown';
type Recipient = { id: string; name: string; gender?: string; note: string; masked: string; enabled: boolean; result?: Result; time?: string; reason?: string };
type Incident = { id: string; recipientId: string; name: string; type: 'fault' | 'recovery'; time: string; result: Result; reason?: string };
type Health = { status: 'healthy' | 'fault' | 'unknown'; checkedAt: string | null; productCount: number };
type Snapshot = { recipients: Recipient[]; faultRecipientId: string | null; incidents: Incident[]; health: Health };

class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers }, cache: 'no-store' });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, body?.error || '请求失败');
  return body as T;
}
const formatTime = (value?: string) => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '';
const labels = { accepted: '平台已接受', failed: '发送失败', unknown: '结果未确认' };

export default function Home() {
  const [auth, setAuth] = useState<'loading' | 'authenticated' | 'anonymous'>('loading');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [fault, setFault] = useState('');
  const [health, setHealth] = useState<Health>({ status: 'unknown', checkedAt: null, productCount: 3 });
  const [tab, setTab] = useState('recipients');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [gender, setGender] = useState('');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [modal, setModal] = useState<'edit' | 'test' | 'delete' | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [note, setNote] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = recipients.find(r => r.id === selected);

  function applySnapshot(snapshot: Snapshot) {
    setRecipients(snapshot.recipients); setFault(snapshot.faultRecipientId || ''); setIncidents(snapshot.incidents); setHealth(snapshot.health);
  }
  async function loadSnapshot() { applySnapshot(await api<Snapshot>('/api/admin/snapshot')); }
  useEffect(() => { void loadSnapshot().then(() => setAuth('authenticated')).catch(error => setAuth(error instanceof ApiError && error.status === 401 ? 'anonymous' : 'anonymous')); }, []);
  function notify(message: string) { setToast(message); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setToast(''), 3200); }
  function close() { dialog.current?.close(); setModal(null); setKey(''); setError(''); }
  function open(kind: 'edit' | 'test' | 'delete', recipient?: Recipient) {
    setSelected(recipient?.id ?? null); setName(recipient?.name ?? ''); setGender(recipient?.gender ?? ''); setNote(recipient?.note ?? ''); setKey(''); setEnabled(recipient?.enabled ?? true); setError(''); setModal(kind); dialog.current?.showModal();
  }
  async function login(username: string, password: string) {
    try { await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }); await loadSnapshot(); setAuth('authenticated'); setTab('recipients'); return null; }
    catch (error) { return error instanceof Error ? error.message : '登录失败'; }
  }
  async function logout() { await api('/api/auth/logout', { method: 'POST' }).catch(() => undefined); setAuth('anonymous'); }
  async function save() {
    if (!name.trim()) return setError('请填写收件人名称');
    if (!selected && !/^SCT[A-Za-z0-9]{8,100}$/.test(key.trim())) return setError('请输入正确的 SendKey');
    setBusy(true); setError('');
    try {
      const payload = { name: name.trim(), gender, note: note.trim(), enabled, ...(key.trim() ? { sendKey: key.trim() } : {}) };
      await api(selected ? `/api/admin/recipients/${selected}` : '/api/admin/recipients', { method: selected ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      await loadSnapshot(); close(); notify('收件人已保存');
    } catch (error) { setError(error instanceof Error ? error.message : '保存失败'); }
    finally { setBusy(false); }
  }
  async function setRecipientEnabled(recipient: Recipient, value: boolean) {
    setRecipients(list => list.map(item => item.id === recipient.id ? { ...item, enabled: value } : item));
    try { await api(`/api/admin/recipients/${recipient.id}`, { method: 'PATCH', body: JSON.stringify({ enabled: value }) }); }
    catch (error) { await loadSnapshot().catch(() => undefined); notify(error instanceof Error ? error.message : '更新失败'); }
  }
  async function testRecipient() {
    if (!current) return; setBusy(true); setError('');
    try { const result = await api<{ result: Result; reason?: string }>(`/api/admin/recipients/${current.id}/test`, { method: 'POST' }); await loadSnapshot(); close(); notify(labels[result.result]); }
    catch (error) { await loadSnapshot().catch(() => undefined); setError(error instanceof Error ? error.message : '发送失败'); }
    finally { setBusy(false); }
  }
  async function removeRecipient() {
    if (!current) return; setBusy(true); setError('');
    try { await api(`/api/admin/recipients/${current.id}`, { method: 'DELETE' }); await loadSnapshot(); close(); notify('收件人已删除'); }
    catch (error) { setError(error instanceof Error ? error.message : '删除失败'); }
    finally { setBusy(false); }
  }
  async function saveFault(id: string) { await api('/api/admin/fault', { method: 'PUT', body: JSON.stringify({ recipientId: id }) }); setFault(id); notify('故障接收人已更新'); }

  const visible = recipients.filter(r => `${r.name} ${r.note} ${r.masked}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'all' || r.enabled === (filter === 'enabled')) && (genderFilter === 'all' || r.gender === genderFilter));
  if (auth === 'loading') return <main className="admin-loading">正在载入后台…</main>;
  if (auth === 'anonymous') return <LoginPage onLogin={login}/>;

  return <main className="ricoh-shell"><AdminSidebar selected={tab} onSelect={setTab} count={incidents.length} onLogout={() => void logout()}/><div className="workspace-content">
    <div className="page-heading"><h1>{tab === 'recipients' ? '收件人管理' : tab === 'incidents' ? '异常记录' : '故障通知'}</h1></div>
    {tab === 'recipients' && <MonitorStats enabled={recipients.filter(r => r.enabled).length} total={recipients.length} health={health}/>}
    <section className="work-panel">
      {tab === 'recipients' && <><div className="toolbar recipient-toolbar"><div className="result-count" aria-live="polite"><span>筛选结果</span><strong>{visible.length} 位收件人</strong></div><div className="recipient-actions"><Input className="search-field" aria-label="搜索收件人" placeholder="搜索收件人" leadingIcon={RiSearchLine} value={query} onChange={setQuery}/><Select aria-label="库存推送筛选" selectedKey={filter} onSelectionChange={v => setFilter(String(v))} className="status-filter"><SelectItem id="all">全部状态</SelectItem><SelectItem id="enabled">推送开启</SelectItem><SelectItem id="paused">推送暂停</SelectItem></Select><Select aria-label="性别筛选" selectedKey={genderFilter} onSelectionChange={v => setGenderFilter(String(v))} className="gender-filter"><SelectItem id="all">全部性别</SelectItem><SelectItem id="male">男</SelectItem><SelectItem id="female">女</SelectItem></Select><Button leadingIcon={RiAddLine} className="add-button" onClick={() => open('edit')}>新增收件人</Button></div></div>
      <div className="table-scroll"><Table aria-label="收件人列表" className="recipient-data-table" size="md"><TableHeader><TableColumn isRowHeader>收件人</TableColumn><TableColumn>SendKey</TableColumn><TableColumn>库存推送</TableColumn><TableColumn>最近发送</TableColumn><TableColumn>操作</TableColumn></TableHeader><TableBody renderEmptyState={() => '暂无收件人'}>{visible.map(r => <TableRow id={r.id} key={r.id} textValue={r.name}><TableCell><div className="name-line"><strong>{r.name}</strong>{r.id === fault && <span className="role-badge">故障接收人</span>}</div><small>{r.note || (r.gender === 'male' ? '男' : r.gender === 'female' ? '女' : '无备注')}</small></TableCell><TableCell><span className="key-value">{r.masked}</span></TableCell><TableCell><Switch aria-label={`${r.name}库存推送`} isSelected={r.enabled} onChange={value => void setRecipientEnabled(r, value)}/></TableCell><TableCell>{r.result ? <><span className={`send-result ${r.result}`}>{r.result === 'accepted' ? <RiCheckLine size={16}/> : <RiErrorWarningLine size={16}/>} {labels[r.result]}</span><small title={r.time}>{formatTime(r.time)}</small></> : <span className="muted">尚未发送</span>}</TableCell><TableCell><div className="row-actions"><Button variant="secondary" iconOnly leadingIcon={RiSendPlaneLine} title="发送测试" aria-label={`向${r.name}发送测试`} onClick={() => open('test',r)}/><Button variant="secondary" iconOnly leadingIcon={RiPencilLine} title="编辑" aria-label={`编辑${r.name}`} onClick={() => open('edit',r)}/><Button variant="secondary" iconOnly leadingIcon={RiDeleteBinLine} title="删除" aria-label={`删除${r.name}`} className="delete-action" onClick={() => open('delete',r)}/></div></TableCell></TableRow>)}</TableBody></Table></div>
      <footer className="table-footer"><span/><span>服务端配置</span></footer></>}
      {tab === 'incidents' && <IncidentPage incidents={incidents}/>}
      {tab === 'fault' && <FaultPage recipients={recipients} fault={fault} onSave={saveFault}/>}
    </section>
    <dialog ref={dialog} className="edit-dialog" onCancel={close}><div className="dialog-heading"><h2>{modal === 'edit' ? selected ? '编辑收件人' : '新增收件人' : modal === 'test' ? '发送测试' : '删除收件人'}</h2><Button variant="ghost" iconOnly leadingIcon={RiCloseLine} onClick={close} aria-label="关闭"/></div>
      {modal === 'edit' && <form onSubmit={e=>{e.preventDefault();void save();}}><div className="form-fields"><Input label="名称" value={name} onChange={setName} maxLength={64} isRequired/><div className="gender-field"><span id="gender-label" className="text-body-medium">性别</span><RadioGroup aria-labelledby="gender-label" value={gender} onChange={setGender} orientation="horizontal" className="gender-options"><Radio value="male">男</Radio><Radio value="female">女</Radio></RadioGroup></div><Input label="SendKey" value={key} onChange={setKey} type="password" maxLength={120} autoComplete="off" placeholder={selected ? '留空保留原值' : 'SCT...'}/><p className="muted">SendKey 仅保存在服务端，编辑时不会回显。</p><Input label="备注" value={note} onChange={setNote} maxLength={240}/><div className="form-toggle"><span>库存推送</span><Switch aria-label="库存推送" isSelected={enabled} onChange={setEnabled}/></div><p role="alert" className="form-error">{error}</p></div><div className="dialog-actions"><Button variant="secondary" onClick={close} type="button">取消</Button><Button type="submit" disabled={busy}>{busy ? '保存中' : '保存收件人'}</Button></div></form>}
      {modal === 'test' && <div className="form-fields"><strong>{current?.name}</strong><p>将向该收件人发送一条真实测试消息。</p><p role="alert" className="form-error">{error}</p><Button disabled={busy} onClick={() => void testRecipient()}>{busy ? '发送中' : '发送测试'}</Button></div>}
      {modal === 'delete' && <div className="form-fields"><p>{current?.id === fault ? '请先更换故障接收人，再删除此收件人。' : `确定删除「${current?.name}」？`}</p><p role="alert" className="form-error">{error}</p><Button variant="danger" disabled={busy || current?.id===fault} onClick={() => void removeRecipient()}>{busy ? '删除中' : '删除收件人'}</Button></div>}
    </dialog><div className="toast-message" role="status" hidden={!toast}>{toast}</div>
  </div></main>;
}

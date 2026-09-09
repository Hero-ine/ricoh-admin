'use client';
import { useState } from 'react';
import { RiSearchLine } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { Select, SelectItem } from '@/components/base/select/select';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@/components/base/table/table';
import './secondary-pages.css';

export function LoginPage({ onLogin }: { onLogin: (username: string, password: string) => Promise<string | null> }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return <main className="admin-login"><form className="admin-login-form" onSubmit={async e => { e.preventDefault(); if (!name.trim() || !password) { setError('请填写账号和密码'); return; } setBusy(true); setError((await onLogin(name.trim(), password)) || ''); setBusy(false); }}>
    <div><h1>管理员登录</h1><p className="text-body-regular text-text-secondary">本地演示</p></div>
    <Input label="账号" value={name} onChange={setName} autoComplete="username" isRequired/>
    <div className="login-password"><Input label="密码" type="password" value={password} onChange={setPassword} autoComplete="current-password" isRequired/></div>
    <p role="alert" className="text-body-regular text-text-secondary">{error || '请输入后台管理员账号。'}</p>
    <Button type="submit" disabled={busy}>{busy ? '登录中' : '登录'}</Button>
  </form></main>;
}

type Incident = { id: string; name: string; type: 'fault' | 'recovery'; time: string; result: 'accepted' | 'failed' | 'unknown'; reason?: string };
export function IncidentPage({ incidents }: { incidents: Incident[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const visible = incidents.filter(i => i.name.includes(query.trim()) && (filter === 'all' || i.result === filter));
  return <div className="admin-secondary">
    <div className="secondary-toolbar"><span aria-live="polite">{visible.length} 条记录</span><div><Input aria-label="搜索故障接收人" placeholder="搜索收件人" leadingIcon={RiSearchLine} value={query} onChange={setQuery}/><Select aria-label="发送结果" selectedKey={filter} onSelectionChange={v => setFilter(String(v))}><SelectItem id="all">全部结果</SelectItem><SelectItem id="accepted">平台已接受</SelectItem><SelectItem id="failed">发送失败</SelectItem><SelectItem id="unknown">结果未确认</SelectItem></Select></div></div>
    <div className="table-scroll"><Table aria-label="故障通知记录" className="incident-table"><TableHeader><TableColumn>类型</TableColumn><TableColumn isRowHeader>收件人</TableColumn><TableColumn>发送时间</TableColumn><TableColumn>结果</TableColumn><TableColumn>详情</TableColumn></TableHeader><TableBody renderEmptyState={() => <div className="incident-empty">{incidents.length ? '没有匹配的发送记录' : '暂无故障通知记录'}</div>}>{visible.map(i => <TableRow id={i.id} key={i.id} textValue={i.name}><TableCell>{i.type === 'fault' ? '故障' : '恢复'}</TableCell><TableCell>{i.name}</TableCell><TableCell>{i.time}</TableCell><TableCell>{i.result === 'accepted' ? '平台已接受' : i.result === 'failed' ? '发送失败' : '结果未确认'}</TableCell><TableCell>{i.reason || '—'}</TableCell></TableRow>)}</TableBody></Table></div>
  </div>;
}

export function FaultPage({ recipients, fault, onSave }: { recipients: {id: string; name: string; masked: string; enabled: boolean}[]; fault: string; onSave: (id: string) => Promise<void> }) {
  const [draft, setDraft] = useState(fault);
  const current = recipients.find(r => r.id === draft);
  const dirty = draft !== String(fault);
  return <form className="admin-fault" onSubmit={async e => {e.preventDefault(); if(current) await onSave(current.id);}}>
    <div className="fault-section"><h2>故障与恢复通知</h2><p>库存推送暂停后，故障通知仍发送给此接收人。</p></div>
    <Select aria-label="固定接收人" selectedKey={draft} onSelectionChange={v => setDraft(String(v))}>{recipients.map(r => <SelectItem key={r.id} id={String(r.id)}>{r.name}</SelectItem>)}</Select>
    {current && <dl className="fault-detail"><div><dt>SendKey</dt><dd>{current.masked}</dd></div><div><dt>库存推送</dt><dd>{current.enabled ? '开启' : '暂停'}</dd></div><div><dt>通知范围</dt><dd>监控故障、恢复</dd></div></dl>}
    <div className="fault-actions"><Button variant="secondary" disabled={!dirty} onClick={() => setDraft(String(fault))}>取消</Button><Button type="submit" disabled={!dirty || !current}>保存设置</Button></div>
  </form>;
}




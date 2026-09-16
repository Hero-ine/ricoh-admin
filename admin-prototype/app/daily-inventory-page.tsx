'use client';
import { useEffect, useState } from 'react';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@/components/base/table/table';
import { Button } from '@/components/base/buttons/button';
import { RiRefreshLine } from '@remixicon/react';
type Row = {date:string; values:Record<string,number|null>; incomplete:boolean};
const columns = ['gr4-refurb','gr3x-refurb','gr3x-hdf-refurb','membership-card'];
export function DailyInventoryPage() {
  const [rows,setRows]=useState<Row[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [refresh,setRefresh]=useState(0);
  useEffect(()=>{
    const controller=new AbortController(); setLoading(true);setError('');
    fetch('/api/admin/daily-inventory',{cache:'no-store',signal:controller.signal})
      .then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||'读取失败');setRows(data.rows);})
      .catch(error=>{if(!controller.signal.aborted)setError(error.message);})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[refresh]);
  return <>
    <div className="toolbar"><span className="muted">00:00–22:00 · 北京时间</span><Button variant="secondary" iconOnly leadingIcon={RiRefreshLine} aria-label="刷新每日库存" title="刷新" disabled={loading} onClick={()=>setRefresh(v=>v+1)}/></div>
    {error ? <p role="alert" className="form-error">{error}</p> : <div className="table-scroll"><Table aria-label="每日库存更新" className="recipient-data-table daily-inventory-table"><TableHeader><TableColumn isRowHeader>日期</TableColumn><TableColumn>GR IV</TableColumn><TableColumn>GR IIIx</TableColumn><TableColumn>GR IIIx HDF</TableColumn><TableColumn>会员卡</TableColumn></TableHeader><TableBody renderEmptyState={()=>loading?'正在加载':'暂无每日统计'}>{rows.map(row=><TableRow key={row.date} id={row.date}><TableCell><strong>{row.date}</strong>{row.incomplete&&<small>数据不完整</small>}</TableCell>{columns.map(id=><TableCell key={id}>{row.values[id]??'—'}</TableCell>)}</TableRow>)}</TableBody></Table></div>}
  </>;
}

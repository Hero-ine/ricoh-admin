'use client';
import { useEffect, useState } from 'react';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@/components/base/table/table';
import { Button } from '@/components/base/buttons/button';
import { PillTab, PillTabList } from '@/components/base/tabs/pill-tab';
import { RiRefreshLine } from '@remixicon/react';
type Row = {date:string; values:Record<string,number|null>; incomplete:boolean};
const productColumns = {
  refurb: [{id:'gr4-refurb',label:'GR IV'},{id:'gr3-refurb',label:'GR III'},{id:'gr3x-refurb',label:'GR IIIx'},{id:'gr3x-hdf-refurb',label:'GR IIIx HDF'}],
  new: [{id:'gr3-new',label:'GR III'},{id:'gr3x-new',label:'GR IIIx'},{id:'gr3x-hdf-new',label:'GR IIIx HDF'}],
};
export function DailyInventoryPage() {
  const [condition,setCondition]=useState<'refurb'|'new'>('refurb');
  const columns=[...productColumns[condition],{id:'membership-card',label:'会员卡'}];
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
    <div className="toolbar flex-wrap">
      <span className="muted">00:00–22:00 · 北京时间</span>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <PillTabList aria-label="商品类型" className="rounded-2lg bg-background-secondary-default p-1 [&>span]:bg-white">
          <PillTab variant="gray" isSelected={condition==='refurb'} onSelect={()=>setCondition('refurb')} className="min-w-16 justify-center">官翻</PillTab>
          <PillTab variant="gray" isSelected={condition==='new'} onSelect={()=>setCondition('new')} className="min-w-16 justify-center">全新</PillTab>
        </PillTabList>
        <Button variant="secondary" iconOnly leadingIcon={RiRefreshLine} aria-label="刷新每日库存" title="刷新" disabled={loading} onClick={()=>setRefresh(v=>v+1)}/>
      </div>
    </div>
    {error ? <p role="alert" className="form-error">{error}</p> : <div className="table-scroll">
      <Table key={condition} aria-label={`每日库存更新 · ${condition==='refurb'?'官翻':'全新'}`} className="recipient-data-table daily-inventory-table">
        <TableHeader columns={[{id:'date',label:'日期'},...columns]}>{column=><TableColumn id={column.id} isRowHeader={column.id==='date'}>{column.label}</TableColumn>}</TableHeader>
        <TableBody renderEmptyState={()=>loading?'正在加载':'暂无每日统计'}>{rows.map(row=><TableRow key={row.date} id={row.date} columns={[{id:'date',label:'日期'},...columns]}>{column=><TableCell>{column.id==='date'?<><strong>{row.date}</strong>{row.incomplete&&<small>数据不完整</small>}</>:row.values[column.id]??'—'}</TableCell>}</TableRow>)}</TableBody>
      </Table>
    </div>}
  </>;
}

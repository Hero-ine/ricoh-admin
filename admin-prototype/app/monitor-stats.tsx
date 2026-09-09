import { RiPulseLine, RiTimeLine, RiGroupLine, RiCameraLine } from '@remixicon/react';
import { StatCards, type Stat } from '@/components/application/dashboard/stat-cards';
import './monitor-stats.css';

type Health = { status: 'healthy' | 'fault' | 'unknown'; checkedAt: string | null; productCount: number };
const statusText = { healthy: '运行正常', fault: '运行异常', unknown: '尚未连接' };

export function MonitorStats({ enabled, total, health }: { enabled: number; total: number; health: Health }) {
  const checkedAt = health.checkedAt ? new Date(health.checkedAt).toLocaleString('zh-CN', { hour12: false }) : '尚无记录';
  const stats: Stat[] = [
    { icon: RiPulseLine, label: '运行状态', value: statusText[health.status], delta: '', deltaColor: health.status === 'healthy' ? 'lime' : health.status === 'fault' ? 'rose' : 'neutral', tone: 'emerald' },
    { icon: RiTimeLine, label: '最近检查', value: checkedAt, delta: '', deltaColor: 'neutral', tone: 'sky' },
    { icon: RiGroupLine, label: '启用收件人', value: `${enabled} 人`, delta: `${total} 人`, deltaColor: 'neutral', tone: 'blue' },
    { icon: RiCameraLine, label: '监控商品', value: `${health.productCount} 款`, delta: '', deltaColor: 'neutral', tone: 'orange', hint: 'GR IV、GR IIIx、GR IIIx HDF 官翻商品' },
  ];
  return <StatCards variant="footer" stats={stats} className="monitor-stats"/>;
}


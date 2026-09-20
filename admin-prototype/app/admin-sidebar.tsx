'use client';
import { useEffect, useRef, useState } from 'react';
import { SidebarProfile } from './sidebar-profile';
import { RiMenuLine } from '@remixicon/react';
import { UserIcon, CalendarCheckIcon, BadgeAlertIcon, BellIcon } from './sidebar-icons';
import { DashboardSidebar } from '@/components/application/dashboard/dashboard-sidebar';
import { Button } from '@/components/base/buttons/button';
import './sidebar.css';
import './sidebar-spacing.css';

export function AdminSidebar({ selected, onSelect, count, onLogout }: { selected: string; onSelect: (key: string) => void; count: number; onLogout: () => void }) {
  const drawer = useRef<HTMLDialogElement>(null);
  const [dailyDates, setDailyDates] = useState<string[]>([]);
  const [seenDate, setSeenDate] = useState('');
  const currentTab = useRef(selected);
  currentTab.current = selected;
  const seenKey = 'ricoh-admin.daily-inventory.seen-date';
  function markDailySeen(date: string) {
    if (!date) return;
    setSeenDate(previous => previous > date ? previous : date);
    try {
      const stored = localStorage.getItem(seenKey) || '';
      localStorage.setItem(seenKey, stored > date ? stored : date);
    } catch { /* Keep the session read state if browser storage is unavailable. */ }
  }
  useEffect(() => {
    try { setSeenDate(localStorage.getItem(seenKey) || ''); } catch {}
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function refreshDailyBadge() {
      try {
        const response = await fetch('/api/admin/daily-inventory', {cache:'no-store', signal:controller.signal});
        if (response.ok) {
          const data = await response.json();
          if (controller.signal.aborted) return;
          const dates = [...new Set<string>((data.rows || []).map((row: {date:string}) => row.date))].sort().reverse();
          setDailyDates(dates);
          if (currentTab.current === 'daily' && dates[0]) markDailySeen(dates[0]);
        }
      } catch { /* Failed reads must not create or clear notifications. */ }
      finally { if (!controller.signal.aborted) timer = setTimeout(refreshDailyBadge, 60000); }
    }
    const syncSeen = (event: StorageEvent) => {
      if (event.key === seenKey && event.newValue) setSeenDate(event.newValue);
    };
    window.addEventListener('storage', syncSeen);
    void refreshDailyBadge();
    return () => { controller.abort(); clearTimeout(timer); window.removeEventListener('storage', syncSeen); };
  }, []);
  const dailyUnread = dailyDates.filter(date => date > seenDate).length;
  const items = [
    { key: 'recipients', label: '收件人', icon: UserIcon },
    { key: 'daily', label: '每日库存更新', icon: CalendarCheckIcon, badge: dailyUnread || undefined },
    { key: 'incidents', label: '异常记录', icon: BadgeAlertIcon, badge: count || undefined },
    { key: 'fault', label: '故障通知', icon: BellIcon },
  ].map(item => ({ ...item, onClick: () => { if (item.key === 'daily') markDailySeen(dailyDates[0]); onSelect(item.key); drawer.current?.close(); } }));
  const props = { items, selected, profile: <SidebarProfile onLogout={() => { drawer.current?.close(); onLogout(); }}/>, collapsible: false, showTemplateExtras: false, showThemeToggle: false };
  return <>
    <div className="desktop-navigation"><DashboardSidebar {...props}/></div>
    <div className="mobile-navigation"><Button variant="secondary" iconOnly leadingIcon={RiMenuLine} aria-label="打开导航" onClick={() => drawer.current?.showModal()}/></div>
    <dialog ref={drawer} className="navigation-drawer" aria-label="管理导航"><DashboardSidebar {...props} mobile onClose={() => drawer.current?.close()}/></dialog>
  </>;
}

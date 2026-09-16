'use client';
import { useRef } from 'react';
import { SidebarProfile } from './sidebar-profile';
import { RiUserLine, RiErrorWarningLine, RiNotification3Line, RiMenuLine, RiCalendarLine } from '@remixicon/react';
import { DashboardSidebar } from '@/components/application/dashboard/dashboard-sidebar';
import { Button } from '@/components/base/buttons/button';
import './sidebar.css';
import './sidebar-spacing.css';

export function AdminSidebar({ selected, onSelect, count, onLogout }: { selected: string; onSelect: (key: string) => void; count: number; onLogout: () => void }) {
  const drawer = useRef<HTMLDialogElement>(null);
  const items = [
    { key: 'recipients', label: '收件人', icon: RiUserLine },
    { key: 'daily', label: '每日库存更新', icon: RiCalendarLine },
    { key: 'incidents', label: '异常记录', icon: RiErrorWarningLine, badge: count || undefined },
    { key: 'fault', label: '故障通知', icon: RiNotification3Line },
  ].map(item => ({ ...item, onClick: () => { onSelect(item.key); drawer.current?.close(); } }));
  const props = { items, selected, profile: <SidebarProfile onLogout={() => { drawer.current?.close(); onLogout(); }}/>, collapsible: false, showTemplateExtras: false, showThemeToggle: false };
  return <>
    <div className="desktop-navigation"><DashboardSidebar {...props}/></div>
    <div className="mobile-navigation"><Button variant="secondary" iconOnly leadingIcon={RiMenuLine} aria-label="打开导航" onClick={() => drawer.current?.showModal()}/></div>
    <dialog ref={drawer} className="navigation-drawer" aria-label="管理导航"><DashboardSidebar {...props} mobile onClose={() => drawer.current?.close()}/></dialog>
  </>;
}


import type { Metadata } from 'next';
import '@/styles/globals.css';
import './ricoh.css';
import './responsive.css';
import './typography.css';
export const metadata: Metadata = { title: '收件人管理 · 理光' };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}

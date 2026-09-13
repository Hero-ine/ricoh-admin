import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies, headers } from 'next/headers';

export const SESSION_COOKIE = 'ricoh_admin_session';
const secret = () => process.env.ADMIN_SESSION_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'local-development-only-secret');
const credentials = () => {
  if (process.env.NODE_ENV === 'production' && (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET)) {
    throw new Error('管理员凭据未配置');
  }
  return { username: process.env.ADMIN_USERNAME || 'admin', password: process.env.ADMIN_PASSWORD || 'ricoh-demo' };
};
const sign = (value: string) => createHmac('sha256', secret()).update(value).digest('base64url');
const equal = (a: string, b: string) => { const aa = Buffer.from(a); const bb = Buffer.from(b); return aa.length === bb.length && timingSafeEqual(aa, bb); };

export function verifyCredentials(username: string, password: string) { const expected = credentials(); return equal(username, expected.username) && equal(password, expected.password); }
export function createSession() { if (!secret()) throw new Error('ADMIN_SESSION_SECRET 未配置'); const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url'); return `${payload}.${sign(payload)}`; }
export async function isAuthenticated() { const token = (await cookies()).get(SESSION_COOKIE)?.value; if (!token || !secret()) return false; const [payload, signature] = token.split('.'); if (!payload || !signature || !equal(signature, sign(payload))) return false; try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now(); } catch { return false; } }
export async function requireAdmin(request?: Request) {
  if (!await isAuthenticated()) return Response.json({ error: '请先登录' }, { status: 401 });
  if (request && request.method !== 'GET') {
    const incoming = await headers();
    const origin = incoming.get('origin');
    // Next.js may rebuild request.url with the internal port behind an SSH tunnel.
    const host = incoming.get('host');
    if (origin && (!host || origin !== `${new URL(request.url).protocol}//${host}`)) {
      return Response.json({ error: '请求来源无效' }, { status: 403 });
    }
  }
  return null;
}

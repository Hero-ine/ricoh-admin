import { cookies } from 'next/headers';
import { createSession, SESSION_COOKIE, verifyCredentials } from '@/lib/auth';
import { readObject } from '@/lib/http';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const body = await readObject(request);
    if (!verifyCredentials(String(body.username || ''), String(body.password || ''))) return Response.json({ error: '账号或密码错误' }, { status: 401 });
    (await cookies()).set(SESSION_COOKIE, createSession(), { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 8 * 60 * 60 });
    return Response.json({ authenticated: true });
  } catch { return Response.json({ error: '登录服务未配置' }, { status: 503 }); }
}

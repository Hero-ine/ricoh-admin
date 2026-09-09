import { StoreError } from './admin-store';

export function jsonError(error: unknown) {
  if (error instanceof StoreError) return Response.json({ error: error.message }, { status: error.status });
  console.error('[admin-api]', error instanceof Error ? error.message : 'unknown error');
  return Response.json({ error: '服务器处理失败' }, { status: 500 });
}

export async function readObject(request: Request) {
  const body = await request.json();
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new StoreError(400, '请求数据格式不正确');
  return body as Record<string, unknown>;
}

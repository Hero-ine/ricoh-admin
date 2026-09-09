import { requireAdmin } from '@/lib/auth';
import { getSnapshot } from '@/lib/admin-store';
import { jsonError } from '@/lib/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) { const denied = await requireAdmin(request); if (denied) return denied; try { return Response.json(await getSnapshot(), { headers: { 'Cache-Control': 'no-store' } }); } catch (error) { return jsonError(error); } }

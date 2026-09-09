import { requireAdmin } from '@/lib/auth';
import { createRecipient } from '@/lib/admin-store';
import { jsonError, readObject } from '@/lib/http';
export const runtime = 'nodejs';
export async function POST(request: Request) { const denied = await requireAdmin(request); if (denied) return denied; try { return Response.json(await createRecipient(await readObject(request)), { status: 201 }); } catch (error) { return jsonError(error); } }

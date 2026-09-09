import { requireAdmin } from '@/lib/auth';
import { setFaultRecipient } from '@/lib/admin-store';
import { jsonError, readObject } from '@/lib/http';
export const runtime = 'nodejs';
export async function PUT(request: Request) { const denied = await requireAdmin(request); if (denied) return denied; try { const body = await readObject(request); return Response.json({ faultRecipientId: await setFaultRecipient(String(body.recipientId || '')) }); } catch (error) { return jsonError(error); } }

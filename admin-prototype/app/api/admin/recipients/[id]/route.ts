import { requireAdmin } from '@/lib/auth';
import { deleteRecipient, updateRecipient } from '@/lib/admin-store';
import { jsonError, readObject } from '@/lib/http';
export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) { const denied = await requireAdmin(request); if (denied) return denied; try { return Response.json(await updateRecipient((await context.params).id, await readObject(request))); } catch (error) { return jsonError(error); } }
export async function DELETE(request: Request, context: Context) { const denied = await requireAdmin(request); if (denied) return denied; try { await deleteRecipient((await context.params).id); return new Response(null, { status: 204 }); } catch (error) { return jsonError(error); } }

import { requireAdmin } from '@/lib/auth';
import { getSecretRecipient, updateDeliveryStatus } from '@/lib/admin-store';
import { jsonError } from '@/lib/http';
import { sendServerChanTest } from '@/lib/server-chan';
export const runtime = 'nodejs';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(request); if (denied) return denied;
  try {
    const recipient = await getSecretRecipient((await params).id); if (!recipient) return Response.json({ error: '收件人不存在' }, { status: 404 });
    const result = await sendServerChanTest(recipient.sendKey);
    await updateDeliveryStatus(recipient.id, result.result, 'reason' in result ? result.reason : '');
    return Response.json(result, { status: result.result === 'failed' ? 502 : 200 });
  } catch (error) { return jsonError(error); }
}

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { requireAdmin } from '@/lib/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const denied = await requireAdmin(request); if (denied) return denied;
  try {
    const directory = path.resolve(/* turbopackIgnore: true */ process.env.RICOH_ADMIN_DATA_DIR || path.join(process.cwd(), '..', '.admin-data'));
    const state = JSON.parse(await readFile(/* turbopackIgnore: true */ path.join(directory, 'daily-inventory.json'), 'utf8'));
    const rows = Object.values(state.days).filter((row: any) => row.finalized).sort((a: any,b: any) => b.date.localeCompare(a.date));
    return Response.json({ rows, updatedAt: state.updatedAt }, { headers: {'Cache-Control':'no-store'} });
  } catch(error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return Response.json({rows:[],updatedAt:null});
    return Response.json({error:'库存统计暂时无法读取'}, {status:503});
  }
}

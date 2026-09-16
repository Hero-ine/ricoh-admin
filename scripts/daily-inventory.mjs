import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const categories = ['gr4-refurb', 'gr3x-refurb', 'gr3x-hdf-refurb', 'membership-card'];
const dayOf = time => new Date(time + 8 * 3600000).toISOString().slice(0, 10);
const startOf = date => Date.parse(`${date}T00:00:00+08:00`);
const cutoffOf = date => startOf(date) + 22 * 3600000;
const emptyValues = () => Object.fromEntries(categories.map(id => [id, null]));

export function createDailyState(now) {
  return { version: 1, startedAt: now, cursors: {}, baselines: {}, days: {}, updatedAt: now };
}

// The matcher exposes numeric inventory through this exact, locally generated reason.
export function quantities(matches) {
  if (!Array.isArray(matches) || !matches.length) return null;
  const values = {};
  for (const match of matches) {
    const found = /^库存字段为 (\d+)$/.exec(match.reason || '');
    if (!found || !match.title || Object.hasOwn(values, match.title)) return null;
    const quantity = Number(found[1]);
    if (!Number.isSafeInteger(quantity)) return null;
    values[match.title] = quantity;
  }
  return values;
}

export function updateDaily(state, snapshot, now, gapMs = 60000) {
  // Create missing dates as incomplete, rather than silently omitting an outage.
  for (let t = startOf(dayOf(state.startedAt)); t <= now; t += 86400000) {
    const date = dayOf(t);
    state.days[date] ??= { date, values: emptyValues(), incomplete: state.startedAt > t + gapMs, finalized: false };
  }
  for (const id of categories) {
    const product = snapshot?.products?.[id];
    const entries = new Map();
    for (const entry of product?.history || []) entries.set(entry.checkedAt, { ...entry, ok: true });
    if (product) entries.set(product.checkedAt, product);
    for (const entry of [...entries.values()].sort((a,b) => Date.parse(a.checkedAt) - Date.parse(b.checkedAt))) {
      const time = Date.parse(entry.checkedAt);
      if (!Number.isFinite(time) || time < state.startedAt || time > now || time <= (state.cursors[id] || 0)) continue;
      const row = state.days[dayOf(time)];
      const baseline = state.baselines[id];
      const current = entry.ok === false ? null : quantities(entry.matches);
      const inWindow = time < cutoffOf(row.date);
      if (!row.finalized && inWindow) {
        if (!current || !baseline || time - baseline.time > gapMs) row.incomplete = true;
        if (current) {
          state.windowEnds ??= {};
          state.windowEnds[row.date] ??= {};
          state.windowEnds[row.date][id] = time;
          row.values[id] ??= 0;
          if (baseline && time - baseline.time <= gapMs) {
            for (const [key, quantity] of Object.entries(current)) {
              if (Object.hasOwn(baseline.values, key)) row.values[id] += Math.max(0, quantity - baseline.values[key]);
              else row.incomplete = true;
            }
            if (Object.keys(baseline.values).some(key => !Object.hasOwn(current,key))) row.incomplete = true;
          }
        }
      }
      state.baselines[id] = current ? {time, values: current} : null;
      state.cursors[id] = time;
    }
  }
  for (const row of Object.values(state.days)) {
    if (row.finalized || now < cutoffOf(row.date) + 5 * 60000) continue;
    for (const id of categories) {
      // Fresh post-cutoff observations cannot repair a missing end-of-window sample.
      if (row.values[id] === null) row.incomplete = true;
      const last = state.windowEnds?.[row.date]?.[id] || 0;
      if (cutoffOf(row.date) - last > gapMs) row.incomplete = true;
    }
    row.finalized = true;
  }
  state.updatedAt = now;
  return state;
}

export async function collect(directory, now = Date.now()) {
  const file = path.join(directory, '.admin-data', 'daily-inventory.json');
  let state;
  try { state = JSON.parse(await fs.readFile(file,'utf8')); }
  catch(error) { if(error.code !== 'ENOENT') throw error; state=createDailyState(now); }
  let snapshot;
  try { snapshot=JSON.parse(await fs.readFile(path.join(directory,'.monitor-state.json'),'utf8')); }
  catch { snapshot=null; }
  updateDaily(state,snapshot,now);
  await fs.mkdir(path.dirname(file),{recursive:true,mode:0o700});
  const temp=`${file}.${process.pid}.tmp`;
  await fs.writeFile(temp,JSON.stringify(state),{mode:0o600});
  await fs.rename(temp,file);
  console.log(`Daily inventory collected: ${Object.values(state.days).filter(r=>r.finalized).length} finalized days`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await collect(path.resolve(process.argv[2] || '.'));

import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type Gender = 'male' | 'female' | '';
export type DeliveryResult = 'accepted' | 'failed' | 'unknown';
export type StoredRecipient = { id: string; name: string; gender: Gender; note: string; sendKey: string; enabled: boolean; result?: DeliveryResult; time?: string; reason?: string; createdAt: string; updatedAt: string };
export type PublicRecipient = Omit<StoredRecipient, 'sendKey'> & { masked: string };
export type Incident = { id: string; recipientId: string; name: string; type: 'fault' | 'recovery'; result: DeliveryResult; reason: string; time: string };
type Store = { version: 1; recipients: StoredRecipient[]; faultRecipientId: string | null };

const dataDir = () => path.resolve(/* turbopackIgnore: true */ process.env.RICOH_ADMIN_DATA_DIR || path.join(process.cwd(), '..', '.admin-data'));
const storePath = () => path.join(dataDir(), 'recipients.json');
const incidentsPath = () => path.join(dataDir(), 'incidents.jsonl');
let queue = Promise.resolve();

function serialize<T>(task: () => Promise<T>) {
  const result = queue.then(task, task);
  queue = result.then(() => undefined, () => undefined);
  return result;
}

async function atomicJson(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, file);
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try { return JSON.parse(await readFile(/* turbopackIgnore: true */ file, 'utf8')) as T; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fallback; throw error; }
}

async function importExisting(): Promise<Store> {
  const empty: Store = { version: 1, recipients: [], faultRecipientId: null };
  const configFile = path.resolve(/* turbopackIgnore: true */ process.env.RICOH_MONITOR_CONFIG_PATH || path.join(process.cwd(), '..', 'monitor.config.json'));
  try {
    const config = JSON.parse(await readFile(/* turbopackIgnore: true */ configFile, 'utf8'));
    const configured = Array.isArray(config.notification?.serverChanSendKeys) ? config.notification.serverChanSendKeys : [];
    const legacy = config.notification?.serverChanSendKey ? [config.notification.serverChanSendKey] : [];
    const keys = [...new Set([...configured, ...legacy].map(v => String(v).trim()).filter(Boolean))];
    const now = new Date().toISOString();
    empty.recipients = keys.map((sendKey, index) => ({ id: randomUUID(), name: index === 0 ? '我的微信' : `收件人 ${index + 1}`, gender: '', note: index === 0 ? '原接收人' : '', sendKey, enabled: true, createdAt: now, updatedAt: now }));
    empty.faultRecipientId = empty.recipients[0]?.id ?? null;
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  await atomicJson(storePath(), empty);
  return empty;
}

async function readStore(): Promise<Store> {
  try { return JSON.parse(await readFile(/* turbopackIgnore: true */ storePath(), 'utf8')) as Store; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return importExisting(); throw error; }
}

const mask = (key: string) => `${key.slice(0, 6)}••••${key.slice(-4)}`;
const expose = ({ sendKey, ...recipient }: StoredRecipient): PublicRecipient => ({ ...recipient, masked: mask(sendKey) });
const validKey = (value: string) => /^SCT[A-Za-z0-9]{8,100}$/.test(value);
const cleanText = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);
const cleanGender = (value: unknown): Gender => value === 'male' || value === 'female' ? value : '';

export async function getSnapshot() {
  const [store, incidents, health] = await Promise.all([readStore(), readIncidents(), readHealth()]);
  return { recipients: store.recipients.map(expose), faultRecipientId: store.faultRecipientId, incidents, health };
}

export async function createRecipient(input: Record<string, unknown>) {
  return serialize(async () => {
    const store = await readStore();
    const name = cleanText(input.name, 64); const sendKey = cleanText(input.sendKey, 120);
    if (!name) throw new StoreError(400, '请填写收件人名称');
    if (!validKey(sendKey)) throw new StoreError(400, 'SendKey 格式不正确');
    if (store.recipients.some(r => r.sendKey === sendKey)) throw new StoreError(409, '这个 SendKey 已存在');
    const now = new Date().toISOString();
    const recipient: StoredRecipient = { id: randomUUID(), name, gender: cleanGender(input.gender), note: cleanText(input.note, 240), sendKey, enabled: input.enabled !== false, createdAt: now, updatedAt: now };
    store.recipients.push(recipient); store.faultRecipientId ??= recipient.id;
    await atomicJson(storePath(), store); return expose(recipient);
  });
}

export async function updateRecipient(id: string, input: Record<string, unknown>) {
  return serialize(async () => {
    const store = await readStore(); const index = store.recipients.findIndex(r => r.id === id);
    if (index < 0) throw new StoreError(404, '收件人不存在');
    const current = store.recipients[index]; const sendKey = cleanText(input.sendKey, 120);
    if (sendKey && !validKey(sendKey)) throw new StoreError(400, 'SendKey 格式不正确');
    if (sendKey && store.recipients.some(r => r.id !== id && r.sendKey === sendKey)) throw new StoreError(409, '这个 SendKey 已存在');
    const name = input.name === undefined ? current.name : cleanText(input.name, 64);
    if (!name) throw new StoreError(400, '请填写收件人名称');
    const next: StoredRecipient = { ...current, name, gender: input.gender === undefined ? current.gender : cleanGender(input.gender), note: input.note === undefined ? current.note : cleanText(input.note, 240), sendKey: sendKey || current.sendKey, enabled: input.enabled === undefined ? current.enabled : input.enabled === true, updatedAt: new Date().toISOString() };
    store.recipients[index] = next; await atomicJson(storePath(), store); return expose(next);
  });
}

export async function deleteRecipient(id: string) {
  return serialize(async () => {
    const store = await readStore();
    if (store.faultRecipientId === id) throw new StoreError(409, '请先指定其他故障接收人');
    const next = store.recipients.filter(r => r.id !== id);
    if (next.length === store.recipients.length) throw new StoreError(404, '收件人不存在');
    store.recipients = next; await atomicJson(storePath(), store);
  });
}

export async function setFaultRecipient(id: string) {
  return serialize(async () => { const store = await readStore(); if (!store.recipients.some(r => r.id === id)) throw new StoreError(404, '收件人不存在'); store.faultRecipientId = id; await atomicJson(storePath(), store); return id; });
}

export async function updateDeliveryStatus(id: string, result: DeliveryResult, reason = '') {
  return serialize(async () => {
    const store = await readStore(); const recipient = store.recipients.find(r => r.id === id);
    if (!recipient) throw new StoreError(404, '收件人不存在');
    recipient.result = result; recipient.time = new Date().toISOString(); recipient.reason = reason; recipient.updatedAt = recipient.time;
    await atomicJson(storePath(), store); return expose(recipient);
  });
}

export async function getSecretRecipient(id: string) { const store = await readStore(); return store.recipients.find(r => r.id === id) ?? null; }
async function readIncidents() {
  try {
    return (await readFile(/* turbopackIgnore: true */ incidentsPath(), 'utf8')).trim().split('\n').filter(Boolean).slice(-500).reverse().map(line => JSON.parse(line) as Incident);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}
export async function recordIncident(incident: Omit<Incident, 'id' | 'time'>) {
  await mkdir(dataDir(), { recursive: true, mode: 0o700 });
  const item = { ...incident, id: randomUUID(), time: new Date().toISOString() };
  await appendFile(incidentsPath(), `${JSON.stringify(item)}\n`, { mode: 0o600 });
}

async function readHealth() {
  const stateFile = path.resolve(/* turbopackIgnore: true */ process.env.RICOH_MONITOR_STATE_PATH || path.join(process.cwd(), '..', '.monitor-state.json'));
  try {
    const state = JSON.parse(await readFile(/* turbopackIgnore: true */ stateFile, 'utf8'));
    const products = Object.values(state.products || {});
    const fresh = (value: unknown) => {
      const time = Date.parse(String(value || ''));
      return Number.isFinite(time) && Date.now() - time < 180000 && time <= Date.now() + 30000;
    };
    const ok = fresh(state.checkedAt) && (products.length ? products.every((item: any) => item?.ok === true && fresh(item.checkedAt)) : state.ok === true);
    return { status: ok ? 'healthy' : 'fault', checkedAt: state.checkedAt || null, productCount: products.length || 3 };
  }
  catch { return { status: 'unknown', checkedAt: null, productCount: 3 }; }
}

export class StoreError extends Error { constructor(public status: number, message: string) { super(message); } }




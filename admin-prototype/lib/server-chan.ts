export async function sendServerChanTest(sendKey: string) {
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const body = new URLSearchParams({ title: '理光库存监控测试', desp: `后台测试消息\n\n发送时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}` });
    const response = await fetch(`https://sctapi.ftqq.com/${encodeURIComponent(sendKey)}.send`, { method: 'POST', body, signal: controller.signal, cache: 'no-store' });
    const text = await response.text(); let data: any = null; try { data = JSON.parse(text); } catch {}
    if (!response.ok) return { result: 'failed' as const, reason: `平台返回 HTTP ${response.status}` };
    if (!data || data.code == null) return { result: 'unknown' as const, reason: '平台响应无法解析，结果未确认' };
    if (String(data.code) !== '0' || (data.data?.errno != null && String(data.data.errno) !== '0')) return { result: 'failed' as const, reason: '平台拒绝发送请求' };
    return { result: 'accepted' as const };
  } catch { return { result: 'unknown' as const, reason: '未收到有效平台响应，结果未确认' }; }
  finally { clearTimeout(timeout); }
}

// 极简访客计数 Worker
// - GET  /api/visits  -> 返回当前全局访客数 {count:N}
// - POST /api/visits  -> 全局访客数 +1 并返回新值（前端用 localStorage 守卫，保证同一浏览器只 +1 一次）
// - 其余请求一律交还静态资产 env.ASSETS.fetch（含 SPA 回落），保持原纯静态站行为不变
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/visits') {
      // 允许跨域：离线小工具包 moon-minitool.zip 从 file:// 或 localhost 打开时，
      // 调用的是本绝对地址，属于跨域请求，需要 CORS 才能累计进同一个全局计数器。
      const cors = {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'content-type, accept',
      };
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: cors });
      }
      let n = parseInt(await env.VISITS.get('count'), 10);
      if (!Number.isFinite(n) || n < 0) n = 0;
      if (request.method === 'POST') {
        n += 1;
        await env.VISITS.put('count', String(n));
      }
      return new Response(JSON.stringify({ count: n }), {
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
          ...cors,
        },
      });
    }

    // 交还静态资产（index.html / 图片等）；未命中文件时由 not_found_handling 做 SPA 回落。
    try {
      const res = await env.ASSETS.fetch(request);
      // 兜底：万一资产层返回 404（理论上 SPA 回落会拦截），主动回 index.html。
      if (res.status === 404) {
        return env.ASSETS.fetch(new URL('/index.html', request.url));
      }
      return res;
    } catch (e) {
      // 任何异常都不向用户抛 Cloudflare 1101，回一个最小可用页面。
      return new Response(
        '<!doctype html><meta charset="utf-8"><title>月亮</title>' +
        '<body style="margin:0;background:#0b1020;color:#e8d9a0;font-family:sans-serif;' +
        'display:flex;align-items:center;justify-content:center;height:100vh">月亮稍后回来 ✦</body>',
        { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }
      );
    }
  },
};

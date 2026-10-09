import https from 'node:https';
import zlib from 'node:zlib';

const agent = new https.Agent({ keepAlive: true, maxSockets: 32 });

export function get(url, { tries = 4 } = {}) {
  return new Promise((resolve, reject) => {
    const attempt = n => {
      https.get(url, { agent, headers: { 'accept-encoding': 'gzip', 'user-agent': 'analise-eleicoes-2026-validador' } }, res => {
        if (res.statusCode === 404) { res.resume(); return resolve(null); }
        if (res.statusCode !== 200) {
          res.resume();
          if (n < tries) return setTimeout(() => attempt(n + 1), 500 * n);
          return reject(new Error(`HTTP ${res.statusCode} ${url}`));
        }
        const chunks = [];
        const stream = res.headers['content-encoding'] === 'gzip' ? res.pipe(zlib.createGunzip()) : res;
        stream.on('data', c => chunks.push(c));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', e => (n < tries ? attempt(n + 1) : reject(e)));
      }).on('error', e => (n < tries ? setTimeout(() => attempt(n + 1), 500 * n) : reject(e)));
    };
    attempt(1);
  });
}

export async function getJson(url) {
  const b = await get(url);
  return b ? JSON.parse(b.toString('utf8')) : null;
}

export async function pool(items, size, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (i < items.length) {
      const k = i++;
      out[k] = await fn(items[k], k);
    }
  }));
  return out;
}

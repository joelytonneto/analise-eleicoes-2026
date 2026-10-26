import https from 'node:https';
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const agent = new https.Agent({ keepAlive: true, maxSockets: 10 });
const CACHE_DIR = path.resolve('scratch/http-cache');
fs.mkdirSync(CACHE_DIR, { recursive: true });

// Rate limiter simples para evitar HTTP 429 do Akamai/TSE (~22 req/s)
let nextSlot = 0;
const MIN_INTERVAL_MS = 45;
async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + MIN_INTERVAL_MS;
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
}

function cachePath(url) {
  const h = crypto.createHash('sha1').update(url).digest('hex');
  return path.join(CACHE_DIR, `${h.slice(0, 2)}`, `${h}.bin`);
}

export async function get(url, { tries = 6, useCache = true } = {}) {
  if (useCache) {
    const cp = cachePath(url);
    if (fs.existsSync(cp)) {
      return fs.readFileSync(cp);
    }
  }
  await throttle();
  return new Promise((resolve, reject) => {
    const attempt = n => {
      https.get(url, {
        agent,
        headers: {
          'accept-encoding': 'gzip',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'accept': 'application/json, text/plain, */*'
        }
      }, res => {
        if (res.statusCode === 404) { res.resume(); return resolve(null); }
        if (res.statusCode === 429) {
          res.resume();
          const backoff = Math.min(60000, 5000 * n);
          nextSlot = Math.max(nextSlot, Date.now() + backoff);
          if (n < tries) return setTimeout(() => attempt(n + 1), backoff);
          return reject(new Error(`HTTP 429 ${url}`));
        }
        if (res.statusCode !== 200) {
          res.resume();
          if (n < tries) return setTimeout(() => attempt(n + 1), 800 * n);
          return reject(new Error(`HTTP ${res.statusCode} ${url}`));
        }
        const chunks = [];
        const stream = res.headers['content-encoding'] === 'gzip' ? res.pipe(zlib.createGunzip()) : res;
        stream.on('data', c => chunks.push(c));
        stream.on('end', () => {
          const buf = Buffer.concat(chunks);
          if (useCache && buf.length > 0) {
            try {
              const cp = cachePath(url);
              fs.mkdirSync(path.dirname(cp), { recursive: true });
              fs.writeFileSync(cp, buf);
            } catch { /* ignore cache write errors */ }
          }
          resolve(buf);
        });
        stream.on('error', e => (n < tries ? attempt(n + 1) : reject(e)));
      }).on('error', e => (n < tries ? setTimeout(() => attempt(n + 1), 800 * n) : reject(e)));
    };
    attempt(1);
  });
}

export async function getJson(url, opts) {
  const b = await get(url, opts);
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

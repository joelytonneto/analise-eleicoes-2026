const nf = new Intl.NumberFormat('pt-BR');
const pf = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmt = n => (n == null || Number.isNaN(n) ? '—' : nf.format(n));
export const pct = (a, b) => (!b ? null : (a / b) * 100);
export const fmtPct = (v, casas = 2) =>
  v == null || !Number.isFinite(v) ? '—' : `${casas === 2 ? pf.format(v) : v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
export const pad = (n, k = 4) => String(n).padStart(k, '0');
export const titulo = s =>
  (s || '').toLowerCase().replace(/(^|[\s\-/(])([a-zà-ú])/g, (m, a, b) => a + b.toUpperCase())
    .replace(/\b(De|Da|Do|Das|Dos|E)\b/g, w => w.toLowerCase());
export const semAcento = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Métricas escolhíveis para colorir mapas e montar rankings/painéis.
import { S, validosSt, nulosSt } from './data';
import { pct, fmtPct } from './format';
import { mapaCores, SEQ } from './colors';

export function opcoesMetrica(candRef, cargo) {
  const vagas = +cargo === 5 ? 2 : 1;
  const ops = [{ value: 'vencedor', label: 'Candidato mais votado' }];
  for (const c of (candRef || []).slice(0, 12)) ops.push({ value: `cand:${c.n}`, label: `% ${c.nome} (${c.n})` });
  ops.push(
    { value: 'comparecimento', label: '% comparecimento' },
    { value: 'abstencao', label: '% abstenção' },
    { value: 'brancos', label: '% brancos' },
    { value: 'nulos', label: '% nulos' }
  );
  if (+cargo === 1 && (candRef || []).length >= 2) ops.push({ value: 'margem', label: `Margem ${candRef[0].nome} − ${candRef[1].nome} (p.p.)` });
  void vagas;
  return ops;
}

/** Valor numérico da métrica para uma unidade (st/v do cargo). */
export function valorMetrica(metrica, st, v, candRef, cargo) {
  if (!st) return null;
  const totalVotos = st[S.comp] * (+cargo === 5 ? 2 : 1);
  const validos = validosSt(st);
  switch (metrica) {
    case 'comparecimento': return pct(st[S.comp], st[S.aptos]);
    case 'abstencao': return pct(st[S.abst], st[S.aptos]);
    case 'brancos': return pct(st[S.br], totalVotos);
    case 'nulos': return pct(nulosSt(st), totalVotos);
    case 'margem': return v ? pct(v[0] - v[1], validos) : null;
    default:
      if (metrica.startsWith('cand:')) {
        const n = +metrica.slice(5);
        const i = (candRef || []).findIndex(c => +c.n === n);
        return i >= 0 && v ? pct(v[i] || 0, validos) : null;
      }
      return null;
  }
}

/** Candidato mais votado entre as candidaturas válidas (ignora anulados/sub judice/nulos técnicos). */
export function indiceVencedor(v, candRef) {
  if (!v?.length) return -1;
  let bi = -1, bv = 0;
  v.forEach((x, i) => { if (x > bv && !candRef[i]?.votoValido) { bv = x; bi = i; } });
  return bi;
}
export function vencedor(v, candRef) {
  const i = indiceVencedor(v, candRef);
  return i >= 0 ? candRef[i] : null;
}

/**
 * Prepara a coloração de um conjunto de unidades.
 * unidades: [{ key, st, v }]
 * Retorna { cor: key -> cor, rotulo: key -> texto, legenda }
 */
export function colorir(metrica, unidades, candRef, cargo) {
  const cores = mapaCores(candRef);
  const cor = new Map();
  const rotulo = new Map();
  if (metrica === 'vencedor') {
    const usados = new Map();
    for (const u of unidades) {
      const w = vencedor(u.v, candRef);
      if (!w) continue;
      const i = indiceVencedor(u.v, candRef);
      const validos = validosSt(u.st);
      cor.set(u.key, cores.get(+w.n) || '#898781');
      rotulo.set(u.key, `${w.nome}: ${fmtPct(pct(u.v[i], validos))}`);
      usados.set(+w.n, (usados.get(+w.n) || 0) + 1);
    }
    const legenda = { tipo: 'categorica', itens: [...usados.entries()].sort((a, b) => b[1] - a[1]).map(([n, q]) => ({ cor: cores.get(n) || '#898781', label: candRef.find(c => +c.n === n)?.nome, q })) };
    return { cor, rotulo, legenda };
  }
  const vals = unidades.map(u => [u.key, valorMetrica(metrica, u.st, u.v, candRef, cargo)]).filter(([, x]) => x != null && Number.isFinite(x));
  if (!vals.length) return { cor, rotulo, legenda: null };
  const arr = vals.map(x => x[1]).sort((a, b) => a - b);
  // escala por quantis (robusta a extremos)
  const q = p => arr[Math.min(arr.length - 1, Math.floor(p * (arr.length - 1)))];
  const cortes = SEQ.map((_, i) => q((i + 1) / SEQ.length));
  for (const [k, x] of vals) {
    let i = cortes.findIndex(c => x <= c);
    if (i < 0) i = SEQ.length - 1;
    cor.set(k, SEQ[i]);
    rotulo.set(k, metrica === 'margem' ? `${x.toFixed(2).replace('.', ',')} p.p.` : fmtPct(x));
  }
  return { cor, rotulo, legenda: { tipo: 'sequencial', min: arr[0], max: arr[arr.length - 1], cores: SEQ } };
}

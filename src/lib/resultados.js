import { S, validosSt, nulosSt } from './data';
import { mapaCores } from './colors';
import { pct } from './format';

/** Itens de resultado (candidatos ordenados por votos) a partir de um vetor v alinhado à lista de referência. */
export function itensDeVetor(v, candRef) {
  const cores = mapaCores(candRef);
  return (candRef || [])
    .map((c, i) => ({ ...c, votos: v?.[i] || 0, cor: cores.get(+c.n) }))
    .filter(c => c.votos > 0 || !v)
    .sort((a, b) => b.votos - a.votos);
}

/** Itens de deputados para um município a partir do arquivo dep/<UF>.json */
export function itensDeputadosMun(dep, cargo, cd) {
  const ref = dep?.cand?.[cargo] || [];
  const m = dep?.mun?.[cd]?.[cargo];
  if (!m) return [];
  const cores = mapaCores(ref);
  const out = [];
  for (let i = 0; i < m.v.length; i += 2) {
    const c = ref[m.v[i]];
    out.push({ ...c, votos: m.v[i + 1], cor: cores.get(+c.n) });
  }
  return out.sort((a, b) => b.votos - a.votos);
}
export function itensDeputadosUf(dep, cargo) {
  const ref = dep?.cand?.[cargo] || [];
  const cores = mapaCores(ref);
  return ref.map(c => ({ ...c, cor: cores.get(+c.n) }));
}
export function legendaDeputadosMun(dep, cargo, cd) {
  const m = dep?.mun?.[cd]?.[cargo];
  if (!m) return [];
  const out = [];
  for (let i = 0; i < m.leg.length; i += 2) out.push({ n: m.leg[i], votos: m.leg[i + 1] });
  return out.sort((a, b) => b.votos - a.votos);
}

/** Métricas derivadas de um vetor st */
// Senador em 2026: 2 vagas, cada eleitor registra 2 votos — percentuais de brancos/nulos usam 2× o comparecimento.
export function metricas(st, cargo = 1) {
  if (!st) return null;
  const validos = validosSt(st);
  const votosTotais = st[S.comp] * (+cargo === 5 ? 2 : 1);
  return {
    aptos: st[S.aptos],
    comparecimento: st[S.comp],
    abstencoes: st[S.abst],
    nominais: st[S.nom],
    legenda: st[S.leg],
    brancos: st[S.br],
    nulos: nulosSt(st),
    nulosDigitados: st[S.nu],
    nulosTecnicos: st[S.tec] || 0,
    anuladosSubJudice: st[S.sj] || 0,
    anulados: st[S.an] || 0,
    validos,
    votosTotais,
    pComparecimento: pct(st[S.comp], st[S.aptos]),
    pAbstencao: pct(st[S.abst], st[S.aptos]),
    pBrancos: pct(st[S.br], votosTotais),
    pNulos: pct(nulosSt(st), votosTotais),
    pValidos: pct(validos, votosTotais)
  };
}

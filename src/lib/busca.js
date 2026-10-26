// Busca por texto livre em locais de votação (nome da escola, endereço, bairro) e candidaturas.
import { loadCandidatosIndex, loadLocaisUf, UF_NOMES, cargoNome } from './data';
import { semAcento, titulo, pad } from './format';
import { rotas, getTurno } from './router';

const PARADAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'em', 'na', 'no']);
export const norm = s => semAcento(s).replace(/[^a-z0-9]+/g, ' ').trim();
const tokens = q => norm(q).split(' ').filter(t => t && !PARADAS.has(t));

// ---------------------------------------------------------------- resultado da candidatura
/** Classifica o resultado oficial do TSE: eleito | turno2 | suplente | nao | null */
export function situacao(resultado) {
  const r = (resultado || '').toUpperCase();
  if (!r) return null;
  if (r.includes('NÃO ELEITO') || r.includes('NAO ELEITO')) return 'nao';
  if (r.includes('ELEITO')) return 'eleito';
  if (r.includes('2º TURNO') || r.includes('2O TURNO')) return 'turno2';
  if (r.includes('SUPLENTE')) return 'suplente';
  return null;
}
export const eleitoOuTurno2 = resultado => ['eleito', 'turno2'].includes(situacao(resultado));

// ---------------------------------------------------------------- candidatos
const CAMPOS = ['cargo', 'uf', 'n', 'nome', 'nomeCompleto', 'partido', 'resultado', 'votos', 'sq', 'votoValido'];
const candCache = new Map();
export function carregarCandidatos(t = getTurno()) {
  const key = +t === 1 ? 1 : 2;
  if (!candCache.has(key)) {
    candCache.set(key, loadCandidatosIndex(key).then(rows => rows.map(r => {
      const c = Object.fromEntries(CAMPOS.map((k, i) => [k, r[i]]));
      c._t = ` ${norm(`${c.nome} ${c.nomeCompleto}`)} `;
      c._p = norm(c.partido);
      return c;
    })).catch(e => { candCache.delete(key); throw e; }));
  }
  return candCache.get(key);
}

export const hrefCandidato = c => rotas.candidato(c.cargo === 1 ? 'BR' : c.uf, c.cargo, c.n);
export const rotuloUfCand = c => (c.cargo === 1 ? 'Brasil' : UF_NOMES[c.uf] || c.uf);

/**
 * Filtra candidaturas por texto (nome de urna, nome completo, partido ou número) e filtros.
 * filtros: { uf, cargo, eleitos }
 */
export function buscarCandidatos(q, lista, filtros = {}) {
  const tk = tokens(q);
  let ufTk = null;
  const texto = [];
  const nums = [];
  for (const t of tk) {
    if (/^\d+$/.test(t)) nums.push(+t);
    else if (t.length === 2 && UF_NOMES[t.toUpperCase()] && tk.length > 1) ufTk = t.toUpperCase();
    else texto.push(t);
  }
  const uf = filtros.uf || ufTk;
  const semTexto = !texto.length && !nums.length;
  if (semTexto && !filtros.uf && !filtros.cargo && !filtros.eleitos) return [];
  if (!semTexto && texto.join('').length < 3 && !nums.length && !filtros.uf && !filtros.cargo) return [];
  // número de candidato só vale sozinho (com UF opcional), para não confundir com zona/seção
  if (nums.length && (texto.length || nums.length > 1)) return [];
  const out = [];
  for (const c of lista) {
    if (uf && c.cargo !== 1 && c.uf !== uf) continue; // presidente vale para todas as UFs
    if (filtros.cargo && c.cargo !== +filtros.cargo) continue;
    if (filtros.eleitos && !eleitoOuTurno2(c.resultado)) continue;
    let score = 0;
    if (nums.length) {
      if (c.n !== nums[0]) continue;
      score = 10;
    } else if (texto.length) {
      let ok = true;
      for (const t of texto) {
        if (c._p === t) score += 3;
        else if (c._t.includes(` ${t}`)) score += 3;
        else if (c._t.includes(t)) score += 1;
        else { ok = false; break; }
      }
      if (!ok) continue;
      if (norm(c.nome).startsWith(texto.join(' '))) score += 4;
    }
    if (eleitoOuTurno2(c.resultado)) score += 2;
    out.push({ c, score });
  }
  out.sort((a, b) => b.score - a.score || b.c.votos - a.c.votos);
  return out.map(x => x.c);
}

// ---------------------------------------------------------------- locais de votação
const locaisCache = new Map();
function carregarLocaisUf(uf, nomesMun) {
  if (!locaisCache.has(uf)) {
    locaisCache.set(uf, loadLocaisUf(uf).then(rows => rows.map(([cd, z, n, nome, end, bairro, nSec]) => {
      const mun = nomesMun.get(`${uf}:${cd}`) || '';
      return { uf, cd, z, n, nome, end, bairro, nSec, mun, _nome: ` ${norm(nome)} `, _resto: ` ${norm(`${end} ${bairro}`)} `, _mun: ` ${norm(mun)} ` };
    })).catch(e => { locaisCache.delete(uf); throw e; }));
  }
  return locaisCache.get(uf);
}

/**
 * Descobre o escopo da busca de locais: UF citada pela sigla e municípios citados pelo nome completo.
 * municipios: índice com _n (nome normalizado).
 */
export function escopoLocais(q, municipios) {
  let t = ` ${norm(q)} `;
  const muns = municipios
    .filter(m => m._n.length >= 4 && t.includes(` ${norm(m._n)} `))
    .sort((a, b) => b._n.length - a._n.length);
  // fica só com o(s) nome(s) mais longo(s) (ex.: "são josé dos campos" vence "são josé")
  const maiorNome = muns.length ? norm(muns[0]._n) : null;
  const escolhidos = maiorNome ? muns.filter(m => norm(m._n) === maiorNome) : [];
  if (maiorNome) t = t.replace(` ${maiorNome} `, ' ');
  let uf = null;
  const resto = [];
  for (const tk of t.trim().split(' ').filter(Boolean)) {
    if (!uf && tk.length === 2 && UF_NOMES[tk.toUpperCase()]) uf = tk.toUpperCase();
    else if (!PARADAS.has(tk)) resto.push(tk);
  }
  const munsFinal = uf ? escolhidos.filter(m => m.uf === uf) : escolhidos;
  const ufs = munsFinal.length ? [...new Set(munsFinal.map(m => m.uf))] : uf ? [uf] : Object.keys(UF_NOMES);
  return { ufs, muns: new Set(munsFinal.map(m => `${m.uf}:${m.cd}`)), resto, global: !munsFinal.length && !uf };
}

/** Busca locais pelo nome da escola, endereço e bairro (e nome do município). Assíncrona: carrega o índice das UFs necessárias. */
export async function buscarLocais(q, municipios, { limite = 60, nomesMun } = {}) {
  const esc = escopoLocais(q, municipios);
  const termos = esc.resto;
  if (!termos.length || termos.join('').length < 3) return { itens: [], escopo: esc };
  // busca nacional só com texto suficiente (evita baixar todos os índices por 2 letras)
  if (esc.global && termos.join('').length < 4) return { itens: [], escopo: esc };
  const nomes = nomesMun || new Map(municipios.map(m => [`${m.uf}:${m.cd}`, titulo(m.nome)]));
  const listas = await Promise.all(esc.ufs.map(uf => carregarLocaisUf(uf, nomes)));
  const out = [];
  for (const lista of listas) {
    for (const l of lista) {
      if (esc.muns.size && !esc.muns.has(`${l.uf}:${l.cd}`)) continue;
      let score = 0, ok = true;
      for (const t of termos) {
        if (l._nome.includes(` ${t}`)) score += 4;
        else if (l._nome.includes(t)) score += 2;
        else if (l._resto.includes(` ${t}`)) score += 2;
        else if (l._resto.includes(t)) score += 1;
        else if (l._mun.includes(` ${t}`)) score += 1;
        else { ok = false; break; }
      }
      if (ok) out.push({ l, score });
    }
  }
  out.sort((a, b) => b.score - a.score || b.l.nSec - a.l.nSec);
  return { itens: out.slice(0, limite).map(x => x.l), total: out.length, escopo: esc };
}

export const hrefLocal = l => rotas.mun(l.uf, l.cd, { tab: 'secoes', zona: l.z, local: `${l.z}-${l.n}` });
export const subLocal = l => [titulo(l.end), titulo(l.bairro), `${l.mun} – ${l.uf}`, `Zona ${pad(l.z)}`, `${l.nSec} seç${l.nSec === 1 ? 'ão' : 'ões'}`].filter(Boolean).join(' · ');
export const subCandidato = c => [`${cargoNome(c.cargo)} · ${rotuloUfCand(c)}`, c.partido, `nº ${c.n}`, `${c.votos.toLocaleString('pt-BR')} votos`].join(' · ');

/** Índice cargo|uf|nº -> candidatura (com o código sq da foto). */
const porChaveCache = new Map();
export function carregarCandidatosPorChave(t = getTurno()) {
  const key = +t === 1 ? 1 : 2;
  if (!porChaveCache.has(key)) {
    const p = key === 1
      ? carregarCandidatos(1).then(l => new Map(l.map(c => [`${c.cargo}|${c.uf}|${c.n}`, c])))
      : Promise.all([carregarCandidatos(1).catch(() => []), carregarCandidatos(2)]).then(([l1, l2]) => {
          const m = new Map(l1.map(c => [`${c.cargo}|${c.uf}|${c.n}`, c]));
          for (const c of l2) m.set(`${c.cargo}|${c.uf}|${c.n}`, c);
          return m;
        });
    porChaveCache.set(key, p.catch(e => { porChaveCache.delete(key); throw e; }));
  }
  return porChaveCache.get(key);
}
export const chaveCand = (cargo, uf, n) => `${cargo}|${+cargo === 1 ? 'BR' : uf}|${n}`;

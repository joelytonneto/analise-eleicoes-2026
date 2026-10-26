// Acesso à base estática gerada a partir dos dados oficiais do TSE (public/data/2026/t1 e t2).
// Todos os arquivos são JSON servidos pelo próprio site; mantidos em cache na memória.
import { getTurno } from './router.js';

const BASE_2026 = `${import.meta.env.BASE_URL}data/2026/`;
const BASE_T1 = `${BASE_2026}t1/`;
const GEO = `${import.meta.env.BASE_URL}data/geo/`;
const cache = new Map();

const baseTurno = (t = getTurno()) => `${BASE_2026}t${+t === 1 ? 1 : 2}/`;

function load(url) {
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then(r => {
      if (!r.ok) throw new Error(`Falha ao carregar ${url} (HTTP ${r.status})`);
      return r.json();
    }).catch(e => { cache.delete(url); throw e; }));
  }
  return cache.get(url);
}

export const loadBrasil = (t = getTurno()) => load(`${baseTurno(t)}brasil.json`);
export const loadMeta = (t = getTurno()) => load(`${baseTurno(t)}meta.json`);
export const loadValidacao = (t = getTurno()) => load(`${baseTurno(t)}validacao.json`);
export const loadMunicipiosIndex = (t = getTurno()) => load(`${baseTurno(t)}municipios.json`);
export const loadPartidos = (t = getTurno()) => load(`${baseTurno(t)}partidos.json`);
export const loadUf = (uf, t = getTurno()) => load(`${baseTurno(t)}uf/${uf}.json`);
export const loadDep = uf => load(`${BASE_T1}dep/${uf}.json`);
export const loadZonasT2 = uf => load(`${BASE_2026}t2/zonas/${uf}.json`);
export const loadGeoUf = uf => load(`${GEO}${uf}.json`);
export const loadGeoBrasil = () => import('../data/brazilStatesGeo.json').then(m => m.default);

// Relatórios especiais (Confronto 1º×2º Turno e Votação Após 17:00h)
export const loadConfrontoTurnos = () => load(`${BASE_2026}confronto-turnos.json`);
export const loadVotacaoPos17h = () => load(`${BASE_2026}votacao-pos17h.json`);

export function loadMun(uf, cd, t = getTurno()) {
  if (+t === 1) return load(`${BASE_T1}mun/${uf}/${cd}.json`);
  const key = `mun-t2:${uf}:${cd}`;
  if (!cache.has(key)) {
    cache.set(key, Promise.all([
      load(`${BASE_T1}mun/${uf}/${cd}.json`),
      loadUf(uf, 2),
      loadZonasT2(uf)
    ]).then(([mf1, uf2, z2]) => {
      const m2 = uf2.mun.find(m => m.cd === String(cd));
      const secoesBU = z2.secoesBU || {};
      const zonasTotais = {};
      if (m2) {
        if (m2.zonas?.length === 1) {
          zonasTotais[m2.zonas[0]] = { st: m2.st, v: m2.v };
        } else {
          for (const z of m2.zonas || []) {
            const zd = z2.zonas?.[`${cd}|${z}`];
            if (zd) zonasTotais[z] = zd;
          }
        }
      }
      const secoes = mf1.secoes.map(s => {
        const bu = secoesBU[`${cd}|${s.z}|${s.s}`];
        return {
          ...s,
          t1: s.st ? { st: s.st, v: s.v, rb: s.rb, cand: mf1.cand } : null,
          st: bu ? bu.st : null,
          v: bu ? bu.v : null,
          rb: bu ? bu.rb : null,
          ab: bu ? bu.ab : null,
          enc: bu ? bu.enc : null,
          buSobDemanda: !s.ag && !bu
        };
      });
      return {
        ...mf1,
        turno: 2,
        cand: z2.cand || { 1: [13, 22] },
        candT1: mf1.cand,
        munTotal: m2 || null,
        zonasTotais,
        secoes
      };
    }).catch(e => { cache.delete(key); throw e; }));
  }
  return cache.get(key);
}

// Índices do vetor de estatísticas (st) por cargo
// nom = votos nominais digitados (como no BU); tec = nulos técnicos (número não reconhecido pelo TSE);
// sj = anulados sub judice; an = anulados. Válidos e nulos seguem a regra da totalização oficial.
export const S = { aptos: 0, comp: 1, abst: 2, nom: 3, br: 4, nu: 5, leg: 6, anul: 7, tec: 8, sj: 9, an: 10 };
export const validosSt = st => (st ? st[S.nom] + st[S.leg] - (st[S.tec] || 0) - (st[S.sj] || 0) - (st[S.an] || 0) : 0);
export const nulosSt = st => (st ? st[S.nu] + (st[S.tec] || 0) : 0);

export const UF_NOMES = {
  AC: 'Acre', AL: 'Alagoas', AM: 'Amazonas', AP: 'Amapá', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal',
  ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MG: 'Minas Gerais', MS: 'Mato Grosso do Sul', MT: 'Mato Grosso',
  PA: 'Pará', PB: 'Paraíba', PE: 'Pernambuco', PI: 'Piauí', PR: 'Paraná', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RO: 'Rondônia', RR: 'Roraima', RS: 'Rio Grande do Sul', SC: 'Santa Catarina', SE: 'Sergipe', SP: 'São Paulo',
  TO: 'Tocantins', ZZ: 'Exterior'
};
export const IBGE_UF = {
  11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO', 21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB',
  26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA', 31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP', 41: 'PR', 42: 'SC', 43: 'RS', 50: 'MS',
  51: 'MT', 52: 'GO', 53: 'DF'
};

export const UFS_GOV_2T = ['AC', 'AM', 'DF', 'ES', 'RN', 'TO'];

export const CARGOS = [
  { id: 1, nome: 'Presidente', curto: 'Presidente', secao: true },
  { id: 3, nome: 'Governador', curto: 'Governador', secao: true },
  { id: 5, nome: 'Senador', curto: 'Senador', secao: true, vagas: 2 },
  { id: 6, nome: 'Deputado Federal', curto: 'Dep. Federal', secao: false },
  { id: 7, nome: 'Deputado Estadual', curto: 'Dep. Estadual', secao: false },
  { id: 8, nome: 'Deputado Distrital', curto: 'Dep. Distrital', secao: false }
];
export const cargoNome = id => CARGOS.find(c => c.id === +id)?.nome || `Cargo ${id}`;

/** Cargos disponíveis para uma UF no turno ativo. */
export function cargosDaUf(uf, t = getTurno()) {
  if (+t === 2) {
    if (uf && UFS_GOV_2T.includes(uf)) return CARGOS.filter(c => c.id === 1 || c.id === 3);
    return CARGOS.filter(c => c.id === 1);
  }
  if (!uf) return CARGOS.filter(c => c.id === 1);
  if (uf === 'ZZ') return CARGOS.filter(c => c.id === 1);
  if (uf === 'DF') return CARGOS.filter(c => c.id !== 7);
  return CARGOS.filter(c => c.id !== 8);
}

/**
 * Lista de candidatos (com ordem de coluna) para um cargo num escopo.
 * Presidente usa a ordem nacional; Governador/Senador a ordem da UF.
 */
export function candidatosDe(cargo, brasil, ufData) {
  if (+cargo === 1) return brasil?.cand?.[1] || [];
  return ufData?.cand?.[cargo] || [];
}

/** Agrupa estatísticas somando vetores st por cargo */
export function somarSt(alvo, st) {
  for (const [cg, arr] of Object.entries(st || {})) {
    const t = (alvo[cg] ??= []);
    for (let i = 0; i < arr.length; i++) t[i] = (t[i] || 0) + (arr[i] || 0);
  }
  return alvo;
}
export function somarV(alvo, v) {
  for (const [cg, arr] of Object.entries(v || {})) {
    const t = (alvo[cg] ??= []);
    for (let i = 0; i < arr.length; i++) t[i] = (t[i] || 0) + (arr[i] || 0);
  }
  return alvo;
}

/** Converte o arquivo de município em linhas de seção prontas para uso. */
export function secoesDoMunicipio(mf, ufNome) {
  return mf.secoes.map(s => {
    const local = mf.locais[s.l] || null;
    return {
      ...s,
      uf: mf.uf,
      cd: mf.cd,
      municipio: mf.nome,
      ufNome,
      local,
      id: `${mf.uf}-${mf.cd}-${s.z}-${s.s}`
    };
  });
}

/** Agrega seções em zonas ou locais de votação. */
export function agrupar(secoes, chave, zonasTotais = null) {
  const g = new Map();
  for (const s of secoes) {
    if (!s.st && !zonasTotais) continue;
    const k = chave === 'zona' ? `${s.z}` : `${s.z}|${s.local?.n}`;
    let u = g.get(k);
    if (!u) {
      u = {
        tipo: chave, z: s.z, local: chave === 'local' ? s.local : null, uf: s.uf, cd: s.cd, municipio: s.municipio,
        st: {}, v: {}, nSecoes: 0, eleitorado: 0, secoes: [], locais: new Set()
      };
      g.set(k, u);
    }
    if (s.st) {
      somarSt(u.st, s.st);
      somarV(u.v, s.v);
    }
    if (!s.ag) {
      u.nSecoes++;
      u.eleitorado += s.el || 0;
    }
    u.secoes.push(s);
    if (s.local) u.locais.add(s.local.n);
  }
  if (chave === 'zona' && zonasTotais) {
    for (const u of g.values()) {
      const zt = zonasTotais[u.z];
      if (zt) {
        u.st = zt.st;
        u.v = zt.v;
      }
    }
  }
  return [...g.values()];
}

// Índices da busca (gerados por scripts/data/indices-busca.mjs e build-t2.mjs)
export const loadCandidatosIndex = (t = getTurno()) => load(`${baseTurno(t)}busca/candidatos.json`);
export const loadLocaisUf = uf => load(`${BASE_T1}busca/locais/${uf}.json`);

// Acesso à base estática gerada a partir dos dados abertos do TSE (public/data/2026/t1).
// Todos os arquivos são JSON servidos pelo próprio site; mantidos em cache na memória.

const BASE = `${import.meta.env.BASE_URL}data/2026/t1/`;
const GEO = `${import.meta.env.BASE_URL}data/geo/`;
const cache = new Map();

function load(url) {
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then(r => {
      if (!r.ok) throw new Error(`Falha ao carregar ${url} (HTTP ${r.status})`);
      return r.json();
    }).catch(e => { cache.delete(url); throw e; }));
  }
  return cache.get(url);
}

export const loadBrasil = () => load(`${BASE}brasil.json`);
export const loadMeta = () => load(`${BASE}meta.json`);
export const loadValidacao = () => load(`${BASE}validacao.json`);
export const loadMunicipiosIndex = () => load(`${BASE}municipios.json`);
export const loadPartidos = () => load(`${BASE}partidos.json`);
export const loadUf = uf => load(`${BASE}uf/${uf}.json`);
export const loadMun = (uf, cd) => load(`${BASE}mun/${uf}/${cd}.json`);
export const loadDep = uf => load(`${BASE}dep/${uf}.json`);
export const loadGeoUf = uf => load(`${GEO}${uf}.json`);
export const loadGeoBrasil = () => import('../data/brazilStatesGeo.json').then(m => m.default);

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

export const CARGOS = [
  { id: 1, nome: 'Presidente', curto: 'Presidente', secao: true },
  { id: 3, nome: 'Governador', curto: 'Governador', secao: true },
  { id: 5, nome: 'Senador', curto: 'Senador', secao: true, vagas: 2 },
  { id: 6, nome: 'Deputado Federal', curto: 'Dep. Federal', secao: false },
  { id: 7, nome: 'Deputado Estadual', curto: 'Dep. Estadual', secao: false },
  { id: 8, nome: 'Deputado Distrital', curto: 'Dep. Distrital', secao: false }
];
export const cargoNome = id => CARGOS.find(c => c.id === +id)?.nome || `Cargo ${id}`;
/** Cargos disponíveis para uma UF (Exterior só vota para Presidente; DF tem distrital). */
export function cargosDaUf(uf) {
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
export function agrupar(secoes, chave) {
  const g = new Map();
  for (const s of secoes) {
    if (!s.st) continue;
    const k = chave === 'zona' ? `${s.z}` : `${s.z}|${s.local?.n}`;
    let u = g.get(k);
    if (!u) {
      u = {
        tipo: chave, z: s.z, local: chave === 'local' ? s.local : null, uf: s.uf, cd: s.cd, municipio: s.municipio,
        st: {}, v: {}, nSecoes: 0, eleitorado: 0, secoes: [], locais: new Set()
      };
      g.set(k, u);
    }
    somarSt(u.st, s.st);
    somarV(u.v, s.v);
    u.nSecoes++;
    u.eleitorado += s.el || 0;
    u.secoes.push(s);
    if (s.local) u.locais.add(s.local.n);
  }
  return [...g.values()];
}

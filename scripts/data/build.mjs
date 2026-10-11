// Gera a base estática do painel a partir EXCLUSIVAMENTE dos arquivos de dados abertos do TSE.
//
// Uso:
//   node scripts/data/build.mjs <pasta-com-os-zips> [saida=public/data/2026/t1]
//
// Arquivos esperados na pasta (baixados de https://cdn.tse.jus.br/estatistica/sead/odsele/):
//   eleitorado_local_votacao_2026.zip   (locais de votação e seções)
//   detalhe_votacao_secao_2026.zip      (comparecimento/brancos/nulos por seção e cargo)
//   votacao_secao_2026_BR.zip           (votos de Presidente por seção)
//   uf/votacao_secao_2026_<UF>.zip      (votos dos cargos estaduais por seção, 27 arquivos)
//   consulta_cand_2026.zip              (candidatos)
//
// Nenhum número é estimado ou preenchido: se um dado não existir na fonte, ele fica ausente.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { forEachRow, listZip } from './csv.mjs';

const RAW = path.resolve(process.argv[2] || '');
const OUT = path.resolve(process.argv[3] || 'public/data/2026/t1');
const TURNO = 1;
const CDN = 'https://cdn.tse.jus.br/estatistica/sead/odsele';

const UF_NOMES = {
  AC: 'Acre', AL: 'Alagoas', AM: 'Amazonas', AP: 'Amapá', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal',
  ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MG: 'Minas Gerais', MS: 'Mato Grosso do Sul', MT: 'Mato Grosso',
  PA: 'Pará', PB: 'Paraíba', PE: 'Pernambuco', PI: 'Piauí', PR: 'Paraná', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RO: 'Rondônia', RR: 'Roraima', RS: 'Rio Grande do Sul', SC: 'Santa Catarina', SE: 'Sergipe', SP: 'São Paulo',
  TO: 'Tocantins', ZZ: 'Exterior'
};
const UFS = Object.keys(UF_NOMES);
// Cargos com votos por seção armazenados na base; 6/7/8 (deputados) são agregados por município.
const CARGOS_SECAO = [1, 3, 5];
const CARGOS_DEP = [6, 7, 8];
// Índices do vetor de estatísticas por cargo
// Índices 0-7 vêm do detalhe por seção; 8-10 são calculados a partir dos votos por candidato e da situação
// de cada candidatura na totalização oficial (nominais = votos digitados para candidatos, como no BU).
const ST = ['aptos', 'comparecimento', 'abstencoes', 'nominais', 'brancos', 'nulos', 'legenda', 'anuladosApuSep', 'nulosTecnicos', 'anuladosSubJudice', 'anulados'];
// Situação na totalização -> índice: sub judice soma em vansj; "Anulado" (decisão definitiva) soma em van
// (até 09/10 o TSE somava os dois em vansj; o JSON atualizado em 10/10 separa — o validador confere).
const SITUACAO_IDX = { 'Anulado sub judice': 9, Anulado: 10 };

const int = s => {
  const v = parseInt(s, 10);
  return Number.isFinite(v) ? v : null;
};
const coord = s => {
  if (!s || s === '-1') return null;
  const v = parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(v) && v !== -1 ? Math.round(v * 1e6) / 1e6 : null;
};
const clean = s => (s == null || s === '#NULO' || s === '#NE' || s === '-1' || s === '#NULO#' ? null : s);
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s]`, ...a);

async function sha256(file) {
  const h = crypto.createHash('sha256');
  await new Promise((res, rej) => fs.createReadStream(file).on('data', d => h.update(d)).on('end', res).on('error', rej));
  return h.digest('hex');
}

// ---------------- estado global ----------------
const municipios = new Map(); // `${uf}|${cd}` -> mun
const secoes = new Map(); // `${uf}|${cd}|${zona}|${secao}` -> sec
const candidatos = new Map(); // `${cargo}|${ue}|${numero}` -> cand
const partidos = new Map(); // numero -> sigla
const problemas = [];
let situacao = {}; // `${cargo}|${ue}` -> { numero: { dvt } } (totalização oficial)
const fontes = [];

function getMun(uf, cd, nome) {
  const k = `${uf}|${cd}`;
  let m = municipios.get(k);
  if (!m) {
    m = { uf, cd, nome, zonas: new Set(), locais: new Map(), secoes: [], dep: { 6: new Map(), 7: new Map(), 8: new Map() }, depLeg: { 6: new Map(), 7: new Map(), 8: new Map() } };
    municipios.set(k, m);
  }
  return m;
}

async function registrarFonte(file, inner, url, linhas, dtGeracao) {
  const st = fs.statSync(file);
  fontes.push({ arquivo: path.basename(file), conteudo: inner, url, bytes: st.size, sha256: await sha256(file), linhas, dtGeracao });
}

// ---------------- 1. candidatos ----------------
async function lerCandidatos() {
  const zip = path.join(RAW, 'consulta_cand_2026.zip');
  const inner = 'consulta_cand_2026_BRASIL.csv';
  let dt = null;
  const n = await forEachRow(zip, inner, (c, H) => {
    if (int(c[H.NR_TURNO]) !== TURNO) return;
    dt ??= `${c[H.DT_GERACAO]} ${c[H.HH_GERACAO]}`;
    const cargo = int(c[H.CD_CARGO]);
    const ue = c[H.SG_UE] === 'BR' ? 'BR' : c[H.SG_UF];
    const numero = int(c[H.NR_CANDIDATO]);
    partidos.set(int(c[H.NR_PARTIDO]), c[H.SG_PARTIDO]);
    // Substituições: o mesmo número pode aparecer duas vezes; prevalece a candidatura que não foi anulada (#NULO).
    const anterior = candidatos.get(`${cargo}|${ue}|${numero}`);
    if (anterior && anterior.resultado && !clean(c[H.DS_SIT_TOT_TURNO])) return;
    candidatos.set(`${cargo}|${ue}|${numero}`, {
      n: numero,
      nome: c[H.NM_URNA_CANDIDATO],
      nomeCompleto: c[H.NM_CANDIDATO],
      partido: c[H.SG_PARTIDO],
      coligacao: clean(c[H.NM_COLIGACAO]) || clean(c[H.NM_FEDERACAO]) || null,
      federacao: clean(c[H.SG_FEDERACAO]),
      situacaoCandidatura: clean(c[H.DS_SITUACAO_CANDIDATURA]),
      resultado: clean(c[H.DS_SIT_TOT_TURNO]),
      sq: c[H.SQ_CANDIDATO]
    });
  });
  await registrarFonte(zip, inner, `${CDN}/consulta_cand/consulta_cand_2026.zip`, n, dt);
  log('candidatos', candidatos.size);
}

// ---------------- 2. locais de votação e seções ----------------
async function lerEleitorado() {
  const zip = path.join(RAW, 'eleitorado_local_votacao_2026.zip');
  let total = 0;
  let dt = null;
  for (const uf of UFS) {
    const inner = `eleitorado_local_votacao_2026_${uf}.csv`;
    total += await forEachRow(zip, inner, (c, H) => {
      if (int(c[H.NR_TURNO]) !== TURNO) return;
      dt ??= `${c[H.DT_GERACAO]} ${c[H.HH_GERACAO]}`;
      const cd = c[H.CD_MUNICIPIO].padStart(5, '0');
      const m = getMun(uf, cd, c[H.NM_MUNICIPIO]);
      const zona = int(c[H.NR_ZONA]);
      const secao = int(c[H.NR_SECAO]);
      const nrLocal = int(c[H.NR_LOCAL_VOTACAO]);
      m.zonas.add(zona);
      const lk = `${zona}|${nrLocal}`;
      if (!m.locais.has(lk)) {
        const loc = {
          z: zona,
          n: nrLocal,
          nome: c[H.NM_LOCAL_VOTACAO],
          end: clean(c[H.DS_ENDERECO]),
          bairro: clean(c[H.NM_BAIRRO]),
          cep: clean(c[H.NR_CEP]) === '11111111' ? null : clean(c[H.NR_CEP]),
          lat: coord(c[H.NR_LATITUDE]),
          lng: coord(c[H.NR_LONGITUDE]),
          tipo: clean(c[H.DS_TIPO_LOCAL])
        };
        const orig = int(c[H.NR_LOCAL_VOTACAO_ORIGINAL]);
        if (orig != null && orig !== nrLocal) loc.original = { n: orig, nome: c[H.NM_LOCAL_VOTACAO_ORIGINAL], end: clean(c[H.DS_ENDERECO_LOCVT_ORIGINAL]) };
        m.locais.set(lk, loc);
      }
      const key = `${uf}|${cd}|${zona}|${secao}`;
      if (secoes.has(key)) { problemas.push(`seção duplicada no eleitorado: ${key}`); return; }
      const principal = int(c[H.NR_SECAO_PRINCIPAL]);
      const sec = {
        z: zona,
        s: secao,
        lk,
        agregada: c[H.DS_TIPO_SECAO_AGREGADA] !== 'Principal',
        p: principal != null && principal > 0 ? principal : null,
        el: int(c[H.QT_ELEITOR_SECAO]),
        acess: c[H.DS_SITU_SECAO_ACESSIBILIDADE] === 'Com acessibilidade' ? 1 : 0,
        st: {},
        v: {}
      };
      secoes.set(key, sec);
      m.secoes.push(sec);
    });
  }
  await registrarFonte(zip, 'eleitorado_local_votacao_2026_<UF>.csv', `${CDN}/eleitorado_locais_votacao/eleitorado_local_votacao_2026.zip`, total, dt);
  log('eleitorado: municípios', municipios.size, 'seções', secoes.size);
}

// ---------------- 3. detalhe por seção ----------------
async function lerDetalhe() {
  const zip = path.join(RAW, 'detalhe_votacao_secao_2026.zip');
  const arquivos = (await listZip(zip)).filter(f => /detalhe_votacao_secao_2026_[A-Z]{2}\.csv$/.test(f));
  let total = 0;
  let dt = null;
  for (const inner of arquivos) {
    total += await forEachRow(zip, inner, (c, H) => {
      if (int(c[H.NR_TURNO]) !== TURNO) return;
      dt ??= `${c[H.DT_GERACAO]} ${c[H.HH_GERACAO]}`;
      const uf = c[H.SG_UF];
      const cd = c[H.CD_MUNICIPIO].padStart(5, '0');
      const key = `${uf}|${cd}|${int(c[H.NR_ZONA])}|${int(c[H.NR_SECAO])}`;
      let sec = secoes.get(key);
      if (!sec) {
        problemas.push(`detalhe sem seção no eleitorado: ${key} (${c[H.DS_CARGO]})`);
        const m = getMun(uf, cd, c[H.NM_MUNICIPIO]);
        sec = { z: int(c[H.NR_ZONA]), s: int(c[H.NR_SECAO]), lk: `${int(c[H.NR_ZONA])}|${int(c[H.NR_LOCAL_VOTACAO])}`, agregada: false, p: null, el: null, st: {}, v: {} };
        m.zonas.add(sec.z);
        if (!m.locais.has(sec.lk)) m.locais.set(sec.lk, { z: sec.z, n: int(c[H.NR_LOCAL_VOTACAO]), nome: c[H.NM_LOCAL_VOTACAO], end: clean(c[H.DS_LOCAL_VOTACAO_ENDERECO]), lat: null, lng: null });
        secoes.set(key, sec);
        m.secoes.push(sec);
      }
      const cargo = int(c[H.CD_CARGO]);
      if (sec.st[cargo]) problemas.push(`detalhe duplicado: ${key} cargo ${cargo}`);
      sec.st[cargo] = [
        int(c[H.QT_APTOS]), int(c[H.QT_COMPARECIMENTO]), int(c[H.QT_ABSTENCOES]), int(c[H.QT_VOTOS_NOMINAIS]),
        int(c[H.QT_VOTOS_BRANCOS]), int(c[H.QT_VOTOS_NULOS]), int(c[H.QT_VOTOS_LEGENDA]), int(c[H.QT_VOTOS_ANULADOS_APU_SEP])
      ];
      sec.m = clean(c[H.DS_MODELO_URNA]);
      sec.o = c[H.DS_ORIGEM_VOTO];
      sec.inst = c[H.ST_SECAO_INSTALADA] === 'Sim' ? 1 : 0;
      sec.anul = c[H.ST_SECAO_ANULADA] === 'Sim' ? 1 : 0;
      sec.rb = clean(c[H.DT_RECEBIMENTO_BU_HOR_TSE]);
    });
  }
  await registrarFonte(zip, arquivos.join(', '), `${CDN}/detalhe_votacao_secao/detalhe_votacao_secao_2026.zip`, total, dt);
  log('detalhe linhas', total);
}

// ---------------- 4. votos por seção ----------------
async function lerVotos(zip, inner, url) {
  let dt = null;
  const n = await forEachRow(zip, inner, (c, H) => {
    if (int(c[H.NR_TURNO]) !== TURNO) return;
    dt ??= `${c[H.DT_GERACAO]} ${c[H.HH_GERACAO]}`;
    const uf = c[H.SG_UF];
    const cd = c[H.CD_MUNICIPIO].padStart(5, '0');
    const key = `${uf}|${cd}|${int(c[H.NR_ZONA])}|${int(c[H.NR_SECAO])}`;
    const sec = secoes.get(key);
    if (!sec) { problemas.push(`voto sem seção: ${key}`); return; }
    const cargo = int(c[H.CD_CARGO]);
    const num = int(c[H.NR_VOTAVEL]);
    const qt = int(c[H.QT_VOTOS]);
    if (num === 95 || num === 96 || num === 97) { // branco / nulo / anulado: já estão no detalhe
      (sec.esp ??= {})[`${cargo}|${num}`] = ((sec.esp ?? {})[`${cargo}|${num}`] || 0) + qt;
      return;
    }
    const ue = cargo === 1 ? 'BR' : uf;
    if (CARGOS_DEP.includes(cargo) && num < 100) {
      // legenda em partido ausente da totalização do cargo/UF = nulo técnico;
      // legenda em partido com situação não válida (ex.: anulado sub judice) = anulado sub judice
      const sp = situacao[`${cargo}|${ue}`]?.partidos?.[num];
      const idx = !sp ? 8 : /^V.lido/.test(sp.dvt) ? 0 : 9;
      if (idx) { const e = ((sec.extra ??= {})[cargo] ??= [0, 0, 0]); e[idx - 8] += qt; }
    } else {
      // classifica o voto nominal conforme a situação da candidatura na totalização oficial
      const situ = situacao[`${cargo}|${ue}`]?.cands?.[num];
      const idx = !situ ? 8 : SITUACAO_IDX[situ.dvt];
      if (idx) { const e = ((sec.extra ??= {})[cargo] ??= [0, 0, 0]); e[idx - 8] += qt; }
    }
    if (CARGOS_SECAO.includes(cargo)) {
      const vv = (sec.v[cargo] ??= {});
      vv[num] = (vv[num] || 0) + qt;
      if (!candidatos.has(`${cargo}|${ue}|${num}`)) {
        problemas.push(`votável sem cadastro em consulta_cand: cargo ${cargo} ${ue} nº ${num} (${c[H.NM_VOTAVEL]})`);
        candidatos.set(`${cargo}|${ue}|${num}`, { n: num, nome: c[H.NM_VOTAVEL], partido: null, semCadastro: true });
      }
    } else if (CARGOS_DEP.includes(cargo)) {
      const m = municipios.get(`${uf}|${cd}`);
      // números de 2 dígitos são votos de legenda (partido)
      const tgt = num < 100 ? m.depLeg[cargo] : m.dep[cargo];
      tgt.set(num, (tgt.get(num) || 0) + qt);
      if (num >= 100 && !candidatos.has(`${cargo}|${ue}|${num}`)) {
        candidatos.set(`${cargo}|${ue}|${num}`, { n: num, nome: c[H.NM_VOTAVEL], partido: null, semCadastro: true });
      }
    }
  });
  await registrarFonte(zip, inner, url, n, dt);
  return n;
}

// ---------------- 5. montagem ----------------
const sum = (a, b) => (a || 0) + (b || 0);
function somaSt(acc, st) {
  for (const [cargo, arr] of Object.entries(st)) {
    const t = (acc[cargo] ??= new Array(ST.length).fill(0));
    arr.forEach((x, i) => (t[i] += x || 0));
  }
}
function somaVotos(acc, v) {
  for (const [cargo, obj] of Object.entries(v)) {
    const t = (acc[cargo] ??= {});
    for (const [num, q] of Object.entries(obj)) t[num] = sum(t[num], q);
  }
}
function ordenar(votosObj) {
  return Object.entries(votosObj).sort((a, b) => b[1] - a[1]).map(([n]) => +n);
}
function alinhar(votosObj, ordem) {
  return ordem.map(n => votosObj?.[n] || 0);
}
function infoCand(cargo, ue, n, votos) {
  const c = candidatos.get(`${cargo}|${ue}|${n}`) || { n, nome: `Nº ${n}`, semCadastro: true };
  const o = { n, nome: c.nome, partido: c.partido };
  if (c.nomeCompleto) o.nomeCompleto = c.nomeCompleto;
  if (c.coligacao) o.coligacao = c.coligacao;
  if (c.resultado) o.resultado = c.resultado;
  if (c.situacaoCandidatura) o.situacao = c.situacaoCandidatura;
  const situ = situacao[`${cargo}|${ue}`]?.cands?.[n];
  if (!situ) o.votoValido = 'Nulo técnico: número não reconhecido na totalização do TSE';
  else if (situ.dvt !== 'Válido') o.votoValido = situ.dvt;
  if (votos != null) o.votos = votos;
  return o;
}
function writeJson(rel, obj) {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(obj));
  return fs.statSync(f).size;
}

async function main() {
  if (!fs.existsSync(RAW)) throw new Error('Informe a pasta com os zips do TSE');
  fs.rmSync(OUT, { recursive: true, force: true });
  await lerCandidatos();
  await lerEleitorado();
  await lerDetalhe();
  situacao = JSON.parse(fs.readFileSync(path.join(RAW, 'situacao-candidatos.json'), 'utf8')).cargos;
  log('votos presidente...');
  await lerVotos(path.join(RAW, 'votacao_secao_2026_BR.zip'), 'votacao_secao_2026_BR.csv', `${CDN}/votacao_secao/votacao_secao_2026_BR.zip`);
  for (const uf of UFS.filter(u => u !== 'ZZ')) {
    log('votos', uf);
    await lerVotos(path.join(RAW, 'uf', `votacao_secao_2026_${uf}.zip`), `votacao_secao_2026_${uf}.csv`, `${CDN}/votacao_secao/votacao_secao_2026_${uf}.zip`);
  }
  // completa o vetor de estatísticas com nulos técnicos / anulados sub judice / anulados
  for (const sec of secoes.values()) {
    for (const [cargo, st] of Object.entries(sec.st)) st.push(...(sec.extra?.[cargo] || [0, 0, 0]));
    delete sec.extra;
    delete sec.esp;
  }
  await registrarFonte(path.join(RAW, 'situacao-candidatos.json'), 'situação das candidaturas (campo dvt)', 'https://resultados.tse.jus.br/oficial/ele2026/{6257,6259}/dados/<uf>/<uf>-c<cargo>-e<eleicao>-u.json', Object.keys(situacao).length, null);

  // Municípios de referência (coordenadas IBGE e código IBGE) — já existentes no projeto
  const ref = JSON.parse(fs.readFileSync(path.resolve('scripts/data/ref/municipios-ibge.json'), 'utf8'));
  const refMap = new Map();
  for (const [uf, list] of Object.entries(ref)) for (const m of list) refMap.set(`${uf}|${m.codigoTse}`, m);

  // Totais nacionais para ordenar candidatos a presidente
  const brTot = { st: {}, v: {} };
  const ufTot = {};

  const resumoUfs = [];
  let bytes = 0;
  const totalMunLista = [];

  // Agrupa municípios por UF
  const porUf = new Map();
  for (const m of municipios.values()) {
    if (!porUf.has(m.uf)) porUf.set(m.uf, []);
    porUf.get(m.uf).push(m);
  }

  // 1ª passada: totais por município/UF/Brasil
  for (const m of municipios.values()) {
    m.tot = { st: {}, v: {} };
    for (const s of m.secoes) {
      somaSt(m.tot.st, s.st);
      somaVotos(m.tot.v, s.v);
    }
    // deputados: estatísticas por cargo já entram via st; votos ficam em m.dep
    const u = (ufTot[m.uf] ??= { st: {}, v: {} });
    somaSt(u.st, m.tot.st);
    somaVotos(u.v, m.tot.v);
    somaSt(brTot.st, { 1: m.tot.st[1] || new Array(ST.length).fill(0) });
    somaVotos(brTot.v, { 1: m.tot.v[1] || {} });
  }
  const ordemPres = ordenar(brTot.v[1]);

  for (const [uf, muns] of [...porUf.entries()].sort()) {
    const u = ufTot[uf];
    const ordem = { 1: ordemPres, 3: ordenar(u.v[3] || {}), 5: ordenar(u.v[5] || {}) };
    const munsOut = [];
    for (const m of muns.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))) {
      const r = refMap.get(`${uf}|${m.cd}`);
      const locais = [...m.locais.values()].sort((a, b) => a.z - b.z || a.n - b.n);
      const idx = new Map(locais.map((l, i) => [`${l.z}|${l.n}`, i]));
      const secs = m.secoes.sort((a, b) => a.z - b.z || a.s - b.s);
      const agregadasPor = new Map();
      for (const s of secs) if (s.agregada && s.p) {
        const k = `${s.z}|${s.p}`;
        if (!agregadasPor.has(k)) agregadasPor.set(k, []);
        agregadasPor.get(k).push(s.s);
      }
      const secOut = secs.map(s => {
        const o = { z: s.z, s: s.s, l: idx.get(s.lk) };
        if (s.el != null) o.el = s.el;
        if (s.agregada) { o.ag = 1; if (s.p) o.p = s.p; }
        const ags = agregadasPor.get(`${s.z}|${s.s}`);
        if (ags) o.agr = ags;
        if (s.acess) o.acess = 1;
        if (Object.keys(s.st).length) {
          o.m = s.m; o.o = s.o; o.rb = s.rb;
          if (!s.inst) o.naoInstalada = 1;
          if (s.anul) o.anulada = 1;
          o.st = s.st;
          o.v = {};
          for (const cg of CARGOS_SECAO) if (s.v[cg] || s.st[cg]) o.v[cg] = alinhar(s.v[cg], ordem[cg]);
        }
        return o;
      });
      const nSecoes = secs.filter(s => Object.keys(s.st).length).length;
      const zonas = [...m.zonas].sort((a, b) => a - b);
      const lat = r?.lat ?? (locais.find(l => l.lat)?.lat ?? null);
      const lng = r?.lng ?? (locais.find(l => l.lng)?.lng ?? null);
      bytes += writeJson(`mun/${uf}/${m.cd}.json`, {
        uf, cd: m.cd, nome: m.nome, cand: ordem, st: ST, locais, secoes: secOut
      });
      const mOut = {
        cd: m.cd, nome: m.nome, ibge: r?.codigoIbge ?? null, lat, lng, capital: r?.capital || false,
        zonas, nLocais: locais.length, nSecoes, nAgregadas: secs.length - nSecoes,
        eleitorado: secs.reduce((a, s) => a + (s.el || 0), 0),
        st: m.tot.st,
        v: Object.fromEntries(CARGOS_SECAO.filter(cg => m.tot.v[cg] || m.tot.st[cg]).map(cg => [cg, alinhar(m.tot.v[cg], ordem[cg])]))
      };
      munsOut.push(mOut);
      totalMunLista.push({ uf, cd: m.cd, nome: m.nome, nSecoes, zonas: zonas.length, capital: mOut.capital });
    }

    // deputados: candidatos do estado com votos totais e votos por município
    const dep = { cand: {}, legenda: {}, mun: {} };
    for (const cg of CARGOS_DEP) {
      const tot = new Map();
      const leg = new Map();
      for (const m of muns) {
        for (const [n, q] of m.dep[cg]) tot.set(n, (tot.get(n) || 0) + q);
        for (const [n, q] of m.depLeg[cg]) leg.set(n, (leg.get(n) || 0) + q);
      }
      if (!tot.size && !leg.size) continue;
      const ordemDep = [...tot.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
      const ix = new Map(ordemDep.map((n, i) => [n, i]));
      dep.cand[cg] = ordemDep.map(n => infoCand(cg, uf, n, tot.get(n)));
      const sitPart = situacao[`${cg}|${uf}`]?.partidos || {};
      dep.legenda[cg] = Object.fromEntries([...leg.entries()].sort((a, b) => b[1] - a[1]).map(([n, q]) => {
        const o = { partido: partidos.get(n) || null, votos: q };
        if (!sitPart[n]) o.votoValido = 'Nulo técnico: partido sem participação neste cargo/UF';
        else if (!/^V.lido/.test(sitPart[n].dvt)) o.votoValido = sitPart[n].dvt;
        return [n, o];
      }));
      for (const m of muns) {
        const arr = [...m.dep[cg].entries()].map(([n, q]) => [ix.get(n), q]).sort((a, b) => a[0] - b[0]).flat();
        const lg = [...m.depLeg[cg].entries()].sort((a, b) => a[0] - b[0]).flat();
        (dep.mun[m.cd] ??= {})[cg] = { v: arr, leg: lg };
      }
    }
    if (Object.keys(dep.cand).length) bytes += writeJson(`dep/${uf}.json`, dep);

    const cand = {
      3: ordem[3].map(n => infoCand(3, uf, n, u.v[3]?.[n] || 0)),
      5: ordem[5].map(n => infoCand(5, uf, n, u.v[5]?.[n] || 0))
    };
    bytes += writeJson(`uf/${uf}.json`, { uf, nome: UF_NOMES[uf], st: ST, cand, mun: munsOut });

    const secsUf = muns.reduce((a, m) => a + m.secoes.length, 0);
    resumoUfs.push({
      uf, nome: UF_NOMES[uf], nMun: muns.length,
      nZonas: new Set(muns.flatMap(m => [...m.zonas])).size,
      nLocais: muns.reduce((a, m) => a + m.locais.size, 0),
      nSecoes: muns.reduce((a, m) => a + m.secoes.filter(s => Object.keys(s.st).length).length, 0),
      nSecoesCadastro: secsUf,
      eleitorado: muns.reduce((a, m) => a + m.secoes.reduce((b, s) => b + (s.el || 0), 0), 0),
      st: u.st,
      v: Object.fromEntries(CARGOS_SECAO.filter(cg => u.v[cg]).map(cg => [cg, alinhar(u.v[cg], ordem[cg])])),
      cand3: cand[3].slice(0, 3).map(c => ({ n: c.n, nome: c.nome, partido: c.partido, votos: c.votos })),
      cand5: cand[5].slice(0, 3).map(c => ({ n: c.n, nome: c.nome, partido: c.partido, votos: c.votos }))
    });
    log('UF pronta', uf, muns.length, 'municípios');
  }

  bytes += writeJson('brasil.json', {
    ano: 2026, turno: TURNO, pleito: 3220, eleicoes: { federal: 6257, estadual: 6259 },
    st: ST,
    cand: { 1: ordemPres.map(n => infoCand(1, 'BR', n, brTot.v[1][n])) },
    total: { st: brTot.st, v: { 1: alinhar(brTot.v[1], ordemPres) } },
    ufs: resumoUfs
  });
  bytes += writeJson('municipios.json', totalMunLista);

  // Partidos (para votos de legenda)
  bytes += writeJson('partidos.json', Object.fromEntries([...partidos.entries()].sort((a, b) => a[0] - b[0])));

  const meta = {
    geradoEm: new Date().toISOString(),
    turno: TURNO,
    fontes,
    contagens: {
      municipios: municipios.size,
      secoesCadastro: secoes.size,
      secoesComVotacao: [...secoes.values()].filter(s => Object.keys(s.st).length).length,
      locais: [...municipios.values()].reduce((a, m) => a + m.locais.size, 0)
    },
    problemas: problemas.slice(0, 500),
    totalProblemas: problemas.length
  };
  bytes += writeJson('meta.json', meta);
  log('concluído. bytes gravados:', (bytes / 1e6).toFixed(1), 'MB; problemas:', problemas.length);
  if (problemas.length) console.log(problemas.slice(0, 30).join('\n'));
}

main().catch(e => { console.error(e); process.exit(1); });

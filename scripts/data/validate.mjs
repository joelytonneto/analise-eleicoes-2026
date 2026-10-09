// Auditoria da base gerada contra três referências independentes:
//   1. Consistência interna (aritmética de cada seção e de cada cargo);
//   2. Totalização oficial divulgada pelo TSE (resultados.tse.jus.br, JSON "-u") para Brasil,
//      todas as UFs e TODOS os municípios (Presidente, Governador e Senador) + deputados por UF;
//   3. Boletins de Urna (.bu.dat) originais baixados do TSE e decodificados (amostra aleatória).
//
// Uso: node scripts/data/validate.mjs [pasta=public/data/2026/t1] [--bu=800] [--sem-municipios]
import fs from 'node:fs';
import path from 'node:path';
import { getJson, get, pool } from './http.mjs';
import { decodeBoletimUrna, resumirBU } from '../../src/lib/buDecoder.js';

const args = process.argv.slice(2);
const DIR = path.resolve(args.find(a => !a.startsWith('--')) || 'public/data/2026/t1');
const N_BU = +(args.find(a => a.startsWith('--bu='))?.split('=')[1] ?? 800);
const SEM_MUN = args.includes('--sem-municipios');
const BASE = 'https://resultados.tse.jus.br/oficial/ele2026';
const PLEITO = 3220;
const ELE = { 1: 6257, 3: 6259, 5: 6259, 6: 6259, 7: 6259, 8: 6259 };
const read = rel => JSON.parse(fs.readFileSync(path.join(DIR, rel), 'utf8'));
const pad = (n, k) => String(n).padStart(k, '0');
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s]`, ...a);

const brasil = read('brasil.json');
const ufs = brasil.ufs.map(u => u.uf);
const ufData = Object.fromEntries(ufs.map(uf => [uf, read(`uf/${uf}.json`)]));

const report = {
  geradoEm: new Date().toISOString(),
  consistencia: { secoes: 0, checagens: 0, falhas: [] },
  divulgacao: { arquivos: 0, comparacoes: 0, divergencias: [], ausentes: [] },
  bu: { amostra: 0, secoesIguais: 0, comparacoes: 0, divergencias: [], erros: [], verificadas: [] }
};

// ---------------- 1. consistência interna ----------------
function consistencia() {
  const c = report.consistencia;
  const falha = (msg) => { if (c.falhas.length < 300) c.falhas.push(msg); c.totalFalhas = (c.totalFalhas || 0) + 1; };
  for (const uf of ufs) {
    for (const m of ufData[uf].mun) {
      const mf = read(`mun/${uf}/${m.cd}.json`);
      for (const s of mf.secoes) {
        if (!s.st) continue;
        c.secoes++;
        for (const [cg, st] of Object.entries(s.st)) {
          const [aptos, comp, abst, nom, br, nu, leg] = st;
          const id = `${uf}/${m.cd} z${s.z} s${s.s} cargo ${cg}`;
          if (s.naoInstalada) continue; // seção não instalada: sem comparecimento nem abstenção apurados
          c.checagens++;
          if (comp + abst !== aptos) falha(`${id}: comparecimento+abstenção (${comp}+${abst}) ≠ aptos (${aptos})`);
          const vagas = cg === '5' ? 2 : 1;
          c.checagens++;
          if (s.anulada !== 1 && nom + br + nu + leg !== comp * vagas) falha(`${id}: nominais+brancos+nulos+legenda (${nom + br + nu + leg}) ≠ comparecimento×vagas (${comp * vagas})`);
          if (s.v?.[cg]) {
            const soma = s.v[cg].reduce((a, b) => a + b, 0);
            c.checagens++;
            if (soma !== nom) falha(`${id}: soma dos votos por candidato (${soma}) ≠ nominais (${nom})`);
          }
        }
      }
    }
  }
  log('consistência:', c.checagens, 'checagens,', c.totalFalhas || 0, 'falhas');
}

// ---------------- 2. totalização oficial (JSON de divulgação) ----------------
function urlDivulgacao(uf, cdMun, cargo) {
  const e = ELE[cargo];
  const abr = cdMun ? `${uf.toLowerCase()}${cdMun}` : uf.toLowerCase();
  return `${BASE}/${e}/dados/${uf.toLowerCase()}/${abr}-c${pad(cargo, 4)}-e${pad(e, 6)}-u.json`;
}
function candsDivulgacao(j) {
  const out = new Map();
  for (const agr of j.carg[0].agr || []) for (const p of agr.par || []) for (const c of p.cand || []) out.set(+c.n, +c.vap);
  return out;
}
function comparar(escopo, cargo, j, st, votos, ordem) {
  const d = report.divulgacao;
  const dif = (campo, nosso, tse) => {
    d.comparacoes++;
    if (nosso !== tse) d.divergencias.push({ escopo, cargo, campo, base: nosso, tse });
  };
  dif('aptos', st[0], +j.e.te);
  dif('comparecimento', st[1], +j.e.c);
  dif('abstencoes', st[2], +j.e.a);
  dif('brancos', st[4], +j.v.vb);
  // regras da totalização: nulos = nulos + nulos técnicos; válidos excluem anulados e sub judice
  dif('nulos (incl. técnicos)', st[5] + st[8], +j.v.tvn);
  dif('válidos', st[3] + st[6] - st[8] - st[9] - st[10], +j.v.vv);
  dif('anulados sub judice', st[9], +j.v.vansj);
  dif('anulados', st[10], +j.v.van);
  dif('nulos técnicos', st[8], +j.v.vnt);
  if (votos) {
    // números ausentes da totalização são nulos técnicos (conferidos acima no total "vnt")
    const tse = candsDivulgacao(j);
    ordem.forEach((n, i) => { if (tse.has(n)) dif(`votos nº ${n}`, votos[i], tse.get(n)); });
    for (const [n, q] of tse) if (!ordem.includes(n) && q > 0) dif(`votos nº ${n}`, 0, q);
  }
}

async function divulgacao() {
  const tarefas = [];
  // Brasil
  tarefas.push({ escopo: 'BR', cargo: 1, url: `${BASE}/6257/dados/br/br-c0001-e006257-u.json`, st: brasil.total.st[1], v: brasil.total.v[1], ordem: brasil.cand[1].map(c => c.n) });
  for (const u of brasil.ufs) {
    const ud = ufData[u.uf];
    for (const cg of [1, 3, 5]) {
      if (!u.st[cg]) continue;
      const ordem = cg === 1 ? brasil.cand[1].map(c => c.n) : ud.cand[cg].map(c => c.n);
      tarefas.push({ escopo: u.uf, cargo: cg, url: urlDivulgacao(u.uf, null, cg), st: u.st[cg], v: u.v[cg], ordem });
      if (SEM_MUN) continue;
      for (const m of ud.mun) if (m.st[cg]) tarefas.push({ escopo: `${u.uf}/${m.cd} ${m.nome}`, cargo: cg, url: urlDivulgacao(u.uf, m.cd, cg), st: m.st[cg], v: m.v[cg], ordem });
    }
    // deputados: estatísticas por UF e votos de todos os candidatos
    if (fs.existsSync(path.join(DIR, `dep/${u.uf}.json`))) {
      const dep = read(`dep/${u.uf}.json`);
      for (const cg of Object.keys(dep.cand)) {
        tarefas.push({ escopo: u.uf, cargo: +cg, url: urlDivulgacao(u.uf, null, +cg), st: u.st[cg], v: dep.cand[cg].map(c => c.votos), ordem: dep.cand[cg].map(c => c.n) });
      }
    }
  }
  log('divulgação:', tarefas.length, 'arquivos do TSE a comparar');
  let feitos = 0;
  await pool(tarefas, 24, async t => {
    const j = await getJson(t.url).catch(e => ({ erro: e.message }));
    if (!j || j.erro) { report.divulgacao.ausentes.push({ escopo: t.escopo, cargo: t.cargo, url: t.url, erro: j?.erro || '404' }); return; }
    report.divulgacao.arquivos++;
    comparar(t.escopo, t.cargo, j, t.st, t.v, t.ordem);
    if (++feitos % 2000 === 0) log('  ', feitos, 'arquivos comparados');
  });
  log('divulgação:', report.divulgacao.comparacoes, 'comparações,', report.divulgacao.divergencias.length, 'divergências,', report.divulgacao.ausentes.length, 'ausentes');
}

// ---------------- 3. Boletins de Urna originais ----------------
function sortear(n) {
  const todas = [];
  for (const uf of ufs) for (const m of ufData[uf].mun) todas.push({ uf, m, peso: m.nSecoes });
  const total = todas.reduce((a, x) => a + x.peso, 0);
  // garante ao menos 4 seções por UF e sorteia o restante proporcional ao nº de seções
  const escolhidas = [];
  let seed = 20261004;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pick = lista => {
    let r = rnd() * lista.reduce((a, x) => a + x.peso, 0);
    for (const x of lista) { r -= x.peso; if (r <= 0) return x; }
    return lista[lista.length - 1];
  };
  for (const uf of ufs) {
    const l = todas.filter(x => x.uf === uf && x.peso > 0);
    for (let i = 0; i < 4; i++) escolhidas.push(pick(l));
  }
  while (escolhidas.length < n) escolhidas.push(pick(todas));
  void total;
  const cache = new Map();
  return escolhidas.map(({ uf, m }) => {
    const k = `${uf}/${m.cd}`;
    if (!cache.has(k)) cache.set(k, read(`mun/${k}.json`));
    const mf = cache.get(k);
    const secs = mf.secoes.filter(s => s.st);
    const s = secs[Math.floor(rnd() * secs.length)];
    return { uf, mf, s };
  });
}

export async function baixarBU(uf, cd, z, s) {
  const dir = `${BASE}/arquivo-urna/${PLEITO}/dados/${uf.toLowerCase()}/${cd}/${pad(z, 4)}/${pad(s, 4)}`;
  const aux = await getJson(`${dir}/p00${PLEITO}-${uf.toLowerCase()}-m${cd}-z${pad(z, 4)}-s${pad(s, 4)}-aux.json`);
  if (!aux) throw new Error('aux.json inexistente');
  const h = [...aux.hashes].reverse().find(x => /totaliz/i.test(x.st)) || aux.hashes[aux.hashes.length - 1];
  const arq = h.arq.find(a => a.tp === 'bu');
  if (!arq) throw new Error(`hash ${h.st} sem arquivo bu`);
  const buf = await get(`${dir}/${h.hash}/${arq.nm}`);
  return { aux, hash: h, buf };
}

async function amostraBU() {
  const r = report.bu;
  const amostra = sortear(N_BU);
  const vistos = new Set();
  const lista = amostra.filter(a => { const k = `${a.uf}${a.mf.cd}${a.s.z}${a.s.s}`; if (vistos.has(k)) return false; vistos.add(k); return true; });
  log('BU: amostra de', lista.length, 'seções');
  let feitos = 0;
  await pool(lista, 16, async ({ uf, mf, s }) => {
    const id = `${uf}/${mf.cd} ${mf.nome} z${s.z} s${s.s}`;
    let bu;
    try {
      const { buf } = await baixarBU(uf, mf.cd, s.z, s.s);
      bu = resumirBU(decodeBoletimUrna(buf));
    } catch (e) {
      r.erros.push({ secao: id, erro: e.message });
      return;
    }
    r.amostra++;
    let ok = true;
    const dif = (campo, nosso, tse) => {
      r.comparacoes++;
      if (nosso !== tse) { ok = false; r.divergencias.push({ secao: id, campo, base: nosso, bu: tse }); }
    };
    for (const [cg, st] of Object.entries(s.st)) {
      const b = bu[cg];
      if (!b) { dif(`cargo ${cg} presente no BU`, true, false); continue; }
      dif(`c${cg} aptos`, st[0], b.aptos);
      dif(`c${cg} comparecimento`, st[1], b.comparecimento);
      dif(`c${cg} brancos`, st[4], b.brancos);
      dif(`c${cg} nulos`, st[5], b.nulos);
      dif(`c${cg} legenda`, st[6], b.legenda);
      dif(`c${cg} nominais`, st[3], b.nominais);
      if (s.v?.[cg]) {
        const ordem = mf.cand[cg];
        ordem.forEach((n, i) => dif(`c${cg} nº ${n}`, s.v[cg][i], b.votos[n] || 0));
        for (const n of Object.keys(b.votos)) if (!ordem.includes(+n)) dif(`c${cg} nº ${n}`, 0, b.votos[n]);
      }
    }
    if (ok) r.secoesIguais++;
    r.verificadas.push({ uf, cd: mf.cd, municipio: mf.nome, zona: s.z, secao: s.s, ok });
    if (++feitos % 100 === 0) log('  ', feitos, 'BUs verificados');
  });
  log('BU:', r.amostra, 'BUs decodificados,', r.secoesIguais, 'idênticos,', r.divergencias.length, 'divergências,', r.erros.length, 'erros');
}

consistencia();
await divulgacao();
if (N_BU > 0) await amostraBU();
report.resumo = {
  consistenciaOk: !report.consistencia.totalFalhas,
  divulgacaoOk: report.divulgacao.divergencias.length === 0 && report.divulgacao.ausentes.length === 0,
  buOk: report.bu.divergencias.length === 0 && report.bu.erros.length === 0
};
report.divulgacao.divergencias = report.divulgacao.divergencias.slice(0, 500);
report.bu.divergencias = report.bu.divergencias.slice(0, 500);
fs.writeFileSync(path.join(DIR, 'validacao.json'), JSON.stringify(report, null, 1));
log('relatório salvo em', path.join(DIR, 'validacao.json'));
console.log(JSON.stringify(report.resumo));

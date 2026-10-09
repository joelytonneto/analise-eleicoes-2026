// Baixa da totalização oficial do TSE a situação de cada candidato (campo "dvt": Válido, Anulado,
// Anulado sub judice...). Votos em números que a totalização não reconhece como válidos são
// contabilizados pelo TSE como nulos técnicos/anulados — e a base precisa seguir a mesma regra.
// Uso: node scripts/data/situacao-candidatos.mjs <pasta-raw>   -> grava <pasta-raw>/situacao-candidatos.json
import fs from 'node:fs';
import path from 'node:path';
import { getJson, pool } from './http.mjs';

const RAW = path.resolve(process.argv[2] || '.');
const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];
const tarefas = [{ ue: 'BR', cargo: 1, url: 'https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json' }];
for (const uf of UFS) {
  for (const cargo of [3, 5, 6, uf === 'DF' ? 8 : 7]) {
    const u = uf.toLowerCase();
    tarefas.push({ ue: uf, cargo, url: `https://resultados.tse.jus.br/oficial/ele2026/6259/dados/${u}/${u}-c${String(cargo).padStart(4, '0')}-e006259-u.json` });
  }
}
const out = { fonte: 'resultados.tse.jus.br (JSON de totalização, campo dvt)', geradoEm: new Date().toISOString(), cargos: {} };
await pool(tarefas, 12, async t => {
  const j = await getJson(t.url);
  if (!j) throw new Error(`não encontrado: ${t.url}`);
  const cands = {};
  const partidos = {};
  for (const a of j.carg[0].agr || []) {
    for (const p of a.par || []) {
      if (p.dvt) partidos[+p.n] = { dvt: p.dvt, legenda: +(p.tval || p.tvtl || 0) };
      for (const c of p.cand || []) cands[+c.n] = { dvt: c.dvt, st: c.st, vap: +c.vap };
    }
  }
  out.cargos[`${t.cargo}|${t.ue}`] = { dg: `${j.dg} ${j.hg}`, v: j.v, cands, partidos };
});
fs.writeFileSync(path.join(RAW, 'situacao-candidatos.json'), JSON.stringify(out));
const dvts = {};
for (const c of Object.values(out.cargos)) for (const x of Object.values(c.cands)) dvts[x.dvt] = (dvts[x.dvt] || 0) + 1;
console.log('arquivos', Object.keys(out.cargos).length, 'situações:', dvts);

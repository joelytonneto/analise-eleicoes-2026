// Gera os índices usados pela busca do site a partir da base já construída (public/data/2026/t1):
//   busca/locais/<UF>.json — todo local de votação da UF: [cd, zona, nº, nome, endereço, bairro, seções com urna]
//   busca/candidatos.json  — toda candidatura: [cargo, uf, nº, nome de urna, nome completo, partido, resultado, votos]
// Uso: node scripts/data/indices-busca.mjs   (rodar depois de build.mjs)
import fs from 'node:fs';
import path from 'node:path';

const BASE = path.resolve('public/data/2026/t1');
const OUT = path.join(BASE, 'busca');
fs.mkdirSync(path.join(OUT, 'locais'), { recursive: true });
const ler = f => JSON.parse(fs.readFileSync(path.join(BASE, f), 'utf8'));
const gravar = (f, dados) => {
  const s = JSON.stringify(dados);
  fs.writeFileSync(path.join(OUT, f), s);
  console.log(`${f}: ${dados.length} registros, ${(s.length / 1e6).toFixed(1)} MB`);
};

let totalLocais = 0;
for (const uf of fs.readdirSync(path.join(BASE, 'mun')).sort()) {
  const locais = [];
  for (const arq of fs.readdirSync(path.join(BASE, 'mun', uf)).sort()) {
    const m = ler(`mun/${uf}/${arq}`);
    const nSec = new Array(m.locais.length).fill(0);
    for (const s of m.secoes) if (!s.ag && s.st && Object.keys(s.st).length) nSec[s.l]++;
    m.locais.forEach((l, i) => locais.push([m.cd, l.z, l.n, l.nome || '', l.end || '', l.bairro || '', nSec[i]]));
  }
  fs.writeFileSync(path.join(OUT, 'locais', `${uf}.json`), JSON.stringify(locais));
  totalLocais += locais.length;
}
console.log(`locais/<UF>.json: ${totalLocais} locais`);

const candidatos = [];
const add = (cargo, uf, c) => candidatos.push([cargo, uf, c.n, c.nome, c.nomeCompleto || '', c.partido || '', c.resultado || '', c.votos || 0]);
const brasil = ler('brasil.json');
for (const c of brasil.cand[1]) add(1, 'BR', c);
for (const arq of fs.readdirSync(path.join(BASE, 'uf')).sort()) {
  const u = ler(`uf/${arq}`);
  for (const cargo of [3, 5]) for (const c of u.cand?.[cargo] || []) add(cargo, u.uf, c);
}
for (const arq of fs.readdirSync(path.join(BASE, 'dep')).sort()) {
  const uf = arq.replace('.json', '');
  const d = ler(`dep/${arq}`);
  for (const cargo of [6, 7, 8]) for (const c of d.cand?.[cargo] || []) add(cargo, uf, c);
}
gravar('candidatos.json', candidatos);

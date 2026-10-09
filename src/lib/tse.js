// Acesso direto (ao vivo) aos servidores oficiais do TSE — resultados.tse.jus.br.
// O TSE libera CORS para este site, então o navegador baixa os arquivos originais sem intermediários.
import { decodeBoletimUrna, resumirBU } from './buDecoder.js';
import { pad } from './format.js';

export const TSE = 'https://resultados.tse.jus.br/oficial';
export const PLEITO = 3220;
export const ELEICAO = { federal: 6257, estadual: 6259 };
export const eleicaoDoCargo = cargo => (+cargo === 1 ? ELEICAO.federal : ELEICAO.estadual);

export function dirSecao(uf, cd, z, s) {
  return `${TSE}/ele2026/arquivo-urna/${PLEITO}/dados/${uf.toLowerCase()}/${cd}/${pad(z)}/${pad(s)}`;
}
export function urlAux(uf, cd, z, s) {
  return `${dirSecao(uf, cd, z, s)}/p00${PLEITO}-${uf.toLowerCase()}-m${cd}-z${pad(z)}-s${pad(s)}-aux.json`;
}
/** Página da seção no portal oficial de resultados do TSE (aba Boletim de Urna). */
export function urlPortalSecao(uf, cd, z, s, cargo = 1) {
  return `${TSE}/app/index.html#/eleicao;e=e${eleicaoDoCargo(cargo)};uf=${uf.toLowerCase()};mu=${cd};zn=${pad(z)};se=${pad(s)}/dados-de-urna/boletim-de-urna`;
}
export function urlPortalMunicipio(uf, cd, cargo = 1) {
  return `${TSE}/app/index.html#/eleicao;e=e${eleicaoDoCargo(cargo)};uf=${uf.toLowerCase()};mu=${cd}/resultados`;
}
/** JSON de totalização oficial (mesmo arquivo usado pelo portal do TSE). */
export function urlDivulgacao(uf, cd, cargo) {
  const e = eleicaoDoCargo(cargo);
  const u = (uf || 'br').toLowerCase();
  return `${TSE}/ele2026/${e}/dados/${u}/${cd ? `${u}${cd}` : u}-c${pad(cargo)}-e${String(e).padStart(6, '0')}-u.json`;
}
export const URL_DADOS_ABERTOS = 'https://dadosabertos.tse.jus.br/dataset/resultados-2026';

async function sha256Hex(buf) {
  if (!globalThis.crypto?.subtle) return null;
  const h = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Baixa do TSE o Boletim de Urna de uma seção e o decodifica.
 * Retorna { aux, hash, arquivos, urlBU, bu, resumo, sha256, bytes }.
 */
export async function baixarBoletim(uf, cd, z, s, { signal } = {}) {
  const dir = dirSecao(uf, cd, z, s);
  const r = await fetch(urlAux(uf, cd, z, s), { signal, cache: 'no-cache' });
  if (r.status === 404 || r.status === 403) throw new Error('O TSE não publicou arquivos para esta seção (seção agregada ou inexistente).');
  if (!r.ok) throw new Error(`TSE respondeu HTTP ${r.status} ao consultar a seção.`);
  const aux = await r.json();
  const hashes = aux.hashes || [];
  const escolhido = [...hashes].reverse().find(h => /totaliz/i.test(h.st)) || hashes[hashes.length - 1];
  if (!escolhido) throw new Error('A seção não possui arquivos de urna publicados.');
  const arqBU = escolhido.arq.find(a => a.tp === 'bu');
  if (!arqBU) throw new Error('Arquivo de BU não encontrado entre os arquivos publicados.');
  const urlBU = `${dir}/${escolhido.hash}/${arqBU.nm}`;
  const rb = await fetch(urlBU, { signal });
  if (!rb.ok) throw new Error(`Falha ao baixar o BU (HTTP ${rb.status}).`);
  const ab = await rb.arrayBuffer();
  const bu = decodeBoletimUrna(new Uint8Array(ab));
  return {
    aux,
    hash: escolhido,
    situacao: aux.st,
    arquivos: escolhido.arq.map(a => ({ ...a, url: `${dir}/${escolhido.hash}/${a.nm}` })),
    urlBU,
    urlAux: urlAux(uf, cd, z, s),
    bu,
    resumo: resumirBU(bu),
    sha256: await sha256Hex(ab),
    bytes: ab.byteLength
  };
}

/**
 * Compara os números da base do site com o BU oficial.
 * cands: { [cargo]: [números na ordem do vetor v] }
 * Retorna lista de { cargo, campo, base, bu, ok }.
 */
export function compararComBU(secao, cands, resumo) {
  const linhas = [];
  for (const [cg, st] of Object.entries(secao.st || {})) {
    const b = resumo[cg];
    if (!b) { linhas.push({ cargo: +cg, campo: 'Cargo presente no BU', base: 'sim', bu: 'não', ok: false }); continue; }
    const add = (campo, base, bu) => linhas.push({ cargo: +cg, campo, base, bu, ok: base === bu });
    add('Eleitores aptos', st[0], b.aptos);
    add('Comparecimento', st[1], b.comparecimento);
    add('Votos nominais', st[3], b.nominais);
    add('Votos de legenda', st[6], b.legenda);
    add('Brancos', st[4], b.brancos);
    add('Nulos', st[5], b.nulos);
    const v = secao.v?.[cg];
    const ordem = cands?.[cg];
    if (v && ordem) {
      ordem.forEach((n, i) => { if (v[i] || b.votos[n]) add(`Nº ${n}`, v[i] || 0, b.votos[n] || 0); });
      for (const n of Object.keys(b.votos)) if (!ordem.includes(+n)) add(`Nº ${n}`, 0, b.votos[n]);
    }
  }
  return linhas;
}

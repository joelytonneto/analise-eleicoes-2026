// "Unidade" = qualquer recorte territorial comparável: Brasil, UF, município, zona, local de votação ou seção.
// Identificador textual: br | uf:CE | mun:CE:13480 | zona:CE:13480:78 | local:CE:13480:78:1082 | secao:CE:13480:78:393
import { loadBrasil, loadUf, loadMun, somarSt, somarV, UF_NOMES } from './data';
import { titulo, pad } from './format';
import { rotas } from './router';

export const idSecao = (uf, cd, z, s) => `secao:${uf}:${cd}:${z}:${s}`;
export const idLocal = (uf, cd, z, n) => `local:${uf}:${cd}:${z}:${n}`;
export const idZona = (uf, cd, z) => `zona:${uf}:${cd}:${z}`;
export const idMun = (uf, cd) => `mun:${uf}:${cd}`;
export const idUf = uf => `uf:${uf}`;

export const TIPO_NOME = { br: 'País', uf: 'UF', mun: 'Município', zona: 'Zona', local: 'Local de votação', secao: 'Seção' };

export async function carregarUnidade(id) {
  const [tipo, uf, cd, z, n] = id.split(':');
  const brasil = await loadBrasil();
  if (tipo === 'br') {
    return { id, tipo, nome: 'Brasil', sub: 'Total nacional (inclui exterior)', st: brasil.total.st, v: brasil.total.v, cand: { 1: brasil.cand[1] }, href: rotas.brasil() };
  }
  const ud = await loadUf(uf);
  const cand = { 1: brasil.cand[1], 3: ud.cand[3], 5: ud.cand[5] };
  if (tipo === 'uf') {
    const r = brasil.ufs.find(u => u.uf === uf);
    return { id, tipo, uf, nome: UF_NOMES[uf], sub: `${r.nMun} municípios · ${r.nSecoes.toLocaleString('pt-BR')} seções`, st: r.st, v: r.v, cand, nSecoes: r.nSecoes, eleitorado: r.eleitorado, href: rotas.uf(uf) };
  }
  const m = ud.mun.find(x => x.cd === cd);
  if (!m) throw new Error(`Município ${uf}/${cd} não encontrado`);
  const munNome = `${titulo(m.nome)} – ${uf}`;
  if (tipo === 'mun') {
    return { id, tipo, uf, cd, nome: munNome, sub: `${m.zonas.length} zona(s) · ${m.nSecoes.toLocaleString('pt-BR')} seções`, st: m.st, v: m.v, cand, nSecoes: m.nSecoes, eleitorado: m.eleitorado, lat: m.lat, lng: m.lng, href: rotas.mun(uf, cd) };
  }
  const mf = await loadMun(uf, cd);
  const zona = +z;
  if (tipo === 'secao') {
    const s = mf.secoes.find(x => x.z === zona && x.s === +n);
    if (!s) throw new Error(`Seção ${pad(n)} da zona ${pad(z)} não existe em ${munNome}`);
    const loc = mf.locais[s.l];
    return {
      id, tipo, uf, cd, z: zona, s: s.s, nome: `Seção ${pad(s.s)} · Zona ${pad(zona)}`, sub: `${munNome} · ${titulo(loc?.nome || '')}`,
      st: s.st || {}, v: s.v || {}, cand, nSecoes: s.st ? 1 : 0, eleitorado: s.el, secao: s, local: loc, lat: loc?.lat, lng: loc?.lng,
      href: rotas.secao(uf, cd, zona, s.s), agregada: !!s.ag, principal: s.p
    };
  }
  const secs = mf.secoes.filter(s => s.z === zona && (tipo === 'zona' || mf.locais[s.l]?.n === +n));
  if (!secs.length) throw new Error(`${TIPO_NOME[tipo]} não encontrado(a)`);
  const st = {}, v = {};
  let el = 0, ns = 0;
  for (const s of secs) { if (s.st) { somarSt(st, s.st); somarV(v, s.v); ns++; } el += s.el || 0; }
  if (tipo === 'zona') {
    return { id, tipo, uf, cd, z: zona, nome: `Zona ${pad(zona)}`, sub: munNome, st, v, cand, nSecoes: ns, eleitorado: el, href: rotas.mun(uf, cd, { tab: 'secoes', zona }) };
  }
  const loc = mf.locais[secs[0].l];
  return {
    id, tipo, uf, cd, z: zona, nome: titulo(loc.nome), sub: `Zona ${pad(zona)} · ${munNome}`, st, v, cand, nSecoes: ns, eleitorado: el,
    local: loc, lat: loc.lat, lng: loc.lng, href: rotas.mun(uf, cd, { tab: 'locais', local: `${zona}-${loc.n}` })
  };
}

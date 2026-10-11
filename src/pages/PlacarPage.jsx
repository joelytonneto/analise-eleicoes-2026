import React, { useEffect, useMemo, useState } from 'react';
import { Trophy, Users, Vote, CircleSlash, UserX, BarChart3, Search, MapPin, Building2, School, UserRound, ChevronRight, FileText, Info, Loader2, ShieldCheck, ExternalLink, Download } from 'lucide-react';
import { useAsync, Loading, ErrorBox, Seg, Select, SeloResultado, StatusIcon } from '../components/ui';
import { FotoCandidato, Contador, BarraGrossa, CartaoNumero, CartaoUnidade } from '../components/Vitrine';
import { interpretar, useMunicipios, useBuscaTexto } from '../components/SearchBox';
import { loadBrasil, loadUf, loadMun, loadDep, UF_NOMES, cargosDaUf, cargoNome, validosSt, nulosSt, secoesDoMunicipio, agrupar, S } from '../lib/data';
import { carregarCandidatos, eleitoOuTurno2, subLocal, subCandidato, hrefCandidato } from '../lib/busca';
import { corPorIndice, OUTROS } from '../lib/colors';
import { fmt, fmtPct, pct, titulo, pad, semAcento } from '../lib/format';
import { rotas, setQuery } from '../lib/router';
import { baixarBoletim, urlPortalSecao } from '../lib/tse';

// ---------------------------------------------------------------- votos de deputado por urna (boletins de urna do TSE)
// O TSE não publica o voto de cada deputado por zona, local ou seção na totalização: esse dado está só no
// boletim de urna (BU). Para esses recortes o Placar baixa os BUs do TSE e soma os votos, como a página da seção.
const LIMITE_AUTOMATICO = 80; // acima disso de urnas, a leitura começa só quando a pessoa pede
const cacheBU = new Map();
/** Resumo do BU oficial de uma urna, por cargo, com os endereços dos arquivos no TSE. */
function lerBoletim(uf, cd, z, s) {
  const k = `${uf}-${cd}-${z}-${s}`;
  if (!cacheBU.has(k)) {
    cacheBU.set(k, baixarBoletim(uf, cd, z, s).then(r => {
      const o = { cargos: {}, urlBU: r.urlBU, urlAux: r.urlAux };
      for (const b of Object.values(r.resumo)) {
        if (b.codigoCargo == null) continue;
        o.cargos[b.codigoCargo] = { aptos: b.aptos, comparecimento: b.comparecimento, nominais: b.nominais, legenda: b.legenda, brancos: b.brancos, nulos: b.nulos, votos: b.votos };
      }
      return o;
    }).catch(e => { cacheBU.delete(k); throw e; }));
  }
  return cacheBU.get(k);
}

/** Lê os BUs das urnas (6 por vez) e devolve o progresso e os votos por urna (chave "zona-seção"). */
function useBoletins(uf, cd, urnas, ativo) {
  const [r, setR] = useState({ urnas: null, res: new Map(), feitos: 0, falhas: 0 });
  useEffect(() => {
    if (!ativo || !urnas?.length) return undefined;
    let vivo = true, i = 0, feitos = 0, falhas = 0, ultimo = 0;
    const res = new Map();
    const publicar = () => { if (vivo) setR({ urnas, res: new Map(res), feitos, falhas }); };
    setR({ urnas, res: new Map(), feitos: 0, falhas: 0 });
    const trabalhador = async () => {
      while (vivo && i < urnas.length) {
        const x = urnas[i++];
        try { res.set(`${x.z}-${x.s}`, await lerBoletim(uf, cd, x.z, x.s)); } catch { falhas++; }
        feitos++;
        if (feitos === urnas.length || Date.now() - ultimo > 250) { ultimo = Date.now(); publicar(); }
      }
    };
    Promise.all(Array.from({ length: 6 }, trabalhador));
    return () => { vivo = false; };
  }, [uf, cd, urnas, ativo]);
  const atual = r.urnas === urnas;
  return { res: atual ? r.res : new Map(), feitos: atual ? r.feitos : 0, falhas: atual ? r.falhas : 0, total: urnas?.length || 0, pronto: atual && !!urnas?.length && r.feitos >= urnas.length };
}

const fmtPct1 = v => fmtPct(v, 1);

function CartaoPodio({ c, pos, total, cor, destaque }) {
  const p = pct(c.votos, total);
  return (
    <a href={c.href} className="card relative overflow-hidden p-4 sm:p-5 flex flex-col items-center text-center gap-2 hover:-translate-y-0.5 transition-transform" style={destaque ? { boxShadow: `0 0 0 2px ${cor}, 0 16px 40px -18px ${cor}` } : undefined}>
      <div className="absolute inset-x-0 top-0 h-20 opacity-20" style={{ background: `linear-gradient(180deg, ${cor}, transparent)` }} />
      <span className="absolute top-3 left-3 text-xs font-bold rounded-full px-2 py-0.5" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>{pos}º</span>
      <FotoCandidato cargo={c.cargo} uf={c.uf} sq={c.sq} nome={c.nome} cor={cor} size={destaque ? 112 : 92} className="relative mt-2" />
      <div className="relative min-w-0 w-full">
        <div className="font-bold text-base sm:text-lg leading-tight truncate">{c.nome}</div>
        <div className="text-xs muted">{c.partido} · {c.n}</div>
      </div>
      <SeloResultado resultado={c.resultado} />
      <div className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: cor }}><Contador valor={p ?? 0} formato={fmtPct1} /></div>
      <div className="text-sm ink-2"><Contador valor={c.votos} /> votos</div>
      <div className="w-full mt-1"><BarraGrossa pct={p} cor={cor} altura={12} /></div>
    </a>
  );
}

function LinhaCandidato({ c, pos, total, cor, topo }) {
  const p = pct(c.votos, total);
  return (
    <a href={c.href} className="card p-3 flex items-center gap-3 hover:-translate-y-0.5 transition-transform min-w-0">
      <span className="w-6 text-right text-xs font-semibold muted num shrink-0">{pos}º</span>
      <FotoCandidato cargo={c.cargo} uf={c.uf} sq={c.sq} nome={c.nome} cor={cor} size={48} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold text-sm truncate">{c.nome}</span>
          <span className="font-bold num shrink-0" style={{ color: cor }}>{fmtPct1(p)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs muted">
          <span className="truncate">{c.partido} · {c.n} {c.resultado && <SeloResultado resultado={c.resultado} className="ml-1" />}</span>
          <span className="num shrink-0">{fmt(c.votos)}</span>
        </div>
        <div className="mt-1.5"><BarraGrossa pct={topo ? (c.votos / topo) * 100 : 0} cor={cor} altura={6} /></div>
      </div>
    </a>
  );
}

// ---------------------------------------------------------------- escopo (Brasil → UF → município → zona → local → seção)

function lerEscopo(query) {
  const uf = query.uf && UF_NOMES[query.uf] ? query.uf : '';
  const cd = uf && /^\d{5}$/.test(query.m || '') ? query.m : '';
  const z = cd && +query.z > 0 ? +query.z : null;
  const l = z != null && +query.l > 0 ? +query.l : null;
  const s = z != null && l == null && +query.s > 0 ? +query.s : null;
  const nivel = s != null ? 'secao' : l != null ? 'local' : z != null ? 'zona' : cd ? 'mun' : uf ? 'uf' : 'br';
  return { uf, cd, z, l, s, nivel };
}

/** Endereço do Placar para um lugar encontrado na busca. */
function hrefPlacarLugar(r, c) {
  if (r.tipo === 'uf') return rotas.placar({ uf: r.uf, c });
  if (r.tipo === 'mun') return rotas.placar({ uf: r.uf, m: r.cd, c });
  if (r.tipo === 'zona') return rotas.placar({ uf: r.uf, m: r.cd, z: r.z, c });
  if (r.tipo === 'secao') return rotas.placar({ uf: r.uf, m: r.cd, z: r.z, s: r.s, c });
  return r.href;
}

/** Busca de qualquer lugar (estado, cidade, zona e seção, escola ou endereço) ou candidato, abrindo no Placar. */
function BuscaLugar({ cargo }) {
  const [q, setQ] = useState('');
  const [aberto, setAberto] = useState(false);
  const [sel, setSel] = useState(0);
  const municipios = useMunicipios();
  const lugares = useMemo(() => (q.trim() ? interpretar(q, municipios).slice(0, 6) : []), [q, municipios]);
  const extra = useBuscaTexto(q, municipios, { limiteLocais: 6, limiteCand: 4 });
  const res = useMemo(() => {
    const out = lugares.map(r => ({ ...r, href: hrefPlacarLugar(r, cargo) }));
    for (const l of extra.locais) out.push({ tipo: 'local', label: titulo(l.nome), sub: subLocal(l), href: rotas.placar({ uf: l.uf, m: l.cd, z: l.z, l: l.n, c: cargo }) });
    for (const c of extra.candidatos) out.push({ tipo: 'cand', label: c.nome, sub: subCandidato(c), href: hrefCandidato(c) });
    return out;
  }, [lugares, extra, cargo]);
  useEffect(() => setSel(0), [q]);
  const ir = r => { window.location.hash = r.href; setAberto(false); setQ(''); };
  const Icone = { uf: MapPin, mun: Building2, zona: MapPin, secao: Vote, local: School, cand: UserRound };
  return (
    <div className="relative w-full sm:w-80 max-w-full">
      <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 muted" />
      <input
        className="input w-full pl-8"
        placeholder="Ir para cidade, escola, seção ou candidato"
        aria-label="Buscar lugar ou candidato no Placar"
        value={q}
        onChange={e => { setQ(e.target.value); setAberto(true); }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setSel(x => Math.min(res.length - 1, x + 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(x => Math.max(0, x - 1)); }
          else if (e.key === 'Enter' && res[sel]) ir(res[sel]);
          else if (e.key === 'Escape') setAberto(false);
        }}
      />
      {aberto && q.trim() && (
        <div className="absolute z-20 mt-1 left-0 right-0 card p-1 max-h-[60vh] overflow-auto" style={{ boxShadow: '0 0 0 1px var(--ring), 0 12px 32px rgba(0,0,0,.18)' }}>
          {res.map((r, i) => {
            const I = Icone[r.tipo] || MapPin;
            return (
              <a key={`${r.tipo}-${r.href}`} href={r.href} onMouseDown={e => e.preventDefault()} onClick={e => { e.preventDefault(); ir(r); }}
                className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg" style={i === sel ? { background: 'var(--surface-2)' } : undefined}>
                <I className="w-4 h-4 mt-0.5 shrink-0 muted" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium truncate">{r.label}</span>
                  {r.sub && <span className="block text-xs muted truncate">{r.sub}</span>}
                </span>
              </a>
            );
          })}
          {!res.length && !extra.carregando && <div className="px-2.5 py-2 text-sm muted">Nada encontrado. Tente o nome da cidade, “Fortaleza 114 1” (zona e seção) ou o nome da escola.</div>}
          {extra.carregando && <div className="px-2.5 py-2 text-xs muted flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando escolas e candidatos…</div>}
        </div>
      )}
    </div>
  );
}

/**
 * Conferência da seção com o boletim de urna (BU) oficial baixado do TSE: cada número da tela
 * comparado com o arquivo da urna, e links para conferir por conta própria no portal e no arquivo.
 */
function ConferenciaTSE({ uf, cd, z, s, cargo, prop, st, lista, bu, carregando, falhou, auditoria }) {
  const b = bu?.cargos?.[cargo];
  const linhas = [];
  if (b) {
    const add = (item, placar, oficial) => linhas.push({ item, placar, oficial, ok: placar === oficial });
    add('Eleitores aptos', st[S.aptos], b.aptos);
    add('Comparecimento', st[S.comp], b.comparecimento);
    add('Votos nominais', st[S.nom], b.nominais);
    if (prop) add('Votos de legenda', st[S.leg], b.legenda);
    add('Brancos', st[S.br], b.brancos);
    add('Nulos', st[S.nu], b.nulos);
    if (!prop) for (const c of lista || []) add(`${c.nome} (${c.n})`, c.votos, b.votos[c.n] || 0);
  }
  const div = linhas.filter(x => !x.ok);
  const link = 'inline-flex items-center gap-1.5 link font-medium';
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0" style={{ background: 'color-mix(in srgb, var(--ok) 14%, transparent)', color: 'var(--ok)' }}><ShieldCheck className="w-5 h-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">Conferir com o TSE</div>
          <div className="text-sm ink-2">
            {carregando && !b ? <span className="inline-flex items-center gap-1.5"><Loader2 className="w-4 h-4 animate-spin" /> Baixando o boletim de urna oficial desta seção no site do TSE…</span>
              : !b ? <span style={{ color: 'var(--bad)' }}>{falhou ? 'Não foi possível baixar o boletim de urna agora. Use os links abaixo para conferir direto no TSE.' : 'O boletim de urna não traz este cargo.'}</span>
              : !div.length ? <span className="inline-flex items-start gap-1.5"><StatusIcon ok /> <span>Os <b>{linhas.length}</b> números desta tela para {cargoNome(cargo)} conferem com o boletim de urna oficial desta seção{prop ? ' (os votos por deputado foram lidos desse mesmo boletim)' : ''}.</span></span>
              : <span className="inline-flex items-start gap-1.5"><StatusIcon ok={false} /> <span><b>{div.length}</b> número(s) diferente(s) do boletim de urna: {div.map(x => x.item).join(', ')}.</span></span>}
          </div>
        </div>
      </div>
      {linhas.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer muted text-xs">Ver a comparação item por item</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs muted text-left"><th className="py-1 pr-3 font-medium">Item</th><th className="py-1 pr-3 font-medium text-right">Placar</th><th className="py-1 pr-3 font-medium text-right">Boletim de urna</th><th className="py-1 font-medium" /></tr></thead>
              <tbody>
                {linhas.map(x => (
                  <tr key={x.item} style={{ boxShadow: '0 -1px 0 var(--grid)' }}>
                    <td className="py-1 pr-3">{x.item}</td>
                    <td className="py-1 pr-3 text-right num">{fmt(x.placar)}</td>
                    <td className="py-1 pr-3 text-right num">{fmt(x.oficial)}</td>
                    <td className="py-1"><StatusIcon ok={x.ok} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <a className={link} href={urlPortalSecao(uf, cd, z, s, cargo)} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /> Abrir esta seção no portal do TSE</a>
        {bu?.urlBU && <a className={link} href={bu.urlBU} target="_blank" rel="noreferrer"><Download className="w-4 h-4" /> Boletim de urna (arquivo oficial)</a>}
        <a className={link} href={auditoria}><FileText className="w-4 h-4" /> Auditoria completa da urna</a>
      </div>
    </div>
  );
}

const ORDENS = [
  { value: 'aptos', label: 'Mais eleitores' },
  { value: 'comp', label: 'Comparecimento' },
  { value: 'nome', label: 'A–Z' }
];

/** Grade de cartões dos lugares contidos no escopo (estados, municípios, locais, seções…). */
function GradeLugares({ titulo: tit, itens, ordemInicial = 'aptos', alternativa }) {
  const [filtro, setFiltro] = useState('');
  const [ordem, setOrdem] = useState(ordemInicial);
  const [qtd, setQtd] = useState(24);
  const lista = useMemo(() => {
    const f = semAcento(filtro.trim());
    const out = f ? itens.filter(u => semAcento(`${u.nome} ${u.sub || ''} ${u.lider?.nome || ''}`).includes(f)) : [...itens];
    const tx = u => (u.aptos ? u.comp / u.aptos : 0);
    if (ordem === 'nome') out.sort((a, b) => (a.ordemNome ?? a.nome).localeCompare(b.ordemNome ?? b.nome, 'pt-BR', { numeric: true }));
    else if (ordem === 'comp') out.sort((a, b) => tx(b) - tx(a));
    else out.sort((a, b) => b.aptos - a.aptos);
    return out;
  }, [itens, filtro, ordem]);
  if (!itens.length) return null;
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{tit} <span className="muted font-normal">({fmt(itens.length)})</span></h2>
        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          {alternativa}
          {itens.length > 8 && <Seg size="xs" value={ordem} onChange={v => { setOrdem(v); setQtd(24); }} options={ORDENS} />}
          {itens.length > 12 && (
            <input className="input !py-1 text-sm w-full sm:w-48" placeholder="Filtrar…" aria-label={`Filtrar ${tit}`} value={filtro} onChange={e => { setFiltro(e.target.value); setQtd(24); }} />
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
        {lista.slice(0, qtd).map(u => <CartaoUnidade key={u.key} {...u} />)}
      </div>
      {!lista.length && <p className="text-sm muted">Nada encontrado com “{filtro}”.</p>}
      {lista.length > qtd && <button className="btn w-full justify-center" onClick={() => setQtd(x => x + 48)}>Mostrar mais ({fmt(lista.length - qtd)})</button>}
    </section>
  );
}

/** Placar visual: fotos oficiais, votos e percentuais de qualquer recorte — do Brasil até uma urna. */
export default function PlacarPage({ query }) {
  const esc = lerEscopo(query);
  const { uf, cd, z, l, s, nivel } = esc;
  const disp = cargosDaUf(uf || null);
  const cargo = disp.some(c => c.id === +query.c) ? +query.c : uf && uf !== 'ZZ' ? 3 : 1;
  const prop = cargo >= 6;
  const precisaDep = prop && nivel !== 'br';
  const [filtro, setFiltro] = useState('eleitos');
  const [qtd, setQtd] = useState(24);
  const [abaMun, setAbaMun] = useState('locais');
  const [pediuBU, setPediuBU] = useState('');
  const chaveEscopo = `${uf}|${cd}|${z}|${l}|${s}`;
  useEffect(() => { setQtd(24); window.scrollTo(0, 0); }, [chaveEscopo]);

  const { data, loading, error } = useAsync(() => Promise.all([
    loadBrasil(), carregarCandidatos(),
    uf ? loadUf(uf) : null,
    cd ? loadMun(uf, cd) : null,
    precisaDep ? loadDep(uf) : null
  ]), [uf, cd, precisaDep]);

  const ctx = useMemo(() => {
    if (!data) return null;
    const [brasil, todos, ud, mf, dd] = data;
    const ufC = cargo === 1 ? 'BR' : uf;
    const idx = new Map(todos.filter(c => c.cargo === cargo && c.uf === ufC).map(c => [+c.n, c]));
    const info = c => ({ ...idx.get(+c.n), ...c, cargo, uf: ufC, href: rotas.candidato(ufC, cargo, c.n) });
    // lista de referência (ordem dos vetores de votos) e posição de cada candidato no ranking do escopo de referência
    const ref = cargo === 1 ? brasil.cand[1] : prop ? dd?.cand?.[cargo] || [] : ud?.cand?.[cargo] || [];
    const rank = new Map([...ref].sort((a, b) => (b.votos || 0) - (a.votos || 0)).map((c, i) => [+c.n, i]));
    const corDe = n => {
      const r = rank.get(+n);
      if (prop) return r != null && r < 3 ? corPorIndice(r) : 'var(--accent)';
      return r != null ? corPorIndice(r) : OUTROS.light;
    };
    const valido = i => !idx.get(+ref[i]?.n)?.votoValido;
    const deVetor = vec => ref.map((c, i) => ({ ...info(c), votos: vec?.[i] || 0 }));

    // resumo de um lugar: quem liderou, a divisão dos votos
    const resumoVetor = (vec, stU) => {
      if (!vec || !stU) return {};
      const ordem = vec.map((v, i) => [v || 0, i]).filter(([v, i]) => v > 0 && valido(i)).sort((a, b) => b[0] - a[0]);
      if (!ordem.length) return {};
      const [bv, bi] = ordem[0];
      const fatias = ordem.slice(0, 4).map(([v, i]) => ({ key: i, votos: v, cor: corDe(ref[i].n), titulo: `${ref[i].nome}: ${fmt(v)}` }));
      const resto = ordem.slice(4).reduce((a, [v]) => a + v, 0);
      if (resto) fatias.push({ key: 'outros', votos: resto, cor: OUTROS.light, titulo: `Demais: ${fmt(resto)}` });
      return { lider: { ...info(ref[bi]), votos: bv, pct: pct(bv, validosSt(stU)), cor: corDe(ref[bi].n) }, fatias, total: ordem.reduce((a, [v]) => a + v, 0) };
    };
    const resumoPares = (d, stU) => {
      if (!d?.v?.length || !stU) return {};
      let bi = -1, bv = -1;
      for (let i = 0; i < d.v.length; i += 2) if (d.v[i + 1] > bv && valido(d.v[i])) { bv = d.v[i + 1]; bi = d.v[i]; }
      if (bi < 0) return {};
      return { lider: { ...info(ref[bi]), votos: bv, pct: pct(bv, validosSt(stU)), cor: corDe(ref[bi].n), rotulo: 'deputado mais votado' } };
    };
    const porNum = new Map(ref.map(c => [+c.n, c]));
    const somarBU = (secs, res) => {
      const soma = new Map();
      for (const x of secs) {
        const b = res.get(`${x.z}-${x.s}`)?.cargos[cargo];
        if (b) for (const [n, q] of Object.entries(b.votos)) soma.set(+n, (soma.get(+n) || 0) + q);
      }
      return soma;
    };
    // a partir dos BUs: só números de candidatos reconhecidos e com voto válido (o resto é nulo técnico/anulado)
    const listaBU = soma => [...soma].filter(([n]) => porNum.has(n) && !idx.get(n)?.votoValido).map(([n, q]) => ({ ...info(porNum.get(n)), votos: q }));
    const liderBU = (secs, res, stU) => {
      let bn = null, bv = 0;
      for (const [n, q] of somarBU(secs, res)) if (q > bv && porNum.has(n) && !idx.get(n)?.votoValido) { bv = q; bn = n; }
      if (bn == null) return {};
      return { lider: { ...info(porNum.get(bn)), votos: bv, pct: pct(bv, validosSt(stU)), cor: corDe(bn), rotulo: 'deputado mais votado' } };
    };
    const unidade = (u, extra) => ({ aptos: u.st?.[S.aptos] || 0, comp: u.st?.[S.comp] || 0, ...extra });

    let st, lista = null, filhos = [], filhosZonas = null, extra = {}, urnas = null;
    const m = cd ? ud?.mun.find(x => x.cd === cd) : null;
    if (cd && !m) return { erro: `Município ${cd} não encontrado em ${UF_NOMES[uf]}.` };
    const nomeMun = m ? titulo(m.nome) : '';

    if (nivel === 'br') {
      st = brasil.total.st[1];
      lista = deVetor(brasil.total.v[1]);
      filhos = brasil.ufs.filter(u => u.st[1]).map(u => unidade({ st: u.st[1] }, {
        key: u.uf, nome: u.nome, ordemNome: u.uf === 'ZZ' ? '~' : u.nome, sub: u.uf === 'ZZ' ? 'Eleitores no exterior' : `${fmt(u.nMun)} municípios`,
        href: rotas.placar({ uf: u.uf, c: 1 }), ...resumoVetor(u.v[1], u.st[1])
      }));
    } else if (nivel === 'uf') {
      const resumo = brasil.ufs.find(u => u.uf === uf);
      st = resumo?.st[cargo];
      lista = cargo === 1 ? deVetor(resumo?.v[1]) : todos.filter(c => c.cargo === cargo && c.uf === uf).map(c => ({ ...c, href: rotas.candidato(uf, cargo, c.n) }));
      filhos = (ud?.mun || []).filter(x => x.st[cargo]).map(x => unidade({ st: x.st[cargo] }, {
        key: x.cd, nome: titulo(x.nome), sub: `${fmt(x.nSecoes)} seções${x.capital ? ' · capital' : ''}`,
        href: rotas.placar({ uf, m: x.cd, c: cargo }),
        ...(prop ? resumoPares(dd?.mun?.[x.cd]?.[cargo], x.st[cargo]) : resumoVetor(x.v[cargo], x.st[cargo]))
      }));
      extra.sub = `${fmt(resumo?.nMun)} ${uf === 'ZZ' ? 'cidades' : 'municípios'} · ${fmt(resumo?.nSecoes)} seções`;
    } else {
      const secoes = secoesDoMunicipio(mf, UF_NOMES[uf]);
      const cartaoLocal = u => unidade({ st: u.st[cargo] }, {
        key: `${u.z}-${u.local.n}`, nome: titulo(u.local.nome),
        sub: [titulo(u.local.end), titulo(u.local.bairro), `Zona ${pad(u.z)}`, `${u.nSecoes} seç${u.nSecoes === 1 ? 'ão' : 'ões'}`].filter(Boolean).join(' · '),
        href: rotas.placar({ uf, m: cd, z: u.z, l: u.local.n, c: cargo }), ...(prop ? { _secoes: u.secoes.filter(x => x.st?.[cargo]), _st: u.st[cargo] } : resumoVetor(u.v[cargo], u.st[cargo]))
      });
      if (nivel === 'mun') {
        st = m.st[cargo];
        if (prop) {
          const d = dd?.mun?.[cd]?.[cargo];
          lista = [];
          if (d) for (let i = 0; i < d.v.length; i += 2) lista.push({ ...info(ref[d.v[i]]), votos: d.v[i + 1] });
        } else lista = deVetor(m.v[cargo]);
        filhos = agrupar(secoes, 'local').filter(u => u.st[cargo]).map(cartaoLocal);
        if (m.zonas.length > 1) {
          filhosZonas = agrupar(secoes, 'zona').filter(u => u.st[cargo]).map(u => unidade({ st: u.st[cargo] }, {
            key: u.z, nome: `Zona ${pad(u.z)}`, ordemNome: pad(u.z), sub: `${fmt(u.locais.size)} locais · ${fmt(u.nSecoes)} seções`,
            href: rotas.placar({ uf, m: cd, z: u.z, c: cargo }), ...(prop ? {} : resumoVetor(u.v[cargo], u.st[cargo]))
          }));
        }
        extra.sub = `${m.zonas.length} zona(s) · ${fmt(m.nLocais)} locais · ${fmt(m.nSecoes)} seções`;
      } else {
        let sel;
        if (nivel === 'zona') sel = secoes.filter(x => x.z === z);
        else if (nivel === 'local') sel = secoes.filter(x => x.z === z && x.local?.n === l);
        else {
          let sec = secoes.find(x => x.z === z && x.s === s);
          if (!sec) return { erro: `A seção ${pad(s)} da zona ${pad(z)} não existe em ${nomeMun} – ${uf}.` };
          if (sec.ag) { extra.agregadaA = sec.p; sec = secoes.find(x => x.z === z && x.s === sec.p) || sec; }
          extra.sec = sec;
          sel = [sec];
        }
        if (!sel.length) return { erro: nivel === 'zona' ? `A zona ${pad(z)} não existe em ${nomeMun} – ${uf}.` : `Local de votação não encontrado na zona ${pad(z)} de ${nomeMun} – ${uf}.` };
        extra.local = sel[0].local;
        const [agg] = agrupar(sel.map(x => ({ ...x, z: 0, local: { n: 0 } })), 'zona');
        st = agg?.st[cargo];
        lista = prop ? null : agg ? deVetor(agg.v[cargo]) : [];
        if (prop || nivel === 'secao') urnas = sel.filter(x => x.st?.[cargo]);
        if (nivel === 'zona') {
          filhos = agrupar(sel, 'local').filter(u => u.st[cargo]).map(cartaoLocal);
          extra.sub = `${fmt(new Set(sel.map(x => x.local?.n)).size)} locais · ${fmt(agg?.nSecoes || 0)} seções · ${nomeMun} – ${uf}`;
        } else if (nivel === 'local') {
          filhos = sel.filter(x => x.st?.[cargo]).map(x => unidade({ st: x.st[cargo] }, {
            key: x.s, nome: `Seção ${pad(x.s)}`, ordemNome: pad(x.s), sub: x.agr ? `Agrega a(s) seção(ões) ${x.agr.map(a => pad(a)).join(', ')}` : x.m ? `Urna ${x.m}` : null,
            href: rotas.placar({ uf, m: cd, z, s: x.s, c: cargo }), ...(prop ? { _secoes: [x], _st: x.st[cargo] } : resumoVetor(x.v?.[cargo], x.st[cargo]))
          }));
          const loc = extra.local;
          extra.sub = [titulo(loc?.end), titulo(loc?.bairro), `${nomeMun} – ${uf}`, `Zona ${pad(z)}`].filter(Boolean).join(' · ');
        } else {
          const loc = extra.local;
          extra.sub = [titulo(loc?.nome), titulo(loc?.end), `${nomeMun} – ${uf}`].filter(Boolean).join(' · ');
        }
      }
    }
    if (lista) {
      lista = lista.filter(c => !c.votoValido && (nivel === 'br' || nivel === 'uf' || !prop || c.votos > 0)).sort((a, b) => b.votos - a.votos);
    }
    return { st, lista, filhos, filhosZonas, nomeMun, corDe, extra, validos: validosSt(st), urnas, somarBU, listaBU, liderBU };
  }, [data, cargo, prop, uf, cd, z, l, s, nivel]);

  const urnas = ctx?.urnas || null;
  const chaveBU = `${chaveEscopo}|${cargo}`;
  const autoBU = !!urnas && (urnas.length <= LIMITE_AUTOMATICO || pediuBU === chaveBU);
  const bus = useBoletins(uf, cd, urnas, autoBU);
  const doBU = useMemo(() => {
    if (!urnas || !bus.feitos) return null;
    const soma = ctx.somarBU(urnas, bus.res);
    let nominaisBU = 0;
    for (const x of urnas) nominaisBU += bus.res.get(`${x.z}-${x.s}`)?.cargos[cargo]?.nominais || 0;
    const lista = ctx.listaBU(soma).sort((a, b) => b.votos - a.votos);
    const filhos = ctx.filhos.map(f => (f._secoes ? { ...f, ...ctx.liderBU(f._secoes, bus.res, f._st) } : f));
    return { lista, filhos, nominaisBU };
  }, [ctx, urnas, bus.res, bus.feitos, cargo]);

  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const trocar = patch => { setQtd(24); setQuery(patch); };
  const controles = (
    <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
      <Select value={uf} onChange={v => trocar({ uf: v || undefined, m: undefined, z: undefined, l: undefined, s: undefined, c: v ? (v === 'ZZ' ? 1 : cargo === 1 ? 1 : cargo) : undefined })} aria-label="Estado">
        <option value="">Brasil</option>
        {Object.entries(UF_NOMES).map(([sg, n]) => <option key={sg} value={sg}>{n}</option>)}
      </Select>
      {disp.length > 1 && <Seg value={cargo} onChange={v => trocar({ c: v })} options={disp.map(c => ({ value: c.id, label: c.curto }))} />}
      <div className="w-full lg:w-auto lg:ml-auto"><BuscaLugar cargo={cargo} /></div>
    </div>
  );

  if (ctx?.erro) return <div className="space-y-4">{controles}<ErrorBox>{ctx.erro}</ErrorBox></div>;

  const { st, filhosZonas, nomeMun, corDe, extra, validos } = ctx;
  const viaBU = !!urnas && bus.pronto && !!doBU;
  const lista = ctx.lista || (viaBU ? doBU.lista : null);
  const filhos = viaBU ? doBU.filhos : ctx.filhos;
  const local = extra.local;
  const nomeEscopo = {
    br: 'Brasil', uf: UF_NOMES[uf], mun: `${nomeMun} – ${uf}`, zona: `Zona ${pad(z)} · ${nomeMun}`,
    local: titulo(local?.nome || ''), secao: `Seção ${pad(s)} · Zona ${pad(z)}`
  }[nivel];

  const trilha = [{ label: 'Brasil', href: rotas.placar() }];
  if (uf) trilha.push({ label: UF_NOMES[uf], href: rotas.placar({ uf, c: cargo }) });
  if (cd) trilha.push({ label: nomeMun, href: rotas.placar({ uf, m: cd, c: cargo }) });
  if (z != null) trilha.push({ label: `Zona ${pad(z)}`, href: rotas.placar({ uf, m: cd, z, c: cargo }) });
  if (local && (nivel === 'local' || nivel === 'secao')) trilha.push({ label: titulo(local.nome), href: rotas.placar({ uf, m: cd, z, l: local.n, c: cargo }) });
  if (s != null) trilha.push({ label: `Seção ${pad(s)}` });
  trilha[trilha.length - 1] = { label: trilha[trilha.length - 1].label };

  const analise = {
    br: rotas.brasil(), uf: rotas.uf(uf, { c: cargo }), mun: rotas.mun(uf, cd, { c: cargo }),
    zona: rotas.mun(uf, cd, { c: cargo, tab: 'secoes', zona: z }),
    local: rotas.mun(uf, cd, { c: cargo, tab: 'secoes', zona: z, local: `${z}-${l}` }),
    secao: rotas.secao(uf, cd, z, extra.agregadaA || s, { c: cargo })
  }[nivel];

  const hero = (
    <div className="rounded-2xl p-5 sm:p-7 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #184f95, #2a78d6 55%, #6250d6)' }}>
      <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full opacity-10" style={{ background: '#fff' }} />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-widest opacity-80 flex items-center gap-1.5"><Trophy className="w-4 h-4" /> Placar · 1º turno 2026</div>
          {trilha.length > 1 && (
            <nav aria-label="Caminho" className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs sm:text-sm">
              {trilha.map((t, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <ChevronRight className="w-3.5 h-3.5 opacity-60 shrink-0" />}
                  {t.href ? <a href={t.href} className="opacity-85 hover:opacity-100 underline-offset-2 hover:underline">{t.label}</a> : <span className="font-semibold">{t.label}</span>}
                </React.Fragment>
              ))}
            </nav>
          )}
          <h1 className={`${nivel === 'local' ? 'text-xl sm:text-3xl' : 'text-2xl sm:text-4xl'} font-extrabold mt-1 break-words`}>{cargoNome(cargo)} · {nomeEscopo}</h1>
          {extra.sub && <p className="text-sm opacity-90 mt-1">{extra.sub}</p>}
          {st && <p className="text-sm opacity-90 mt-0.5"><Contador valor={validos} /> votos válidos · {fmtPct1(pct(st[S.comp], st[S.aptos]))} de comparecimento</p>}
        </div>
        <a href={analise} className="btn !bg-white/15 !text-white !shadow-none hover:!bg-white/25">
          {nivel === 'secao' ? <><FileText className="w-4 h-4" /> Boletim de urna e auditoria</> : <><BarChart3 className="w-4 h-4" /> Ver análise detalhada</>}
        </a>
      </div>
    </div>
  );

  if (!st) {
    return (
      <div className="space-y-5">
        {hero}
        {controles}
        <ErrorBox>{nivel === 'secao' ? 'Esta seção não teve votação registrada (não instalada ou anulada).' : `Não há votação de ${cargoNome(cargo)} em ${nomeEscopo}.`}</ErrorBox>
      </div>
    );
  }

  // a cor segue o candidato (posição no ranking do estado/Brasil), em qualquer recorte
  const cor = c => corDe(c.n);
  const vagas = cargo === 5 ? 2 : 1;
  const totalVotos = st[S.comp] * vagas;
  const nPodio = lista ? Math.min(3, lista.length) : 0;
  const podio = lista ? lista.slice(0, nPodio) : [];
  const eleitos = lista ? lista.filter(c => eleitoOuTurno2(c.resultado)) : [];
  const resto = !lista ? [] : prop && filtro === 'eleitos' && eleitos.length ? eleitos.filter(c => !podio.includes(c)) : lista.slice(nPodio);
  const ordemPodio = podio.length === 3 ? [podio[1], podio[0], podio[2]] : podio;
  const tituloFilhos = { br: 'Estados e exterior', uf: uf === 'ZZ' ? 'Cidades no exterior' : `Municípios de ${UF_NOMES[uf]}`, mun: 'Locais de votação', zona: 'Locais de votação da zona', local: 'Seções (urnas) deste local' }[nivel];
  const mostrarZonas = nivel === 'mun' && filhosZonas && abaMun === 'zonas';

  return (
    <div className="space-y-5">
      {hero}
      {controles}

      {extra.agregadaA && (
        <div className="card p-4 text-sm flex gap-3"><Info className="w-5 h-5 shrink-0" style={{ color: 'var(--accent)' }} />
          <div>A seção {pad(s)} é <b>agregada</b>: seus eleitores votaram na urna da seção {pad(extra.agregadaA)}. Os números abaixo são dessa urna, que reúne as duas.</div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CartaoNumero icon={Vote} rotulo="Votos válidos" valor={validos} sub={`${fmtPct1(pct(validos, totalVotos))} dos votos`} cor="#2a78d6" />
        <CartaoNumero icon={Users} rotulo="Compareceram" valor={st[S.comp]} sub={`de ${fmt(st[S.aptos])} aptos`} cor="#1baf7a" />
        <CartaoNumero icon={CircleSlash} rotulo="Brancos e nulos" valor={st[S.br] + nulosSt(st)} sub={`${fmtPct1(pct(st[S.br] + nulosSt(st), totalVotos))} dos votos`} cor="#898781" />
        <CartaoNumero icon={UserX} rotulo="Abstenção" valor={st[S.abst]} sub={`${fmtPct1(pct(st[S.abst], st[S.aptos]))} dos aptos`} cor="#eb6834" />
      </div>

      {nivel === 'secao' && extra.sec && (
        <ConferenciaTSE uf={uf} cd={cd} z={z} s={extra.sec.s} cargo={cargo} prop={prop} st={st} lista={lista}
          bu={bus.res.get(`${z}-${extra.sec.s}`)} carregando={!bus.pronto} falhou={bus.falhas > 0} auditoria={analise} />
      )}
      {urnas && prop && !bus.pronto && (
        <div className="card p-4 text-sm flex gap-3"><Info className="w-5 h-5 shrink-0" style={{ color: 'var(--accent)' }} />
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              O TSE publica o voto de cada deputado por urna só no <b>boletim de urna</b>. {autoBU
                ? <>Lendo os boletins no site do TSE: <b className="num">{fmt(bus.feitos)}</b> de <b className="num">{fmt(bus.total)}</b> urna{bus.total === 1 ? '' : 's'}…</>
                : <>Este recorte tem <b className="num">{fmt(urnas.length)}</b> urnas; a leitura de todos os boletins pode levar alguns minutos.</>}
            </div>
            {autoBU
              ? <BarraGrossa pct={bus.total ? (bus.feitos / bus.total) * 100 : 0} cor="var(--accent)" altura={8} />
              : <button className="btn btn-primary" onClick={() => setPediuBU(chaveBU)}><FileText className="w-4 h-4" /> Ler os {fmt(urnas.length)} boletins de urna</button>}
          </div>
        </div>
      )}
      {urnas && !urnas.length && (
        <ErrorBox>Não há urna com votação de {cargoNome(cargo)} neste recorte.</ErrorBox>
      )}
      {viaBU && prop && (
        <p className="text-xs muted flex items-start gap-1.5">
          <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Votos por deputado lidos agora {bus.total - bus.falhas === 1 ? 'do boletim de urna publicado' : <>dos {fmt(bus.total - bus.falhas)} boletins de urna publicados</>} pelo TSE
            {bus.falhas ? <> — <b style={{ color: 'var(--bad)' }}>{fmt(bus.falhas)} boletim(ns) não puderam ser baixados</b>; recarregue a página para tentar de novo</> : null}.
            {' '}{!bus.falhas && doBU.nominaisBU === st[S.nom]
              ? <span style={{ color: 'var(--ok)' }}>✓ Soma dos votos nominais ({fmt(doBU.nominaisBU)}) confere com a totalização.</span>
              : !bus.falhas ? <span style={{ color: 'var(--warn)' }}>Votos nominais nos BUs: {fmt(doBU.nominaisBU)}; na totalização: {fmt(st[S.nom])}.</span> : null}
          </span>
        </p>
      )}

      {podio.length > 0 && (
        <div className={`grid gap-3 sm:gap-4 grid-cols-1 ${podio.length === 3 ? 'sm:grid-cols-3 sm:items-end' : podio.length === 2 ? 'sm:grid-cols-2' : ''}`}>
          {ordemPodio.map(c => {
            const i = lista.indexOf(c);
            return <div key={c.n} className={podio.length === 3 && i === 0 ? 'order-first sm:order-none' : ''}><CartaoPodio c={c} pos={i + 1} total={validos} cor={cor(c, i)} destaque={i === 0} /></div>;
          })}
        </div>
      )}
      {cargo === 5 && lista && <p className="text-xs muted text-center">Senado 2026: duas vagas por estado e dois votos por eleitor — os percentuais somam 200%.</p>}

      {lista && (resto.length > 0 || (prop && eleitos.length > 0)) && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">{prop && filtro === 'eleitos' && eleitos.length ? `Demais eleitos (${eleitos.length} no total)` : 'Demais candidatos'}</h2>
            {prop && eleitos.length > 0 && (
              <Seg size="xs" value={filtro} onChange={v => { setFiltro(v); setQtd(24); }} options={[{ value: 'eleitos', label: `Eleitos (${eleitos.length})` }, { value: 'todos', label: `Todos (${lista.length})` }]} />
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {resto.slice(0, qtd).map(c => {
              const i = lista.indexOf(c);
              return <LinhaCandidato key={c.n} c={c} pos={i + 1} total={validos} cor={cor(c, i)} topo={lista[0]?.votos} />;
            })}
          </div>
          {resto.length > qtd && <button className="btn w-full justify-center" onClick={() => setQtd(q => q + 48)}>Mostrar mais ({fmt(resto.length - qtd)})</button>}
        </section>
      )}

      {nivel !== 'secao' && (
        <GradeLugares
          key={`${chaveEscopo}|${cargo}|${mostrarZonas ? 'z' : 'l'}`}
          titulo={mostrarZonas ? 'Zonas eleitorais' : tituloFilhos}
          itens={mostrarZonas ? filhosZonas : filhos}
          ordemInicial={nivel === 'local' || mostrarZonas ? 'nome' : 'aptos'}
          alternativa={nivel === 'mun' && filhosZonas ? <Seg size="xs" value={abaMun} onChange={setAbaMun} options={[{ value: 'locais', label: 'Locais' }, { value: 'zonas', label: `Zonas (${filhosZonas.length})` }]} /> : null}
        />
      )}

      <p className="text-xs muted">
        Fotos e números oficiais publicados pelo TSE. Percentuais sobre os votos válidos{prop ? ' (nominais + legenda)' : ''}.
        {nivel === 'br' || nivel === 'uf' ? '' : ' Abaixo do estado, os votos são a soma das urnas do recorte.'} Toque num candidato para ver onde ele foi votado, ou num lugar para descer até a urna.
      </p>
    </div>
  );
}

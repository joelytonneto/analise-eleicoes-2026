import React, { useMemo, useState } from 'react';
import { Trophy, Users, Vote, CircleSlash, UserX, BarChart3 } from 'lucide-react';
import { useAsync, Loading, ErrorBox, Seg, Select, SeloResultado } from '../components/ui';
import { FotoCandidato, Contador, BarraGrossa, CartaoNumero } from '../components/Vitrine';
import { loadBrasil, UF_NOMES, cargosDaUf, cargoNome, validosSt, nulosSt, S } from '../lib/data';
import { carregarCandidatos, eleitoOuTurno2 } from '../lib/busca';
import { mapaCores, corPorIndice } from '../lib/colors';
import { fmt, fmtPct, pct } from '../lib/format';
import { rotas, setQuery } from '../lib/router';

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

/** Placar visual: fotos oficiais, votos e percentuais — para acompanhar, não para analisar. */
export default function PlacarPage({ query }) {
  const uf = query.uf && UF_NOMES[query.uf] ? query.uf : '';
  const disp = uf ? cargosDaUf(uf) : cargosDaUf(null);
  const cargo = disp.some(c => c.id === +query.c) ? +query.c : uf && uf !== 'ZZ' ? 3 : 1;
  const prop = cargo >= 6;
  const [filtro, setFiltro] = useState('eleitos');
  const [qtd, setQtd] = useState(24);
  const { data, loading, error } = useAsync(() => Promise.all([loadBrasil(), carregarCandidatos()]), []);

  const ctx = useMemo(() => {
    if (!data) return null;
    const [brasil, todos] = data;
    const resumo = uf ? brasil.ufs.find(u => u.uf === uf) : null;
    const st = uf ? resumo?.st[cargo] : brasil.total.st[1];
    if (!st) return { st: null };
    const idx = new Map(todos.map(c => [`${c.cargo}|${c.uf}|${c.n}`, c]));
    let lista;
    if (cargo === 1) {
      const v = uf ? resumo.v[1] : brasil.total.v[1];
      lista = brasil.cand[1].map((c, i) => ({ ...idx.get(`1|BR|${c.n}`), ...c, cargo: 1, uf: 'BR', votos: v[i] || 0 }));
    } else {
      lista = todos.filter(c => c.cargo === cargo && c.uf === uf);
    }
    lista = lista.filter(c => !c.votoValido).sort((a, b) => b.votos - a.votos)
      .map(c => ({ ...c, href: rotas.candidato(c.cargo === 1 ? 'BR' : c.uf, c.cargo, c.n) }));
    // cor por candidato: Presidente segue a ordem nacional, como no resto do site
    const ref = cargo === 1 ? brasil.cand[1] : lista;
    return { st, lista, cores: mapaCores(ref), validos: validosSt(st) };
  }, [data, uf, cargo]);

  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const escopo = uf ? UF_NOMES[uf] : 'Brasil';
  const trocar = patch => { setQtd(24); setQuery(patch); };
  const controles = (
    <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
      <Select value={uf} onChange={v => trocar({ uf: v || undefined, c: v ? (v === 'ZZ' ? 1 : cargo === 1 ? 1 : cargo) : undefined })} aria-label="Escopo">
        <option value="">Brasil</option>
        {Object.entries(UF_NOMES).map(([s, n]) => <option key={s} value={s}>{n}</option>)}
      </Select>
      {disp.length > 1 && <Seg value={cargo} onChange={v => trocar({ c: v })} options={disp.map(c => ({ value: c.id, label: c.curto }))} />}
    </div>
  );

  if (!ctx?.st) {
    return <div className="space-y-4">{controles}<ErrorBox>Não há votação de {cargoNome(cargo)} em {escopo}.</ErrorBox></div>;
  }

  const { st, lista, cores, validos } = ctx;
  const cor = (c, i) => (prop ? (i < 3 ? corPorIndice(i) : 'var(--accent)') : cores.get(+c.n) || corPorIndice(99));
  const nPodio = prop ? 3 : Math.min(3, lista.length);
  const podio = lista.slice(0, nPodio);
  const eleitos = lista.filter(c => eleitoOuTurno2(c.resultado));
  const resto = prop && filtro === 'eleitos' && eleitos.length ? eleitos.filter(c => !podio.includes(c)) : lista.slice(nPodio);
  const vagas = cargo === 5 ? 2 : 1;
  const totalVotos = st[S.comp] * vagas;
  const ordemPodio = podio.length === 3 ? [podio[1], podio[0], podio[2]] : podio;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-5 sm:p-7 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #184f95, #2a78d6 55%, #6250d6)' }}>
        <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full opacity-10" style={{ background: '#fff' }} />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest opacity-80 flex items-center gap-1.5"><Trophy className="w-4 h-4" /> Placar · 1º turno 2026</div>
            <h1 className="text-2xl sm:text-4xl font-extrabold mt-1">{cargoNome(cargo)} · {escopo}</h1>
            <p className="text-sm opacity-90 mt-1"><Contador valor={validos} /> votos válidos · {fmtPct1(pct(st[S.comp], st[S.aptos]))} de comparecimento</p>
          </div>
          <a href={cargo === 1 && !uf ? rotas.brasil() : rotas.uf(uf, { c: cargo })} className="btn !bg-white/15 !text-white !shadow-none hover:!bg-white/25"><BarChart3 className="w-4 h-4" /> Ver análise detalhada</a>
        </div>
      </div>

      {controles}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CartaoNumero icon={Vote} rotulo="Votos válidos" valor={validos} sub={`${fmtPct1(pct(validos, totalVotos))} dos votos`} cor="#2a78d6" />
        <CartaoNumero icon={Users} rotulo="Compareceram" valor={st[S.comp]} sub={`de ${fmt(st[S.aptos])} aptos`} cor="#1baf7a" />
        <CartaoNumero icon={CircleSlash} rotulo="Brancos e nulos" valor={st[S.br] + nulosSt(st)} sub={`${fmtPct1(pct(st[S.br] + nulosSt(st), totalVotos))} dos votos`} cor="#898781" />
        <CartaoNumero icon={UserX} rotulo="Abstenção" valor={st[S.abst]} sub={`${fmtPct1(pct(st[S.abst], st[S.aptos]))} dos aptos`} cor="#eb6834" />
      </div>

      {podio.length > 0 && (
        <div className={`grid gap-3 sm:gap-4 grid-cols-1 ${podio.length === 3 ? 'sm:grid-cols-3 sm:items-end' : podio.length === 2 ? 'sm:grid-cols-2' : ''}`}>
          {ordemPodio.map(c => {
            const i = lista.indexOf(c);
            return <div key={c.n} className={podio.length === 3 && i === 0 ? 'order-first sm:order-none' : ''}><CartaoPodio c={c} pos={i + 1} total={validos} cor={cor(c, i)} destaque={i === 0} /></div>;
          })}
        </div>
      )}
      {cargo === 5 && <p className="text-xs muted text-center">Senado 2026: duas vagas por estado e dois votos por eleitor — os percentuais somam 200%.</p>}

      {(resto.length > 0 || prop) && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">{prop && filtro === 'eleitos' ? `Demais eleitos (${eleitos.length} no total)` : 'Demais candidatos'}</h2>
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
      <p className="text-xs muted">Fotos e números oficiais publicados pelo TSE. Percentuais sobre os votos válidos{prop ? ' (nominais + legenda)' : ''}. Toque num candidato para ver a votação por município.</p>
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { Sparkles, Users, UserX, Vote, MapPin, Building2, Landmark, Crown, Medal, TrendingUp, TrendingDown } from 'lucide-react';
import { useAsync, Loading, ErrorBox, Seg, SeloResultado } from '../components/ui';
import { FotoCandidato, CartaoNumero, Contador } from '../components/Vitrine';
import { loadBrasil, UF_NOMES, validosSt, S } from '../lib/data';
import { carregarCandidatos, situacao } from '../lib/busca';
import { corPorIndice, OUTROS } from '../lib/colors';
import { fmt, fmtPct, pct } from '../lib/format';
import { rotas } from '../lib/router';

const fmtPct1 = v => fmtPct(v, 1);
const hrefCand = c => rotas.candidato(c.cargo === 1 ? 'BR' : c.uf, c.cargo, c.n);
const ufNome = c => (c.cargo === 1 ? 'Brasil' : UF_NOMES[c.uf]);

/** Cartão de recorde: foto grande, rótulo, nome e número. */
function Recorde({ rotulo, icon: I = Medal, c, valor, sub, cor = '#2a78d6' }) {
  if (!c) return null;
  return (
    <a href={hrefCand(c)} className="card p-4 flex items-center gap-4 hover:-translate-y-0.5 transition-transform min-w-0 relative overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: cor }} />
      <FotoCandidato cargo={c.cargo} uf={c.uf} sq={c.sq} nome={c.nome} cor={cor} size={72} />
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide font-semibold flex items-center gap-1" style={{ color: cor }}><I className="w-3.5 h-3.5" /> {rotulo}</div>
        <div className="font-bold leading-tight truncate mt-0.5">{c.nome}</div>
        <div className="text-xs muted truncate">{c.partido} · {ufNome(c)}</div>
        <div className="text-xl font-extrabold tracking-tight mt-1"><Contador valor={valor ?? c.votos} /> <span className="text-xs font-medium muted">votos</span></div>
        {sub && <div className="text-xs ink-2">{sub}</div>}
      </div>
    </a>
  );
}

/** Hemiciclo: um ponto por cadeira, partidos em fatias da esquerda para a direita. */
function Hemiciclo({ grupos, total }) {
  const linhas = total > 300 ? 12 : total > 80 ? 7 : 4;
  const W = 400, H = 214, cx = W / 2, R = H - 22, r0 = R * 0.38;
  const raioPonto = Math.min(9, ((R - r0) / linhas) * 0.42);
  const cy = H - raioPonto - 3;
  const raios = Array.from({ length: linhas }, (_, i) => r0 + ((R - r0) * i) / (linhas - 1));
  const soma = raios.reduce((a, b) => a + b, 0);
  const porLinha = raios.map(r => Math.round((total * r) / soma));
  porLinha[linhas - 1] += total - porLinha.reduce((a, b) => a + b, 0);
  const pts = [];
  raios.forEach((r, li) => {
    const n = porLinha[li];
    for (let k = 0; k < n; k++) {
      const a = Math.PI - (n === 1 ? Math.PI / 2 : (Math.PI * k) / (n - 1));
      pts.push({ x: cx + r * Math.cos(a), y: cy - r * Math.sin(a), a });
    }
  });
  pts.sort((p, q) => q.a - p.a);
  const cores = [];
  for (const g of grupos) for (let i = 0; i < g.n; i++) cores.push(g);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xl mx-auto" role="img" aria-label="Distribuição das cadeiras por partido">
      {pts.map((p, i) => {
        const g = cores[i];
        return <circle key={i} cx={p.x} cy={p.y} r={raioPonto} fill={g ? g.cor : 'var(--surface-2)'}><title>{g ? `${g.partido}: ${g.n}` : 'vaga não proclamada'}</title></circle>;
      })}
      <text x={cx} y={cy - 18} textAnchor="middle" className="font-extrabold" style={{ fontSize: 34, fill: 'var(--ink)' }}>{cores.length}</text>
      <text x={cx} y={cy} textAnchor="middle" style={{ fontSize: 11, fill: 'var(--muted)' }}>eleitos</text>
    </svg>
  );
}

function Bancada({ titulo, sub, lista, vagas, maxPartidos = 8 }) {
  const porPartido = new Map();
  for (const c of lista) porPartido.set(c.partido, (porPartido.get(c.partido) || 0) + 1);
  const ordenado = [...porPartido.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const principais = ordenado.slice(0, maxPartidos).map(([partido, n], i) => ({ partido, n, cor: corPorIndice(i) }));
  const outros = ordenado.slice(maxPartidos);
  const grupos = outros.length ? [...principais, { partido: `Outros (${outros.length} partidos)`, n: outros.reduce((a, x) => a + x[1], 0), cor: OUTROS.light }] : principais;
  const max = Math.max(1, ...ordenado.map(x => x[1]));
  return (
    <section className="card p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="font-semibold flex items-center gap-2"><Landmark className="w-4 h-4" /> {titulo}</h2>
        <p className="text-xs muted">{sub} · {fmt(lista.length)} eleitos proclamados{vagas ? ` de ${vagas} vagas` : ''}</p>
      </div>
      <Hemiciclo grupos={grupos} total={Math.max(vagas || 0, lista.length)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
        {ordenado.map(([partido, n], i) => (
          <div key={partido} className="flex items-center gap-2 text-sm min-w-0">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: i < maxPartidos ? corPorIndice(i) : OUTROS.light }} />
            <span className="font-medium w-24 truncate">{partido}</span>
            <span className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--surface-2)' }}><span className="block h-1.5 rounded-full" style={{ width: `${(n / max) * 100}%`, background: i < maxPartidos ? corPorIndice(i) : OUTROS.light }} /></span>
            <span className="num font-semibold w-8 text-right">{n}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function MiniCand({ c, rotulo, total }) {
  if (!c) return <div className="text-xs muted">{rotulo}: —</div>;
  return (
    <a href={hrefCand(c)} className="flex items-center gap-2.5 min-w-0 group">
      <FotoCandidato cargo={c.cargo} uf={c.uf} sq={c.sq} nome={c.nome} size={36} cor={situacao(c.resultado) === 'eleito' ? 'var(--ok)' : 'var(--accent)'} />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] muted leading-tight">{rotulo}</span>
        <span className="block text-sm font-semibold truncate group-hover:underline leading-tight">{c.nome} <span className="font-normal muted text-xs">{c.partido}</span></span>
      </span>
      <span className="text-right shrink-0 leading-tight">
        <span className="block text-sm font-bold num">{total ? fmtPct1(pct(c.votos, total)) : ''}</span>
        <span className="block text-[11px] muted num">{fmt(c.votos)}</span>
      </span>
    </a>
  );
}

function CartaoEstado({ u, porUf }) {
  const d = porUf.get(u.uf) || {};
  const val = cg => validosSt(u.st[cg]);
  const gov = d[3] || [];
  const govEleito = gov.find(c => situacao(c.resultado) === 'eleito');
  const govT2 = gov.filter(c => situacao(c.resultado) === 'turno2');
  const sens = (d[5] || []).filter(c => situacao(c.resultado) === 'eleito');
  const depF = (d[6] || [])[0];
  const depE = (d[u.uf === 'DF' ? 8 : 7] || [])[0];
  const abst = pct(u.st[1][S.abst], u.st[1][S.aptos]);
  return (
    <section className="card overflow-hidden flex flex-col">
      <a href={rotas.uf(u.uf)} className="px-4 py-3 flex items-center justify-between gap-2" style={{ background: 'var(--surface-2)' }}>
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold rounded-md px-1.5 py-0.5 text-white" style={{ background: 'var(--accent)' }}>{u.uf}</span>
          <span className="font-semibold truncate">{u.nome}</span>
        </span>
        <span className="text-[11px] muted shrink-0 text-right leading-tight">{fmt(u.st[1][S.aptos])} eleitores<br />abstenção {fmtPct1(abst)}</span>
      </a>
      <div className="p-4 space-y-3 flex-1">
        {govEleito
          ? <MiniCand c={govEleito} rotulo="Governador eleito" total={val(3)} />
          : govT2.length
            ? <div className="space-y-2"><div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--accent)' }}>Governador · 2º turno</div>{govT2.map(c => <MiniCand key={c.n} c={c} rotulo="Disputa o 2º turno" total={val(3)} />)}</div>
            : <MiniCand c={gov[0]} rotulo="Governador (mais votado)" total={val(3)} />}
        {sens.map(c => <MiniCand key={c.n} c={c} rotulo="Senador eleito" total={val(5)} />)}
        <MiniCand c={depF} rotulo="Dep. federal mais votado" total={val(6)} />
        <MiniCand c={depE} rotulo={u.uf === 'DF' ? 'Dep. distrital mais votado' : 'Dep. estadual mais votado'} total={val(u.uf === 'DF' ? 8 : 7)} />
      </div>
      <a href={rotas.placar({ uf: u.uf, c: 3 })} className="px-4 py-2 text-xs link text-center" style={{ boxShadow: '0 -1px 0 var(--ring)' }}>Ver placar completo de {u.nome} →</a>
    </section>
  );
}

/** Principais indicadores e recordes da eleição, de todos os cargos e estados. */
export default function DestaquesPage() {
  const { data, loading, error } = useAsync(() => Promise.all([loadBrasil(), carregarCandidatos()]), []);
  const [ordemUf, setOrdemUf] = useState('nome');

  const ctx = useMemo(() => {
    if (!data) return null;
    const [brasil, todos] = data;
    const validos = todos.filter(c => !c.votoValido && c.votos > 0);
    const porUf = new Map();
    for (const c of validos) {
      const m = porUf.get(c.uf) || {};
      (m[c.cargo] ??= []).push(c);
      porUf.set(c.uf, m);
    }
    for (const m of porUf.values()) for (const l of Object.values(m)) l.sort((a, b) => b.votos - a.votos);
    const maior = cg => validos.filter(c => c.cargo === cg).sort((a, b) => b.votos - a.votos)[0];
    const resumoUf = new Map(brasil.ufs.map(u => [u.uf, u]));
    const pctNaUf = c => pct(c.votos, validosSt(resumoUf.get(c.uf)?.st[c.cargo]));
    const melhorPct = cgs => validos.filter(c => cgs.includes(c.cargo)).map(c => ({ c, p: pctNaUf(c) })).filter(x => x.p != null).sort((a, b) => b.p - a.p)[0];
    const ufs = brasil.ufs.filter(u => u.uf !== 'ZZ');
    const abst = u => pct(u.st[1][S.abst], u.st[1][S.aptos]);
    const ufsAbst = [...ufs].sort((a, b) => abst(a) - abst(b));
    const govEleitos = validos.filter(c => c.cargo === 3 && situacao(c.resultado) === 'eleito');
    const govT2 = new Set(validos.filter(c => c.cargo === 3 && situacao(c.resultado) === 'turno2').map(c => c.uf));
    const eleitosDe = cgs => todos.filter(c => cgs.includes(c.cargo) && situacao(c.resultado) === 'eleito');
    return {
      brasil, porUf, ufs, abst, govEleitos, govT2,
      pres: brasil.cand[1].map((c, i) => ({ ...todos.find(x => x.cargo === 1 && x.n === c.n), votos: brasil.total.v[1][i] })),
      depF: maior(6), depE: validos.filter(c => c.cargo === 7 || c.cargo === 8).sort((a, b) => b.votos - a.votos)[0],
      sen: maior(5), gov: maior(3),
      govPct: melhorPct([3]), senPct: melhorPct([5]),
      menorAbst: ufsAbst[0], maiorAbst: ufsAbst[ufsAbst.length - 1],
      camara: eleitosDe([6]), senado: eleitosDe([5]), assembleias: eleitosDe([7, 8]),
      nCands: todos.length
    };
  }, [data]);

  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const { brasil } = ctx;
  const st = brasil.total.st[1];
  const nSecoes = brasil.ufs.reduce((a, u) => a + u.nSecoes, 0);
  const nMun = brasil.ufs.reduce((a, u) => a + u.nMun, 0);
  const validosPres = validosSt(st);
  const p1 = ctx.pres[0], p2 = ctx.pres[1];
  const ufsOrdenadas = [...ctx.ufs].sort(ordemUf === 'eleitores' ? (a, b) => b.st[1][S.aptos] - a.st[1][S.aptos] : (a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-5 sm:p-8 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0d366b, #256abf 50%, #1baf7a)' }}>
        <div className="absolute -right-16 -bottom-16 w-72 h-72 rounded-full opacity-10" style={{ background: '#fff' }} />
        <div className="relative">
          <div className="text-xs uppercase tracking-widest opacity-80 flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Destaques · Eleições Gerais 2026</div>
          <h1 className="text-2xl sm:text-4xl font-extrabold mt-1">O 1º turno em números</h1>
          <p className="text-sm sm:text-base opacity-90 mt-2 max-w-2xl">{fmt(nMun)} municípios, {fmt(nSecoes)} urnas e {fmt(ctx.nCands)} candidaturas para presidente, governador, senador e deputados. Todos os números vêm dos arquivos oficiais do TSE.</p>
          {p1 && p2 && (
            <div className="mt-5 grid grid-cols-2 gap-3 max-w-xl">
              {[p1, p2].map((c, i) => (
                <a key={c.n} href={hrefCand(c)} className="rounded-xl p-3 flex items-center gap-3 min-w-0" style={{ background: 'rgba(255,255,255,.12)' }}>
                  <FotoCandidato cargo={1} uf="BR" sq={c.sq} nome={c.nome} size={52} cor={corPorIndice(i)} />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold truncate">{c.nome}</span>
                    <span className="block text-2xl font-extrabold leading-tight"><Contador valor={pct(c.votos, validosPres)} formato={fmtPct1} /></span>
                    <span className="block text-[11px] opacity-80">2º turno · 25/10</span>
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CartaoNumero icon={Users} rotulo="Eleitores aptos" valor={st[S.aptos]} sub={`${fmt(brasil.ufs.find(u => u.uf === 'ZZ')?.st[1][S.aptos] || 0)} no exterior`} cor="#2a78d6" />
        <CartaoNumero icon={Vote} rotulo="Compareceram" valor={st[S.comp]} sub={`${fmtPct1(pct(st[S.comp], st[S.aptos]))} dos aptos`} cor="#1baf7a" />
        <CartaoNumero icon={UserX} rotulo="Abstenção" valor={st[S.abst]} sub={`${fmtPct1(pct(st[S.abst], st[S.aptos]))} dos aptos`} cor="#eb6834" />
        <CartaoNumero icon={Building2} rotulo="Urnas apuradas" valor={nSecoes} sub={`${fmt(nMun)} municípios`} cor="#6250d6" />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold flex items-center gap-2"><Crown className="w-5 h-5" style={{ color: '#eda100' }} /> Recordistas de votos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <Recorde rotulo="Mais votado para presidente" icon={Crown} c={p1} cor="#eda100" sub={`${fmtPct1(pct(p1?.votos, validosPres))} dos válidos`} />
          <Recorde rotulo="Deputado federal mais votado do Brasil" c={ctx.depF} cor="#2a78d6" sub={ctx.depF && <SeloResultado resultado={ctx.depF.resultado} />} />
          <Recorde rotulo="Deputado estadual/distrital mais votado" c={ctx.depE} cor="#6250d6" sub={ctx.depE && <SeloResultado resultado={ctx.depE.resultado} />} />
          <Recorde rotulo="Senador mais votado do Brasil" c={ctx.sen} cor="#1baf7a" sub={ctx.sen && <SeloResultado resultado={ctx.sen.resultado} />} />
          <Recorde rotulo="Governador mais votado do Brasil" c={ctx.gov} cor="#e34948" sub={ctx.gov && <SeloResultado resultado={ctx.gov.resultado} />} />
          <Recorde rotulo="Maior % para governador" icon={TrendingUp} c={ctx.govPct?.c} cor="#eb6834" sub={ctx.govPct && `${fmtPct1(ctx.govPct.p)} dos válidos em ${UF_NOMES[ctx.govPct.c.uf]}`} />
          <Recorde rotulo="Maior % para senador" icon={TrendingUp} c={ctx.senPct?.c} cor="#e87ba4" sub={ctx.senPct && `${fmtPct1(ctx.senPct.p)} dos válidos em ${UF_NOMES[ctx.senPct.c.uf]} (2 votos por eleitor)`} />
          <a href={rotas.uf(ctx.menorAbst.uf)} className="card p-4 flex items-center gap-4 hover:-translate-y-0.5 transition-transform">
            <span className="w-[72px] h-[72px] rounded-full grid place-items-center text-xl font-extrabold text-white shrink-0" style={{ background: '#1baf7a' }}>{ctx.menorAbst.uf}</span>
            <span className="min-w-0"><span className="text-[11px] uppercase tracking-wide font-semibold flex items-center gap-1" style={{ color: '#1baf7a' }}><TrendingDown className="w-3.5 h-3.5" /> Menor abstenção</span><span className="block font-bold">{ctx.menorAbst.nome}</span><span className="block text-xl font-extrabold">{fmtPct1(ctx.abst(ctx.menorAbst))}</span></span>
          </a>
          <a href={rotas.uf(ctx.maiorAbst.uf)} className="card p-4 flex items-center gap-4 hover:-translate-y-0.5 transition-transform">
            <span className="w-[72px] h-[72px] rounded-full grid place-items-center text-xl font-extrabold text-white shrink-0" style={{ background: '#eb6834' }}>{ctx.maiorAbst.uf}</span>
            <span className="min-w-0"><span className="text-[11px] uppercase tracking-wide font-semibold flex items-center gap-1" style={{ color: '#eb6834' }}><TrendingUp className="w-3.5 h-3.5" /> Maior abstenção</span><span className="block font-bold">{ctx.maiorAbst.nome}</span><span className="block text-xl font-extrabold">{fmtPct1(ctx.abst(ctx.maiorAbst))}</span></span>
          </a>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Bancada titulo="Câmara dos Deputados" sub="Deputados federais eleitos por partido" lista={ctx.camara} vagas={513} />
        <div className="space-y-4">
          <Bancada titulo="Senado · vagas de 2026" sub="Senadores eleitos por partido" lista={ctx.senado} vagas={54} />
          <section className="card p-4 sm:p-5">
            <h2 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4" /> Governadores</h2>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="rounded-xl p-3" style={{ background: 'color-mix(in srgb, var(--ok) 12%, transparent)' }}><div className="text-3xl font-extrabold" style={{ color: 'var(--ok)' }}><Contador valor={ctx.govEleitos.length} /></div><div className="text-xs ink-2">eleitos no 1º turno</div></div>
              <div className="rounded-xl p-3" style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)' }}><div className="text-3xl font-extrabold" style={{ color: 'var(--accent)' }}><Contador valor={ctx.govT2.size} /></div><div className="text-xs ink-2">estados com 2º turno em 25/10</div></div>
            </div>
            <p className="text-xs muted mt-2">2º turno: {[...ctx.govT2].sort().join(', ') || '—'}</p>
          </section>
        </div>
      </section>
      <Bancada titulo="Assembleias Legislativas e Câmara Legislativa (DF)" sub="Deputados estaduais e distritais eleitos por partido, somando os 27 estados" lista={ctx.assembleias} maxPartidos={8} />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold flex items-center gap-2"><MapPin className="w-5 h-5" /> Estado por estado</h2>
          <Seg size="xs" value={ordemUf} onChange={setOrdemUf} options={[{ value: 'nome', label: 'A–Z' }, { value: 'eleitores', label: 'Mais eleitores' }]} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {ufsOrdenadas.map(u => <CartaoEstado key={u.uf} u={u} porUf={ctx.porUf} />)}
        </div>
      </section>
      <p className="text-xs muted">Fotos, votos e situação das candidaturas (eleito, 2º turno, suplente) conforme a divulgação oficial do TSE. Percentuais sobre os votos válidos do cargo no estado.</p>
    </div>
  );
}

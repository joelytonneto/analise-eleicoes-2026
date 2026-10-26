import React, { useMemo } from 'react';
import { Trophy, Vote, Medal, MapPin, Percent } from 'lucide-react';
import { useAsync, Card, Loading, ErrorBox, Seg } from '../components/ui';
import { FotoCandidato, Contador, CartaoNumero, BarraGrossa } from '../components/Vitrine';
import { carregarCandidatosPorChave, chaveCand } from '../lib/busca';
import MapaResultado from '../components/MapaResultado';
import DataTable from '../components/DataTable';
import Trilha from '../components/Trilha';
import { loadBrasil, loadUf, loadDep, loadGeoUf, loadGeoBrasil, UF_NOMES, IBGE_UF, cargoNome, validosSt } from '../lib/data';
import { fmt, fmtPct, pct, titulo } from '../lib/format';
import { rotas, useTurno } from '../lib/router';

const somenteCandidato = o => o.value.startsWith('cand:');

export default function CandidatoPage({ uf, cargo, n }) {
  const [turno, setTurno] = useTurno();
  const pres = cargo === 1;
  const dep = cargo >= 6;
  const { data, loading, error } = useAsync(async () => {
    const tEfetivo = dep || cargo === 5 ? 1 : turno;
    let [brasil, ud, dd, geo, porChave] = await Promise.all([
      loadBrasil(tEfetivo),
      pres ? null : loadUf(uf, tEfetivo),
      dep ? loadDep(uf) : null,
      pres ? loadGeoBrasil() : uf !== 'ZZ' ? loadGeoUf(uf).catch(() => null) : null,
      carregarCandidatosPorChave(tEfetivo).catch(() => null)
    ]);
    const lista = pres ? brasil.cand[1] : dep ? dd?.cand?.[cargo] : ud?.cand?.[cargo];
    if (tEfetivo === 2 && !(lista || []).some(c => +c.n === n)) {
      // Candidato que disputou apenas o 1º Turno -> carrega dados do 1º Turno
      [brasil, ud, porChave] = await Promise.all([
        loadBrasil(1),
        pres ? null : loadUf(uf, 1),
        carregarCandidatosPorChave(1).catch(() => null)
      ]);
      return [brasil, ud, dd, geo, porChave, 1];
    }
    return [brasil, ud, dd, geo, porChave, tEfetivo];
  }, [uf, cargo, n, turno]);

  const ctx = useMemo(() => {
    if (!data) return null;
    const [brasil, ud, dd, geo, porChave, turnoCand] = data;
    const lista = pres ? brasil.cand[1] : dep ? dd?.cand?.[cargo] : ud?.cand?.[cargo];
    const idx = (lista || []).findIndex(c => +c.n === n);
    if (idx < 0) return { naoEncontrado: true };
    const cand = { ...lista[idx], sq: lista[idx].sq || porChave?.get(chaveCand(cargo, uf, n))?.sq };
    const posicao = [...lista].sort((a, b) => (b.votos || 0) - (a.votos || 0)).findIndex(c => +c.n === n) + 1;
    let linhas;
    if (pres) {
      linhas = brasil.ufs.map(u => ({ key: u.uf, chave: u.uf, nome: u.nome, votos: u.v[1][idx] || 0, st: u.st[1], href: rotas.uf(u.uf), placar: rotas.placar({ uf: u.uf, c: 1 }) }));
    } else {
      linhas = ud.mun.filter(m => m.st[cargo]).map(m => {
        let votos = 0;
        if (dep) {
          const d = dd.mun[m.cd]?.[cargo];
          if (d) for (let i = 0; i < d.v.length; i += 2) if (d.v[i] === idx) { votos = d.v[i + 1]; break; }
        } else votos = m.v?.[cargo]?.[idx] || 0;
        return { key: m.cd, chave: String(m.ibge ?? m.cd), nome: titulo(m.nome), votos, st: m.st[cargo], href: rotas.mun(uf, m.cd, { c: cargo }), placar: rotas.placar({ uf, m: m.cd, c: cargo }), lat: m.lat, lng: m.lng };
      });
    }
    const stTotal = pres ? brasil.total.st[1] : brasil.ufs.find(u => u.uf === uf)?.st[cargo];
    const total = linhas.reduce((a, r) => a + r.votos, 0);
    for (const r of linhas) { r.pValidos = pct(r.votos, validosSt(r.st)); r.pDoTotal = pct(r.votos, total); }
    return { cand, posicao, nCands: lista.length, linhas, stTotal, total, geo, brasil, turnoCand };
  }, [data, pres, dep, cargo, uf, n]);

  const unidades = useMemo(() => (ctx?.linhas || []).map(r => ({
    key: r.chave, nome: r.nome, st: r.st, v: [r.votos], lat: r.lat, lng: r.lng, onClick: () => { window.location.hash = r.href; }
  })), [ctx]);
  const candRef = useMemo(() => (ctx?.cand ? [ctx.cand] : []), [ctx]);

  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!ctx || ctx.naoEncontrado) return <ErrorBox>Candidatura nº {n} não encontrada para {cargoNome(cargo)}{pres ? '' : ` em ${UF_NOMES[uf] || uf}`}.</ErrorBox>;

  const { cand, linhas, stTotal, turnoCand } = ctx;
  const escopo = pres ? 'Brasil' : UF_NOMES[uf];
  const unidade = pres ? 'UF' : 'Município';
  const unidadeMin = pres ? 'UF' : 'município';
  const comVoto = linhas.filter(r => r.votos > 0).length;
  const melhor = [...linhas].sort((a, b) => b.votos - a.votos)[0];
  const melhorPct = [...linhas].filter(r => r.st && validosSt(r.st) >= 100).sort((a, b) => (b.pValidos || 0) - (a.pValidos || 0))[0];

  const colunas = [
    { key: 'nome', label: unidade, value: r => r.nome, render: r => <a className="link font-medium" href={r.href} onClick={e => e.stopPropagation()}>{r.nome}</a> },
    { key: 'votos', label: 'Votos', value: r => r.votos, align: 'right', render: r => fmt(r.votos) },
    { key: 'pv', label: '% dos válidos', value: r => r.pValidos, align: 'right', render: r => fmtPct(r.pValidos) },
    { key: 'pt', label: '% da votação do candidato', value: r => r.pDoTotal, align: 'right', render: r => fmtPct(r.pDoTotal) }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Trilha itens={[{ label: 'Brasil', href: rotas.brasil() }, ...(pres ? [] : [{ label: UF_NOMES[uf], href: rotas.uf(uf, { c: cargo }) }]), { label: cand.nome }]} />
        {(cargo === 1 || cargo === 3) && (
          <Seg
            size="xs"
            value={String(turnoCand)}
            onChange={v => setTurno(+v)}
            options={[
              { value: '2', label: '2º Turno · 25/10' },
              { value: '1', label: '1º Turno · 04/10' }
            ]}
          />
        )}
      </div>
      <div className="rounded-2xl p-5 sm:p-7 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #184f95, #2a78d6 55%, #6250d6)' }}>
        <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full opacity-10" style={{ background: '#fff' }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <FotoCandidato cargo={cargo} uf={pres ? 'BR' : uf} sq={cand.sq} nome={cand.nome} cor="rgba(255,255,255,.85)" size={112} className="self-center sm:self-auto" />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="text-xs uppercase tracking-widest opacity-80">{cargoNome(cargo)} · {escopo} · {turnoCand}º Turno</div>
            <h1 className="text-2xl sm:text-4xl font-extrabold mt-1 break-words">{cand.nome}</h1>
            <p className="text-sm opacity-90 mt-0.5">{cand.partido} · nº {cand.n}</p>
            <p className="text-xs opacity-80">{cand.nomeCompleto}{cand.coligacao && cand.coligacao !== 'PARTIDO ISOLADO' ? ` · ${cand.coligacao}` : ''}</p>
            {cand.resultado && <span className="inline-block mt-2 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: 'rgba(255,255,255,.2)' }}>{cand.resultado}</span>}
          </div>
          <div className="text-center sm:text-right shrink-0">
            <div className="text-3xl sm:text-5xl font-extrabold tracking-tight"><Contador valor={cand.votos} /></div>
            <div className="text-sm opacity-90">votos no {turnoCand}ºT · {fmtPct(pct(cand.votos, validosSt(stTotal)), 1)} dos válidos · {ctx.posicao}º lugar</div>
            <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-end">
              <a className="btn !bg-white/15 !text-white !shadow-none hover:!bg-white/25" href={pres ? rotas.placar({ c: 1 }) : rotas.placar({ uf, c: cargo })}><Trophy className="w-4 h-4" /> Placar do cargo</a>
              <a className="btn !bg-white/15 !text-white !shadow-none hover:!bg-white/25" href={pres ? rotas.brasil() : rotas.uf(uf, { c: cargo })}>Todos os candidatos</a>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CartaoNumero icon={Vote} rotulo={`Votos (${turnoCand}ºT)`} valor={cand.votos} sub={`${fmtPct(pct(cand.votos, validosSt(stTotal)))} dos válidos`} cor="#2a78d6" />
        <CartaoNumero icon={Medal} rotulo="Posição" valor={ctx.posicao} formato={v => `${v}º`} sub={`de ${ctx.nCands} candidaturas`} cor="#6250d6" />
        <CartaoNumero icon={MapPin} rotulo="Mais votos em" valor={melhor?.votos || 0} sub={melhor?.votos ? melhor.nome : ''} cor="#1baf7a" />
        <CartaoNumero icon={Percent} rotulo="Maior % dos válidos" valor={melhorPct?.pValidos ?? 0} formato={v => (melhorPct ? fmtPct(v) : '—')} sub={melhorPct?.nome} cor="#eb6834" />
      </div>
      <Card title={`Onde teve mais votos (${turnoCand}º Turno)`} subtitle={`Os 10 ${pres ? 'estados' : 'municípios'} com mais votos · toque para abrir o placar do lugar`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          {[...linhas].filter(r => r.votos > 0).sort((a, b) => b.votos - a.votos).slice(0, 10).map((r, i, arr) => (
            <a key={r.key} href={r.placar} className="flex items-center gap-3 min-w-0 group">
              <span className="w-6 text-right text-xs font-semibold muted num shrink-0">{i + 1}º</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium truncate group-hover:underline">{r.nome}</span>
                  <span className="num shrink-0"><b>{fmt(r.votos)}</b> <span className="muted text-xs">{fmtPct(r.pValidos, 1)}</span></span>
                </div>
                <div className="mt-1"><BarraGrossa pct={(r.votos / arr[0].votos) * 100} cor="var(--accent)" altura={6} /></div>
              </div>
            </a>
          ))}
        </div>
      </Card>
      {ctx.total !== cand.votos && (
        <p className="text-xs muted">Soma por {unidadeMin}: {fmt(ctx.total)} votos (o total oficial considera também seções sem {unidadeMin} identificado).</p>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card title={`Votação por ${unidadeMin} (${turnoCand}ºT)`} subtitle={`Teve votos em ${fmt(comVoto)} de ${fmt(linhas.length)} ${pres ? 'UFs (incl. exterior)' : 'municípios'}`} className="lg:col-span-2">
          <DataTable linhas={linhas} colunas={colunas} rowKey={r => r.key} ordemInicial={{ key: 'votos', dir: 'desc' }} porPagina={25} nomeArquivo={`${cand.nome}-${turnoCand}t-${cargoNome(cargo)}-por-${unidadeMin}`} onRowClick={r => { window.location.hash = r.href; }} />
        </Card>
        <Card title="Mapa" subtitle="% dos votos válidos em cada unidade · clique para detalhar" className="lg:col-span-3">
          {ctx.geo
            ? <MapaResultado unidades={unidades} candRef={candRef} cargo={cargo} geo={ctx.geo} chaveFeature={pres ? f => IBGE_UF[f.properties.codarea] : f => String(f.properties.ibge)} height={480} metricaInicial={`cand:${cand.n}`} filtroOpcoes={somenteCandidato} />
            : <p className="text-sm muted">Sem malha geográfica para o exterior; use a tabela.</p>}
        </Card>
      </div>
    </div>
  );
}

import React, { useMemo } from 'react';
import { useAsync, Card, Loading, ErrorBox, Stat, SeloResultado } from '../components/ui';
import MapaResultado from '../components/MapaResultado';
import DataTable from '../components/DataTable';
import Trilha from '../components/Trilha';
import { loadBrasil, loadUf, loadDep, loadGeoUf, loadGeoBrasil, UF_NOMES, IBGE_UF, cargoNome, validosSt } from '../lib/data';
import { fmt, fmtPct, pct, titulo } from '../lib/format';
import { rotas } from '../lib/router';

const somenteCandidato = o => o.value.startsWith('cand:');

/**
 * Página de uma candidatura: total oficial, situação (eleito, 2º turno…) e a distribuição dos votos
 * por município (ou por UF, para Presidente), com mapa e tabela.
 */
export default function CandidatoPage({ uf, cargo, n }) {
  const pres = cargo === 1;
  const dep = cargo >= 6;
  const { data, loading, error } = useAsync(() => Promise.all([
    loadBrasil(),
    pres ? null : loadUf(uf),
    dep ? loadDep(uf) : null,
    pres ? loadGeoBrasil() : uf !== 'ZZ' ? loadGeoUf(uf).catch(() => null) : null
  ]), [uf, cargo, n]);

  const ctx = useMemo(() => {
    if (!data) return null;
    const [brasil, ud, dd, geo] = data;
    const lista = pres ? brasil.cand[1] : dep ? dd?.cand?.[cargo] : ud?.cand?.[cargo];
    const idx = (lista || []).findIndex(c => +c.n === n);
    if (idx < 0) return { naoEncontrado: true };
    const cand = lista[idx];
    const posicao = [...lista].sort((a, b) => (b.votos || 0) - (a.votos || 0)).findIndex(c => +c.n === n) + 1;
    let linhas;
    if (pres) {
      linhas = brasil.ufs.map(u => ({ key: u.uf, chave: u.uf, nome: u.nome, votos: u.v[1][idx] || 0, st: u.st[1], href: rotas.uf(u.uf) }));
    } else {
      linhas = ud.mun.filter(m => m.st[cargo]).map(m => {
        let votos = 0;
        if (dep) {
          const d = dd.mun[m.cd]?.[cargo];
          if (d) for (let i = 0; i < d.v.length; i += 2) if (d.v[i] === idx) { votos = d.v[i + 1]; break; }
        } else votos = m.v?.[cargo]?.[idx] || 0;
        return { key: m.cd, chave: String(m.ibge ?? m.cd), nome: titulo(m.nome), votos, st: m.st[cargo], href: rotas.mun(uf, m.cd, { c: cargo }), lat: m.lat, lng: m.lng };
      });
    }
    const stTotal = pres ? brasil.total.st[1] : brasil.ufs.find(u => u.uf === uf)?.st[cargo];
    const total = linhas.reduce((a, r) => a + r.votos, 0);
    for (const r of linhas) { r.pValidos = pct(r.votos, validosSt(r.st)); r.pDoTotal = pct(r.votos, total); }
    return { cand, posicao, nCands: lista.length, linhas, stTotal, total, geo, brasil };
  }, [data, pres, dep, cargo, uf, n]);

  const unidades = useMemo(() => (ctx?.linhas || []).map(r => ({
    key: r.chave, nome: r.nome, st: r.st, v: [r.votos], lat: r.lat, lng: r.lng, onClick: () => { window.location.hash = r.href; }
  })), [ctx]);
  const candRef = useMemo(() => (ctx?.cand ? [ctx.cand] : []), [ctx]);

  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!ctx || ctx.naoEncontrado) return <ErrorBox>Candidatura nº {n} não encontrada para {cargoNome(cargo)}{pres ? '' : ` em ${UF_NOMES[uf] || uf}`}.</ErrorBox>;

  const { cand, linhas, stTotal } = ctx;
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
      <Trilha itens={[{ label: 'Brasil', href: rotas.brasil() }, ...(pres ? [] : [{ label: UF_NOMES[uf], href: rotas.uf(uf, { c: cargo }) }]), { label: cand.nome }]} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold flex flex-wrap items-center gap-2">{cand.nome} <SeloResultado resultado={cand.resultado} mostrarNaoEleito className="!text-xs !px-2 !py-0.5" /></h1>
          <p className="text-sm ink-2">{cargoNome(cargo)} · {escopo} · {cand.partido} · nº {cand.n}</p>
          <p className="text-xs muted">{cand.nomeCompleto}{cand.coligacao && cand.coligacao !== 'PARTIDO ISOLADO' ? ` · ${cand.coligacao}` : ''}</p>
        </div>
        <a className="btn" href={pres ? rotas.brasil() : rotas.uf(uf, { c: cargo })}>Ver todos os candidatos</a>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Votos" value={fmt(cand.votos)} sub={`${fmtPct(pct(cand.votos, validosSt(stTotal)))} dos válidos`} />
        <Stat label="Posição" value={`${ctx.posicao}º`} sub={`de ${ctx.nCands} candidaturas`} />
        <Stat label={`Mais votos em`} value={melhor?.votos ? fmt(melhor.votos) : '—'} sub={melhor?.votos ? melhor.nome : ''} />
        <Stat label={`Maior % dos válidos`} value={melhorPct ? fmtPct(melhorPct.pValidos) : '—'} sub={melhorPct?.nome} title="Entre unidades com pelo menos 100 votos válidos" />
      </div>
      {ctx.total !== cand.votos && (
        <p className="text-xs muted">Soma por {unidadeMin}: {fmt(ctx.total)} votos (o total oficial considera também seções sem {unidadeMin} identificado).</p>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card title={`Votação por ${unidadeMin}`} subtitle={`Teve votos em ${fmt(comVoto)} de ${fmt(linhas.length)} ${pres ? 'UFs (incl. exterior)' : 'municípios'}`} className="lg:col-span-2">
          <DataTable linhas={linhas} colunas={colunas} rowKey={r => r.key} ordemInicial={{ key: 'votos', dir: 'desc' }} porPagina={25} nomeArquivo={`${cand.nome}-${cargoNome(cargo)}-por-${unidadeMin}`} onRowClick={r => { window.location.hash = r.href; }} />
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

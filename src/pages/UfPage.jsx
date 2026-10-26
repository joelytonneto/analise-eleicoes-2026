import React, { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { useAsync, Card, Loading, ErrorBox, Seg } from '../components/ui';
import { Indicadores, ComposicaoVotos, ResultadoCandidatos, CargoPicker, useCargo } from '../components/Resultado';
import MapaResultado from '../components/MapaResultado';
import DataTable from '../components/DataTable';
import Trilha from '../components/Trilha';
import { BotaoComparar } from '../components/Comparacao';
import { loadBrasil, loadUf, loadDep, loadGeoUf, UF_NOMES, S, cargoNome, validosSt, nulosSt } from '../lib/data';
import { itensDeVetor, itensDeputadosUf } from '../lib/resultados';
import { fmt, fmtPct, pct, titulo } from '../lib/format';
import { rotas, useTurno } from '../lib/router';
import { urlDivulgacao } from '../lib/tse';
import { idUf } from '../lib/unidades';

/** Para deputados: vetores alinhados a um subconjunto de candidatos (top 12 do estado + todo vencedor municipal). */
export function vetoresDeputados(dep, cargo, muns) {
  const ref = dep.cand[cargo] || [];
  const escolhidos = new Set(ref.slice(0, 12).map((_, i) => i));
  for (const m of muns) {
    const d = dep.mun[m.cd]?.[cargo];
    if (!d?.v.length) continue;
    let bi = -1, bv = -1;
    for (let i = 0; i < d.v.length; i += 2) if (d.v[i + 1] > bv) { bv = d.v[i + 1]; bi = d.v[i]; }
    escolhidos.add(bi);
  }
  const idx = [...escolhidos].sort((a, b) => a - b);
  const pos = new Map(idx.map((x, k) => [x, k]));
  const candRef = idx.map(i => ref[i]);
  const v = new Map();
  for (const m of muns) {
    const d = dep.mun[m.cd]?.[cargo];
    const arr = new Array(idx.length).fill(0);
    if (d) for (let i = 0; i < d.v.length; i += 2) { const k = pos.get(d.v[i]); if (k != null) arr[k] = d.v[i + 1]; }
    v.set(m.cd, arr);
  }
  return { candRef, v };
}

export default function UfPage({ uf, query }) {
  const [turno, setTurno] = useTurno();
  const [cargo, disp] = useCargo(query, uf);
  const dep = cargo >= 6 && turno === 1;
  const { data, loading, error } = useAsync(
    () => Promise.all([loadBrasil(turno), loadUf(uf, turno), uf !== 'ZZ' ? loadGeoUf(uf).catch(() => null) : null, dep ? loadDep(uf) : null]),
    [uf, dep, turno]
  );
  const [brasil, ud, geo, depData] = data || [];

  const ctx = useMemo(() => {
    if (!ud || (dep && !depData)) return null;
    const resumo = brasil.ufs.find(u => u.uf === uf);
    const st = resumo?.st?.[cargo];
    if (!st) return null;
    if (dep) {
      const { candRef, v } = vetoresDeputados(depData, cargo, ud.mun);
      return { resumo, st, itens: itensDeputadosUf(depData, cargo), candRef, vMun: cd => v.get(cd) };
    }
    const candRef = cargo === 1 ? brasil.cand[1] : ud.cand[cargo];
    return { resumo, st, itens: itensDeVetor(resumo.v[cargo], candRef), candRef, vMun: cd => ud.mun.find(m => m.cd === cd)?.v[cargo] };
  }, [brasil, ud, depData, cargo, uf, dep]);

  const unidades = useMemo(() => (ctx ? ud.mun.filter(m => m.st[cargo]).map(m => ({
    key: String(m.ibge ?? m.cd), cd: m.cd, nome: titulo(m.nome), st: m.st[cargo], v: ctx.vMun(m.cd), lat: m.lat, lng: m.lng,
    onClick: () => { window.location.hash = rotas.mun(uf, m.cd, { c: cargo }); }
  })) : []), [ctx, ud, cargo, uf]);

  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!ctx?.st) return <ErrorBox>Não há votação de {cargoNome(cargo)} em {UF_NOMES[uf]} no {turno}º Turno.</ErrorBox>;

  const top = ctx.candRef.slice(0, 3);
  const linhas = unidades.map(u => ({ ...u, m: ud.mun.find(x => x.cd === u.cd) }));
  const colunas = [
    { key: 'nome', label: 'Município', value: r => r.nome, render: r => <a className="link font-medium" href={rotas.mun(uf, r.cd, { c: cargo })} onClick={e => e.stopPropagation()}>{r.nome}</a> },
    { key: 'z', label: 'Zonas', value: r => r.m.zonas.length, align: 'right' },
    { key: 'sec', label: 'Seções', value: r => r.m.nSecoes, align: 'right', render: r => fmt(r.m.nSecoes) },
    { key: 'apt', label: 'Aptos', value: r => r.st[S.aptos], align: 'right', render: r => fmt(r.st[S.aptos]) },
    { key: 'comp', label: '% Comparec.', value: r => pct(r.st[S.comp], r.st[S.aptos]), align: 'right', render: r => fmtPct(pct(r.st[S.comp], r.st[S.aptos])) },
    ...top.map((c, i) => ({
      key: `c${c.n}`, label: `% ${c.nome}`, align: 'right',
      value: r => pct(r.v?.[i] || 0, validosSt(r.st)), render: r => fmtPct(pct(r.v?.[i] || 0, validosSt(r.st)))
    })),
    { key: 'br', label: '% Brancos', value: r => pct(r.st[S.br], r.st[S.comp] * (cargo === 5 ? 2 : 1)), align: 'right', render: r => fmtPct(pct(r.st[S.br], r.st[S.comp] * (cargo === 5 ? 2 : 1))) },
    { key: 'nu', label: '% Nulos', value: r => pct(nulosSt(r.st), r.st[S.comp] * (cargo === 5 ? 2 : 1)), align: 'right', render: r => fmtPct(pct(nulosSt(r.st), r.st[S.comp] * (cargo === 5 ? 2 : 1))) }
  ];

  return (
    <div className="space-y-4">
      <Trilha itens={[{ label: 'Brasil', href: rotas.brasil() }, { label: UF_NOMES[uf] }]} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-semibold">{UF_NOMES[uf]} · {cargoNome(cargo)} ({turno}º Turno)</h1>
            <Seg
              size="xs"
              value={String(turno)}
              onChange={v => setTurno(+v)}
              options={[
                { value: '2', label: '2º Turno' },
                { value: '1', label: '1º Turno' }
              ]}
            />
          </div>
          <p className="text-sm ink-2 mt-0.5">{turno}º turno · {turno === 1 ? '04/10/2026' : '25/10/2026'} · {fmt(ctx.resumo.nMun)} {uf === 'ZZ' ? 'cidades' : 'municípios'} · {fmt(ctx.resumo.nZonas)} zonas · {fmt(ctx.resumo.nLocais)} locais · {fmt(ctx.resumo.nSecoes)} seções com urna</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center min-w-0 max-w-full">
          <CargoPicker cargo={cargo} disponiveis={disp} />
          <BotaoComparar id={idUf(uf)} rotulo={UF_NOMES[uf]} />
          <a className="btn" href={rotas.placar({ uf, c: cargo })} title="Ver este estado no Placar, com fotos e cartões"><Trophy className="w-4 h-4" /> Ver no Placar</a>
        </div>
      </div>
      <Indicadores st={ctx.st} cargo={cargo} />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card
          title={`Resultado · ${cargoNome(cargo)} (${turno}º Turno)`}
          subtitle={<>Totalização oficial · <a className="link" href={urlDivulgacao(uf, null, cargo, turno)} target="_blank" rel="noreferrer">JSON oficial do TSE</a></>}
          className="lg:col-span-2"
        >
          <ResultadoCandidatos itens={ctx.itens} st={ctx.st} cargo={cargo} max={dep ? 10 : 12} uf={uf} />
          <div className="mt-4"><ComposicaoVotos st={ctx.st} cargo={cargo} /></div>
        </Card>
        <Card title="Mapa por município" subtitle={geo ? 'Clique num município para detalhar' : 'Sem malha geográfica para o exterior'} className="lg:col-span-3">
          {geo
            ? <MapaResultado unidades={unidades} candRef={ctx.candRef} cargo={cargo} geo={geo} chaveFeature={f => String(f.properties.ibge)} height={480} />
            : <p className="text-sm muted">As seções no exterior não possuem coordenadas; use a tabela abaixo.</p>}
        </Card>
      </div>
      <Card title={`${uf === 'ZZ' ? 'Cidades' : 'Municípios'} · ${cargoNome(cargo)} (${turno}º Turno)`} subtitle="Clique para abrir zonas, locais de votação e seções">
        <DataTable linhas={linhas} colunas={colunas} rowKey={r => r.cd} ordemInicial={{ key: 'apt', dir: 'desc' }} nomeArquivo={`${uf}-${turno}t-${cargoNome(cargo)}-municipios`} onRowClick={r => { window.location.hash = rotas.mun(uf, r.cd, { c: cargo }); }} />
      </Card>
    </div>
  );
}

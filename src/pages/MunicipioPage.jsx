import React, { useMemo, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { useAsync, Card, Loading, ErrorBox, Seg, Select } from '../components/ui';
import { Indicadores, ComposicaoVotos, ResultadoCandidatos, CargoPicker, useCargo } from '../components/Resultado';
import MapaResultado from '../components/MapaResultado';
import DataTable from '../components/DataTable';
import Trilha from '../components/Trilha';
import { Histogram, Scatter, CandidateBars } from '../components/charts';
import { BotaoComparar } from '../components/Comparacao';
import { loadBrasil, loadUf, loadMun, loadDep, loadPartidos, UF_NOMES, S, cargoNome, secoesDoMunicipio, agrupar, validosSt, nulosSt } from '../lib/data';
import { itensDeVetor, itensDeputadosMun, legendaDeputadosMun } from '../lib/resultados';
import { opcoesMetrica, valorMetrica, vencedor } from '../lib/metricasMapa';
import { fmt, fmtPct, pct, titulo, pad } from '../lib/format';
import { rotas, setQuery } from '../lib/router';
import { urlDivulgacao, urlPortalMunicipio } from '../lib/tse';
import { idMun, idZona, idLocal, idSecao } from '../lib/unidades';
import { mapaCores } from '../lib/colors';

const TABS = [
  { value: 'resultado', label: 'Resultado' },
  { value: 'zonas', label: 'Zonas' },
  { value: 'locais', label: 'Locais de votação' },
  { value: 'secoes', label: 'Seções (urnas)' },
  { value: 'distribuicao', label: 'Distribuições' }
];

const pctVotos = (st, cargo, k) => pct(st[k], st[S.comp] * (+cargo === 5 ? 2 : 1));

export function colunasMetricas(cargo, candRef, { candidatos = 3 } = {}) {
  const val = r => validosSt(r.st[cargo]);
  return [
    { key: 'apt', label: 'Aptos', value: r => r.st[cargo]?.[S.aptos], align: 'right', render: r => fmt(r.st[cargo]?.[S.aptos]) },
    { key: 'comp', label: '% Comparec.', value: r => (r.st[cargo] ? pct(r.st[cargo][S.comp], r.st[cargo][S.aptos]) : null), align: 'right', render: r => fmtPct(r.st[cargo] && pct(r.st[cargo][S.comp], r.st[cargo][S.aptos])) },
    ...(candRef || []).slice(0, candidatos).map((c, i) => ({
      key: `c${c.n}`, label: `${c.nome}`, title: `Votos e % dos válidos de ${c.nome}`, align: 'right',
      value: r => (r.v?.[cargo] ? pct(r.v[cargo][i] || 0, val(r)) : null),
      render: r => (r.v?.[cargo] ? <span title={`${fmt(r.v[cargo][i] || 0)} votos`}>{fmt(r.v[cargo][i] || 0)} <span className="muted text-xs">{fmtPct(pct(r.v[cargo][i] || 0, val(r)), 1)}</span></span> : '—')
    })),
    { key: 'br', label: 'Brancos', value: r => r.st[cargo]?.[S.br], align: 'right', render: r => (r.st[cargo] ? <>{fmt(r.st[cargo][S.br])} <span className="muted text-xs">{fmtPct(pctVotos(r.st[cargo], cargo, S.br), 1)}</span></> : '—') },
    { key: 'nu', label: 'Nulos', title: 'Inclui nulos técnicos (votos em números não reconhecidos pelo TSE)', value: r => (r.st[cargo] ? nulosSt(r.st[cargo]) : null), align: 'right', render: r => (r.st[cargo] ? <>{fmt(nulosSt(r.st[cargo]))} <span className="muted text-xs">{fmtPct(pct(nulosSt(r.st[cargo]), r.st[cargo][S.comp] * (+cargo === 5 ? 2 : 1)), 1)}</span></> : '—') }
  ];
}

export default function MunicipioPage({ uf, cd, query }) {
  const [cargo, disp] = useCargo(query, uf);
  const dep = cargo >= 6;
  const tab = query.tab || 'resultado';
  const zonaFiltro = query.zona ? +query.zona : null;
  const localFiltro = query.local || null; // "zona-numero"
  const { data, loading, error } = useAsync(
    () => Promise.all([loadBrasil(), loadUf(uf), loadMun(uf, cd), dep ? loadDep(uf) : null, dep ? loadPartidos() : null]),
    [uf, cd, dep]
  );
  const [brasil, ud, mf, depData, partidos] = data || [];

  const base = useMemo(() => {
    if (!mf) return null;
    const m = ud.mun.find(x => x.cd === cd);
    const secoes = secoesDoMunicipio(mf, UF_NOMES[uf]);
    const candRef = dep ? null : cargo === 1 ? brasil.cand[1] : ud.cand[cargo];
    return { m, secoes, candRef };
  }, [mf, ud, brasil, cd, uf, cargo, dep]);

  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!base.m) return <ErrorBox>Município {cd} não encontrado em {UF_NOMES[uf]}.</ErrorBox>;

  const { m, secoes, candRef } = base;
  const nomeMun = titulo(m.nome);
  const st = m.st[cargo];
  const filtradas = secoes.filter(s => (zonaFiltro == null || s.z === zonaFiltro) && (!localFiltro || `${s.z}-${s.local?.n}` === localFiltro));
  const localSel = localFiltro ? secoes.find(s => `${s.z}-${s.local?.n}` === localFiltro)?.local : null;

  return (
    <div className="space-y-4">
      <Trilha itens={[{ label: 'Brasil', href: rotas.brasil() }, { label: UF_NOMES[uf], href: rotas.uf(uf, { c: cargo }) }, { label: nomeMun }]} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">{nomeMun} <span className="muted font-normal">– {uf}</span></h1>
          <p className="text-sm ink-2">
            Código TSE {cd}{m.ibge ? ` · IBGE ${m.ibge}` : ''} · {m.zonas.length} zona(s): {m.zonas.slice(0, 6).map(z => pad(z)).join(', ')}{m.zonas.length > 6 ? ` e mais ${m.zonas.length - 6}` : ''} · {fmt(m.nLocais)} locais · {fmt(m.nSecoes)} seções com urna{m.nAgregadas ? ` (+${fmt(m.nAgregadas)} agregadas)` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center min-w-0 max-w-full">
          <CargoPicker cargo={cargo} disponiveis={disp} />
          <BotaoComparar id={idMun(uf, cd)} rotulo={`${nomeMun} – ${uf}`} />
          <a className="btn" href={urlPortalMunicipio(uf, cd, cargo)} target="_blank" rel="noreferrer" title="Abrir este município no portal oficial de resultados do TSE">TSE <ExternalLink className="w-3.5 h-3.5" /></a>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
        <Seg value={tab} onChange={v => setQuery({ tab: v })} options={TABS} />
        <Select value={zonaFiltro ?? ''} onChange={v => setQuery({ zona: v || undefined, local: undefined })} aria-label="Filtrar por zona" className="!py-1 text-sm">
          <option value="">Todas as zonas</option>
          {m.zonas.map(z => <option key={z} value={z}>Zona {pad(z)}</option>)}
        </Select>
        {localSel && (
          <span className="chip">{titulo(localSel.nome)} <button onClick={() => setQuery({ local: undefined })} aria-label="Remover filtro de local"><X className="w-3 h-3" /></button></span>
        )}
      </div>

      {!st && <ErrorBox>Não há votação de {cargoNome(cargo)} neste município.</ErrorBox>}
      {st && tab === 'resultado' && <AbaResultado {...{ uf, cd, cargo, st, candRef, m, dep, depData, partidos, filtradas, zonaFiltro, localFiltro }} />}
      {st && tab === 'zonas' && <AbaZonas {...{ uf, cd, cargo, candRef, secoes, nomeMun, dep }} />}
      {st && tab === 'locais' && <AbaLocais {...{ uf, cd, cargo, candRef, secoes: zonaFiltro == null ? secoes : secoes.filter(s => s.z === zonaFiltro), nomeMun, dep }} />}
      {st && tab === 'secoes' && <AbaSecoes {...{ uf, cd, cargo, candRef, secoes: filtradas, nomeMun, dep }} />}
      {st && tab === 'distribuicao' && <AbaDistribuicao {...{ uf, cd, cargo, candRef, secoes: filtradas, dep }} />}
    </div>
  );
}

function AbaResultado({ uf, cd, cargo, st, candRef, m, dep, depData, partidos, filtradas, zonaFiltro, localFiltro }) {
  const filtrado = zonaFiltro != null || localFiltro;
  const agg = useMemo(() => {
    if (!filtrado) return null;
    const [u] = agrupar(filtradas.map(s => ({ ...s, z: 0, local: { n: 0 } })), 'zona');
    return u;
  }, [filtradas, filtrado]);
  const stF = agg ? agg.st[cargo] : st;
  let itens;
  if (dep) itens = filtrado ? null : itensDeputadosMun(depData, cargo, cd);
  else itens = itensDeVetor(agg ? agg.v[cargo] : m.v[cargo], candRef);
  const leg = dep && !filtrado ? legendaDeputadosMun(depData, cargo, cd) : [];
  return (
    <div className="space-y-4">
      <Indicadores st={stF} cargo={cargo} extra={[filtrado ? `${fmt(agg?.nSecoes)} seções no filtro` : `${fmt(m.nSecoes)} seções`]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card
          title={`Resultado · ${cargoNome(cargo)}${filtrado ? ' (filtro aplicado)' : ''}`}
          subtitle={<>Soma das seções do município · <a className="link" href={urlDivulgacao(uf, cd, cargo)} target="_blank" rel="noreferrer">JSON oficial do TSE para conferência</a></>}
        >
          {itens ? <ResultadoCandidatos itens={itens} st={stF} cargo={cargo} max={dep ? 10 : 13} /> : (
            <p className="text-sm muted">Para deputados, os votos por candidato estão disponíveis no total do município e em cada seção (via boletim de urna). Remova o filtro de zona/local para ver o total.</p>
          )}
        </Card>
        <div className="space-y-4">
          <Card title="Composição dos votos"><ComposicaoVotos st={stF} cargo={cargo} /></Card>
          {dep && leg.length > 0 && (
            <Card title="Votos de legenda por partido">
              <CandidateBars itens={leg.filter(l => !depData.legenda?.[cargo]?.[l.n]?.votoValido).map(l => ({ n: l.n, nome: partidos?.[l.n] || `Partido ${l.n}`, votos: l.votos, cor: 'var(--accent)' }))} total={validosSt(stF)} max={12} mostrarNumero={false} />
              {leg.filter(l => depData.legenda?.[cargo]?.[l.n]?.votoValido).map(l => (
                <p key={l.n} className="text-xs muted mt-2">Legenda {partidos?.[l.n] || l.n}: {fmt(l.votos)} voto(s) — {depData.legenda[cargo][l.n].votoValido} (não entram nos válidos).</p>
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function AbaZonas({ uf, cd, cargo, candRef, secoes, nomeMun, dep }) {
  const zonas = useMemo(() => agrupar(secoes, 'zona'), [secoes]);
  const colunas = [
    { key: 'z', label: 'Zona', value: r => r.z, render: r => <a className="link font-medium" href={rotas.mun(uf, cd, { c: cargo, tab: 'secoes', zona: r.z })} onClick={e => e.stopPropagation()}>Zona {pad(r.z)}</a> },
    { key: 'loc', label: 'Locais', value: r => r.locais.size, align: 'right' },
    { key: 'ns', label: 'Seções', value: r => r.nSecoes, align: 'right' },
    ...colunasMetricas(cargo, dep ? null : candRef, { candidatos: 4 }),
    { key: 'cmp', label: '', value: () => null, render: r => <BotaoComparar compacto id={idZona(uf, cd, r.z)} rotulo={`Zona ${pad(r.z)} · ${nomeMun}`} /> }
  ];
  return (
    <Card title="Zonas eleitorais" subtitle="Totais por zona dentro do município">
      <DataTable linhas={zonas} colunas={colunas} rowKey={r => r.z} ordemInicial={{ key: 'z', dir: 'asc' }} nomeArquivo={`${cd}-zonas`} onRowClick={r => setQuery({ tab: 'secoes', zona: r.z })} />
    </Card>
  );
}

function AbaLocais({ uf, cd, cargo, candRef, secoes, nomeMun, dep }) {
  const locais = useMemo(() => agrupar(secoes, 'local'), [secoes]);
  const unidades = useMemo(() => locais.map(l => ({
    key: `${l.z}-${l.local.n}`, nome: titulo(l.local.nome), st: l.st[cargo], v: l.v[cargo], lat: l.local.lat, lng: l.local.lng,
    extraTooltip: `Zona ${pad(l.z)} · ${l.nSecoes} seção(ões)`,
    onClick: () => setQuery({ tab: 'secoes', zona: l.z, local: `${l.z}-${l.local.n}` })
  })), [locais, cargo]);
  const colunas = [
    { key: 'nome', label: 'Local de votação', value: r => r.local.nome, nowrap: false, render: r => (
      <div className="min-w-[220px]">
        <div className="font-medium">{titulo(r.local.nome)}</div>
        <div className="text-xs muted">{[r.local.end, r.local.bairro].filter(Boolean).map(titulo).join(' · ')}</div>
        {r.local.original && <div className="text-xs" style={{ color: 'var(--warn)' }}>Local alterado; original: {titulo(r.local.original.nome)}</div>}
      </div>
    ) },
    { key: 'bairro', label: 'Bairro', value: r => r.local.bairro && titulo(r.local.bairro), ocultarMobile: true },
    { key: 'z', label: 'Zona', value: r => r.z, align: 'right', render: r => pad(r.z) },
    { key: 'ns', label: 'Seções', value: r => r.nSecoes, align: 'right' },
    ...colunasMetricas(cargo, dep ? null : candRef, { candidatos: 3 }),
    { key: 'cmp', label: '', value: () => null, render: r => <BotaoComparar compacto id={idLocal(uf, cd, r.z, r.local.n)} rotulo={`${titulo(r.local.nome)} (Z${pad(r.z)})`} /> }
  ];
  return (
    <div className="space-y-4">
      {!dep && unidades.some(u => u.lat != null) && (
        <Card title="Mapa dos locais de votação" subtitle="Coordenadas publicadas pelo TSE; clique num local para ver as seções">
          <MapaResultado unidades={unidades} candRef={candRef} cargo={cargo} pontos height={460} raio={u => 4 + Math.min(10, Math.sqrt(u.st?.[S.aptos] || 0) / 8)} />
        </Card>
      )}
      <Card title="Locais de votação" subtitle="Nome e endereço conforme cadastro do TSE (eleitorado_local_votacao_2026)">
        <DataTable linhas={locais} colunas={colunas} rowKey={r => `${r.z}-${r.local.n}`} ordemInicial={{ key: 'apt', dir: 'desc' }} nomeArquivo={`${cd}-locais`} onRowClick={r => setQuery({ tab: 'secoes', zona: r.z, local: `${r.z}-${r.local.n}` })} />
      </Card>
    </div>
  );
}

function AbaSecoes({ uf, cd, cargo, candRef, secoes, nomeMun, dep }) {
  const colunas = [
    { key: 'z', label: 'Zona', value: r => r.z, align: 'right', render: r => pad(r.z), ocultarMobile: true },
    { key: 's', label: 'Seção', value: r => r.s, align: 'right', render: r => <a className="link font-semibold num" href={rotas.secao(uf, cd, r.z, r.ag && r.p ? r.p : r.s, { c: cargo })} onClick={e => e.stopPropagation()}>{pad(r.s)}</a>, ocultarMobile: true },
    { key: 'loc', label: 'Local', value: r => r.local?.nome, render: r => <span className="truncate inline-block max-w-[260px] align-bottom" title={r.local?.nome}>{titulo(r.local?.nome || '')}</span>, ocultarMobile: true },
    { key: 'situ', label: 'Situação', value: r => (r.ag ? `Agregada à ${pad(r.p)}` : r.anulada ? 'Anulada' : r.naoInstalada ? 'Não instalada' : r.agr ? `Principal (+${r.agr.length})` : 'Normal'),
      render: r => (r.ag ? <span className="chip">Agregada → {pad(r.p)}</span> : r.anulada ? <span className="chip" style={{ color: 'var(--bad)' }}>Anulada</span> : r.agr ? <span className="chip" title={`Agrega: ${r.agr.map(x => pad(x)).join(', ')}`}>+{r.agr.length} agregada(s)</span> : '') },
    ...colunasMetricas(cargo, dep ? null : candRef, { candidatos: 3 }).map(c => ({ ...c, value: r => (r.st ? c.value(r) : null), render: r => (r.st ? (c.render ? c.render(r) : c.value(r)) : '—') })),
    { key: 'urna', label: 'Urna', value: r => r.m },
    { key: 'cmp', label: '', value: () => null, render: r => (r.st ? <BotaoComparar compacto id={idSecao(uf, cd, r.z, r.s)} rotulo={`Seção ${pad(r.s)} Z${pad(r.z)} · ${nomeMun}`} /> : null) }
  ];
  return (
    <Card title="Seções eleitorais (urnas)" subtitle="Clique numa seção para ver o boletim de urna e conferir ao vivo com o TSE. Seções agregadas votam na urna da seção principal.">
      <DataTable linhas={secoes} colunas={colunas} rowKey={r => r.id} tituloMobile={r => <span><span className="font-semibold">Seção {pad(r.s)}</span> <span className="muted">· Zona {pad(r.z)}</span><span className="block text-xs muted font-normal">{titulo(r.local?.nome || '')}</span></span>} ordemInicial={{ key: 's', dir: 'asc' }} porPagina={100} nomeArquivo={`${cd}-secoes`} onRowClick={r => { window.location.hash = rotas.secao(uf, cd, r.z, r.ag && r.p ? r.p : r.s, { c: cargo }); }} />
    </Card>
  );
}

function AbaDistribuicao({ uf, cd, cargo, candRef, secoes, dep }) {
  const ops = useMemo(() => opcoesMetrica(dep ? [] : candRef, cargo).filter(o => o.value !== 'vencedor'), [candRef, cargo, dep]);
  const [mx, setMx] = useState('comparecimento');
  const [my, setMy] = useState(ops.find(o => o.value.startsWith('cand:'))?.value || 'brancos');
  const comVoto = secoes.filter(s => s.st?.[cargo]);
  const val = (met, s) => valorMetrica(met, s.st[cargo], s.v?.[cargo], candRef, cargo);
  const cores = mapaCores(candRef);
  const label = v => ops.find(o => o.value === v)?.label || v;
  const pontos = comVoto.map(s => {
    const lider = !dep && s.v?.[cargo] ? vencedor(s.v[cargo], candRef) : null;
    return { x: val(mx, s), y: val(my, s), label: `Seção ${pad(s.s)} · Zona ${pad(s.z)} · ${titulo(s.local?.nome || '')}`, cor: lider ? cores.get(+lider.n) : undefined, onClick: () => { window.location.hash = rotas.secao(uf, cd, s.z, s.s, { c: cargo }); } };
  });
  // seções atípicas: |z| > 3 na métrica Y
  const ys = pontos.map(p => p.y).filter(Number.isFinite);
  const media = ys.reduce((a, b) => a + b, 0) / (ys.length || 1);
  const dp = Math.sqrt(ys.reduce((a, b) => a + (b - media) ** 2, 0) / (ys.length || 1));
  const atipicas = comVoto.map((s, i) => ({ s, y: pontos[i].y, z: dp && Number.isFinite(pontos[i].y) ? (pontos[i].y - media) / dp : 0 })).filter(x => Math.abs(x.z) > 3).sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
  const f1 = v => `${v.toFixed(1).replace('.', ',')}`;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center text-sm">
        <span className="ink-2">Eixo X</span>
        <Select value={mx} onChange={setMx} className="!py-1 text-xs">{ops.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
        <span className="ink-2">Eixo Y</span>
        <Select value={my} onChange={setMy} className="!py-1 text-xs">{ops.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
        <span className="muted text-xs">{fmt(comVoto.length)} seções</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title={`Distribuição: ${label(mx)}`} subtitle="Cada unidade é uma seção (urna)"><Histogram values={pontos.map(p => p.x)} format={f1} xLabel={label(mx)} /></Card>
        <Card title={`Distribuição: ${label(my)}`} subtitle="Cada unidade é uma seção (urna)"><Histogram values={pontos.map(p => p.y)} format={f1} xLabel={label(my)} /></Card>
      </div>
      <Card title={`${label(my)} × ${label(mx)}`} subtitle={dep ? 'Cada ponto é uma seção' : 'Cada ponto é uma seção, colorida pelo candidato mais votado nela; clique para abrir o BU'}>
        <Scatter points={pontos} xLabel={label(mx)} yLabel={label(my)} fx={f1} fy={f1} height={360} />
      </Card>
      <Card title={`Seções estatisticamente atípicas em “${label(my)}”`} subtitle={`Desvio superior a 3 desvios-padrão da média do recorte (média ${f1(media)}, desvio ${f1(dp)}). Atipicidade estatística não indica irregularidade — confira o BU de cada uma.`}>
        {atipicas.length ? (
          <div className="flex flex-wrap gap-2">
            {atipicas.slice(0, 60).map(({ s, y, z }) => (
              <a key={s.id} className="chip hover:underline" href={rotas.secao(uf, cd, s.z, s.s, { c: cargo })} title={`${titulo(s.local?.nome || '')} · z-score ${z.toFixed(1)}`}>
                Z{pad(s.z)} S{pad(s.s)}: <b className="num">{f1(y)}</b>
              </a>
            ))}
          </div>
        ) : <p className="text-sm muted">Nenhuma seção fora de ±3 desvios-padrão neste recorte.</p>}
      </Card>
    </div>
  );
}

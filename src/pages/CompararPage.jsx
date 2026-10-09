import React, { useMemo, useState } from 'react';
import { X, Plus, GitCompare, Link2 } from 'lucide-react';
import { useAsync, Card, Loading, ErrorBox, Seg, Empty } from '../components/ui';
import { CandidateBars } from '../components/charts';
import DataTable from '../components/DataTable';
import { interpretar } from '../components/SearchBox';
import { useComparacao } from '../components/Comparacao';
import { carregarUnidade, TIPO_NOME } from '../lib/unidades';
import { loadMunicipiosIndex, S, CARGOS, cargoNome } from '../lib/data';
import { itensDeVetor, metricas } from '../lib/resultados';
import { fmt, fmtPct, pct, semAcento } from '../lib/format';
import { rotas, setQuery } from '../lib/router';

const LETRAS = 'ABCDEF';

function AdicionarUnidade({ onAdd }) {
  const [q, setQ] = useState('');
  const idx = useAsync(() => loadMunicipiosIndex().then(l => l.map(m => ({ ...m, _n: semAcento(m.nome).replace(/[-']/g, ' ') }))), []);
  const res = q.trim() && idx.data ? interpretar(q, idx.data).filter(r => r.id) : [];
  return (
    <div className="relative max-w-md w-full">
      <Plus className="w-4 h-4 absolute left-2.5 top-2.5 muted" />
      <input className="input w-full pl-8" placeholder="Adicionar: ex. “Fortaleza 114 1”, “Itaitinga”, “SP”" value={q} onChange={e => setQ(e.target.value)} />
      {res.length > 0 && (
        <div className="absolute z-30 mt-1 w-full card py-1 max-h-80 overflow-auto" style={{ boxShadow: '0 0 0 1px var(--ring), 0 12px 32px rgba(0,0,0,.2)' }}>
          {res.map(r => (
            <button key={r.id} className="w-full text-left px-3 py-1.5 hover:underline text-sm" onClick={() => { onAdd(r.id); setQ(''); }}>
              <b>{r.label}</b> {r.sub && <span className="muted text-xs">· {r.sub}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CompararPage({ query }) {
  const ids = (query.u || '').split(',').filter(Boolean);
  const bandeja = useComparacao();
  const cargoQ = +(query.c || 1);
  const { data: unidades, loading, error } = useAsync(() => Promise.all(ids.map(id => carregarUnidade(id).catch(e => ({ id, erro: e.message })))), [query.u]);
  const setIds = l => setQuery({ u: l.join(',') || undefined }, { replace: false });

  const cargosComuns = useMemo(() => {
    if (!unidades?.length) return [];
    return CARGOS.filter(c => unidades.every(u => !u.erro && u.st?.[c.id]));
  }, [unidades]);
  const cargo = cargosComuns.some(c => c.id === cargoQ) ? cargoQ : cargosComuns[0]?.id || 1;

  if (!ids.length) {
    return (
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-2xl font-semibold flex items-center gap-2"><GitCompare className="w-6 h-6" /> Comparar</h1>
        <p className="text-sm ink-2">Compare lado a lado até 6 unidades de qualquer nível: seções (urnas), locais de votação, zonas, municípios, UFs ou o Brasil. Adicione pela busca abaixo ou pelo botão <b>Comparar</b> presente em cada página e tabela.</p>
        <AdicionarUnidade onAdd={id => setIds([id])} />
        {bandeja.itens.length > 0 && (
          <Card title="Itens selecionados na bandeja">
            <div className="flex flex-wrap gap-2 mb-3">{bandeja.itens.map(i => <span key={i.id} className="chip">{i.rotulo}</span>)}</div>
            <a className="btn btn-primary" href={rotas.comparar(bandeja.itens.map(i => i.id))}>Comparar estes itens</a>
          </Card>
        )}
        <Card title="Exemplos">
          <div className="flex flex-col gap-1 text-sm">
            <a className="link" href={rotas.comparar(['secao:CE:13480:78:393', 'secao:CE:13480:78:396'])}>Duas seções vizinhas em Itaitinga (CE)</a>
            <a className="link" href={rotas.comparar(['mun:SP:71072', 'mun:RJ:60011', 'mun:MG:41238'])}>São Paulo × Rio de Janeiro × Belo Horizonte</a>
            <a className="link" href={rotas.comparar(['uf:CE', 'uf:SC'])}>Ceará × Santa Catarina</a>
          </div>
        </Card>
      </div>
    );
  }
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const validas = unidades.filter(u => !u.erro);
  const mesmaRef = cargo === 1 || validas.every(u => u.uf === validas[0]?.uf);
  const candRef = validas[0]?.cand?.[cargo];

  const linhasInd = [
    ['Eleitores aptos', u => u.st[cargo][S.aptos], fmt],
    ['Comparecimento', u => u.st[cargo][S.comp], fmt],
    ['% Comparecimento', u => metricas(u.st[cargo], cargo).pComparecimento, fmtPct],
    ['% Abstenção', u => metricas(u.st[cargo], cargo).pAbstencao, fmtPct],
    ['Votos válidos', u => metricas(u.st[cargo], cargo).validos, fmt],
    ['% Brancos', u => metricas(u.st[cargo], cargo).pBrancos, fmtPct],
    ['% Nulos', u => metricas(u.st[cargo], cargo).pNulos, fmtPct],
    ['Seções com urna', u => u.nSecoes, fmt]
  ];

  // Tabela por candidato (quando a lista de candidatos é a mesma)
  let linhasCand = [];
  if (mesmaRef && candRef && cargo <= 5) {
    linhasCand = candRef.map((c, i) => {
      const r = { c };
      validas.forEach((u, k) => {
        const val = metricas(u.st[cargo], cargo).validos;
        r[`v${k}`] = u.v?.[cargo]?.[i] || 0;
        r[`p${k}`] = pct(r[`v${k}`], val);
      });
      return r;
    }).filter(r => validas.some((_, k) => r[`v${k}`] > 0));
  }
  const colCand = [
    { key: 'nome', label: 'Candidato', value: r => r.c.nome, render: r => <span><b>{r.c.nome}</b> <span className="muted text-xs">{r.c.partido} · {r.c.n}</span></span> },
    ...validas.flatMap((u, k) => [
      { key: `v${k}`, label: `${LETRAS[k]} votos`, value: r => r[`v${k}`], align: 'right', render: r => fmt(r[`v${k}`]) },
      { key: `p${k}`, label: `${LETRAS[k]} %`, value: r => r[`p${k}`], align: 'right', render: r => fmtPct(r[`p${k}`]) }
    ]),
    ...(validas.length >= 2 ? validas.slice(1).map((u, j) => ({
      key: `d${j}`, label: `${LETRAS[j + 1]} − A (p.p.)`, align: 'right',
      value: r => (r[`p${j + 1}`] ?? 0) - (r.p0 ?? 0),
      render: r => { const d = (r[`p${j + 1}`] ?? 0) - (r.p0 ?? 0); return <span style={{ color: Math.abs(d) < 0.005 ? 'var(--muted)' : 'var(--ink)' }}>{d > 0 ? '+' : ''}{d.toFixed(2).replace('.', ',')}</span>; }
    })) : [])
  ];
  const maxPct = Math.max(1, ...validas.flatMap(u => {
    const val = metricas(u.st[cargo], cargo).validos;
    return (u.v?.[cargo] || []).map(x => pct(x, val) || 0);
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><GitCompare className="w-6 h-6" /> Comparação · {cargoNome(cargo)}</h1>
          <p className="text-sm ink-2">{validas.length} unidade(s). O link desta página guarda a comparação — copie para compartilhar.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {cargosComuns.length > 1 && <Seg value={cargo} onChange={v => setQuery({ c: v })} options={cargosComuns.map(c => ({ value: c.id, label: c.curto }))} />}
          <button className="btn" onClick={() => navigator.clipboard?.writeText(window.location.href)}><Link2 className="w-4 h-4" /> Copiar link</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        {unidades.map((u, k) => (
          <span key={u.id} className="chip !py-1 !px-2.5">
            <b>{LETRAS[k]}</b> {u.erro ? <span style={{ color: 'var(--bad)' }}>{u.id}: {u.erro}</span> : <a className="hover:underline" href={u.href}>{u.nome} <span className="muted">· {u.sub}</span></a>}
            <button onClick={() => setIds(ids.filter(i => i !== u.id))} aria-label="Remover"><X className="w-3 h-3" /></button>
          </span>
        ))}
        {ids.length < 6 && <AdicionarUnidade onAdd={id => !ids.includes(id) && setIds([...ids, id])} />}
      </div>

      {!cargosComuns.length ? <ErrorBox>As unidades escolhidas não têm nenhum cargo em comum.</ErrorBox> : (
        <>
          <Card title="Indicadores">
            <div className="overflow-auto">
              <table className="tbl">
                <thead><tr><th>Indicador</th>{validas.map((u, k) => <th key={u.id} className="text-right">{LETRAS[k]} · {TIPO_NOME[u.tipo]}</th>)}</tr></thead>
                <tbody>
                  {linhasInd.map(([nome, f, fm]) => (
                    <tr key={nome}><td className="ink-2">{nome}</td>{validas.map(u => <td key={u.id} className="text-right num font-medium">{fm(f(u))}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <div className={`grid gap-4 ${validas.length >= 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
            {validas.map((u, k) => {
              const itens = itensDeVetor(u.v?.[cargo], u.cand?.[cargo]);
              return (
                <Card key={u.id} title={`${LETRAS[k]} · ${u.nome}`} subtitle={u.sub}>
                  {cargo <= 5 && itens.length ? <ScaledBars itens={itens} total={metricas(u.st[cargo], cargo).validos} maxPct={maxPct} /> : <Empty>Votos por candidato não disponíveis para deputados neste nível — abra a seção para ver o BU.</Empty>}
                </Card>
              );
            })}
          </div>
          {linhasCand.length > 0 && (
            <Card title="Votos por candidato, lado a lado" subtitle="Percentuais sobre os votos válidos de cada unidade; diferenças em pontos percentuais em relação à unidade A">
              <DataTable linhas={linhasCand} colunas={colCand} rowKey={r => r.c.n} ordemInicial={{ key: 'v0', dir: 'desc' }} busca={false} nomeArquivo="comparacao" />
            </Card>
          )}
          {!mesmaRef && <p className="text-sm muted">As unidades pertencem a UFs diferentes; para {cargoNome(cargo)} os candidatos não são os mesmos, então a tabela lado a lado não se aplica.</p>}
        </>
      )}
    </div>
  );
}

/** Barras com escala comum entre as unidades comparadas (mesmo comprimento = mesmo %). */
function ScaledBars({ itens, total, maxPct }) {
  return (
    <div className="space-y-2">
      {itens.slice(0, 10).map(c => {
        const p = pct(c.votos, total) || 0;
        return (
          <div key={c.n} title={`${c.nome}: ${fmt(c.votos)} votos (${fmtPct(p)})`}>
            <div className="flex justify-between text-sm gap-2">
              <span className="truncate"><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5" style={{ background: c.cor }} />{c.nome}</span>
              <span className="num shrink-0"><b>{fmtPct(p)}</b> <span className="muted text-xs">{fmt(c.votos)}</span></span>
            </div>
            <div className="h-1.5 mt-1 rounded-full" style={{ background: 'var(--surface-2)' }}>
              <div className="h-1.5 rounded-full" style={{ width: `${(p / maxPct) * 100}%`, background: c.cor }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

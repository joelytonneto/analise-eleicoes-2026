import React, { useMemo, useState } from 'react';
import { ShieldCheck, Crosshair, Sparkles, Trophy, ChevronRight, AlertTriangle, Clock } from 'lucide-react';
import { useAsync, Card, Loading, ErrorBox, Seg, useIsMobile } from '../components/ui';
import { RankBars } from '../components/charts';
import { vencedor } from '../lib/metricasMapa';
import { mapaCores } from '../lib/colors';
import { Indicadores, ComposicaoVotos, ResultadoCandidatos } from '../components/Resultado';
import MapaResultado from '../components/MapaResultado';
import DataTable from '../components/DataTable';
import { BotaoComparar } from '../components/Comparacao';
import { loadBrasil, loadGeoBrasil, loadValidacao, IBGE_UF, S, validosSt, nulosSt } from '../lib/data';
import { itensDeVetor } from '../lib/resultados';
import { fmt, fmtPct, pct } from '../lib/format';
import { rotas, useTurno } from '../lib/router';

export function SeloAuditoria() {
  const [turno] = useTurno();
  const { data: val } = useAsync(() => loadValidacao(turno).catch(() => null), [turno]);
  if (!val) return null;
  const d = val.divulgacao, b = val.bu;
  const ok = val.resumo?.divulgacaoOk && val.resumo?.buOk && val.resumo?.consistenciaOk;
  return (
    <a href={rotas.auditoria()} className="card px-4 py-3 flex items-start gap-3 hover:opacity-90">
      <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0" style={{ color: ok ? 'var(--ok)' : 'var(--warn)' }} />
      <div className="text-sm">
        <div className="font-medium">{ok ? `Base do ${turno}º Turno conferida com o TSE` : `Base do ${turno}º Turno conferida com o TSE — ver ressalvas`}</div>
        <div className="text-xs ink-2">
          {fmt(d.comparacoes)} números comparados com {fmt(d.arquivos)} arquivos oficiais de totalização ({fmt(d.divergencias.length)} divergência(s)) e {fmt(b.amostra)} boletins de urna originais decodificados ({fmt(b.secoesIguais)} idênticos).
        </div>
      </div>
    </a>
  );
}

const abstencao = st => pct(st[S.abst], st[S.aptos]);

/** Abstenção (eleitores aptos que não compareceram) em cada UF, com o mais votado para presidente. */
function AbstencaoPorUf({ brasil, candRef }) {
  const [ordem, setOrdem] = useState('desc');
  const [todos, setTodos] = useState(false);
  const mobile = useIsMobile();
  const cores = mapaCores(candRef);
  const ufs = brasil.ufs.filter(u => u.uf !== 'ZZ');
  const ext = brasil.ufs.find(u => u.uf === 'ZZ');
  const itens = ufs
    .map(u => {
      const w = vencedor(u.v[1], candRef);
      return {
        key: u.uf, label: u.nome, value: abstencao(u.st[1]),
        sub: mobile ? w?.nome : `${fmt(u.st[1][S.abst])} de ${fmt(u.st[1][S.aptos])}${w ? ` · mais votado: ${w.nome}` : ''}`,
        onClick: () => { window.location.hash = rotas.uf(u.uf); }
      };
    })
    .sort((a, b) => (ordem === 'desc' ? b.value - a.value : a.value - b.value));
  const max = mobile && !todos ? 10 : itens.length;

  // abstenção somada (ponderada pelo eleitorado) nas UFs em que cada candidato foi o mais votado
  const grupos = new Map();
  for (const u of ufs) {
    const w = vencedor(u.v[1], candRef);
    if (!w) continue;
    const g = grupos.get(+w.n) || { c: w, abst: 0, aptos: 0, ufs: [] };
    g.abst += u.st[1][S.abst]; g.aptos += u.st[1][S.aptos]; g.ufs.push(u.uf);
    grupos.set(+w.n, g);
  }
  const semExt = ufs.reduce((a, u) => [a[0] + u.st[1][S.abst], a[1] + u.st[1][S.aptos]], [0, 0]);

  return (
    <Card
      title="Abstenção por estado"
      subtitle={`% dos eleitores aptos que não compareceram${mobile ? ' (ao lado, o mais votado para presidente)' : ''} · Brasil ${fmtPct(abstencao(brasil.total.st[1]))}${ext ? ` · exterior ${fmtPct(abstencao(ext.st[1]))}` : ''}`}
      actions={<Seg size="xs" value={ordem} onChange={setOrdem} options={[{ value: 'desc', label: 'Maior abstenção' }, { value: 'asc', label: 'Menor abstenção' }]} />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <RankBars itens={itens} format={v => fmtPct(v)} max={max} />
          {mobile && itens.length > 10 && (
            <button className="btn w-full justify-center mt-3" onClick={() => setTodos(t => !t)}>{todos ? 'Mostrar só os 10 primeiros' : `Ver todos os ${itens.length} estados`}</button>
          )}
        </div>
        <div className="space-y-3">
          <h3 className="text-xs font-medium muted">Abstenção somada nas UFs em que cada candidato foi o mais votado para presidente</h3>
          {[...grupos.values()].sort((a, b) => b.ufs.length - a.ufs.length).map(g => (
            <div key={g.c.n} className="rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="flex items-center gap-1.5 min-w-0"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cores.get(+g.c.n) }} /><span className="truncate font-medium">{g.c.nome}</span></span>
                <span className="num font-semibold">{fmtPct(pct(g.abst, g.aptos))}</span>
              </div>
              <div className="text-xs ink-2 mt-1">{g.ufs.length} UFs · {fmt(g.abst)} abstenções em {fmt(g.aptos)} aptos</div>
              <div className="text-xs muted mt-0.5 break-words">{[...g.ufs].sort().join(', ')}</div>
            </div>
          ))}
          <p className="text-xs muted">27 UFs sem o exterior: {fmtPct(pct(semExt[0], semExt[1]))}. Abstenção = aptos − comparecimento (dados do TSE, cargo Presidente). Abra uma UF e escolha “% abstenção” no mapa para ver por município.</p>
        </div>
      </div>
    </Card>
  );
}

export default function BrasilPage() {
  const [turno, setTurno] = useTurno();
  const { data, loading, error } = useAsync(() => Promise.all([loadBrasil(turno), loadGeoBrasil()]), [turno]);
  const brasil = data?.[0], geo = data?.[1];
  const candRef = brasil?.cand[1];

  const unidades = useMemo(() => (brasil ? brasil.ufs.filter(u => u.uf !== 'ZZ').map(u => ({
    key: u.uf, nome: u.nome, st: u.st[1], v: u.v[1], onClick: () => { window.location.hash = rotas.uf(u.uf); }
  })) : []), [brasil]);

  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const st = brasil.total.st[1];
  const itens = itensDeVetor(brasil.total.v[1], candRef);
  const nSecoes = brasil.ufs.reduce((a, u) => a + u.nSecoes, 0);
  const nLocais = brasil.ufs.reduce((a, u) => a + u.nLocais, 0);
  const nMun = brasil.ufs.reduce((a, u) => a + u.nMun, 0);
  const dataTurno = turno === 1 ? '04/10/2026' : '25/10/2026';

  const colunas = [
    { key: 'uf', label: 'UF', value: r => r.nome, render: r => <a className="link font-medium" href={rotas.uf(r.uf)} onClick={e => e.stopPropagation()}>{r.nome}</a> },
    { key: 'mun', label: 'Municípios', value: r => r.nMun, align: 'right', render: r => fmt(r.nMun) },
    { key: 'sec', label: 'Seções', value: r => r.nSecoes, align: 'right', render: r => fmt(r.nSecoes) },
    { key: 'apt', label: 'Aptos', value: r => r.st[1][S.aptos], align: 'right', render: r => fmt(r.st[1][S.aptos]) },
    { key: 'comp', label: '% Comparec.', value: r => pct(r.st[1][S.comp], r.st[1][S.aptos]), align: 'right', render: r => fmtPct(pct(r.st[1][S.comp], r.st[1][S.aptos])) },
    { key: 'abst', label: '% Abstenção', value: r => abstencao(r.st[1]), align: 'right', render: r => fmtPct(abstencao(r.st[1])) },
    ...candRef.slice(0, 4).map((c, i) => ({
      key: `c${c.n}`, label: `% ${c.nome}`, align: 'right',
      value: r => pct(r.v[1][i], validosSt(r.st[1])), render: r => fmtPct(pct(r.v[1][i], validosSt(r.st[1])))
    })),
    { key: 'br', label: '% Brancos', value: r => pct(r.st[1][S.br], r.st[1][S.comp]), align: 'right', render: r => fmtPct(pct(r.st[1][S.br], r.st[1][S.comp])) },
    { key: 'nu', label: '% Nulos', value: r => pct(nulosSt(r.st[1]), r.st[1][S.comp]), align: 'right', render: r => fmtPct(pct(nulosSt(r.st[1]), r.st[1][S.comp])) }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-semibold">Brasil · Presidente ({turno}º Turno)</h1>
            <Seg
              size="xs"
              value={String(turno)}
              onChange={v => setTurno(+v)}
              options={[
                { value: '2', label: '2º Turno · 25/10' },
                { value: '1', label: '1º Turno · 04/10' }
              ]}
            />
          </div>
          <p className="text-sm ink-2 mt-0.5">{turno}º turno · {dataTurno} · {fmt(nMun)} municípios (incl. {brasil.ufs.find(u => u.uf === 'ZZ')?.nMun} cidades no exterior) · {fmt(nLocais)} locais de votação · {fmt(nSecoes)} seções com urna</p>
        </div>
        <div className="flex gap-2">
          <a className="btn" href={rotas.localizar()}><Crosshair className="w-4 h-4" /> Localizar urna</a>
          <BotaoComparar id="br" rotulo="Brasil" />
        </div>
      </div>
      <SeloAuditoria />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <a href={rotas.destaques()} className="card p-3.5 flex items-center gap-3 hover:-translate-y-0.5 transition-transform">
          <span className="w-10 h-10 rounded-xl grid place-items-center text-white shrink-0" style={{ background: 'linear-gradient(135deg, #256abf, #1baf7a)' }}><Sparkles className="w-5 h-5" /></span>
          <span className="flex-1 min-w-0"><span className="block font-semibold text-sm">Destaques {turno}º Turno</span><span className="block text-xs muted">Eleitos, recordistas e resumo por estado</span></span>
          <ChevronRight className="w-4 h-4 muted shrink-0" />
        </a>
        <a href={rotas.placar()} className="card p-3.5 flex items-center gap-3 hover:-translate-y-0.5 transition-transform">
          <span className="w-10 h-10 rounded-xl grid place-items-center text-white shrink-0" style={{ background: 'linear-gradient(135deg, #2a78d6, #6250d6)' }}><Trophy className="w-5 h-5" /></span>
          <span className="flex-1 min-w-0"><span className="block font-semibold text-sm">Placar com fotos</span><span className="block text-xs muted">Votos de cada candidato no {turno}º Turno</span></span>
          <ChevronRight className="w-4 h-4 muted shrink-0" />
        </a>
        <a href={rotas.confronto()} className="card p-3.5 flex items-center gap-3 hover:-translate-y-0.5 transition-transform">
          <span className="w-10 h-10 rounded-xl grid place-items-center text-white shrink-0" style={{ background: 'linear-gradient(135deg, #d97706, #dc2626)' }}><AlertTriangle className="w-5 h-5" /></span>
          <span className="flex-1 min-w-0"><span className="block font-semibold text-sm">Confronto 1º × 2º Turno</span><span className="block text-xs muted">Urnas anômalas, viradas e perda de votos</span></span>
          <ChevronRight className="w-4 h-4 muted shrink-0" />
        </a>
        <a href={rotas.pos17h()} className="card p-3.5 flex items-center gap-3 hover:-translate-y-0.5 transition-transform">
          <span className="w-10 h-10 rounded-xl grid place-items-center text-white shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}><Clock className="w-5 h-5" /></span>
          <span className="flex-1 min-w-0"><span className="block font-semibold text-sm">Votação Após 17:00h</span><span className="block text-xs muted">Relatório de seções encerradas pós-17h</span></span>
          <ChevronRight className="w-4 h-4 muted shrink-0" />
        </a>
      </div>
      <Indicadores st={st} cargo={1} />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card title={`Resultado nacional · ${turno}º Turno`} subtitle="Votos nominais por candidato" className="lg:col-span-2">
          <ResultadoCandidatos itens={itens} st={st} cargo={1} max={13} />
          <div className="mt-4"><ComposicaoVotos st={st} cargo={1} /></div>
        </Card>
        <Card title="Mapa por UF" subtitle="Clique numa UF para detalhar" className="lg:col-span-3">
          <MapaResultado unidades={unidades} candRef={candRef} cargo={1} geo={geo} chaveFeature={f => IBGE_UF[f.properties.codarea]} height={460} />
        </Card>
      </div>
      <AbstencaoPorUf brasil={brasil} candRef={candRef} />
      <Card title={`Resultados por UF · ${turno}º Turno`} subtitle="Percentuais de candidatos sobre votos válidos; clique na linha para abrir a UF">
        <DataTable linhas={brasil.ufs} colunas={colunas} rowKey={r => r.uf} ordemInicial={{ key: 'apt', dir: 'desc' }} porPagina={30} nomeArquivo={`presidente-${turno}t-por-uf`} onRowClick={r => { window.location.hash = rotas.uf(r.uf); }} />
      </Card>
    </div>
  );
}

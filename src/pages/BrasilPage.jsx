import React, { useMemo } from 'react';
import { ShieldCheck, Crosshair } from 'lucide-react';
import { useAsync, Card, Loading, ErrorBox } from '../components/ui';
import { Indicadores, ComposicaoVotos, ResultadoCandidatos } from '../components/Resultado';
import MapaResultado from '../components/MapaResultado';
import DataTable from '../components/DataTable';
import { BotaoComparar } from '../components/Comparacao';
import { loadBrasil, loadGeoBrasil, loadValidacao, IBGE_UF, S, validosSt, nulosSt } from '../lib/data';
import { itensDeVetor } from '../lib/resultados';
import { fmt, fmtPct, pct } from '../lib/format';
import { rotas } from '../lib/router';

export function SeloAuditoria() {
  const { data: val } = useAsync(() => loadValidacao().catch(() => null), []);
  if (!val) return null;
  const d = val.divulgacao, b = val.bu;
  const ok = val.resumo?.divulgacaoOk && val.resumo?.buOk && val.resumo?.consistenciaOk;
  return (
    <a href={rotas.auditoria()} className="card px-4 py-3 flex items-start gap-3 hover:opacity-90">
      <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0" style={{ color: ok ? 'var(--ok)' : 'var(--warn)' }} />
      <div className="text-sm">
        <div className="font-medium">{ok ? 'Base conferida com o TSE' : 'Base conferida com o TSE — ver ressalvas'}</div>
        <div className="text-xs ink-2">
          {fmt(d.comparacoes)} números comparados com {fmt(d.arquivos)} arquivos oficiais de totalização ({fmt(d.divergencias.length)} divergência(s)) e {fmt(b.amostra)} boletins de urna originais decodificados ({fmt(b.secoesIguais)} idênticos).
        </div>
      </div>
    </a>
  );
}

export default function BrasilPage() {
  const { data, loading, error } = useAsync(() => Promise.all([loadBrasil(), loadGeoBrasil()]), []);
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

  const colunas = [
    { key: 'uf', label: 'UF', value: r => r.nome, render: r => <a className="link font-medium" href={rotas.uf(r.uf)} onClick={e => e.stopPropagation()}>{r.nome}</a> },
    { key: 'mun', label: 'Municípios', value: r => r.nMun, align: 'right', render: r => fmt(r.nMun) },
    { key: 'sec', label: 'Seções', value: r => r.nSecoes, align: 'right', render: r => fmt(r.nSecoes) },
    { key: 'apt', label: 'Aptos', value: r => r.st[1][S.aptos], align: 'right', render: r => fmt(r.st[1][S.aptos]) },
    { key: 'comp', label: '% Comparec.', value: r => pct(r.st[1][S.comp], r.st[1][S.aptos]), align: 'right', render: r => fmtPct(pct(r.st[1][S.comp], r.st[1][S.aptos])) },
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
          <h1 className="text-xl sm:text-2xl font-semibold">Brasil · Presidente</h1>
          <p className="text-sm ink-2">1º turno · 04/10/2026 · {fmt(nMun)} municípios (incl. {brasil.ufs.find(u => u.uf === 'ZZ')?.nMun} cidades no exterior) · {fmt(nLocais)} locais de votação · {fmt(nSecoes)} seções com urna</p>
        </div>
        <div className="flex gap-2">
          <a className="btn" href={rotas.localizar()}><Crosshair className="w-4 h-4" /> Localizar urna</a>
          <BotaoComparar id="br" rotulo="Brasil" />
        </div>
      </div>
      <SeloAuditoria />
      <Indicadores st={st} cargo={1} />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card title="Resultado nacional" subtitle="Votos nominais por candidato" className="lg:col-span-2">
          <ResultadoCandidatos itens={itens} st={st} cargo={1} max={13} />
          <div className="mt-4"><ComposicaoVotos st={st} cargo={1} /></div>
        </Card>
        <Card title="Mapa por UF" subtitle="Clique numa UF para detalhar" className="lg:col-span-3">
          <MapaResultado unidades={unidades} candRef={candRef} cargo={1} geo={geo} chaveFeature={f => IBGE_UF[f.properties.codarea]} height={460} />
        </Card>
      </div>
      <Card title="Resultados por UF" subtitle="Percentuais de candidatos sobre votos válidos; clique na linha para abrir a UF">
        <DataTable linhas={brasil.ufs} colunas={colunas} rowKey={r => r.uf} ordemInicial={{ key: 'apt', dir: 'desc' }} porPagina={30} nomeArquivo="presidente-por-uf" onRowClick={r => { window.location.hash = rotas.uf(r.uf); }} />
      </Card>
    </div>
  );
}

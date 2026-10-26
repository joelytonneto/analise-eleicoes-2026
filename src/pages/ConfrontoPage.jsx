import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeftRight, TrendingDown, TrendingUp, ExternalLink, Search, ShieldAlert, Play, Loader2, Building2, Vote } from 'lucide-react';
import { useAsync, Card, Loading, ErrorBox, Seg, Select } from '../components/ui';
import { Scatter } from '../components/charts';
import DataTable from '../components/DataTable';
import { loadConfrontoTurnos, loadMunicipiosIndex, loadMun, UF_NOMES } from '../lib/data';
import { fmt, fmtPct, pct, titulo, pad, semAcento } from '../lib/format';
import { rotas } from '../lib/router';
import { baixarBoletim, urlPortalSecao } from '../lib/tse';

const TAG_LABELS = {
  perda_votos: { label: 'Perda de votos no 2ºT', cor: '#dc2626', bg: 'rgba(220,38,38,.12)' },
  virada: { label: 'Virada de vencedor', cor: '#d97706', bg: 'rgba(217,119,6,.14)' },
  salto_acima_3via: { label: 'Salto > 100% da 3ª via', cor: '#7c3aed', bg: 'rgba(124,58,237,.14)' },
  salto_comparecimento: { label: 'Salto/queda comparec.', cor: '#2563eb', bg: 'rgba(37,99,235,.12)' },
  salto_nulos: { label: 'Salto brancos/nulos', cor: '#db2777', bg: 'rgba(219,39,119,.12)' },
  desvio_escola: { label: 'Desvio na mesma escola', cor: '#059669', bg: 'rgba(5,150,105,.12)' },
  pos17h: { label: 'Encerrada pós-17h', cor: '#9333ea', bg: 'rgba(147,51,234,.12)' }
};

const FILTROS_SECAO = [
  { value: 'todas', label: 'Todas analisadas' },
  { value: 'perda_votos', label: 'Perda de votos no 2ºT' },
  { value: 'virada', label: 'Virada de vencedor' },
  { value: 'salto_acima_3via', label: 'Salto > 3ª via' },
  { value: 'salto_comparecimento', label: 'Oscilação comparec.' },
  { value: 'desvio_escola', label: 'Desvio na escola' },
  { value: 'salto_nulos', label: 'Oscilação nulos' }
];

const fmtSinal = n => (n > 0 ? `+${fmt(n)}` : fmt(n));
const fmtPPSinal = n => `${n > 0 ? '+' : ''}${Number(n || 0).toFixed(2).replace('.', ',')} p.p.`;

function TagChip({ tag }) {
  const info = TAG_LABELS[tag] || { label: tag, cor: 'var(--ink-2)', bg: 'var(--surface-2)' };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap" style={{ color: info.cor, background: info.bg }}>
      {info.label}
    </span>
  );
}

export default function ConfrontoPage() {
  const { data, loading, error } = useAsync(() => loadConfrontoTurnos(), []);
  const [aba, setAba] = useState('secoes');
  const [filtroTag, setFiltroTag] = useState('todas');
  const [ufFiltro, setUfFiltro] = useState('');
  const [busca, setBusca] = useState('');
  const [eixoScatter, setEixoScatter] = useState('votos');
  const [filtroMun, setFiltroMun] = useState('anomalos');

  const secoesFiltradas = useMemo(() => {
    if (!data?.secoes) return [];
    const q = semAcento(busca.trim());
    return data.secoes.filter(s => {
      if (ufFiltro && s.uf !== ufFiltro) return false;
      if (filtroTag !== 'todas' && !s.tags.includes(filtroTag)) return false;
      if (q) {
        const alvo = semAcento(`${s.uf} ${s.municipio} ${s.local} ${s.bairro} z${s.z} s${s.s} ${s.z} ${s.s}`);
        if (!alvo.includes(q)) return false;
      }
      return true;
    });
  }, [data, ufFiltro, filtroTag, busca]);

  const munsFiltrados = useMemo(() => {
    if (!data?.municipios) return [];
    const q = semAcento(busca.trim());
    return data.municipios.filter(m => {
      if (ufFiltro && m.uf !== ufFiltro) return false;
      if (filtroMun === 'virada' && !m.virou) return false;
      if (filtroMun === 'perda' && !m.perdaVotos) return false;
      if (filtroMun === 'perda_flavio' && m.dFlavioVotos >= 0) return false;
      if (filtroMun === 'perda_lula' && m.dLulaVotos >= 0) return false;
      if (filtroMun === 'anomalos' && !m.virou && !m.perdaVotos && Math.abs(m.dCompPP) < 5) return false;
      if (q) {
        const alvo = semAcento(`${m.uf} ${m.nome} ${m.cd}`);
        if (!alvo.includes(q)) return false;
      }
      return true;
    });
  }, [data, ufFiltro, filtroMun, busca]);

  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const rb = data.resumoBrasil;
  const dCompBr = rb.comp2 - rb.comp1;
  const dLulaBr = rb.lula2 - rb.lula1;
  const dFlavioBr = rb.flavio2 - rb.flavio1;
  const munsVirou = data.municipios.filter(m => m.virou).length;
  const munsPerda = data.municipios.filter(m => m.perdaVotos).length;
  const munsPerdaFlavio = data.municipios.filter(m => m.dFlavioVotos < 0).length;
  const munsPerdaLula = data.municipios.filter(m => m.dLulaVotos < 0).length;
  const secPerda = data.secoes.filter(s => s.tags.includes('perda_votos')).length;
  const secVirada = data.secoes.filter(s => s.tags.includes('virada')).length;
  const secSalto3Via = data.secoes.filter(s => s.tags.includes('salto_acima_3via')).length;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-5 sm:p-7 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #7c2d12, #b91c1c 52%, #4c1d95)' }}>
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full opacity-10" style={{ background: '#fff' }} />
        <div className="relative space-y-3">
          <div className="text-xs uppercase tracking-widest opacity-85 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> Auditoria Comparativa · 1º Turno (04/10/2026) × 2º Turno (25/10/2026)
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold">Confronto de Urnas e Pontos Anormais entre Turnos</h1>
          <p className="text-sm sm:text-base opacity-90 max-w-3xl">
            Análise forense seção por seção e município por município comparando o comportamento dos votos entre o 1º e o 2º Turno: urnas onde candidatos perderam votos absolutos de um turno para o outro, inversões abruptas de vencedor, saltos acima de 100% da 3ª via disponível e desvios extremos dentro do mesmo local de votação.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,.12)' }}>
              <div className="text-xs opacity-80">13 · Lula (PT) · 1ºT → 2ºT</div>
              <div className="text-lg font-bold num">{fmt(rb.lula1)} → {fmt(rb.lula2)}</div>
              <div className="text-xs font-semibold text-emerald-300 num">{fmtSinal(dLulaBr)} votos (+6,69 p.p.)</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,.12)' }}>
              <div className="text-xs opacity-80">22 · Flávio Bolsonaro (PL) · 1ºT → 2ºT</div>
              <div className="text-lg font-bold num">{fmt(rb.flavio1)} → {fmt(rb.flavio2)}</div>
              <div className="text-xs font-semibold text-amber-200 num">{fmtSinal(dFlavioBr)} votos (+2,16 p.p.)</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,.12)' }}>
              <div className="text-xs opacity-80">Comparecimento Nacional · 1ºT → 2ºT</div>
              <div className="text-lg font-bold num">{fmt(rb.comp1)} → {fmt(rb.comp2)}</div>
              <div className="text-xs font-semibold text-rose-200 num">{fmtSinal(dCompBr)} eleitores (-1,05 p.p.)</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-xs muted">Urnas na amostra c/ perda de votos no 2ºT</div>
          <div className="text-2xl sm:text-3xl font-extrabold num mt-1" style={{ color: '#dc2626' }}>{fmt(secPerda)}</div>
          <div className="text-xs ink-2 mt-0.5">Candidato teve menos votos no 2ºT que no 1ºT na mesma seção</div>
        </div>
        <div className="card p-4">
          <div className="text-xs muted">Urnas c/ virada ou salto &gt; 100% da 3ª via</div>
          <div className="text-2xl sm:text-3xl font-extrabold num mt-1" style={{ color: '#d97706' }}>{fmt(secVirada + secSalto3Via)}</div>
          <div className="text-xs ink-2 mt-0.5">{fmt(secVirada)} viradas de líder · {fmt(secSalto3Via)} saltos acima da 3ª via</div>
        </div>
        <div className="card p-4">
          <div className="text-xs muted">Municípios com virada de vencedor (1ºT → 2ºT)</div>
          <div className="text-2xl sm:text-3xl font-extrabold num mt-1" style={{ color: '#7c3aed' }}>{fmt(munsVirou)}</div>
          <div className="text-xs ink-2 mt-0.5">de {fmt(data.municipios.length)} municípios auditados no censo</div>
        </div>
        <div className="card p-4">
          <div className="text-xs muted">Municípios c/ redução absoluta de votos no 2ºT</div>
          <div className="text-2xl sm:text-3xl font-extrabold num mt-1" style={{ color: '#2563eb' }}>{fmt(munsPerda)}</div>
          <div className="text-xs ink-2 mt-0.5">Flávio caiu em {fmt(munsPerdaFlavio)} cidades · Lula em {fmt(munsPerdaLula)}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Seg
          value={aba}
          onChange={setAba}
          options={[
            { value: 'secoes', label: `Urnas / Seções Anômalas (${data.secoes.length})` },
            { value: 'municipios', label: `Municípios e Estados (${data.municipios.length})` },
            { value: 'auditor', label: 'Confrontar Qualquer Escola/Zona Ao Vivo' }
          ]}
        />
        {aba !== 'auditor' && (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={ufFiltro} onChange={setUfFiltro} className="!py-1 text-sm">
              <option value="">Todas as UFs</option>
              {Object.entries(UF_NOMES).map(([sg, n]) => <option key={sg} value={sg}>{sg} – {n}</option>)}
            </Select>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 muted" />
              <input
                className="input !py-1 pl-8 text-sm w-56"
                placeholder="Buscar cidade, escola, seção…"
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {aba === 'secoes' && (
        <AbaSecoesAnomalas
          secoes={secoesFiltradas}
          filtroTag={filtroTag}
          setFiltroTag={setFiltroTag}
          eixoScatter={eixoScatter}
          setEixoScatter={setEixoScatter}
        />
      )}

      {aba === 'municipios' && (
        <AbaMunicipiosConfronto
          ufs={data.ufs}
          municipios={munsFiltrados}
          filtroMun={filtroMun}
          setFiltroMun={setFiltroMun}
        />
      )}

      {aba === 'auditor' && <AuditorEscolaAoVivo />}
    </div>
  );
}

function AbaSecoesAnomalas({ secoes, filtroTag, setFiltroTag, eixoScatter, setEixoScatter }) {
  const pontos = useMemo(() => {
    return secoes.map(s => {
      let x, y;
      if (eixoScatter === 'pct') {
        x = s.pLula1;
        y = s.pLula2;
      } else if (eixoScatter === 'comp') {
        x = s.dCompVotos;
        y = s.dLulaVotos;
      } else {
        x = s.dFlavioVotos;
        y = s.dLulaVotos;
      }
      const cor = s.tags.includes('virada')
        ? '#d97706'
        : s.tags.includes('perda_votos')
          ? '#dc2626'
          : s.tags.includes('salto_acima_3via')
            ? '#7c3aed'
            : '#2563eb';
      return {
        x,
        y,
        cor,
        label: `${s.uf} · ${titulo(s.municipio)} · Z${pad(s.z)} S${pad(s.s)} | Lula: ${s.lula1}→${s.lula2} (${fmtSinal(s.dLulaVotos)}) | Flávio: ${s.flavio1}→${s.flavio2} (${fmtSinal(s.dFlavioVotos)})`,
        onClick: () => { window.location.hash = rotas.secao(s.uf, s.cd, s.z, s.s); }
      };
    });
  }, [secoes, eixoScatter]);

  const topCasos = secoes.slice(0, 6);

  const colunas = [
    {
      key: 'loc',
      label: 'UF / Município / Seção',
      value: r => `${r.uf} ${r.municipio} ${r.z} ${r.s}`,
      render: r => (
        <div>
          <a className="link font-semibold" href={rotas.secao(r.uf, r.cd, r.z, r.s)} onClick={e => e.stopPropagation()}>
            {r.uf} · {titulo(r.municipio)} · Z{pad(r.z)} S{pad(r.s)}
          </a>
          <div className="text-xs muted truncate max-w-[250px]" title={r.local}>{titulo(r.local)}</div>
        </div>
      )
    },
    {
      key: 'comp',
      label: 'Comparec. (1ºT → 2ºT)',
      align: 'right',
      value: r => r.dCompVotos,
      render: r => (
        <span className="num">
          {fmt(r.comp1)} → {fmt(r.comp2)}{' '}
          <span className="text-xs font-semibold" style={{ color: r.dCompVotos < -15 ? '#dc2626' : r.dCompVotos > 15 ? '#2563eb' : 'var(--muted)' }}>
            ({fmtSinal(r.dCompVotos)})
          </span>
        </span>
      )
    },
    {
      key: 'lula',
      label: '13 Lula (1ºT → 2ºT)',
      align: 'right',
      value: r => r.dLulaVotos,
      render: r => (
        <span className="num">
          {fmt(r.lula1)} → <b>{fmt(r.lula2)}</b>{' '}
          <span className="text-xs font-semibold" style={{ color: r.dLulaVotos < 0 ? '#dc2626' : '#059669' }}>
            ({fmtSinal(r.dLulaVotos)})
          </span>
        </span>
      )
    },
    {
      key: 'flavio',
      label: '22 Flávio (1ºT → 2ºT)',
      align: 'right',
      value: r => r.dFlavioVotos,
      render: r => (
        <span className="num">
          {fmt(r.flavio1)} → <b>{fmt(r.flavio2)}</b>{' '}
          <span className="text-xs font-semibold" style={{ color: r.dFlavioVotos < 0 ? '#dc2626' : '#2563eb' }}>
            ({fmtSinal(r.dFlavioVotos)})
          </span>
        </span>
      )
    },
    {
      key: 'outros1',
      label: '3ª Via (1ºT)',
      align: 'right',
      value: r => r.outros1,
      render: r => <span className="num">{fmt(r.outros1)}</span>
    },
    {
      key: 'margem',
      label: 'Swing Margem',
      align: 'right',
      value: r => Math.abs(r.dMargemPP),
      render: r => <span className="num font-semibold">{fmtPPSinal(r.dMargemPP)}</span>
    },
    {
      key: 'score',
      label: 'Índice Anomalia',
      align: 'right',
      value: r => r.scoreAnomalia,
      render: r => <span className="num font-bold" style={{ color: r.scoreAnomalia >= 50 ? '#dc2626' : r.scoreAnomalia >= 25 ? '#d97706' : 'var(--ink)' }}>{r.scoreAnomalia.toFixed(1).replace('.', ',')}</span>
    },
    {
      key: 'tags',
      label: 'Pontos Anormais Detectados',
      value: r => r.tags.length,
      render: r => (
        <div className="flex flex-wrap gap-1">
          {r.tags.length ? r.tags.map(t => <TagChip key={t} tag={t} />) : <span className="text-xs muted">Sem alerta crítico</span>}
        </div>
      )
    },
    {
      key: 'tse',
      label: 'BUs TSE',
      value: () => null,
      render: r => (
        <div className="flex gap-1.5 text-xs whitespace-nowrap" onClick={e => e.stopPropagation()}>
          <a className="link" href={urlPortalSecao(r.uf, r.cd, r.z, r.s, 1, 1)} target="_blank" rel="noreferrer">1ºT <ExternalLink className="w-3 h-3 inline" /></a>
          <a className="link" href={urlPortalSecao(r.uf, r.cd, r.z, r.s, 1, 2)} target="_blank" rel="noreferrer">2ºT <ExternalLink className="w-3 h-3 inline" /></a>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Seg size="xs" value={filtroTag} onChange={setFiltroTag} options={FILTROS_SECAO} />
        <span className="text-xs muted ml-auto">{fmt(secoes.length)} seções no filtro</span>
      </div>

      {topCasos.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" style={{ color: '#dc2626' }} /> Casos mais extremos de divergência entre 1º e 2º Turno no filtro atual
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {topCasos.map(s => (
              <a
                key={`${s.uf}-${s.cd}-${s.z}-${s.s}`}
                href={rotas.secao(s.uf, s.cd, s.z, s.s)}
                className="card p-4 space-y-2.5 hover:-translate-y-0.5 transition-transform block"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate">{s.uf} · {titulo(s.municipio)} · Z{pad(s.z)} S{pad(s.s)}</div>
                    <div className="text-xs muted truncate">{titulo(s.local)}</div>
                  </div>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-md shrink-0" style={{ background: 'rgba(220,38,38,.12)', color: '#dc2626' }}>
                    Score {s.scoreAnomalia.toFixed(1).replace('.', ',')}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs rounded-lg p-2.5 num" style={{ background: 'var(--surface-2)' }}>
                  <div>
                    <div className="muted">13 · Lula</div>
                    <div className="font-semibold">{s.lula1} → {s.lula2}</div>
                    <div className="font-bold" style={{ color: s.dLulaVotos < 0 ? '#dc2626' : '#059669' }}>{fmtSinal(s.dLulaVotos)} votos</div>
                  </div>
                  <div>
                    <div className="muted">22 · Flávio</div>
                    <div className="font-semibold">{s.flavio1} → {s.flavio2}</div>
                    <div className="font-bold" style={{ color: s.dFlavioVotos < 0 ? '#dc2626' : '#2563eb' }}>{fmtSinal(s.dFlavioVotos)} votos</div>
                  </div>
                  <div>
                    <div className="muted">Comparec. / 3ªVia</div>
                    <div className="font-semibold">{s.comp1} → {s.comp2}</div>
                    <div className="ink-2">{fmtSinal(s.dCompVotos)} el. · 3ªv: {s.outros1}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {s.tags.map(t => <TagChip key={t} tag={t} />)}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      <Card
        title="Dispersão de Comportamento das Urnas (1º Turno × 2º Turno)"
        subtitle="Cada ponto é uma urna auditada (BU 1ºT × BU 2ºT); clique num ponto para abrir a auditoria completa da seção"
        actions={
          <Seg
            size="xs"
            value={eixoScatter}
            onChange={setEixoScatter}
            options={[
              { value: 'votos', label: 'Δ Votos Flávio × Δ Votos Lula' },
              { value: 'pct', label: '% Lula 1ºT × % Lula 2ºT' },
              { value: 'comp', label: 'Δ Comparecimento × Δ Lula' }
            ]}
          />
        }
      >
        <Scatter
          points={pontos}
          xLabel={eixoScatter === 'pct' ? '% Lula no 1º Turno' : eixoScatter === 'comp' ? 'Δ Comparecimento (2ºT − 1ºT)' : 'Δ Votos Flávio Bolsonaro (2ºT − 1ºT)'}
          yLabel={eixoScatter === 'pct' ? '% Lula no 2º Turno' : 'Δ Votos Lula (2ºT − 1ºT)'}
          fx={v => `${v.toFixed(0)}`}
          fy={v => `${v.toFixed(0)}`}
          height={340}
        />
      </Card>

      <Card
        title="Tabela Completa de Confronto de Seções (1ºT × 2ºT)"
        subtitle="Clique em qualquer seção para abrir o Boletim de Urna completo e comparar todos os campos entre os turnos"
      >
        <DataTable
          linhas={secoes}
          colunas={colunas}
          rowKey={r => `${r.uf}-${r.cd}-${r.z}-${r.s}`}
          ordemInicial={{ key: 'score', dir: 'desc' }}
          porPagina={50}
          nomeArquivo="confronto-secoes-1t-2t"
          onRowClick={r => { window.location.hash = rotas.secao(r.uf, r.cd, r.z, r.s); }}
        />
      </Card>
    </div>
  );
}

function AbaMunicipiosConfronto({ ufs, municipios, filtroMun, setFiltroMun }) {
  const colunasUf = [
    { key: 'uf', label: 'UF', value: r => r.nome, render: r => <a className="link font-semibold" href={rotas.uf(r.uf)}>{r.uf} – {r.nome}</a> },
    { key: 'comp', label: 'Comparec. 1ºT → 2ºT', align: 'right', value: r => r.dCompPP, render: r => <span className="num">{fmtPct(r.pComp1)} → {fmtPct(r.pComp2)} <span className="text-xs muted">({fmtPPSinal(r.dCompPP)})</span></span> },
    { key: 'lula', label: '13 Lula (1ºT → 2ºT)', align: 'right', value: r => r.dLulaVotos, render: r => <span className="num">{fmt(r.lula1)} → <b>{fmt(r.lula2)}</b> <span className="text-xs" style={{ color: r.dLulaVotos < 0 ? '#dc2626' : '#059669' }}>({fmtSinal(r.dLulaVotos)})</span></span> },
    { key: 'flavio', label: '22 Flávio (1ºT → 2ºT)', align: 'right', value: r => r.dFlavioVotos, render: r => <span className="num">{fmt(r.flavio1)} → <b>{fmt(r.flavio2)}</b> <span className="text-xs" style={{ color: r.dFlavioVotos < 0 ? '#dc2626' : '#2563eb' }}>({fmtSinal(r.dFlavioVotos)})</span></span> },
    { key: 'outros', label: '3ª Via no 1ºT', align: 'right', value: r => r.outros1, render: r => <span className="num">{fmt(r.outros1)}</span> },
    { key: 'status', label: 'Comportamento', value: r => (r.virou ? 2 : r.dFlavioVotos < 0 || r.dLulaVotos < 0 ? 1 : 0), render: r => (
      <div className="flex gap-1 flex-wrap">
        {r.virou && <TagChip tag="virada" />}
        {(r.dFlavioVotos < 0 || r.dLulaVotos < 0) && <TagChip tag="perda_votos" />}
      </div>
    ) }
  ];

  const colunasMun = [
    { key: 'nome', label: 'Município', value: r => r.nome, render: r => <a className="link font-semibold" href={rotas.mun(r.uf, r.cd)} onClick={e => e.stopPropagation()}>{titulo(r.nome)} – {r.uf}</a> },
    { key: 'sec', label: 'Seções', align: 'right', value: r => r.nSecoes, render: r => fmt(r.nSecoes) },
    { key: 'comp', label: 'Comparec. (Δ p.p.)', align: 'right', value: r => r.dCompPP, render: r => <span className="num">{fmtPct(r.pComp1, 1)} → {fmtPct(r.pComp2, 1)} <span className="text-xs font-semibold">({fmtPPSinal(r.dCompPP)})</span></span> },
    { key: 'lula', label: '13 Lula (2ºT − 1ºT)', align: 'right', value: r => r.dLulaVotos, render: r => <span className="num">{fmt(r.lula1)} → <b>{fmt(r.lula2)}</b> <span className="text-xs font-semibold" style={{ color: r.dLulaVotos < 0 ? '#dc2626' : '#059669' }}>({fmtSinal(r.dLulaVotos)})</span></span> },
    { key: 'flavio', label: '22 Flávio (2ºT − 1ºT)', align: 'right', value: r => r.dFlavioVotos, render: r => <span className="num">{fmt(r.flavio1)} → <b>{fmt(r.flavio2)}</b> <span className="text-xs font-semibold" style={{ color: r.dFlavioVotos < 0 ? '#dc2626' : '#2563eb' }}>({fmtSinal(r.dFlavioVotos)})</span></span> },
    { key: 'outros', label: '3ª Via (1ºT)', align: 'right', value: r => r.outros1, render: r => fmt(r.outros1) },
    { key: 'swing', label: 'Swing Margem', align: 'right', value: r => Math.abs(r.dMargemPP), render: r => <span className="num font-semibold">{fmtPPSinal(r.dMargemPP)}</span> },
    { key: 'anom', label: 'Alertas', value: r => (r.virou ? 2 : 0) + (r.perdaVotos ? 1 : 0), render: r => (
      <div className="flex gap-1 flex-wrap">
        {r.virou && <TagChip tag="virada" />}
        {r.perdaVotos && <TagChip tag="perda_votos" />}
      </div>
    ) }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Seg
          size="xs"
          value={filtroMun}
          onChange={setFiltroMun}
          options={[
            { value: 'anomalos', label: 'Com virada, perda de votos ou salto' },
            { value: 'virada', label: 'Virada de vencedor (222)' },
            { value: 'perda', label: 'Perda absoluta de votos (964)' },
            { value: 'perda_flavio', label: 'Flávio perdeu votos' },
            { value: 'perda_lula', label: 'Lula perdeu votos' },
            { value: 'todos', label: 'Todos os 5.757 municípios' }
          ]}
        />
        <span className="text-xs muted ml-auto">{fmt(municipios.length)} municípios listados</span>
      </div>

      <Card title="Confronto 1º × 2º Turno nos Municípios" subtitle="Censo completo dos 5.757 municípios comparando a totalização oficial do 1º Turno e do 2º Turno">
        <DataTable
          linhas={municipios}
          colunas={colunasMun}
          rowKey={r => `${r.uf}-${r.cd}`}
          ordemInicial={{ key: 'swing', dir: 'desc' }}
          porPagina={50}
          nomeArquivo="confronto-municipios-1t-2t"
          onRowClick={r => { window.location.hash = rotas.mun(r.uf, r.cd); }}
        />
      </Card>

      <Card title="Confronto 1º × 2º Turno por UF (27 Estados + Exterior)" subtitle="Variação de comparecimento e transferência de votos por estado">
        <DataTable
          linhas={ufs}
          colunas={colunasUf}
          rowKey={r => r.uf}
          ordemInicial={{ key: 'lula', dir: 'desc' }}
          porPagina={30}
          nomeArquivo="confronto-ufs-1t-2t"
          onRowClick={r => { window.location.hash = rotas.uf(r.uf); }}
        />
      </Card>
    </div>
  );
}

function AuditorEscolaAoVivo() {
  const { data: muns } = useAsync(() => loadMunicipiosIndex(1), []);
  const [uf, setUf] = useState('SP');
  const [cd, setCd] = useState('');
  const [zona, setZona] = useState('');
  const [localIdx, setLocalIdx] = useState('');
  const [rodando, setRodando] = useState(false);
  const [progresso, setProgresso] = useState({ feitos: 0, total: 0 });
  const [resultados, setResultados] = useState([]);

  const munsUf = useMemo(() => (muns || []).filter(m => m.uf === uf).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')), [muns, uf]);
  const cdEfetivo = cd || munsUf.find(m => m.capital)?.cd || munsUf[0]?.cd || '';

  const { data: mf1 } = useAsync(() => (cdEfetivo ? loadMun(uf, cdEfetivo, 1) : Promise.resolve(null)), [uf, cdEfetivo]);

  const zonasDisp = useMemo(() => {
    if (!mf1) return [];
    return [...new Set(mf1.secoes.map(s => s.z))].sort((a, b) => a - b);
  }, [mf1]);
  const zonaEfetiva = zona && zonasDisp.includes(+zona) ? +zona : zonasDisp[0] || '';

  const locaisDisp = useMemo(() => {
    if (!mf1 || !zonaEfetiva) return [];
    const map = new Map();
    for (const s of mf1.secoes) {
      if (s.z !== +zonaEfetiva || s.ag) continue;
      if (!map.has(s.l)) map.set(s.l, { l: s.l, local: mf1.locais[s.l], nSec: 0 });
      map.get(s.l).nSec++;
    }
    return [...map.values()];
  }, [mf1, zonaEfetiva]);
  const localEfetivo = localIdx !== '' && locaisDisp.some(x => String(x.l) === String(localIdx)) ? +localIdx : (locaisDisp[0]?.l ?? '');

  async function confrontarAgora() {
    if (!mf1 || rodando) return;
    const secs = mf1.secoes.filter(s => !s.ag && s.st?.[1] && s.z === +zonaEfetiva && (localEfetivo === '' || s.l === +localEfetivo));
    if (!secs.length) return;
    setRodando(true);
    setProgresso({ feitos: 0, total: secs.length });
    setResultados([]);

    const ord1 = mf1.cand?.[1] || [];
    const iL1 = ord1.indexOf(13), iF1 = ord1.indexOf(22);
    const out = [];
    let idx = 0;

    await Promise.all(Array.from({ length: Math.min(6, secs.length) }, async () => {
      while (idx < secs.length) {
        const s = secs[idx++];
        try {
          const bu2 = await baixarBoletim(uf, cdEfetivo, s.z, s.s, { turno: 2 });
          const r2 = bu2.resumo?.[1];
          if (r2) {
            const comp1 = s.st[1][1], val1 = s.st[1][3] - (s.st[1][8] || 0);
            const lula1 = iL1 >= 0 ? (s.v?.[1]?.[iL1] || 0) : 0;
            const flavio1 = iF1 >= 0 ? (s.v?.[1]?.[iF1] || 0) : 0;
            const outros1 = Math.max(0, val1 - lula1 - flavio1);
            const comp2 = r2.comparecimento;
            const lula2 = r2.votos[13] || 0;
            const flavio2 = r2.votos[22] || 0;
            const val2 = lula2 + flavio2;
            const dLulaVotos = lula2 - lula1;
            const dFlavioVotos = flavio2 - flavio1;
            const dCompVotos = comp2 - comp1;
            const pLula1 = pct(lula1, val1), pLula2 = pct(lula2, val2);
            const pFlavio1 = pct(flavio1, val1), pFlavio2 = pct(flavio2, val2);
            const dMargemPP = (pLula2 - pFlavio2) - (pLula1 - pFlavio1);
            const tags = [];
            if ((lula1 > flavio1 && flavio2 > lula2) || (flavio1 > lula1 && lula2 > flavio2)) tags.push('virada');
            if (dLulaVotos < 0 || dFlavioVotos < 0) tags.push('perda_votos');
            const poolDisp = outros1 + Math.max(0, dCompVotos);
            if (dLulaVotos > poolDisp + 3 || dFlavioVotos > poolDisp + 3) tags.push('salto_acima_3via');
            const enc2 = bu2.bu?.dadosSecao?.dataHoraEncerramento || '';
            if (enc2.slice(11) >= '17:01:00') tags.push('pos17h');

            out.push({
              uf, cd: cdEfetivo, municipio: mf1.nome, z: s.z, s: s.s,
              local: mf1.locais[s.l]?.nome || '',
              comp1, comp2, dCompVotos,
              lula1, lula2, dLulaVotos,
              flavio1, flavio2, dFlavioVotos,
              outros1, dMargemPP: +dMargemPP.toFixed(2),
              enc2, tags
            });
          }
        } catch { /* ignore */ }
        setProgresso(p => ({ ...p, feitos: p.feitos + 1 }));
      }
    }));

    out.sort((a, b) => a.s - b.s);
    setResultados(out);
    setRodando(false);
  }

  return (
    <Card
      title="Confrontar Qualquer Local de Votação (Escola) Ao Vivo no TSE"
      subtitle="Escolha qualquer estado, município, zona e escola do Brasil: o navegador baixa os Boletins de Urna originais do 2º Turno diretamente do TSE e confronta urna por urna com o 1º Turno"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs muted block mb-1">Estado (UF)</label>
            <Select value={uf} onChange={v => { setUf(v); setCd(''); setZona(''); setLocalIdx(''); }} className="w-full">
              {Object.entries(UF_NOMES).map(([sg, n]) => <option key={sg} value={sg}>{sg} – {n}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-xs muted block mb-1">Município</label>
            <Select value={cdEfetivo} onChange={v => { setCd(v); setZona(''); setLocalIdx(''); }} className="w-full">
              {munsUf.map(m => <option key={m.cd} value={m.cd}>{titulo(m.nome)} ({m.nSecoes} seções)</option>)}
            </Select>
          </div>
          <div>
            <label className="text-xs muted block mb-1">Zona Eleitoral</label>
            <Select value={zonaEfetiva} onChange={v => { setZona(v); setLocalIdx(''); }} className="w-full">
              {zonasDisp.map(z => <option key={z} value={z}>Zona {pad(z)}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-xs muted block mb-1">Local de Votação (Escola)</label>
            <Select value={localEfetivo} onChange={setLocalIdx} className="w-full">
              {locaisDisp.map(x => <option key={x.l} value={x.l}>{titulo(x.local?.nome || `Local ${x.l}`)} ({x.nSec} urnas)</option>)}
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn btn-primary" disabled={rodando || !mf1} onClick={confrontarAgora}>
            {rodando ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Baixando e confrontando BUs ({progresso.feitos}/{progresso.total})…</>
            ) : (
              <><Play className="w-4 h-4" /> Confrontar Urnas desta Escola Agora (1ºT × 2ºT)</>
            )}
          </button>
          {resultados.length > 0 && (
            <span className="text-sm ink-2">
              <b>{resultados.length}</b> urnas confrontadas · <b>{resultados.filter(r => r.tags.length > 0).length}</b> com alertas
            </span>
          )}
        </div>

        {resultados.length > 0 && (
          <div className="overflow-x-auto">
            <table className="tbl num text-sm">
              <thead>
                <tr>
                  <th>Seção</th>
                  <th className="text-right">Comparec. (1ºT → 2ºT)</th>
                  <th className="text-right">13 Lula (1ºT → 2ºT)</th>
                  <th className="text-right">22 Flávio (1ºT → 2ºT)</th>
                  <th className="text-right">3ª Via 1ºT</th>
                  <th className="text-right">Encerramento 2ºT</th>
                  <th>Diagnóstico</th>
                </tr>
              </thead>
              <tbody>
                {resultados.map(r => (
                  <tr key={r.s}>
                    <td>
                      <a className="link font-semibold" href={rotas.secao(r.uf, r.cd, r.z, r.s)}>Seção {pad(r.s)}</a>
                    </td>
                    <td className="text-right">{fmt(r.comp1)} → {fmt(r.comp2)} ({fmtSinal(r.dCompVotos)})</td>
                    <td className="text-right" style={{ color: r.dLulaVotos < 0 ? '#dc2626' : undefined }}>
                      {fmt(r.lula1)} → <b>{fmt(r.lula2)}</b> ({fmtSinal(r.dLulaVotos)})
                    </td>
                    <td className="text-right" style={{ color: r.dFlavioVotos < 0 ? '#dc2626' : undefined }}>
                      {fmt(r.flavio1)} → <b>{fmt(r.flavio2)}</b> ({fmtSinal(r.dFlavioVotos)})
                    </td>
                    <td className="text-right">{fmt(r.outros1)}</td>
                    <td className="text-right font-mono text-xs">{r.enc2 ? r.enc2.slice(11) : '—'}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {r.tags.length ? r.tags.map(t => <TagChip key={t} tag={t} />) : <span className="text-xs muted">Normal</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}

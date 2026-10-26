import React, { useMemo, useState } from 'react';
import { Clock, AlertTriangle, ExternalLink, Search, Play, Loader2, CheckCircle2, Flame, ShieldAlert } from 'lucide-react';
import { useAsync, Card, Loading, ErrorBox, Seg, Select } from '../components/ui';
import { Histogram, Scatter, RankBars } from '../components/charts';
import DataTable from '../components/DataTable';
import { loadVotacaoPos17h, loadMunicipiosIndex, loadMun, UF_NOMES } from '../lib/data';
import { fmt, fmtPct, pct, titulo, pad, semAcento } from '../lib/format';
import { rotas } from '../lib/router';
import { baixarBoletim, urlPortalSecao } from '../lib/tse';

function fmtAtraso(min) {
  const m = Math.round(min || 0);
  if (m < 60) return `+${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `+${h}h ${String(r).padStart(2, '0')}m`;
}

export default function Pos17hPage() {
  const { data, loading, error } = useAsync(() => loadVotacaoPos17h(), []);
  const [turnoFiltro, setTurnoFiltro] = useState('todos');
  const [minFiltro, setMinFiltro] = useState('0');
  const [ufFiltro, setUfFiltro] = useState('');
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState('urnas');

  const secoesFiltradas = useMemo(() => {
    if (!data?.secoes) return [];
    const q = semAcento(busca.trim());
    const minLim = +minFiltro || 0;
    return data.secoes.filter(s => {
      if (turnoFiltro === '1' && s.turno !== 1) return false;
      if (turnoFiltro === '2' && s.turno !== 2) return false;
      if (turnoFiltro === 'reincidente' && !s.reincidente1T && !s.reincidente2T) return false;
      if (s.minApos17h < minLim) return false;
      if (ufFiltro && s.uf !== ufFiltro) return false;
      if (q) {
        const alvo = semAcento(`${s.uf} ${s.municipio} ${s.local} ${s.bairro} z${s.z} s${s.s}`);
        if (!alvo.includes(q)) return false;
      }
      return true;
    });
  }, [data, turnoFiltro, minFiltro, ufFiltro, busca]);

  const agregadosFiltro = useMemo(() => {
    let comp = 0, apt = 0, val = 0, lula = 0, flavio = 0;
    for (const s of secoesFiltradas) {
      comp += s.comparecimento || 0;
      apt += s.aptos || 0;
      val += s.validos || 0;
      lula += s.lula || 0;
      flavio += s.flavio || 0;
    }
    return {
      comp, apt, val, lula, flavio,
      pComp: pct(comp, apt),
      pLula: pct(lula, val),
      pFlavio: pct(flavio, val)
    };
  }, [secoesFiltradas]);

  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const todas = data.secoes || [];
  const t1Count = todas.filter(s => s.turno === 1).length;
  const t2Count = todas.filter(s => s.turno === 2).length;
  const apos18h = todas.filter(s => s.minApos17h >= 60).length;
  const apos19h = todas.filter(s => s.minApos17h >= 120).length;
  const apos20h = todas.filter(s => s.minApos17h >= 180).length;
  const recorde = todas[0];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-5 sm:p-7 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #3b0764, #6d28d9 52%, #be185d)' }}>
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full opacity-10" style={{ background: '#fff' }} />
        <div className="relative space-y-3">
          <div className="text-xs uppercase tracking-widest opacity-85 flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> Auditoria de Horário das Urnas · 1º e 2º Turno (ASN.1 dataHoraEncerramento)
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold">Relatório de Seções com Votação Após 17:00h</h1>
          <p className="text-sm sm:text-base opacity-90 max-w-3xl">
            Verificação direta do relógio interno de encerramento gravado e assinado digitalmente no Boletim de Urna (<code>dadosSecao.dataHoraEncerramento</code>) em confronto com o horário regulamentar de fechamento (17:00h pelo Horário de Brasília), incluindo o comportamento dos votos nessas urnas.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,.12)' }}>
              <div className="text-xs opacity-80">Urnas Auditadas Encerradas Pós-17h</div>
              <div className="text-2xl font-extrabold num">{fmt(todas.length)} ocorrências</div>
              <div className="text-xs opacity-90">{fmt(t1Count)} no 1º Turno · {fmt(t2Count)} no 2º Turno</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,.12)' }}>
              <div className="text-xs opacity-80">Encerramento Após 18:00h / 19:00h / 20:00h BRT</div>
              <div className="text-2xl font-extrabold num">{fmt(apos18h)} / {fmt(apos19h)} / {fmt(apos20h)}</div>
              <div className="text-xs opacity-90">Mais de 1h, 2h e 3h após o fechamento oficial</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,.12)' }}>
              <div className="text-xs opacity-80">Encerramento Mais Tardio Registrado</div>
              <div className="text-2xl font-extrabold num">{recorde ? `${recorde.horaBRT} BRT` : '—'}</div>
              <div className="text-xs opacity-90 truncate">{recorde ? `${titulo(recorde.municipio)}–${recorde.uf} Z${pad(recorde.z)} S${pad(recorde.s)} (${recorde.horaLocal} local)` : ''}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-xs muted">Eleitores que votaram nas seções filtradas</div>
          <div className="text-2xl sm:text-3xl font-extrabold num mt-1">{fmt(agregadosFiltro.comp)}</div>
          <div className="text-xs ink-2 mt-0.5">de {fmt(agregadosFiltro.apt)} aptos ({fmtPct(agregadosFiltro.pComp, 1)} de comparecimento)</div>
        </div>
        <div className="card p-4">
          <div className="text-xs muted">Votos 13 · Lula (PT) nessas urnas</div>
          <div className="text-2xl sm:text-3xl font-extrabold num mt-1" style={{ color: '#059669' }}>{fmt(agregadosFiltro.lula)}</div>
          <div className="text-xs ink-2 mt-0.5">{fmtPct(agregadosFiltro.pLula, 2)} dos votos válidos no recorte</div>
        </div>
        <div className="card p-4">
          <div className="text-xs muted">Votos 22 · Flávio Bolsonaro (PL) nessas urnas</div>
          <div className="text-2xl sm:text-3xl font-extrabold num mt-1" style={{ color: '#2563eb' }}>{fmt(agregadosFiltro.flavio)}</div>
          <div className="text-xs ink-2 mt-0.5">{fmtPct(agregadosFiltro.pFlavio, 2)} dos votos válidos no recorte</div>
        </div>
        <div className="card p-4">
          <div className="text-xs muted">BUs transmitidos ao TSE após 18:00h (Brasil 1ºT)</div>
          <div className="text-2xl sm:text-3xl font-extrabold num mt-1" style={{ color: '#9333ea' }}>
            {fmt((data.distRecebimentoT1?.de18ha19h || 0) + (data.distRecebimentoT1?.de19ha20h || 0) + (data.distRecebimentoT1?.de20ha21h || 0) + (data.distRecebimentoT1?.apos21h || 0))}
          </div>
          <div className="text-xs ink-2 mt-0.5">{fmt(data.distRecebimentoT1?.apos21h || 0)} urnas recebidas após 21:00h</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Seg
          value={aba}
          onChange={setAba}
          options={[
            { value: 'urnas', label: `Urnas Encerradas Pós-17h (${secoesFiltradas.length})` },
            { value: 'transmissao', label: 'Panorama Nacional de Horários (499 mil urnas)' },
            { value: 'auditor', label: 'Auditar Horário de Qualquer Escola Ao Vivo' }
          ]}
        />
        {aba === 'urnas' && (
          <div className="flex flex-wrap items-center gap-2">
            <Seg
              size="xs"
              value={turnoFiltro}
              onChange={setTurnoFiltro}
              options={[
                { value: 'todos', label: '1º e 2º Turno' },
                { value: '2', label: `2º Turno (${t2Count})` },
                { value: '1', label: `1º Turno (${t1Count})` },
                { value: 'reincidente', label: 'Reincidentes' }
              ]}
            />
            <Select value={minFiltro} onChange={setMinFiltro} className="!py-1 text-xs">
              <option value="0">Todas (&gt; 17:00h BRT)</option>
              <option value="15">Atraso ≥ 15 min (&gt; 17:15h)</option>
              <option value="30">Atraso ≥ 30 min (&gt; 17:30h)</option>
              <option value="60">Atraso ≥ 1 hora (&gt; 18:00h)</option>
              <option value="120">Atraso ≥ 2 horas (&gt; 19:00h)</option>
              <option value="180">Atraso ≥ 3 horas (&gt; 20:00h)</option>
            </Select>
            <Select value={ufFiltro} onChange={setUfFiltro} className="!py-1 text-xs">
              <option value="">Todas as UFs</option>
              {Object.entries(UF_NOMES).filter(([k]) => k !== 'ZZ').map(([sg, n]) => <option key={sg} value={sg}>{sg} – {n}</option>)}
            </Select>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 muted" />
              <input
                className="input !py-1 pl-8 text-xs w-48"
                placeholder="Cidade, escola, seção…"
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {aba === 'urnas' && <AbaUrnasPos17h secoes={secoesFiltradas} />}
      {aba === 'transmissao' && <AbaTransmissaoNacional data={data} />}
      {aba === 'auditor' && <AuditorHorarioAoVivo />}
    </div>
  );
}

function AbaUrnasPos17h({ secoes }) {
  const topCasos = secoes.slice(0, 6);

  const pontosScatter = useMemo(() => {
    return secoes.map(s => {
      const pComp = pct(s.comparecimento, s.aptos);
      const lulaVenceu = s.lula >= s.flavio;
      return {
        x: s.minApos17h,
        y: pComp,
        cor: lulaVenceu ? '#dc2626' : '#2563eb',
        label: `${s.turno}ºT · ${s.uf} · ${titulo(s.municipio)} Z${pad(s.z)} S${pad(s.s)} | Enc: ${s.horaBRT} BRT (${fmtAtraso(s.minApos17h)}) | Lula ${s.lula} × Flávio ${s.flavio}`,
        onClick: () => { window.location.hash = rotas.secao(s.uf, s.cd, s.z, s.s, { t: s.turno }); }
      };
    });
  }, [secoes]);

  const colunas = [
    {
      key: 'turno',
      label: 'Turno',
      value: r => r.turno,
      render: r => (
        <div className="flex items-center gap-1">
          <span className="px-2 py-0.5 rounded-md text-xs font-bold" style={{ background: r.turno === 2 ? 'rgba(37,99,235,.14)' : 'rgba(124,58,237,.14)', color: r.turno === 2 ? '#2563eb' : '#7c3aed' }}>
            {r.turno}ºT
          </span>
          {(r.reincidente1T || r.reincidente2T) && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: 'rgba(217,119,6,.15)', color: '#d97706' }} title="Esta mesma seção também encerrou após 17:00h no outro turno">
              1º+2ºT
            </span>
          )}
        </div>
      )
    },
    {
      key: 'loc',
      label: 'UF / Município / Seção',
      value: r => `${r.uf} ${r.municipio} ${r.z} ${r.s}`,
      render: r => (
        <div>
          <a className="link font-semibold" href={rotas.secao(r.uf, r.cd, r.z, r.s, { t: r.turno })} onClick={e => e.stopPropagation()}>
            {r.uf} · {titulo(r.municipio)} · Z{pad(r.z)} S{pad(r.s)}
          </a>
          <div className="text-xs muted truncate max-w-[240px]" title={r.local}>{titulo(r.local)}</div>
        </div>
      )
    },
    {
      key: 'horaLocal',
      label: 'Abertura → Encerramento (Urna)',
      value: r => r.horaLocal,
      render: r => (
        <div className="font-mono text-xs">
          <span>{r.abertura?.slice(11) || '—'} → <b>{r.horaLocal}</b></span>
          {r.offsetHoras > 0 && <span className="block text-[10px] muted">Fuso UTC-{3 + r.offsetHoras} (-{r.offsetHoras}h BRT)</span>}
        </div>
      )
    },
    {
      key: 'horaBRT',
      label: 'Encerramento (Brasília)',
      align: 'right',
      value: r => r.minApos17h,
      render: r => <span className="font-mono font-bold text-xs" style={{ color: r.minApos17h >= 60 ? '#dc2626' : '#d97706' }}>{r.horaBRT} BRT</span>
    },
    {
      key: 'atraso',
      label: 'Tempo Após 17:00h',
      align: 'right',
      value: r => r.minApos17h,
      render: r => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold num" style={{ background: r.minApos17h >= 60 ? 'rgba(220,38,38,.12)' : 'rgba(217,119,6,.14)', color: r.minApos17h >= 60 ? '#dc2626' : '#d97706' }}>
          {fmtAtraso(r.minApos17h)}
        </span>
      )
    },
    {
      key: 'comp',
      label: 'Comparecimento',
      align: 'right',
      value: r => pct(r.comparecimento, r.aptos),
      render: r => <span className="num">{fmt(r.comparecimento)}/{fmt(r.aptos)} <span className="text-xs muted">({fmtPct(pct(r.comparecimento, r.aptos), 1)})</span></span>
    },
    {
      key: 'lula',
      label: '13 Lula',
      align: 'right',
      value: r => r.lula,
      render: r => <span className="num font-semibold">{fmt(r.lula)} <span className="text-xs muted">({fmtPct(pct(r.lula, r.validos), 1)})</span></span>
    },
    {
      key: 'flavio',
      label: '22 Flávio',
      align: 'right',
      value: r => r.flavio,
      render: r => <span className="num font-semibold">{fmt(r.flavio)} <span className="text-xs muted">({fmtPct(pct(r.flavio, r.validos), 1)})</span></span>
    },
    {
      key: 'rb',
      label: 'Recebido no TSE',
      value: r => r.recebimentoTSE || '',
      render: r => <span className="font-mono text-xs muted">{r.recebimentoTSE?.slice(11) || '—'}</span>
    },
    {
      key: 'tse',
      label: 'BU',
      value: () => null,
      render: r => (
        <a className="link text-xs whitespace-nowrap" href={urlPortalSecao(r.uf, r.cd, r.z, r.s, 1, r.turno)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
          TSE <ExternalLink className="w-3 h-3 inline" />
        </a>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {topCasos.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Flame className="w-4 h-4" style={{ color: '#dc2626' }} /> Seções com encerramento mais tardio no filtro atual
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {topCasos.map((s, idx) => (
              <a
                key={`${s.turno}-${s.uf}-${s.cd}-${s.z}-${s.s}-${idx}`}
                href={rotas.secao(s.uf, s.cd, s.z, s.s, { t: s.turno })}
                className="card p-4 space-y-2.5 hover:-translate-y-0.5 transition-transform block"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate">{s.turno}º Turno · {s.uf} · {titulo(s.municipio)}</div>
                    <div className="text-xs muted truncate">Zona {pad(s.z)} · Seção {pad(s.s)} · {titulo(s.local)}</div>
                  </div>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-md shrink-0" style={{ background: 'rgba(220,38,38,.12)', color: '#dc2626' }}>
                    {fmtAtraso(s.minApos17h)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs rounded-lg p-2.5 num" style={{ background: 'var(--surface-2)' }}>
                  <div>
                    <div className="muted">Encerramento da Urna</div>
                    <div className="font-mono font-bold text-sm">{s.horaBRT} BRT</div>
                    <div className="text-[11px] muted">Local: {s.abertura?.slice(11)} → {s.horaLocal}</div>
                  </div>
                  <div>
                    <div className="muted">Votos Presidente ({s.turno}ºT)</div>
                    <div className="font-semibold">Lula {fmt(s.lula)} × Flávio {fmt(s.flavio)}</div>
                    <div className="text-[11px] muted">Comp.: {fmt(s.comparecimento)}/{fmt(s.aptos)} ({fmtPct(pct(s.comparecimento, s.aptos), 1)})</div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Distribuição do Tempo de Votação Após 17:00h (em minutos)" subtitle="Minutos decorridos entre as 17:00h (Brasília) e a gravação do encerramento no BU">
          <Histogram values={secoes.map(s => s.minApos17h)} format={v => `${Math.round(v)}m`} xLabel="Minutos após 17:00h (BRT)" />
        </Card>
        <Card title="% de Comparecimento × Minutos Após 17:00h" subtitle="Pontos vermelhos: maioria Lula (13); pontos azuis: maioria Flávio (22). Clique para abrir o BU">
          <Scatter
            points={pontosScatter}
            xLabel="Minutos após 17:00h (BRT)"
            yLabel="% Comparecimento na seção"
            fx={v => `${Math.round(v)}m`}
            fy={v => `${v.toFixed(0)}%`}
            height={260}
          />
        </Card>
      </div>

      <Card
        title="Relatório Completo de Seções com Votação Encerrada Após 17:00h"
        subtitle="Todos os horários abaixo foram extraídos diretamente do campo ASN.1 dadosSecao.dataHoraEncerramento assinado pela urna eletrônica"
      >
        <DataTable
          linhas={secoes}
          colunas={colunas}
          rowKey={r => `${r.turno}-${r.uf}-${r.cd}-${r.z}-${r.s}`}
          ordemInicial={{ key: 'atraso', dir: 'desc' }}
          porPagina={50}
          nomeArquivo="relatorio-votacao-apos-17h"
          onRowClick={r => { window.location.hash = rotas.secao(r.uf, r.cd, r.z, r.s, { t: r.turno }); }}
        />
      </Card>
    </div>
  );
}

function AbaTransmissaoNacional({ data }) {
  const d = data.distRecebimentoT1 || {};
  const total = (d.ate17h30 || 0) + (d.de17h30a18h || 0) + (d.de18ha19h || 0) + (d.de19ha20h || 0) + (d.de20ha21h || 0) + (d.apos21h || 0) + (d.diaSeguinte || 0);

  const faixas = [
    { key: '1', label: '17:00h às 17:30h (imediato)', value: d.ate17h30 || 0, sub: `${fmtPct(pct(d.ate17h30 || 0, total))} das urnas` },
    { key: '2', label: '17:30h às 18:00h', value: d.de17h30a18h || 0, sub: `${fmtPct(pct(d.de17h30a18h || 0, total))} das urnas` },
    { key: '3', label: '18:00h às 19:00h', value: d.de18ha19h || 0, sub: `${fmtPct(pct(d.de18ha19h || 0, total))} das urnas` },
    { key: '4', label: '19:00h às 20:00h', value: d.de19ha20h || 0, sub: `${fmtPct(pct(d.de19ha20h || 0, total))} das urnas` },
    { key: '5', label: '20:00h às 21:00h', value: d.de20ha21h || 0, sub: `${fmtPct(pct(d.de20ha21h || 0, total))} das urnas` },
    { key: '6', label: 'Após 21:00h / dia seguinte', value: (d.apos21h || 0) + (d.diaSeguinte || 0), sub: `${fmtPct(pct((d.apos21h || 0) + (d.diaSeguinte || 0), total))} das urnas` }
  ];

  const porUf = Object.entries(data.distPorUfT1 || {})
    .filter(([uf]) => uf !== 'ZZ')
    .map(([uf, v]) => ({
      key: uf,
      label: `${uf} – ${UF_NOMES[uf]}`,
      value: v.apos19h || 0,
      sub: `${fmt(v.apos18h || 0)} após 18h · ${fmt(v.apos20h || 0)} após 20h (de ${fmt(v.total)} urnas)`
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Horário de Recebimento dos 499.248 BUs no TSE" subtitle="Distribuição nacional por faixa de horário de chegada do Boletim de Urna aos servidores do TSE">
        <RankBars itens={faixas} format={v => fmt(v)} max={6} />
      </Card>
      <Card title="Estados com Mais Urnas Transmitidas Após 19:00h" subtitle="Quantidade de seções cujo BU foi recebido pelo TSE depois das 19:00h">
        <RankBars itens={porUf} format={v => `${fmt(v)} urnas`} max={15} />
      </Card>
    </div>
  );
}

function AuditorHorarioAoVivo() {
  const { data: muns } = useAsync(() => loadMunicipiosIndex(1), []);
  const [turno, setTurno] = useState('2');
  const [uf, setUf] = useState('RJ');
  const [cd, setCd] = useState('');
  const [zona, setZona] = useState('');
  const [localIdx, setLocalIdx] = useState('');
  const [rodando, setRodando] = useState(false);
  const [progresso, setProgresso] = useState({ feitos: 0, total: 0 });
  const [linhas, setLinhas] = useState([]);

  const munsUf = useMemo(() => (muns || []).filter(m => m.uf === uf).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')), [muns, uf]);
  const cdEfetivo = cd || munsUf.find(m => m.capital)?.cd || munsUf[0]?.cd || '';
  const { data: mf1 } = useAsync(() => (cdEfetivo ? loadMun(uf, cdEfetivo, 1) : Promise.resolve(null)), [uf, cdEfetivo]);

  const zonasDisp = useMemo(() => (mf1 ? [...new Set(mf1.secoes.map(s => s.z))].sort((a, b) => a - b) : []), [mf1]);
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

  async function verificarAgora() {
    if (!mf1 || rodando) return;
    const secs = mf1.secoes.filter(s => !s.ag && s.z === +zonaEfetiva && (localEfetivo === '' || s.l === +localEfetivo));
    if (!secs.length) return;
    setRodando(true);
    setProgresso({ feitos: 0, total: secs.length });
    setLinhas([]);

    const out = [];
    let idx = 0;
    await Promise.all(Array.from({ length: Math.min(6, secs.length) }, async () => {
      while (idx < secs.length) {
        const s = secs[idx++];
        try {
          const r = await baixarBoletim(uf, cdEfetivo, s.z, s.s, { turno: +turno });
          const ab = r.bu?.dadosSecao?.dataHoraAbertura || '';
          const enc = r.bu?.dadosSecao?.dataHoraEncerramento || '';
          const em = r.bu?.dataHoraEmissao || '';
          const r1 = r.resumo?.[1];
          const [hh, mm, ss] = (enc.slice(11, 19) || '00:00:00').split(':').map(Number);
          const offset = uf === 'AC' ? 2 : ['AM', 'RO', 'RR', 'MT', 'MS'].includes(uf) ? 1 : 0;
          const minApos17 = Math.round(((hh + offset) * 60 + mm + ss / 60 - 17 * 60) * 10) / 10;
          out.push({
            uf, cd: cdEfetivo, z: s.z, s: s.s,
            ab, enc, em,
            rb: r.hash ? `${r.hash.dr} ${r.hash.hr}` : '',
            comp: r1?.comparecimento || 0,
            aptos: r1?.aptos || s.el || 0,
            lula: r1?.votos?.[13] || 0,
            flavio: r1?.votos?.[22] || 0,
            minApos17
          });
        } catch { /* ignore */ }
        setProgresso(p => ({ ...p, feitos: p.feitos + 1 }));
      }
    }));
    out.sort((a, b) => b.minApos17 - a.minApos17);
    setLinhas(out);
    setRodando(false);
  }

  return (
    <Card
      title="Auditar Horário de Abertura e Encerramento de Qualquer Escola Ao Vivo"
      subtitle="Baixa os Boletins de Urna originais direto do TSE no seu navegador e lê o relógio interno de cada urna (dataHoraAbertura e dataHoraEncerramento)"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-xs muted block mb-1">Turno</label>
            <Seg
              size="xs"
              value={turno}
              onChange={setTurno}
              options={[
                { value: '2', label: '2º Turno (25/10)' },
                { value: '1', label: '1º Turno (04/10)' }
              ]}
            />
          </div>
          <div>
            <label className="text-xs muted block mb-1">Estado (UF)</label>
            <Select value={uf} onChange={v => { setUf(v); setCd(''); setZona(''); setLocalIdx(''); }} className="w-full">
              {Object.entries(UF_NOMES).map(([sg, n]) => <option key={sg} value={sg}>{sg} – {n}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-xs muted block mb-1">Município</label>
            <Select value={cdEfetivo} onChange={v => { setCd(v); setZona(''); setLocalIdx(''); }} className="w-full">
              {munsUf.map(m => <option key={m.cd} value={m.cd}>{titulo(m.nome)}</option>)}
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
          <button className="btn btn-primary" disabled={rodando || !mf1} onClick={verificarAgora}>
            {rodando ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Lendo relógio dos BUs ({progresso.feitos}/{progresso.total})…</>
            ) : (
              <><Play className="w-4 h-4" /> Verificar Horário das Urnas desta Escola ({turno}ºT)</>
            )}
          </button>
          {linhas.length > 0 && (
            <span className="text-sm ink-2">
              <b>{linhas.length}</b> urnas verificadas · <b>{linhas.filter(l => l.minApos17 >= 1).length}</b> encerradas após 17:00h
            </span>
          )}
        </div>

        {linhas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="tbl num text-sm">
              <thead>
                <tr>
                  <th>Seção</th>
                  <th>Abertura (Urna)</th>
                  <th>Encerramento (Urna)</th>
                  <th>Emissão do BU</th>
                  <th>Recebido no TSE</th>
                  <th className="text-right">Comparec.</th>
                  <th className="text-right">13 Lula × 22 Flávio</th>
                  <th>Status 17:00h</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map(l => (
                  <tr key={l.s}>
                    <td><a className="link font-semibold" href={rotas.secao(l.uf, l.cd, l.z, l.s, { t: +turno })}>Seção {pad(l.s)}</a></td>
                    <td className="font-mono text-xs">{l.ab || '—'}</td>
                    <td className="font-mono text-xs font-bold">{l.enc || '—'}</td>
                    <td className="font-mono text-xs">{l.em || '—'}</td>
                    <td className="font-mono text-xs muted">{l.rb || '—'}</td>
                    <td className="text-right">{fmt(l.comp)}/{fmt(l.aptos)}</td>
                    <td className="text-right">{fmt(l.lula)} × {fmt(l.flavio)}</td>
                    <td>
                      {l.minApos17 >= 1 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(220,38,38,.12)', color: '#dc2626' }}>
                          <Clock className="w-3 h-3" /> {fmtAtraso(l.minApos17)} após 17h
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--ok)' }}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> No horário
                        </span>
                      )}
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

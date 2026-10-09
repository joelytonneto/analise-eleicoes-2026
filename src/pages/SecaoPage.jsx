import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Download, RefreshCw, MapPin, ChevronLeft, ChevronRight, ShieldCheck, ShieldAlert, Loader2, Info } from 'lucide-react';
import { useAsync, Card, Loading, ErrorBox, StatusIcon } from '../components/ui';
import Trilha from '../components/Trilha';
import { CandidateBars } from '../components/charts';
import { BotaoComparar } from '../components/Comparacao';
import { loadBrasil, loadUf, loadMun, loadDep, loadPartidos, UF_NOMES, S, cargoNome, cargosDaUf } from '../lib/data';
import { itensDeVetor, metricas } from '../lib/resultados';
import { mapaCores } from '../lib/colors';
import { fmt, fmtPct, pct, titulo, pad } from '../lib/format';
import { rotas } from '../lib/router';
import { baixarBoletim, compararComBU, urlPortalSecao } from '../lib/tse';
import { idSecao, idLocal } from '../lib/unidades';

function Campo({ label, children, mono }) {
  return (
    <div className="min-w-0">
      <div className="text-xs muted">{label}</div>
      <div className={`text-sm font-medium break-words ${mono ? 'font-mono text-xs' : ''}`}>{children ?? '—'}</div>
    </div>
  );
}

export default function SecaoPage({ uf, cd, z, s, query }) {
  const { data, loading, error } = useAsync(() => Promise.all([loadBrasil(), loadUf(uf), loadMun(uf, cd)]), [uf, cd]);
  const [brasil, ud, mf] = data || [];
  const [bu, setBu] = useState({ estado: 'idle' });
  const [tentativa, setTentativa] = useState(0);

  const ctx = useMemo(() => {
    if (!mf) return null;
    const idx = mf.secoes.findIndex(x => x.z === z && x.s === s);
    const sec = mf.secoes[idx];
    if (!sec) return { naoExiste: true };
    const local = mf.locais[sec.l];
    const prev = [...mf.secoes.slice(0, idx)].reverse().find(x => x.st);
    const next = mf.secoes.slice(idx + 1).find(x => x.st);
    const vizinhasLocal = mf.secoes.filter(x => x.l === sec.l && x !== sec);
    const candRef = { 1: brasil.cand[1], 3: ud.cand[3], 5: ud.cand[5] };
    const ordens = { 1: mf.cand[1], 3: mf.cand[3], 5: mf.cand[5] };
    return { sec, local, prev, next, vizinhasLocal, candRef, ordens, munNome: titulo(mf.nome) };
  }, [mf, brasil, ud, z, s]);

  const principal = ctx?.sec?.ag ? ctx.sec.p : null;

  useEffect(() => {
    if (!ctx?.sec || ctx.sec.ag || !ctx.sec.st) return;
    const ac = new AbortController();
    setBu({ estado: 'carregando' });
    Promise.all([baixarBoletim(uf, cd, z, s, { signal: ac.signal }), loadDep(uf).catch(() => null), loadPartidos().catch(() => null)])
      .then(([r, dep, partidos]) => setBu({ estado: 'ok', ...r, dep, partidos, comparacao: compararComBU(ctx.sec, ctx.ordens, r.resumo) }))
      .catch(e => { if (!ac.signal.aborted) setBu({ estado: 'erro', erro: e.message }); });
    return () => ac.abort();
  }, [ctx, uf, cd, z, s, tentativa]);

  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (ctx.naoExiste) {
    return (
      <div className="space-y-4">
        <Trilha itens={[{ label: 'Brasil', href: rotas.brasil() }, { label: UF_NOMES[uf], href: rotas.uf(uf) }, { label: titulo(mf.nome), href: rotas.mun(uf, cd) }, { label: `Seção ${pad(s)}` }]} />
        <ErrorBox>A seção {pad(s)} da zona {pad(z)} não consta no cadastro oficial do TSE para {titulo(mf.nome)} – {uf}. <a className="link" href={rotas.mun(uf, cd, { tab: 'secoes', zona: z })}>Ver as seções existentes na zona {pad(z)}</a>.</ErrorBox>
      </div>
    );
  }

  const { sec, local, candRef, munNome } = ctx;
  const cargos = cargosDaUf(uf).filter(c => sec.st?.[c.id]);
  const st1 = sec.st?.[1];
  const mapsUrl = local?.lat != null ? `https://www.openstreetmap.org/?mlat=${local.lat}&mlon=${local.lng}#map=18/${local.lat}/${local.lng}` : null;
  const titulo2 = `Seção ${pad(s)} · Zona ${pad(z)}`;

  return (
    <div className="space-y-4">
      <Trilha itens={[{ label: 'Brasil', href: rotas.brasil() }, { label: UF_NOMES[uf], href: rotas.uf(uf) }, { label: munNome, href: rotas.mun(uf, cd) }, { label: `Zona ${pad(z)}`, href: rotas.mun(uf, cd, { tab: 'secoes', zona: z }) }, { label: `Seção ${pad(s)}` }]} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{titulo2}</h1>
          <p className="text-sm ink-2">{munNome} – {uf} · {titulo(local?.nome || '')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ctx.prev && <a className="btn" href={rotas.secao(uf, cd, ctx.prev.z, ctx.prev.s)} title="Seção anterior"><ChevronLeft className="w-4 h-4" /> {pad(ctx.prev.s)}</a>}
          {ctx.next && <a className="btn" href={rotas.secao(uf, cd, ctx.next.z, ctx.next.s)} title="Próxima seção">{pad(ctx.next.s)} <ChevronRight className="w-4 h-4" /></a>}
          {!sec.ag && <BotaoComparar id={idSecao(uf, cd, z, s)} rotulo={`Seção ${pad(s)} Z${pad(z)} · ${munNome}`} />}
          <a className="btn btn-primary" href={urlPortalSecao(uf, cd, z, principal || s)} target="_blank" rel="noreferrer">Ver no portal do TSE <ExternalLink className="w-3.5 h-3.5" /></a>
        </div>
      </div>

      {sec.ag && (
        <div className="card p-4 text-sm flex gap-3"><Info className="w-5 h-5 shrink-0" style={{ color: 'var(--accent)' }} />
          <div>Esta é uma <b>seção agregada</b>: seus eleitores votaram na mesma urna da <a className="link font-medium" href={rotas.secao(uf, cd, z, principal)}>seção principal {pad(principal)}</a>. Por isso ela não tem boletim de urna próprio; os votos estão no BU da seção principal.</div>
        </div>
      )}
      {sec.anulada === 1 && <ErrorBox>Seção marcada como <b>anulada</b> nos dados abertos do TSE.</ErrorBox>}

      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Local de votação" className="lg:col-span-1">
          <div className="space-y-3">
            <div>
              <div className="font-semibold">{titulo(local?.nome || '—')}</div>
              <div className="text-sm ink-2">{titulo(local?.end || '')}{local?.bairro ? ` · ${titulo(local.bairro)}` : ''}</div>
              {local?.cep && <div className="text-xs muted">CEP {local.cep.replace(/(\d{5})(\d{3})/, '$1-$2')}</div>}
              {local?.original && <div className="text-xs mt-1" style={{ color: 'var(--warn)' }}>Local alterado. Original: {titulo(local.original.nome)} ({titulo(local.original.end || '')})</div>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Nº do local">{local?.n}</Campo>
              <Campo label="Tipo">{local?.tipo}</Campo>
              <Campo label="Eleitores na seção (cadastro)">{fmt(sec.el)}</Campo>
              <Campo label="Acessibilidade">{sec.acess ? 'Sim' : 'Não informada'}</Campo>
              {sec.agr && <Campo label="Seções agregadas">{sec.agr.map(x => pad(x)).join(', ')}</Campo>}
              <Campo label="Modelo da urna">{sec.m}</Campo>
              <Campo label="Origem dos votos">{sec.o}</Campo>
              <Campo label="BU recebido pelo TSE">{sec.rb}</Campo>
            </div>
            <div className="flex flex-wrap gap-2">
              {mapsUrl && <a className="btn !py-1 text-xs" href={mapsUrl} target="_blank" rel="noreferrer"><MapPin className="w-3.5 h-3.5" /> Ver no mapa</a>}
              <a className="btn !py-1 text-xs" href={rotas.mun(uf, cd, { tab: 'secoes', zona: z, local: `${z}-${local?.n}` })}>Todas as seções deste local</a>
              {local && <BotaoComparar id={idLocal(uf, cd, z, local.n)} rotulo={`${titulo(local.nome)} (Z${pad(z)})`} />}
            </div>
            {ctx.vizinhasLocal.length > 0 && (
              <div>
                <div className="text-xs muted mb-1">Outras seções neste local</div>
                <div className="flex flex-wrap gap-1">
                  {ctx.vizinhasLocal.map(v => <a key={`${v.z}-${v.s}`} className="chip hover:underline num" href={rotas.secao(uf, cd, v.z, v.s)}>{pad(v.s)}{v.ag ? '*' : ''}</a>)}
                </div>
              </div>
            )}
          </div>
        </Card>

        <div className="lg:col-span-2">
          {!sec.ag && sec.st && <PainelConferencia bu={bu} onRetry={() => setTentativa(t => t + 1)} uf={uf} cd={cd} z={z} s={s} />}
        </div>
      </div>

      {st1 && <ResumoComparecimento st={st1} bu={bu} />}

      {!sec.ag && sec.st && (
        <div className="grid lg:grid-cols-2 gap-4">
          {cargos.map(c => (
            <CargoSecao key={c.id} cargo={c.id} sec={sec} candRef={candRef[c.id]} bu={bu} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResumoComparecimento({ st, bu }) {
  const m = metricas(st, 1);
  const b = bu.estado === 'ok' ? bu.bu : null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <div className="card px-4 py-3"><div className="text-xs muted">Eleitores aptos</div><div className="text-2xl font-semibold">{fmt(m.aptos)}</div></div>
      <div className="card px-4 py-3"><div className="text-xs muted">Comparecimento</div><div className="text-2xl font-semibold">{fmt(m.comparecimento)}</div><div className="text-xs ink-2">{fmtPct(m.pComparecimento)}</div></div>
      <div className="card px-4 py-3"><div className="text-xs muted">Abstenção</div><div className="text-2xl font-semibold">{fmt(m.abstencoes)}</div><div className="text-xs ink-2">{fmtPct(m.pAbstencao)}</div></div>
      <div className="card px-4 py-3"><div className="text-xs muted">Biometria (BU)</div><div className="text-2xl font-semibold">{b?.detalhamentoComparecimento ? fmt(b.detalhamentoComparecimento.habilitadosPorBiometria) : '—'}</div><div className="text-xs ink-2">{b?.detalhamentoComparecimento ? `${fmt(b.detalhamentoComparecimento.habilitadosPorBiografia)} por documento · ${fmt(b.detalhamentoComparecimento.semBiometria)} sem biometria` : 'aguardando BU'}</div></div>
      <div className="card px-4 py-3"><div className="text-xs muted">Funcionamento (BU)</div><div className="text-base font-semibold">{b?.dadosSecao?.dataHoraAbertura?.slice(11) || '—'} → {b?.dadosSecao?.dataHoraEncerramento?.slice(11) || '—'}</div><div className="text-xs ink-2">abertura → encerramento</div></div>
    </div>
  );
}

function PainelConferencia({ bu, onRetry, uf, cd, z, s }) {
  if (bu.estado === 'carregando' || bu.estado === 'idle') {
    return (
      <Card title="Conferência com o boletim de urna oficial">
        <div className="flex items-center gap-2 text-sm ink-2"><Loader2 className="w-4 h-4 animate-spin" /> Baixando o BU original desta seção direto de resultados.tse.jus.br…</div>
      </Card>
    );
  }
  if (bu.estado === 'erro') {
    return (
      <Card title="Conferência com o boletim de urna oficial">
        <div className="text-sm space-y-3">
          <div className="flex gap-2" style={{ color: 'var(--bad)' }}><ShieldAlert className="w-5 h-5 shrink-0" /> Não foi possível baixar o BU agora: {bu.erro}</div>
          <p className="ink-2">Os números exibidos vêm dos dados abertos oficiais do TSE. Você pode conferir manualmente pelo portal.</p>
          <div className="flex gap-2"><button className="btn" onClick={onRetry}><RefreshCw className="w-4 h-4" /> Tentar de novo</button><a className="btn" href={urlPortalSecao(uf, cd, z, s)} target="_blank" rel="noreferrer">Portal do TSE <ExternalLink className="w-3.5 h-3.5" /></a></div>
        </div>
      </Card>
    );
  }
  const total = bu.comparacao.length;
  const iguais = bu.comparacao.filter(c => c.ok).length;
  const ok = iguais === total;
  const b = bu.bu;
  return (
    <Card title="Conferência com o boletim de urna oficial" subtitle="O navegador baixou o arquivo original assinado pela urna e o decodificou agora mesmo">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
          {ok ? <ShieldCheck className="w-6 h-6 shrink-0" style={{ color: 'var(--ok)' }} /> : <ShieldAlert className="w-6 h-6 shrink-0" style={{ color: 'var(--bad)' }} />}
          <div>
            <div className="font-semibold">{ok ? `Todos os ${fmt(total)} números conferem com o BU do TSE` : `${fmt(total - iguais)} de ${fmt(total)} números divergem do BU`}</div>
            <div className="text-xs ink-2">Situação no TSE: {bu.situacao} · BU emitido em {b.dataHoraEmissao} · recebido {bu.hash.dr} {bu.hash.hr}</div>
          </div>
        </div>
        {!ok && (
          <div className="text-sm space-y-1">
            {bu.comparacao.filter(c => !c.ok).map((c, i) => (
              <div key={i} className="flex gap-2 items-center"><StatusIcon ok={false} /> {cargoNome(c.cargo)} · {c.campo}: base {fmt(c.base)} × BU {fmt(c.bu)}</div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Campo label="Nº interno da urna">{b.urna.numeroInternoUrna}</Campo>
          <Campo label="Tipo de urna">{b.urna.tipoUrna}</Campo>
          <Campo label="Tipo de arquivo">{b.urna.tipoArquivo}</Campo>
          <Campo label="Software de votação">{b.urna.versaoVotacao}</Campo>
          <Campo label="Código de carga" mono>{b.urna.codigoCarga}</Campo>
          <Campo label="Data/hora da carga">{b.urna.dataHoraCarga}</Campo>
          <Campo label="Nº série flash de carga" mono>{b.urna.numeroSerieFC}</Campo>
          <Campo label="Nº série flash de votação" mono>{b.urna.numeroSerieFV}</Campo>
          <Campo label="Local (nº no BU)">{b.identificacao.local}</Campo>
        </div>
        <div className="text-xs space-y-1">
          <div className="muted">SHA-256 do arquivo baixado ({fmt(bu.bytes)} bytes):</div>
          <div className="font-mono break-all">{bu.sha256 || 'indisponível neste navegador'}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="btn !py-1 text-xs" href={bu.urlBU} target="_blank" rel="noreferrer"><Download className="w-3.5 h-3.5" /> Arquivo BU original (.dat)</a>
          {bu.arquivos.filter(a => a.tp !== 'bu').map(a => (
            <a key={a.nm} className="btn !py-1 text-xs" href={a.url} target="_blank" rel="noreferrer"><Download className="w-3.5 h-3.5" /> {a.tp === 'rdv' ? 'RDV' : a.tp === 'log' ? 'Log da urna' : a.tp === 'vota' ? 'Assinatura' : a.tp}</a>
          ))}
          <a className="btn !py-1 text-xs" href={bu.urlAux} target="_blank" rel="noreferrer">Índice de arquivos (JSON)</a>
          <button className="btn !py-1 text-xs" onClick={onRetry}><RefreshCw className="w-3.5 h-3.5" /> Conferir de novo</button>
        </div>
      </div>
    </Card>
  );
}

function CargoSecao({ cargo, sec, candRef, bu }) {
  const st = sec.st[cargo];
  const m = metricas(st, cargo);
  const resumoBU = bu.estado === 'ok' ? bu.resumo[cargo] : null;
  const linhasBU = bu.estado === 'ok' ? bu.comparacao.filter(c => c.cargo === cargo) : [];
  const okCargo = linhasBU.length > 0 && linhasBU.every(c => c.ok);

  let itens = [];
  let fonte = 'base';
  if (sec.v?.[cargo]) {
    itens = itensDeVetor(sec.v[cargo], candRef);
  } else if (resumoBU) {
    // Deputados: nomes a partir do cadastro de candidatos; votos diretamente do BU oficial.
    fonte = 'bu';
    const ref = bu.dep?.cand?.[cargo] || [];
    const cores = mapaCores(ref);
    const porNum = new Map(ref.map(c => [+c.n, c]));
    itens = Object.entries(resumoBU.votos).map(([n, q]) => {
      const c = porNum.get(+n);
      return { n: +n, nome: c?.nome || `Nº ${n}`, partido: c?.partido, resultado: c?.resultado, votos: q, cor: cores.get(+n) || '#898781', votoValido: c ? c.votoValido : 'Nulo técnico: número não reconhecido na totalização do TSE' };
    }).sort((a, b) => b.votos - a.votos);
  }
  const legenda = resumoBU && Object.keys(resumoBU.votosLegenda).length
    ? Object.entries(resumoBU.votosLegenda).map(([n, q]) => ({ n: `leg${n}`, nome: `Legenda ${bu.partidos?.[n] || n}`, votos: q, cor: '#6da7ec', votoValido: bu.dep?.legenda?.[cargo]?.[n]?.votoValido })).sort((a, b) => b.votos - a.votos)
    : [];

  return (
    <Card
      title={cargoNome(cargo)}
      subtitle={fonte === 'bu' ? 'Votos por candidato lidos do BU oficial (decodificado agora)' : 'Votos por candidato'}
      actions={linhasBU.length > 0 && (
        <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: okCargo ? 'var(--ok)' : 'var(--bad)' }}>
          <StatusIcon ok={okCargo} /> {okCargo ? 'Confere com o BU' : 'Diverge do BU'}
        </span>
      )}
    >
      <div className="space-y-3">
        {itens.length ? <CandidateBars itens={[...itens.filter(c => !c.votoValido), ...legenda.filter(c => !c.votoValido)]} total={m.validos} max={fonte === 'bu' ? 40 : 15} compacto /> : (
          <p className="text-sm muted">{bu.estado === 'carregando' ? 'Carregando votos por candidato do BU…' : 'Votos por candidato indisponíveis.'}</p>
        )}
        {[...itens, ...legenda].filter(c => c.votoValido && c.votos).map(c => (
          <div key={c.n} className="text-xs rounded-md px-2 py-1.5" style={{ background: 'var(--surface-2)' }}>
            <b>{c.nome}{typeof c.n === 'number' ? ` (${c.n})` : ''}</b>: {fmt(c.votos)} voto(s) — {c.votoValido}. Registrados normalmente na urna; na totalização oficial não entram nos válidos.
          </div>
        ))}
        <table className="w-full text-sm num">
          <tbody>
            {[
              ['Comparecimento', st[S.comp], resumoBU?.comparecimento],
              ['Nominais', st[S.nom], resumoBU?.nominais],
              ...(+cargo >= 6 ? [['Legenda', st[S.leg], resumoBU?.legenda]] : []),
              ['Brancos', st[S.br], resumoBU?.brancos],
              ['Nulos', st[S.nu], resumoBU?.nulos],
              [+cargo === 5 ? 'Total de votos (2 por eleitor)' : 'Total de votos', st[S.nom] + st[S.leg] + st[S.br] + st[S.nu], resumoBU ? resumoBU.nominais + resumoBU.legenda + resumoBU.brancos + resumoBU.nulos : null]
            ].map(([k, v, vb]) => (
              <tr key={k} style={{ borderTop: '1px solid var(--grid)' }}>
                <td className="py-1 ink-2">{k}</td>
                <td className="py-1 text-right font-medium">{fmt(v)}</td>
                <td className="py-1 text-right muted text-xs w-28">{k.startsWith('Total') ? fmtPct(pct(v, m.votosTotais)) : ''}</td>
                <td className="py-1 w-6 text-right">{vb != null && <StatusIcon ok={vb === v} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

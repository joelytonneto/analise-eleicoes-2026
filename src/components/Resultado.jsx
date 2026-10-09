import React from 'react';
import { Seg, Stat } from './ui';
import { CandidateBars, StackBar } from './charts';
import { cargosDaUf, CARGOS } from '../lib/data';
import { metricas } from '../lib/resultados';
import { fmt, fmtPct } from '../lib/format';
import { setQuery } from '../lib/router';

export function useCargo(query, uf) {
  const disp = uf ? cargosDaUf(uf) : CARGOS.filter(c => c.id === 1);
  let c = +(query?.c || 1);
  if (!disp.some(x => x.id === c)) {
    // estadual/distrital se equivalem ao trocar de UF
    if (c === 7 && disp.some(x => x.id === 8)) c = 8;
    else if (c === 8 && disp.some(x => x.id === 7)) c = 7;
    else c = 1;
  }
  return [c, disp];
}

export function CargoPicker({ cargo, disponiveis }) {
  if (disponiveis.length <= 1) return null;
  return <Seg value={cargo} onChange={v => setQuery({ c: v })} options={disponiveis.map(c => ({ value: c.id, label: c.curto }))} />;
}

/** Quadro de indicadores de comparecimento para um vetor st */
export function Indicadores({ st, cargo, extra = [] }) {
  const m = metricas(st, cargo);
  if (!m) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Stat label="Eleitores aptos" value={fmt(m.aptos)} sub={extra[0]} />
      <Stat label="Comparecimento" value={fmtPct(m.pComparecimento)} sub={`${fmt(m.comparecimento)} eleitores`} />
      <Stat label="Abstenção" value={fmtPct(m.pAbstencao)} sub={`${fmt(m.abstencoes)} eleitores`} />
      <Stat label={+cargo === 5 ? 'Votos válidos (2 votos/eleitor)' : 'Votos válidos'} value={fmt(m.validos)} sub={`Brancos ${fmtPct(m.pBrancos)} · Nulos ${fmtPct(m.pNulos)}`} />
    </div>
  );
}

export function ComposicaoVotos({ st, cargo }) {
  const m = metricas(st, cargo);
  if (!m) return null;
  return (
    <StackBar partes={[
      { label: 'Nominais válidos', valor: m.validos - m.legenda, cor: 'var(--accent)' },
      ...(m.legenda ? [{ label: 'Legenda', valor: m.legenda, cor: '#6da7ec' }] : []),
      { label: 'Brancos', valor: m.brancos, cor: '#c3c2b7' },
      { label: m.nulosTecnicos ? 'Nulos (incl. técnicos)' : 'Nulos', valor: m.nulos, cor: '#898781' },
      ...(m.anuladosSubJudice + m.anulados ? [{ label: 'Anulados / sub judice', valor: m.anuladosSubJudice + m.anulados, cor: '#52514e' }] : [])
    ]} />
  );
}

export function ResultadoCandidatos({ itens, st, cargo, max = 12 }) {
  const m = metricas(st, cargo);
  if (!itens?.length) return <div className="text-sm muted">Sem votos nominais registrados.</div>;
  const validos = itens.filter(c => !c.votoValido);
  const invalidos = itens.filter(c => c.votoValido && c.votos > 0);
  return (
    <div className="space-y-4">
      <CandidateBars itens={validos} total={m?.validos} max={max} />
      {invalidos.length > 0 && (
        <div className="text-xs rounded-lg p-2.5" style={{ background: 'var(--surface-2)' }}>
          <div className="font-medium mb-1">Votos não computados como válidos pelo TSE</div>
          {invalidos.map(c => (
            <div key={c.n} className="flex justify-between gap-2 ink-2">
              <span>{c.nome} ({c.n}) — {c.votoValido}</span><span className="num">{fmt(c.votos)}</span>
            </div>
          ))}
          <div className="muted mt-1">A urna registra esses votos como nominais; na totalização oficial eles não entram nos válidos.</div>
        </div>
      )}
      <p className="text-xs muted">Percentuais sobre os votos válidos{+cargo >= 6 ? ' (nominais + legenda)' : ''}{+cargo === 5 ? '; em 2026 cada eleitor votou em 2 senadores' : ''}.</p>
    </div>
  );
}

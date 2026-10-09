import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { fmt, fmtPct } from '../lib/format';

export function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(600);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, Math.floor(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function Tip({ tip }) {
  if (!tip) return null;
  return (
    <div
      className="pointer-events-none absolute z-20 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap"
      style={{ left: tip.x, top: tip.y, transform: 'translate(-50%, calc(-100% - 10px))', background: 'var(--surface)', boxShadow: '0 0 0 1px var(--ring), 0 6px 16px rgba(0,0,0,.18)' }}
    >
      {tip.content}
    </div>
  );
}

/**
 * Barras horizontais de resultado por candidato.
 * itens: [{ n, nome, partido, votos, cor, resultado }], total = base do percentual (válidos)
 */
export function CandidateBars({ itens, total, max = 12, compacto = false, mostrarNumero = true }) {
  const lista = itens.slice(0, max);
  const resto = itens.slice(max);
  const outros = resto.reduce((a, c) => a + (c.votos || 0), 0);
  const top = Math.max(1, ...lista.map(c => c.votos || 0), outros);
  const linhas = resto.length ? [...lista, { n: 'outros', nome: `Outros (${resto.length})`, votos: outros, cor: '#898781' }] : lista;
  return (
    <div className={compacto ? 'space-y-1.5' : 'space-y-2.5'}>
      {linhas.map(c => {
        const p = total ? (c.votos / total) * 100 : null;
        return (
          <div key={c.n} title={`${c.nome}${c.partido ? ` (${c.partido})` : ''}: ${fmt(c.votos)} votos · ${fmtPct(p)} dos válidos`}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <div className="min-w-0 truncate">
                <span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5 align-middle" style={{ background: c.cor }} />
                <span className="font-medium">{c.nome}</span>
                {c.partido && <span className="muted text-xs ml-1">{c.partido}{mostrarNumero && typeof c.n === 'number' ? ` · ${c.n}` : ''}</span>}
                {c.resultado && /eleito|2º turno/i.test(c.resultado) && !/não eleito/i.test(c.resultado) && (
                  <span className="chip ml-1.5" style={{ fontSize: 10 }}>{c.resultado}</span>
                )}
              </div>
              <div className="shrink-0 num text-right">
                <span className="font-semibold">{fmtPct(p)}</span>
                <span className="muted text-xs ml-1.5">{fmt(c.votos)}</span>
              </div>
            </div>
            <div className="h-1.5 mt-1 rounded-full" style={{ background: 'var(--surface-2)' }}>
              <div className="h-1.5 rounded-full" style={{ width: `${(c.votos / top) * 100}%`, background: c.cor, minWidth: c.votos ? 2 : 0 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Ranking simples: itens [{ key, label, sub, value, cor, onClick }] */
export function RankBars({ itens, format = fmt, max = 15 }) {
  const lista = itens.slice(0, max);
  const top = Math.max(1e-9, ...lista.map(i => Math.abs(i.value || 0)));
  return (
    <div className="space-y-1.5">
      {lista.map((it, k) => (
        <button key={it.key ?? k} onClick={it.onClick} disabled={!it.onClick} className="block w-full text-left group" title={`${it.label}: ${format(it.value)}`}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate min-w-0"><span className="muted num mr-1.5 text-xs">{k + 1}.</span><span className={it.onClick ? 'group-hover:underline' : ''}>{it.label}</span>{it.sub && <span className="muted text-xs ml-1.5">{it.sub}</span>}</span>
            <span className="num font-medium shrink-0">{format(it.value)}</span>
          </div>
          <div className="h-1.5 mt-0.5 rounded-full" style={{ background: 'var(--surface-2)' }}>
            <div className="h-1.5 rounded-full" style={{ width: `${(Math.abs(it.value || 0) / top) * 100}%`, background: it.cor || 'var(--accent)' }} />
          </div>
        </button>
      ))}
    </div>
  );
}

function niceTicks(min, max, n = 5) {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const step0 = span / n;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= step0) || step0;
  const t = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) t.push(+v.toFixed(10));
  return t;
}

/** Histograma de uma métrica numérica. */
export function Histogram({ values, bins = 24, format = v => v.toFixed(1), xLabel, cor = 'var(--accent)', height = 200 }) {
  const [ref, w] = useWidth();
  const [tip, setTip] = useState(null);
  const data = useMemo(() => {
    const vs = values.filter(v => Number.isFinite(v));
    if (!vs.length) return null;
    let min = Math.min(...vs), max = Math.max(...vs);
    if (min === max) { min -= 0.5; max += 0.5; }
    const step = (max - min) / bins;
    const counts = new Array(bins).fill(0);
    for (const v of vs) counts[Math.min(bins - 1, Math.floor((v - min) / step))]++;
    return { min, max, step, counts, n: vs.length, mediana: [...vs].sort((a, b) => a - b)[Math.floor(vs.length / 2)] };
  }, [values, bins]);
  if (!data) return <div className="text-sm muted py-6 text-center">Sem dados para o histograma.</div>;
  const M = { l: 40, r: 10, t: 20, b: 34 };
  const iw = w - M.l - M.r, ih = height - M.t - M.b;
  const cmax = Math.max(...data.counts);
  const x = v => M.l + ((v - data.min) / (data.max - data.min)) * iw;
  const y = c => M.t + ih - (c / cmax) * ih;
  const bw = iw / bins;
  return (
    <div ref={ref} className="relative">
      <svg width={w} height={height} role="img" aria-label={`Histograma de ${xLabel || 'valores'}`}>
        {niceTicks(0, cmax, 4).map(t => (
          <g key={t}>
            <line x1={M.l} x2={w - M.r} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
            <text x={M.l - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize="10" fill="var(--muted)" className="num">{fmt(t)}</text>
          </g>
        ))}
        {data.counts.map((c, i) => (
          <rect
            key={i}
            x={M.l + i * bw + 1}
            y={y(c)}
            width={Math.max(1, bw - 2)}
            height={Math.max(0, M.t + ih - y(c))}
            rx={Math.min(3, bw / 4)}
            fill={cor}
            onMouseMove={e => {
              const r = ref.current.getBoundingClientRect();
              setTip({ x: e.clientX - r.left, y: e.clientY - r.top, content: <><b>{fmt(c)}</b> unidades entre {format(data.min + i * data.step)} e {format(data.min + (i + 1) * data.step)}</> });
            }}
            onMouseLeave={() => setTip(null)}
          />
        ))}
        <line x1={M.l} x2={w - M.r} y1={M.t + ih} y2={M.t + ih} stroke="var(--axis)" />
        {niceTicks(data.min, data.max, Math.max(3, Math.floor(iw / 80))).filter(t => t >= data.min && t <= data.max).map(t => (
          <text key={t} x={x(t)} y={M.t + ih + 14} textAnchor="middle" fontSize="10" fill="var(--muted)" className="num">{format(t)}</text>
        ))}
        <line x1={x(data.mediana)} x2={x(data.mediana)} y1={M.t} y2={M.t + ih} stroke="var(--ink-2)" strokeWidth="1.5" />
        <text x={x(data.mediana)} y={M.t - 6} textAnchor={x(data.mediana) > w - 90 ? 'end' : x(data.mediana) < M.l + 60 ? 'start' : 'middle'} fontSize="10" fill="var(--ink-2)">mediana {format(data.mediana)}</text>
        {xLabel && <text x={M.l + iw / 2} y={height - 4} textAnchor="middle" fontSize="11" fill="var(--ink-2)">{xLabel} · {fmt(data.n)} unidades</text>}
      </svg>
      <Tip tip={tip} />
    </div>
  );
}

/** Dispersão: pontos [{ x, y, r?, label, cor?, onClick? }] */
export function Scatter({ points, xLabel, yLabel, fx = v => v.toFixed(1), fy = v => v.toFixed(1), height = 300 }) {
  const [ref, w] = useWidth();
  const [hover, setHover] = useState(null);
  const pts = points.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (!pts.length) return <div className="text-sm muted py-6 text-center">Sem dados para a dispersão.</div>;
  const M = { l: 46, r: 12, t: 10, b: 36 };
  const iw = w - M.l - M.r, ih = height - M.t - M.b;
  let x0 = Math.min(...pts.map(p => p.x)), x1 = Math.max(...pts.map(p => p.x));
  let y0 = Math.min(...pts.map(p => p.y)), y1 = Math.max(...pts.map(p => p.y));
  if (x0 === x1) { x0 -= 1; x1 += 1; }
  if (y0 === y1) { y0 -= 1; y1 += 1; }
  const px = v => M.l + ((v - x0) / (x1 - x0)) * iw;
  const py = v => M.t + ih - ((v - y0) / (y1 - y0)) * ih;
  const onMove = e => {
    const r = ref.current.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    let best = null, bd = 900;
    for (const p of pts) {
      const d = (px(p.x) - mx) ** 2 + (py(p.y) - my) ** 2;
      if (d < bd) { bd = d; best = p; }
    }
    setHover(best);
  };
  return (
    <div ref={ref} className="relative">
      <svg width={w} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)} onClick={() => hover?.onClick?.()} style={{ cursor: hover?.onClick ? 'pointer' : 'default' }} role="img" aria-label={`Dispersão ${yLabel} × ${xLabel}`}>
        {niceTicks(y0, y1, 5).filter(t => t >= y0 && t <= y1).map(t => (
          <g key={`y${t}`}>
            <line x1={M.l} x2={w - M.r} y1={py(t)} y2={py(t)} stroke="var(--grid)" />
            <text x={M.l - 6} y={py(t)} dy="0.32em" textAnchor="end" fontSize="10" fill="var(--muted)" className="num">{fy(t)}</text>
          </g>
        ))}
        {niceTicks(x0, x1, Math.max(3, Math.floor(iw / 90))).filter(t => t >= x0 && t <= x1).map(t => (
          <text key={`x${t}`} x={px(t)} y={M.t + ih + 14} textAnchor="middle" fontSize="10" fill="var(--muted)" className="num">{fx(t)}</text>
        ))}
        <line x1={M.l} x2={w - M.r} y1={M.t + ih} y2={M.t + ih} stroke="var(--axis)" />
        {pts.map((p, i) => (
          <circle key={i} cx={px(p.x)} cy={py(p.y)} r={p.r || 4} fill={p.cor || 'var(--accent)'} fillOpacity={pts.length > 800 ? 0.45 : 0.75} stroke="var(--surface)" strokeWidth={pts.length > 800 ? 0 : 1} />
        ))}
        {hover && <circle cx={px(hover.x)} cy={py(hover.y)} r={(hover.r || 4) + 3} fill="none" stroke="var(--ink)" strokeWidth="2" />}
        <text x={M.l + iw / 2} y={height - 4} textAnchor="middle" fontSize="11" fill="var(--ink-2)">{xLabel}</text>
        <text transform={`translate(12 ${M.t + ih / 2}) rotate(-90)`} textAnchor="middle" fontSize="11" fill="var(--ink-2)">{yLabel}</text>
      </svg>
      {hover && (
        <Tip tip={{ x: px(hover.x), y: py(hover.y), content: <><b>{hover.label}</b><br />{xLabel}: {fx(hover.x)} · {yLabel}: {fy(hover.y)}</> }} />
      )}
    </div>
  );
}

/** Barra empilhada 100% (comparecimento/abstenção, válidos/brancos/nulos) */
export function StackBar({ partes }) {
  const total = partes.reduce((a, p) => a + (p.valor || 0), 0) || 1;
  return (
    <div>
      <div className="flex h-2.5 rounded-full overflow-hidden gap-[2px]" style={{ background: 'var(--surface)' }}>
        {partes.map(p => (p.valor ? <div key={p.label} style={{ width: `${(p.valor / total) * 100}%`, background: p.cor }} title={`${p.label}: ${fmt(p.valor)} (${fmtPct((p.valor / total) * 100)})`} /> : null))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
        {partes.map(p => (
          <span key={p.label} className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.cor }} />
            <span className="ink-2">{p.label}</span>
            <span className="num font-medium">{fmt(p.valor)}</span>
            <span className="muted num">({fmtPct((p.valor / total) * 100)})</span>
          </span>
        ))}
      </div>
    </div>
  );
}

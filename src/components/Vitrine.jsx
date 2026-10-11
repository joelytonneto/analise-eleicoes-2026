// Peças visuais das telas "Placar" e "Destaques": foto oficial do candidato, número animado e cartões.
import React, { useEffect, useRef, useState } from 'react';
import { urlFoto } from '../lib/tse';
import { fmt, fmtPct } from '../lib/format';

const iniciais = nome => (nome || '?').split(/\s+/).filter(w => w.length > 2 || /^[A-Z]{1,2}$/.test(w)).slice(0, 2).map(w => w[0]).join('') || (nome || '?')[0];

/** Foto oficial publicada pelo TSE; sem foto (ou se falhar), mostra as iniciais. */
export function FotoCandidato({ cargo, uf, sq, nome, cor = 'var(--accent)', size = 64, className = '' }) {
  const [erro, setErro] = useState(false);
  const url = urlFoto(cargo, uf, sq);
  useEffect(() => setErro(false), [url]);
  const estilo = { width: size, height: size, boxShadow: `0 0 0 3px var(--surface), 0 0 0 ${size >= 64 ? 5 : 4}px ${cor}` };
  if (!url || erro) {
    return (
      <span className={`rounded-full grid place-items-center font-semibold text-white shrink-0 select-none ${className}`} style={{ ...estilo, background: cor, fontSize: size * 0.36 }} aria-hidden="true">
        {iniciais(nome)}
      </span>
    );
  }
  return (
    <img
      src={url} alt={`Foto de ${nome}`} loading="lazy" decoding="async" referrerPolicy="no-referrer"
      onError={() => setErro(true)}
      className={`rounded-full object-cover object-top shrink-0 ${className}`}
      style={{ ...estilo, background: 'var(--surface-2)' }}
      width={size} height={size}
    />
  );
}

const semMovimento = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Número que "conta" até o valor quando aparece (respeita a preferência por menos movimento). */
export function Contador({ valor, formato = fmt, duracao = 900 }) {
  const [v, setV] = useState(() => (semMovimento() ? valor : 0));
  const de = useRef(0);
  useEffect(() => {
    if (semMovimento() || !Number.isFinite(valor)) { setV(valor); return undefined; }
    const ini = de.current, t0 = performance.now();
    let raf;
    const passo = t => {
      const k = Math.min(1, (t - t0) / duracao);
      const e = 1 - (1 - k) ** 3;
      setV(ini + (valor - ini) * e);
      if (k < 1) raf = requestAnimationFrame(passo);
      else de.current = valor;
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [valor, duracao]);
  return <span className="num">{formato(Number.isInteger(valor) ? Math.round(v) : v)}</span>;
}

/** Barra de progresso grossa e arredondada. */
export function BarraGrossa({ pct, cor, altura = 10 }) {
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height: altura, background: 'var(--surface-2)' }}>
      <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${Math.max(0, Math.min(100, pct || 0))}%`, background: cor }} />
    </div>
  );
}

/** Cartão de indicador com ícone e número em destaque. */
export function CartaoNumero({ icon: I, rotulo, valor, formato, sub, cor = 'var(--accent)' }) {
  return (
    <div className="card p-3 sm:p-4 flex items-start gap-3 min-w-0">
      {I && <span className="w-10 h-10 rounded-xl hidden sm:grid place-items-center shrink-0" style={{ background: `color-mix(in srgb, ${cor} 14%, transparent)`, color: cor }}><I className="w-5 h-5" /></span>}
      <div className="min-w-0">
        <div className="text-xs muted flex items-center gap-1">{I && <I className="w-3.5 h-3.5 sm:hidden shrink-0" style={{ color: cor }} />}{rotulo}</div>
        <div className="text-xl sm:text-2xl font-bold tracking-tight leading-tight"><Contador valor={valor} formato={formato} /></div>
        {sub && <div className="text-xs ink-2 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

/** Barra empilhada com a fatia de cada candidato (cores do candidato; demais em cinza). */
export function BarraComposicao({ fatias, total, altura = 8 }) {
  if (!total) return null;
  return (
    <div className="w-full flex rounded-full overflow-hidden gap-[2px]" style={{ height: altura, background: 'var(--surface-2)' }}>
      {fatias.filter(f => f.votos > 0).map(f => (
        <div key={f.key} title={f.titulo} style={{ width: `${(f.votos / total) * 100}%`, background: f.cor, minWidth: 2 }} />
      ))}
    </div>
  );
}

/**
 * Cartão de um lugar (UF, município, zona, local ou seção): quem venceu ali, com foto,
 * a divisão dos votos e o comparecimento.
 */
export function CartaoUnidade({ href, nome, sub, aptos, comp, lider, fatias, total, selo }) {
  return (
    <a href={href} className="card p-3 flex flex-col gap-2.5 hover:-translate-y-0.5 transition-transform min-w-0">
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0">
          <div className="font-semibold text-sm leading-snug line-clamp-2">{nome}</div>
          {sub && <div className="text-xs muted truncate">{sub}</div>}
        </div>
        {selo}
      </div>
      {lider ? (
        <div className="flex items-center gap-2.5 min-w-0">
          <FotoCandidato cargo={lider.cargo} uf={lider.uf} sq={lider.sq} nome={lider.nome} cor={lider.cor} size={40} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium truncate">{lider.nome}</span>
              <span className="font-bold num shrink-0" style={{ color: lider.cor }}>{fmtPct(lider.pct, 1)}</span>
            </div>
            <div className="text-xs muted truncate">{lider.rotulo || 'mais votado'} · {fmt(lider.votos)} votos</div>
          </div>
        </div>
      ) : null}
      {fatias ? <BarraComposicao fatias={fatias} total={total} /> : lider ? <BarraGrossa pct={lider.pct} cor={lider.cor} altura={6} /> : null}
      <div className="text-xs muted flex justify-between gap-2 mt-auto">
        <span className="num">{fmt(aptos)} aptos</span>
        <span className="num">Comparec. {fmtPct(aptos ? (comp / aptos) * 100 : null, 1)}</span>
      </div>
    </a>
  );
}

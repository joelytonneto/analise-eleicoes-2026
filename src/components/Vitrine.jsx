// Peças visuais das telas "Placar" e "Destaques": foto oficial do candidato, número animado e cartões.
import React, { useEffect, useRef, useState } from 'react';
import { urlFoto } from '../lib/tse';
import { fmt } from '../lib/format';

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

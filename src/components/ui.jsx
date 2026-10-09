import React, { useEffect, useRef, useState } from 'react';
import { Loader2, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

/** true em telas estreitas (celular). Reage a rotação/redimensionamento. */
export function useIsMobile(max = 639) {
  const q = `(max-width: ${max}px)`;
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on);
    return () => (mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on));
  }, [q]);
  return m;
}

export function useAsync(fn, deps) {
  const [st, setSt] = useState({ loading: true, data: null, error: null });
  useEffect(() => {
    let vivo = true;
    setSt(s => ({ ...s, loading: true, error: null }));
    Promise.resolve()
      .then(fn)
      .then(data => vivo && setSt({ loading: false, data, error: null }))
      .catch(error => vivo && setSt({ loading: false, data: null, error }));
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return st;
}

export function Card({ title, subtitle, actions, children, className = '', bodyClass = 'p-4' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-2 px-3 sm:px-4 pt-3.5">
          <div className="min-w-0 flex-1 basis-48">
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {subtitle && <p className="text-xs muted mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 max-w-full">{actions}</div>}
        </div>
      )}
      <div className={bodyClass === 'p-4' ? 'p-3 sm:p-4' : bodyClass}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, sub, title }) {
  return (
    <div className="card px-3 sm:px-4 py-2.5 sm:py-3 min-w-0" title={title}>
      <div className="text-xs muted truncate">{label}</div>
      <div className="text-xl sm:text-2xl font-semibold mt-0.5 truncate">{value}</div>
      {sub && <div className="text-xs ink-2 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

export function Loading({ texto = 'Carregando dados oficiais…' }) {
  return (
    <div className="flex items-center gap-2 text-sm muted py-8 justify-center">
      <Loader2 className="w-4 h-4 animate-spin" /> {texto}
    </div>
  );
}

export function ErrorBox({ error, children }) {
  return (
    <div className="card p-4 flex gap-3 text-sm" style={{ color: 'var(--bad)' }}>
      <AlertTriangle className="w-5 h-5 shrink-0" />
      <div>{children || String(error?.message || error)}</div>
    </div>
  );
}

export function Seg({ value, onChange, options, size = 'sm' }) {
  const ref = useRef(null);
  // mantém a opção ativa visível quando a lista rola na horizontal (celular)
  useEffect(() => {
    const el = ref.current?.querySelector('[aria-selected="true"]');
    const box = ref.current;
    if (el && box && box.scrollWidth > box.clientWidth) box.scrollLeft = el.offsetLeft - box.clientWidth / 2 + el.offsetWidth / 2;
  }, [value]);
  return (
    <div ref={ref} className="inline-flex max-w-full scroll-x rounded-lg p-0.5" style={{ background: 'var(--surface-2)' }} role="tablist">
      {options.map(o => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={on}
            disabled={o.disabled}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={`shrink-0 whitespace-nowrap rounded-md ${size === 'xs' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1.5 sm:py-1 text-sm'} font-medium transition disabled:opacity-40`}
            style={on ? { background: 'var(--surface)', boxShadow: '0 0 0 1px var(--ring)', color: 'var(--ink)' } : { color: 'var(--ink-2)' }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Select({ value, onChange, children, className = '', ...rest }) {
  return (
    <select className={`input ${className}`} value={value ?? ''} onChange={e => onChange(e.target.value)} {...rest}>
      {children}
    </select>
  );
}

export function StatusIcon({ ok, size = 'w-4 h-4' }) {
  return ok
    ? <CheckCircle2 className={`${size} shrink-0`} style={{ color: 'var(--ok)' }} aria-label="confere" />
    : <XCircle className={`${size} shrink-0`} style={{ color: 'var(--bad)' }} aria-label="diverge" />;
}

/** Bloco recolhível: aberto no computador, recolhido no celular (economiza rolagem). */
export function Detalhes({ titulo, children }) {
  const mobile = useIsMobile();
  return (
    <details key={mobile ? 'm' : 'd'} open={!mobile} className="group">
      <summary className="text-sm link cursor-pointer select-none py-1 list-none flex items-center gap-1">
        <span className="inline-block transition group-open:rotate-90">›</span> {titulo}
      </summary>
      <div className="pt-2 space-y-3">{children}</div>
    </details>
  );
}

export function Empty({ children }) {
  return <div className="text-sm muted py-6 text-center">{children}</div>;
}

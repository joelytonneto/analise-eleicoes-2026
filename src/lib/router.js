import { useEffect, useState } from 'react';

const TURNO_STORAGE_KEY = 'ele2026:turno';

let turnoMemoria = (() => {
  try {
    const h = window.location.hash || '';
    const q = h.includes('?') ? new URLSearchParams(h.split('?')[1]) : null;
    if (q?.get('t') === '1') return 1;
    if (q?.get('t') === '2') return 2;
    const salvo = localStorage.getItem(TURNO_STORAGE_KEY);
    if (salvo === '1') return 1;
    if (salvo === '2') return 2;
  } catch { /* ignore */ }
  return 2; // Padrão: 2º Turno (25/10/2026)
})();

export function getTurno() {
  return turnoMemoria;
}

export function setTurno(novoTurno) {
  const t = +novoTurno === 1 ? 1 : 2;
  if (t === turnoMemoria) return;
  turnoMemoria = t;
  try {
    localStorage.setItem(TURNO_STORAGE_KEY, String(t));
  } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('turnochange', { detail: t }));
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function useTurno() {
  const [t, setT] = useState(() => getTurno());
  useEffect(() => {
    const on = () => setT(getTurno());
    window.addEventListener('turnochange', on);
    window.addEventListener('hashchange', on);
    return () => {
      window.removeEventListener('turnochange', on);
      window.removeEventListener('hashchange', on);
    };
  }, []);
  return [t, setTurno];
}

// Roteamento por hash (compatível com GitHub Pages): #/caminho?chave=valor
export function parseHash(hash = window.location.hash) {
  const h = hash.replace(/^#/, '') || '/';
  const [p, q = ''] = h.split('?');
  const parts = p.split('/').filter(Boolean).map(decodeURIComponent);
  const query = Object.fromEntries(new URLSearchParams(q));
  if (query.t === '1' || query.t === '2') {
    const qt = +query.t;
    if (qt !== turnoMemoria) {
      turnoMemoria = qt;
      try { localStorage.setItem(TURNO_STORAGE_KEY, String(qt)); } catch { /* ignore */ }
    }
  }
  return { parts, query, path: p, turno: turnoMemoria };
}

export function useRoute() {
  const [route, setRoute] = useState(() => parseHash());
  useEffect(() => {
    const on = () => setRoute(parseHash());
    window.addEventListener('hashchange', on);
    window.addEventListener('turnochange', on);
    return () => {
      window.removeEventListener('hashchange', on);
      window.removeEventListener('turnochange', on);
    };
  }, []);
  return route;
}

export function href(parts, query) {
  const p = '/' + parts.filter(x => x != null && x !== '').map(x => encodeURIComponent(String(x))).join('/');
  const q = query ? new URLSearchParams(Object.entries(query).filter(([, v]) => v != null && v !== '')).toString() : '';
  return `#${p}${q ? `?${q}` : ''}`;
}

export function navigate(parts, query) {
  window.location.hash = href(parts, query);
}

/** Atualiza só a query string, preservando o caminho. */
export function setQuery(patch, { replace = true } = {}) {
  const { parts, query } = parseHash();
  const next = { ...query, ...patch };
  const url = href(parts, next);
  if (replace) history.replaceState(null, '', url);
  else window.location.hash = url;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export const rotas = {
  brasil: (q) => href([], q),
  uf: (uf, q) => href(['uf', uf], q),
  mun: (uf, cd, q) => href(['uf', uf, cd], q),
  secao: (uf, cd, z, s, q) => href(['uf', uf, cd, z, s], q),
  comparar: (ids) => href(['comparar'], { u: ids.join(',') }),
  painel: (q) => href(['painel'], q),
  auditoria: () => href(['auditoria']),
  localizar: (q) => href(['localizar'], q),
  buscar: (q) => href(['buscar'], q),
  placar: (q) => href(['placar'], q),
  destaques: () => href(['destaques']),
  confronto: (q) => href(['confronto'], q),
  pos17h: (q) => href(['pos17h'], q),
  candidato: (uf, cargo, n) => href(['candidato', uf, cargo, n])
};

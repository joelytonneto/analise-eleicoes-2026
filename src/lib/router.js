import { useEffect, useState } from 'react';

// Roteamento por hash (compatível com GitHub Pages): #/caminho?chave=valor
export function parseHash(hash = window.location.hash) {
  const h = hash.replace(/^#/, '') || '/';
  const [p, q = ''] = h.split('?');
  const parts = p.split('/').filter(Boolean).map(decodeURIComponent);
  const query = Object.fromEntries(new URLSearchParams(q));
  return { parts, query, path: p };
}

export function useRoute() {
  const [route, setRoute] = useState(() => parseHash());
  useEffect(() => {
    const on = () => setRoute(parseHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
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
  candidato: (uf, cargo, n) => href(['candidato', uf, cargo, n])
};

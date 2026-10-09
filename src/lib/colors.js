// Cores categóricas por candidato. A cor segue o candidato (posição no ranking do escopo
// de referência: Brasil para Presidente, UF para os demais), nunca a posição na tela.
// Ordem validada para daltonismo (ΔE CVD adjacente ≥ 8,4 em claro e escuro).
const LIGHT = ['#2a78d6', '#e34948', '#6250d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];
const DARK = ['#3987e5', '#e66767', '#9085e9', '#d95926', '#199e70', '#c98500', '#d55181', '#008300'];
export const OUTROS = { light: '#898781', dark: '#898781' };

export function isDark() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

/** Cor do candidato pela sua posição (0-based) no ranking de referência do cargo. */
export function corPorIndice(i, dark = isDark()) {
  const p = dark ? DARK : LIGHT;
  return i >= 0 && i < p.length ? p[i] : OUTROS.light;
}

/** Mapa número -> cor a partir da lista de candidatos de referência (já ordenada por votos). */
export function mapaCores(candidatos, dark = isDark()) {
  const m = new Map();
  (candidatos || []).forEach((c, i) => m.set(+c.n, corPorIndice(i, dark)));
  return m;
}

// Rampa sequencial (azul) — magnitude
export const SEQ = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'];
export function corSequencial(t) {
  if (t == null || !Number.isFinite(t)) return null;
  const k = Math.max(0, Math.min(SEQ.length - 1, Math.floor(t * SEQ.length)));
  return SEQ[k];
}

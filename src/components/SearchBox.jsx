import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, MapPin, Vote, Building2 } from 'lucide-react';
import { loadMunicipiosIndex, UF_NOMES } from '../lib/data';
import { semAcento, titulo, pad } from '../lib/format';
import { rotas } from '../lib/router';
import { idSecao, idZona, idMun, idUf } from '../lib/unidades';

// Interpreta textos como:
//   "itaitinga 78 393", "fortaleza zona 114 seção 1", "CE 13480 0078 0393", "sp", "são paulo"
export function interpretar(q, municipios) {
  const txt = semAcento(q).replace(/[ªº°]/g, ' ').replace(/\b(zona|zn|secao|sec|municipio)\b\.?/g, ' ').replace(/[,;/-]/g, ' ');
  const tokensNum = txt.match(/\d+/g) || [];
  const nums = tokensNum.map(Number);
  const palavras = txt.replace(/\d+/g, ' ').replace(/[^a-z\s]/g, ' ').trim().replace(/\s+/g, ' ');
  const res = [];

  // Sigla de UF isolada — só vale como UF se o texto inteiro não for (parte de) um nome de município,
  // para não confundir "Sento Sé", "Pé de Serra" etc. com SE/PE.
  const nomeCompletoExiste = palavras.length >= 2 && municipios.some(m => m._n.includes(palavras));
  const ufMatch = palavras.split(' ').find(p => p.length === 2 && UF_NOMES[p.toUpperCase()]);
  const ufFiltro = ufMatch && !(nomeCompletoExiste && palavras !== ufMatch) ? ufMatch.toUpperCase() : null;
  const resto = ufFiltro ? palavras.split(' ').filter(p => p !== ufMatch).join(' ') : palavras;

  // Nome de UF por extenso (ex.: "Pará", "São Paulo") também é sugerido
  if (!ufFiltro && resto.length >= 3) {
    for (const [uf, nome] of Object.entries(UF_NOMES)) if (semAcento(nome).startsWith(resto)) res.push({ tipo: 'uf', uf, label: nome, sub: 'Unidade da federação', href: rotas.uf(uf), id: idUf(uf) });
  }

  let candidatosMun = [];
  if (resto.length >= 2) {
    candidatosMun = municipios
      .filter(m => (!ufFiltro || m.uf === ufFiltro) && m._n.includes(resto))
      .sort((a, b) => (a._n.startsWith(resto) ? 0 : 1) - (b._n.startsWith(resto) ? 0 : 1) || (b.capital ? 1 : 0) - (a.capital ? 1 : 0) || b.nSecoes - a.nSecoes)
      .slice(0, 8);
  } else if (nums.length && (tokensNum[0].length === 5 || nums[0] >= 1000)) {
    // código TSE do município
    const cd = pad(nums[0], 5);
    candidatosMun = municipios.filter(m => m.cd === cd && (!ufFiltro || m.uf === ufFiltro));
    nums.shift();
  }

  if (ufFiltro && !resto && !nums.length) res.push({ tipo: 'uf', uf: ufFiltro, label: UF_NOMES[ufFiltro], href: rotas.uf(ufFiltro), id: idUf(ufFiltro) });

  for (const m of candidatosMun) {
    const nomeMun = `${titulo(m.nome)} – ${m.uf}`;
    if (nums.length >= 2) {
      res.push({ tipo: 'secao', label: `Seção ${pad(nums[1])} · Zona ${pad(nums[0])}`, sub: nomeMun, href: rotas.secao(m.uf, m.cd, nums[0], nums[1]), id: idSecao(m.uf, m.cd, nums[0], nums[1]) });
    } else if (nums.length === 1) {
      res.push({ tipo: 'zona', label: `Zona ${pad(nums[0])}`, sub: nomeMun, href: rotas.mun(m.uf, m.cd, { tab: 'secoes', zona: nums[0] }), id: idZona(m.uf, m.cd, nums[0]) });
    }
    res.push({ tipo: 'mun', label: nomeMun, sub: `${m.nSecoes.toLocaleString('pt-BR')} seções · ${m.zonas} zona(s)${m.uf === 'ZZ' ? ' · Exterior' : ''}`, href: rotas.mun(m.uf, m.cd), id: idMun(m.uf, m.cd) });
  }
  return res.slice(0, 12);
}

export default function SearchBox() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const [municipios, setMunicipios] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    loadMunicipiosIndex().then(l => setMunicipios(l.map(m => ({ ...m, _n: semAcento(m.nome).replace(/[-']/g, ' ') })))).catch(() => {});
    const k = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ref.current?.focus(); setOpen(true); }
    };
    const abrir = () => { setTimeout(() => ref.current?.focus(), 250); setOpen(true); };
    window.addEventListener('keydown', k);
    window.addEventListener('abrir-busca', abrir);
    return () => { window.removeEventListener('keydown', k); window.removeEventListener('abrir-busca', abrir); };
  }, []);

  const res = useMemo(() => (q.trim() ? interpretar(q, municipios) : []), [q, municipios]);
  useEffect(() => setSel(0), [q]);

  const go = r => { window.location.hash = r.href; setOpen(false); setQ(''); ref.current?.blur(); };
  const Icon = { secao: Vote, zona: MapPin, mun: Building2, uf: MapPin };

  return (
    <div className="relative w-full max-w-md">
      <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 muted" />
      <input
        ref={ref}
        className="input w-full pl-8 pr-14"
        placeholder="Ex.: Itaitinga 78 393"
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(res.length - 1, s + 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(0, s - 1)); }
          if (e.key === 'Enter' && res[sel]) go(res[sel]);
          if (e.key === 'Escape') { setOpen(false); ref.current?.blur(); }
        }}
        aria-label="Buscar município, zona ou seção"
      />
      <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] muted chip hidden sm:inline-flex">Ctrl K</kbd>
      {open && q.trim() && (
        <div className="absolute z-50 mt-1 w-full card py-1 max-h-[60vh] overflow-auto" style={{ boxShadow: '0 0 0 1px var(--ring), 0 12px 32px rgba(0,0,0,.2)' }}>
          {!municipios.length && <div className="px-3 py-2 text-sm muted">Carregando índice de municípios…</div>}
          {municipios.length > 0 && !res.length && (
            <div className="px-3 py-2 text-sm muted">Nenhum resultado. Tente “nome do município + zona + seção”, ex.: <b>Fortaleza 114 1</b>.</div>
          )}
          {res.map((r, i) => {
            const I = Icon[r.tipo];
            return (
              <button key={r.href + i} onMouseDown={() => go(r)} onMouseEnter={() => setSel(i)} className="w-full text-left px-3 py-2.5 sm:py-2 flex items-start gap-2" style={i === sel ? { background: 'var(--surface-2)' } : undefined}>
                <I className="w-4 h-4 mt-0.5 muted shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium truncate">{r.label}</span>
                  {r.sub && <span className="block text-xs muted truncate">{r.sub}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Download, Search } from 'lucide-react';
import { semAcento } from '../lib/format';

/**
 * Tabela genérica.
 * colunas: [{ key, label, value: row => any (para ordenar/exportar), render?: row => node, align?: 'right', title? }]
 */
export default function DataTable({ linhas, colunas, ordemInicial, porPagina = 50, onRowClick, busca = true, nomeArquivo = 'dados', rowKey, destaque, vazio = 'Nenhum registro.', acoes }) {
  const [ordem, setOrdem] = useState(ordemInicial || { key: colunas[0].key, dir: 'asc' });
  const [q, setQ] = useState('');
  const [pag, setPag] = useState(0);

  const filtradas = useMemo(() => {
    if (!q.trim()) return linhas;
    const t = semAcento(q.trim());
    return linhas.filter(r => colunas.some(c => {
      const v = c.value(r);
      return v != null && semAcento(String(v)).includes(t);
    }));
  }, [linhas, colunas, q]);

  const ordenadas = useMemo(() => {
    const col = colunas.find(c => c.key === ordem.key) || colunas[0];
    const d = ordem.dir === 'asc' ? 1 : -1;
    return [...filtradas].sort((a, b) => {
      const x = col.value(a), y = col.value(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR', { numeric: true })) * d;
    });
  }, [filtradas, ordem, colunas]);

  const paginas = Math.max(1, Math.ceil(ordenadas.length / porPagina));
  const p = Math.min(pag, paginas - 1);
  const visiveis = ordenadas.slice(p * porPagina, (p + 1) * porPagina);

  const exportar = () => {
    const esc = v => {
      const s = v == null ? '' : typeof v === 'number' ? String(v).replace('.', ',') : String(v);
      return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [colunas.map(c => esc(c.label)).join(';'), ...ordenadas.map(r => colunas.map(c => esc(c.value(r))).join(';'))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${nomeArquivo}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {busca && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 muted" />
            <input className="input pl-7 !py-1 w-56" placeholder="Filtrar…" value={q} onChange={e => { setQ(e.target.value); setPag(0); }} aria-label="Filtrar tabela" />
          </div>
        )}
        <span className="text-xs muted">{ordenadas.length.toLocaleString('pt-BR')} registro(s)</span>
        <div className="flex-1" />
        {acoes}
        <button className="btn !py-1 text-xs" onClick={exportar} title="Baixar a tabela (com filtros e ordenação) em CSV"><Download className="w-3.5 h-3.5" /> CSV</button>
      </div>
      <div className="overflow-auto max-h-[70vh] rounded-lg" style={{ boxShadow: '0 0 0 1px var(--grid)' }}>
        <table className="tbl">
          <thead>
            <tr>
              {colunas.map(c => (
                <th key={c.key} className={c.align === 'right' ? 'text-right' : ''} title={c.title}>
                  <button
                    className="inline-flex items-center gap-1"
                    onClick={() => setOrdem(o => ({ key: c.key, dir: o.key === c.key && o.dir === 'desc' ? 'asc' : o.key === c.key ? 'desc' : (c.align === 'right' ? 'desc' : 'asc') }))}
                  >
                    {c.label}
                    {ordem.key === c.key && (ordem.dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visiveis.map((r, i) => (
              <tr
                key={rowKey ? rowKey(r) : i}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                className={onRowClick ? 'cursor-pointer' : ''}
                style={destaque?.(r) ? { boxShadow: 'inset 3px 0 0 var(--accent)' } : undefined}
              >
                {colunas.map(c => (
                  <td key={c.key} className={`${c.align === 'right' ? 'text-right num' : ''} ${c.nowrap !== false ? 'whitespace-nowrap' : ''}`}>
                    {c.render ? c.render(r) : c.value(r) ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
            {!visiveis.length && <tr><td colSpan={colunas.length} className="text-center muted py-6">{vazio}</td></tr>}
          </tbody>
        </table>
      </div>
      {paginas > 1 && (
        <div className="flex items-center justify-end gap-2 mt-2 text-xs">
          <button className="btn !py-0.5 text-xs" disabled={p === 0} onClick={() => setPag(p - 1)}>Anterior</button>
          <span className="muted">Página {p + 1} de {paginas}</span>
          <button className="btn !py-0.5 text-xs" disabled={p >= paginas - 1} onClick={() => setPag(p + 1)}>Próxima</button>
        </div>
      )}
    </div>
  );
}

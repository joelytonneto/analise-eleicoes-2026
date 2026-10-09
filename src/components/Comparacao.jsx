import React, { createContext, useContext, useEffect, useState } from 'react';
import { GitCompare, X, Plus, Check } from 'lucide-react';
import { rotas } from '../lib/router';
import { useRoute } from '../lib/router';

const Ctx = createContext(null);
const KEY = 'comparacao-v1';

export function ComparacaoProvider({ children }) {
  const [itens, setItens] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
  });
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(itens)); } catch { /* ok */ } }, [itens]);
  const api = {
    itens,
    tem: id => itens.some(i => i.id === id),
    alternar: (id, rotulo) => setItens(l => (l.some(i => i.id === id) ? l.filter(i => i.id !== id) : [...l, { id, rotulo }].slice(-6))),
    remover: id => setItens(l => l.filter(i => i.id !== id)),
    limpar: () => setItens([])
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
export const useComparacao = () => useContext(Ctx);

export function BotaoComparar({ id, rotulo, compacto }) {
  const c = useComparacao();
  const on = c.tem(id);
  return (
    <button
      className="btn"
      onClick={e => { e.stopPropagation(); e.preventDefault(); c.alternar(id, rotulo); }}
      title={on ? 'Remover da comparação' : 'Adicionar à comparação'}
      style={on ? { boxShadow: '0 0 0 2px var(--accent)' } : undefined}
    >
      {on ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      {!compacto && (on ? 'Na comparação' : 'Comparar')}
    </button>
  );
}

export function BandejaComparacao() {
  const c = useComparacao();
  const { parts } = useRoute();
  if (!c.itens.length || parts[0] === 'comparar') return null;
  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-24px)] max-w-3xl no-print">
      <div className="card px-3 py-2 flex items-center gap-2 flex-wrap" style={{ boxShadow: '0 0 0 1px var(--ring), 0 12px 32px rgba(0,0,0,.25)' }}>
        <GitCompare className="w-4 h-4 muted" />
        <div className="flex-1 flex gap-1.5 flex-wrap min-w-0">
          {c.itens.map(i => (
            <span key={i.id} className="chip max-w-[220px]">
              <span className="truncate">{i.rotulo}</span>
              <button onClick={() => c.remover(i.id)} aria-label={`Remover ${i.rotulo}`}><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
        <button className="btn !py-1 text-xs" onClick={c.limpar}>Limpar</button>
        <a className="btn btn-primary !py-1" href={rotas.comparar(c.itens.map(i => i.id))}>
          Comparar {c.itens.length > 1 ? `(${c.itens.length})` : ''}
        </a>
      </div>
    </div>
  );
}

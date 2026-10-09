import React from 'react';
import { ChevronRight } from 'lucide-react';

export default function Trilha({ itens }) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm mb-3" aria-label="Navegação hierárquica">
      {itens.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 muted" />}
          {it.href && i < itens.length - 1 ? <a className="link" href={it.href}>{it.label}</a> : <span className="font-medium">{it.label}</span>}
        </React.Fragment>
      ))}
    </nav>
  );
}

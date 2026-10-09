import React from 'react';
import { ChevronRight, Home, Map, Building2, School, Vote } from 'lucide-react';

export default function Breadcrumb({
  estado,
  municipio,
  localVotacao,
  secao,
  onResetToBrasil,
  onResetToEstado,
  onResetToMunicipio,
  onResetToLocal
}) {
  return (
    <nav className="flex items-center flex-wrap gap-1.5 text-xs text-slate-500 dark:text-slate-400 py-2.5 px-4 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/80 mb-4 shadow-xs transition-colors">
      {/* Nível Brasil */}
      <button
        onClick={onResetToBrasil}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition font-medium ${
          !estado
            ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-500/30'
            : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <Home className="w-3.5 h-3.5" />
        <span>Brasil</span>
      </button>

      {/* Nível Estado / UF */}
      {estado && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
          <button
            onClick={onResetToEstado}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition font-medium ${
              !municipio
                ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-500/30'
                : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Map className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{estado.nome} ({estado.sigla})</span>
          </button>
        </>
      )}

      {/* Nível Município */}
      {municipio && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
          <button
            onClick={onResetToMunicipio}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition font-medium ${
              !localVotacao
                ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-500/30'
                : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{municipio.nome}</span>
          </button>
        </>
      )}

      {/* Nível Local de Votação (Colégio / Escola) */}
      {localVotacao && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
          <button
            onClick={onResetToLocal}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition font-medium ${
              !secao
                ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-500/30'
                : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <School className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>{localVotacao.nome} (Zona {localVotacao.zona})</span>
          </button>
        </>
      )}

      {/* Nível Seção / Urna */}
      {secao && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-500/40 shadow-xs">
            <Vote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Seção {secao.numero} (Boletim de Urna)</span>
          </span>
        </>
      )}
    </nav>
  );
}

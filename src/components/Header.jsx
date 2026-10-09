import React from 'react';
import { CARGOS } from '../data/brazilStates';
import { 
  Vote, 
  Search, 
  Upload, 
  MapPin, 
  CheckCircle2, 
  BarChart3, 
  ShieldCheck,
  Calendar,
  ExternalLink,
  Sun,
  Moon
} from 'lucide-react';
import { getTseResultadosPortalUrl, getTseDadosAbertosUrl } from '../utils/tseUrls';

export default function Header({
  cargoAtual,
  setCargoAtual,
  turnoAtual,
  setTurnoAtual,
  theme = 'dark',
  onToggleTheme,
  onOpenSearch,
  onOpenImport,
  nivelAtual,
  ufAtual
}) {
  const cargoInfo = CARGOS.find(c => c.id === cargoAtual) || CARGOS[0];
  const suportaSegundoTurno = cargoInfo.turnos.includes(2);

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      {/* Top Banner Oficial */}
      <div className="bg-gradient-to-r from-blue-700 via-slate-800 to-emerald-800 dark:from-blue-950 dark:via-slate-900 dark:to-emerald-950 px-4 py-1.5 text-xs border-b border-slate-200/40 dark:border-slate-800/80 text-white">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <a 
              href={getTseResultadosPortalUrl()} 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-semibold text-emerald-300 hover:text-emerald-200 hover:underline flex items-center gap-1"
              title="Abrir portal oficial de divulgação de resultados do TSE"
            >
              <span>TSE DIVULGABR 2026</span>
              <ExternalLink className="w-3 h-3 inline" />
            </a>
            <span className="text-slate-300 hidden sm:inline">• Apuração Oficial Concluída (100% das Urnas Apuradas)</span>
          </div>
          <div className="flex items-center gap-3 text-slate-200">
            <a 
              href="https://www.tse.jus.br/comunicacao/noticias/2022/Outubro/entenda-como-funciona-a-assinatura-digital-e-a-lacracao-dos-sistemas-eleitorais"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded border border-white/20 text-white transition"
              title="Saiba mais sobre a assinatura digital ICP-Brasil e lacração dos sistemas pelo TSE"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
              <span>Assinatura Digital ICP-Brasil</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
            </a>
            <a 
              href={getTseDadosAbertosUrl()} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white hover:underline hidden md:inline-flex"
              title="Portal de Dados Abertos do TSE"
            >
              <span>Dados Abertos TSE</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-emerald-600 p-0.5 shadow-md shadow-blue-500/10">
            <div className="w-full h-full bg-slate-900 dark:bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Vote className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                Eleições Brasil <span className="text-emerald-600 dark:text-emerald-400">2026</span>
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 px-2 py-0.5 rounded-full">
                Multi-nível (Seções)
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mapeamento Interativo da Urna Eletrônica até o nível da Seção
            </p>
          </div>
        </div>

        {/* Action Buttons: Search, TSE Data Ingestion & Theme Toggle */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg transition shadow-sm"
          >
            <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Buscar Cidade, Zona ou Seção</span>
            <span className="sm:hidden">Buscar</span>
            <kbd className="hidden md:inline-block bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 text-[10px] rounded border border-slate-200 dark:border-slate-700 font-mono">
              Ctrl+K
            </kbd>
          </button>

          <button
            onClick={onOpenImport}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-blue-50 hover:bg-blue-100 dark:bg-blue-600/20 dark:hover:bg-blue-600/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/40 rounded-lg transition"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Dados TSE / Ingestão</span>
            <span className="sm:hidden">TSE</span>
          </button>

          {/* Botão de Alternância de Tema (Light / Dark) */}
          <button
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition shadow-sm"
            title={theme === 'dark' ? 'Ativar Modo Claro (White)' : 'Ativar Modo Escuro (Dark)'}
            aria-label="Alternar tema visual"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Claro</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Escuro</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Cargo & Turno Navigation Tabs */}
      <div className="bg-slate-50 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800/80 px-4 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 py-2">
          {/* Cargo Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {CARGOS.map((cargo) => {
              const active = cargo.id === cargoAtual;
              return (
                <button
                  key={cargo.id}
                  onClick={() => setCargoAtual(cargo.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {cargo.nome}
                  {cargo.id === 'SENADOR' && (
                    <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] px-1.5 py-0.2 rounded-full border border-amber-200 dark:border-amber-500/30">
                      2 vagas
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Turno Switcher */}
          {suportaSegundoTurno ? (
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 px-2 font-medium">Turno:</span>
              <button
                onClick={() => setTurnoAtual(1)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  turnoAtual === 1
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                1º Turno
              </button>
              <button
                onClick={() => setTurnoAtual(2)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  turnoAtual === 2
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                2º Turno
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-500 italic">
              Eleição em turno único proporcional / majoritário
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

import React, { useEffect, useState } from 'react';
import { Sun, Moon, ShieldCheck, LayoutDashboard, GitCompare, Map as MapIcon, Crosshair, Search } from 'lucide-react';
import SearchBox from './components/SearchBox';
import { useRoute, rotas } from './lib/router';
import BrasilPage from './pages/BrasilPage';
import UfPage from './pages/UfPage';
import MunicipioPage from './pages/MunicipioPage';
import SecaoPage from './pages/SecaoPage';
import CompararPage from './pages/CompararPage';
import PainelPage from './pages/PainelPage';
import AuditoriaPage from './pages/AuditoriaPage';
import LocalizarPage from './pages/LocalizarPage';
import { ComparacaoProvider, BandejaComparacao } from './components/Comparacao';

function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    } catch { return 'light'; }
  });
  useEffect(() => {
    try { localStorage.setItem('theme', theme); } catch { /* sem armazenamento */ }
  }, [theme]);
  // a classe é aplicada antes do novo render, para mapas e cores dos gráficos lerem o tema certo
  const trocar = t => { document.documentElement.classList.toggle('dark', t === 'dark'); setTheme(t); };
  if (typeof document !== 'undefined') document.documentElement.classList.toggle('dark', theme === 'dark');
  return [theme, trocar];
}

function NavLink({ to, ativo, icon: I, children }) {
  return (
    <a href={to} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium whitespace-nowrap" style={ativo ? { background: 'var(--surface-2)', color: 'var(--ink)' } : { color: 'var(--ink-2)' }}>
      <I className="w-4 h-4" /> {children}
    </a>
  );
}

// Barra de navegação inferior (celular/tablet), no estilo de aplicativo
function NavInferior({ p0 }) {
  const itens = [
    { to: rotas.brasil(), ativo: !p0 || p0 === 'uf', icon: MapIcon, label: 'Explorar' },
    { acao: true, icon: Search, label: 'Buscar' },
    { to: rotas.localizar(), ativo: p0 === 'localizar', icon: Crosshair, label: 'Localizar' },
    { to: rotas.comparar([]), ativo: p0 === 'comparar', icon: GitCompare, label: 'Comparar' },
    { to: rotas.painel(), ativo: p0 === 'painel', icon: LayoutDashboard, label: 'Painel' }
  ];
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 safe-bottom no-print" style={{ background: 'color-mix(in srgb, var(--surface) 96%, transparent)', boxShadow: '0 -1px 0 var(--ring)', backdropFilter: 'blur(8px)' }} aria-label="Navegação principal">
      <div className="grid grid-cols-5 max-w-lg mx-auto">
        {itens.map(it => {
          const I = it.icon;
          const conteudo = (
            <>
              <I className="w-5 h-5" />
              <span className="text-[11px] font-medium leading-none mt-1">{it.label}</span>
            </>
          );
          const cls = 'flex flex-col items-center justify-center py-2 min-h-[56px]';
          const st = { color: it.ativo ? 'var(--accent)' : 'var(--ink-2)' };
          return it.acao
            ? <button key={it.label} className={cls} style={st} onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); window.dispatchEvent(new Event('abrir-busca')); }}>{conteudo}</button>
            : <a key={it.label} href={it.to} className={cls} style={st} aria-current={it.ativo ? 'page' : undefined}>{conteudo}</a>;
        })}
      </div>
    </nav>
  );
}

export default function App() {
  const [theme, setTheme] = useTheme();
  const route = useRoute();
  const [p0, ...ps] = route.parts;

  useEffect(() => { window.scrollTo(0, 0); }, [route.path]);

  let page;
  if (!p0) page = <BrasilPage query={route.query} />;
  else if (p0 === 'uf' && ps.length === 1) page = <UfPage uf={ps[0].toUpperCase()} query={route.query} />;
  else if (p0 === 'uf' && ps.length === 2) page = <MunicipioPage uf={ps[0].toUpperCase()} cd={ps[1]} query={route.query} />;
  else if (p0 === 'uf' && ps.length >= 4) page = <SecaoPage uf={ps[0].toUpperCase()} cd={ps[1]} z={+ps[2]} s={+ps[3]} query={route.query} />;
  else if (p0 === 'comparar') page = <CompararPage query={route.query} />;
  else if (p0 === 'painel') page = <PainelPage query={route.query} />;
  else if (p0 === 'auditoria') page = <AuditoriaPage />;
  else if (p0 === 'localizar') page = <LocalizarPage query={route.query} />;
  else page = <div className="card p-6">Página não encontrada. <a className="link" href="#/">Voltar ao início</a></div>;

  return (
    <ComparacaoProvider>
      <div className="min-h-screen flex flex-col">
        <header className="lg:sticky top-0 z-30 backdrop-blur" style={{ background: 'color-mix(in srgb, var(--surface) 92%, transparent)', boxShadow: '0 1px 0 var(--ring)' }}>
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <a href="#/" className="flex items-center gap-2 shrink-0 min-w-0">
              <span className="w-8 h-8 rounded-lg grid place-items-center text-white font-bold text-sm shrink-0" style={{ background: 'var(--accent)' }}>26</span>
              <span className="leading-tight min-w-0">
                <span className="block text-sm font-semibold">Eleições 2026</span>
                <span className="block text-[11px] muted truncate">Auditoria por seção · dados oficiais TSE</span>
              </span>
            </a>
            {/* ações compactas no celular */}
            <div className="flex items-center gap-1 ml-auto lg:hidden">
              <a href={rotas.auditoria()} className="btn !px-2" aria-label="Auditoria e metodologia" title="Auditoria" style={p0 === 'auditoria' ? { color: 'var(--accent)' } : undefined}><ShieldCheck className="w-4 h-4" /></a>
              <button className="btn !px-2" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Alternar tema claro/escuro" title="Alternar tema">
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex-1 basis-full lg:basis-auto lg:min-w-[220px] flex justify-center"><SearchBox /></div>
            <nav className="hidden lg:flex items-center gap-1">
              <NavLink to={rotas.brasil()} ativo={!p0 || p0 === 'uf'} icon={MapIcon}>Explorar</NavLink>
              <NavLink to={rotas.localizar()} ativo={p0 === 'localizar'} icon={Crosshair}>Localizar urna</NavLink>
              <NavLink to={rotas.comparar([])} ativo={p0 === 'comparar'} icon={GitCompare}>Comparar</NavLink>
              <NavLink to={rotas.painel()} ativo={p0 === 'painel'} icon={LayoutDashboard}>Painel</NavLink>
              <NavLink to={rotas.auditoria()} ativo={p0 === 'auditoria'} icon={ShieldCheck}>Auditoria</NavLink>
              <button className="btn !px-2" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Alternar tema claro/escuro" title="Alternar tema">
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-5 pb-8 lg:pb-28">{page}</main>

        <footer className="text-xs muted py-6 px-4 pb-40 lg:pb-6" style={{ boxShadow: '0 -1px 0 var(--ring)' }}>
          <div className="max-w-7xl mx-auto flex flex-wrap gap-x-6 gap-y-2 justify-between">
            <span>Eleições Gerais 2026 · 1º turno (04/10/2026). Fontes: Portal de Dados Abertos do TSE e arquivos de urna publicados em resultados.tse.jus.br.</span>
            <a className="link" href={rotas.auditoria()}>Metodologia e auditoria dos dados →</a>
          </div>
        </footer>
        <BandejaComparacao />
        <NavInferior p0={p0} />
      </div>
    </ComparacaoProvider>
  );
}

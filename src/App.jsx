import React, { useEffect, useRef, useState } from 'react';
import { Sun, Moon, ShieldCheck, LayoutDashboard, GitCompare, Map as MapIcon, Crosshair, Search, Sparkles, Trophy, Menu, X, BookOpen, Contrast, Check } from 'lucide-react';
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
import BuscarPage from './pages/BuscarPage';
import CandidatoPage from './pages/CandidatoPage';
import PlacarPage from './pages/PlacarPage';
import DestaquesPage from './pages/DestaquesPage';
import { ComparacaoProvider, BandejaComparacao } from './components/Comparacao';

/** Rede de segurança: um erro de renderização mostra um aviso em vez de apagar o app inteiro. */
class Protecao extends React.Component {
  constructor(p) { super(p); this.state = { erro: null }; }
  static getDerivedStateFromError(erro) { return { erro }; }
  componentDidCatch(erro, info) { console.error(erro, info?.componentStack); }
  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div className="card p-4 text-sm space-y-3 max-w-xl">
        <div className="font-medium" style={{ color: 'var(--bad)' }}>Não foi possível exibir esta tela.</div>
        <div className="ink-2 break-words">{String(this.state.erro?.message || this.state.erro)}</div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => this.setState({ erro: null })}>Tentar de novo</button>
          <a className="btn" href={rotas.brasil()}>Ir para o início</a>
        </div>
      </div>
    );
  }
}

const TEMAS = [
  { id: 'light', label: 'Claro', sub: 'Fundo branco, padrão', icon: Sun },
  { id: 'dark', label: 'Escuro', sub: 'Para ambientes com pouca luz', icon: Moon },
  { id: 'sepia', label: 'Sépia', sub: 'Tom de papel, cansa menos a vista', icon: BookOpen },
  { id: 'contraste', label: 'Alto contraste', sub: 'Preto no branco, bordas fortes', icon: Contrast }
];

function aplicarTema(t) {
  const el = document.documentElement;
  el.classList.toggle('dark', t === 'dark');
  if (t === 'sepia' || t === 'contraste') el.dataset.theme = t;
  else delete el.dataset.theme;
}

function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      const t = localStorage.getItem('theme');
      if (TEMAS.some(x => x.id === t)) return t;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch { return 'light'; }
  });
  useEffect(() => {
    try { localStorage.setItem('theme', theme); } catch { /* sem armazenamento */ }
  }, [theme]);
  // o tema é aplicado antes do novo render, para mapas e cores dos gráficos lerem o tema certo
  const trocar = t => { aplicarTema(t); setTheme(t); };
  if (typeof document !== 'undefined') aplicarTema(theme);
  return [theme, trocar];
}

/** Botão de tema: abre um menu com as quatro opções. */
function SeletorTema({ theme, setTheme }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!aberto) return undefined;
    const fora = e => { if (!ref.current?.contains(e.target)) setAberto(false); };
    const esc = e => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('pointerdown', fora);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', fora); document.removeEventListener('keydown', esc); };
  }, [aberto]);
  const atual = TEMAS.find(t => t.id === theme) || TEMAS[0];
  const I = atual.icon;
  return (
    <div className="relative" ref={ref}>
      <button className="btn !px-2" onClick={() => setAberto(a => !a)} aria-haspopup="menu" aria-expanded={aberto} aria-label={`Tema: ${atual.label}. Trocar tema`} title="Trocar tema">
        <I className="w-4 h-4" />
      </button>
      {aberto && (
        <div role="menu" className="absolute right-0 mt-2 z-50 card p-1.5 w-64" style={{ boxShadow: '0 0 0 1px var(--ring), 0 12px 32px rgba(0,0,0,.22)' }}>
          <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wide muted">Tema de leitura</div>
          {TEMAS.map(t => {
            const TI = t.icon;
            const on = t.id === theme;
            return (
              <button key={t.id} role="menuitemradio" aria-checked={on} onClick={() => { setTheme(t.id); setAberto(false); }}
                className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left" style={on ? { background: 'var(--surface-2)' } : undefined}>
                <TI className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
                <span className="flex-1 min-w-0"><span className="block text-sm font-medium">{t.label}</span><span className="block text-xs muted">{t.sub}</span></span>
                {on && <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NavLink({ to, ativo, icon: I, children }) {
  return (
    <a href={to} title={children} aria-label={children} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium whitespace-nowrap" style={ativo ? { background: 'var(--surface-2)', color: 'var(--ink)' } : { color: 'var(--ink-2)' }}>
      <I className="w-4 h-4" /> <span className="hidden xl:inline">{children}</span>
    </a>
  );
}

// Barra de navegação inferior (celular/tablet), no estilo de aplicativo
const MAIS = [
  { to: rotas.localizar(), p: 'localizar', icon: Crosshair, label: 'Localizar urna', sub: 'UF, município, zona e seção' },
  { to: rotas.comparar([]), p: 'comparar', icon: GitCompare, label: 'Comparar', sub: 'Seções, locais, municípios e estados lado a lado' },
  { to: rotas.painel(), p: 'painel', icon: LayoutDashboard, label: 'Painel', sub: 'Monte gráficos com os filtros que quiser' },
  { to: rotas.auditoria(), p: 'auditoria', icon: ShieldCheck, label: 'Auditoria', sub: 'Como os dados foram conferidos com o TSE' }
];

function NavInferior({ p0 }) {
  const [mais, setMais] = useState(false);
  useEffect(() => setMais(false), [p0]);
  const itens = [
    { to: rotas.brasil(), ativo: !p0 || p0 === 'uf', icon: MapIcon, label: 'Explorar' },
    { to: rotas.destaques(), ativo: p0 === 'destaques', icon: Sparkles, label: 'Destaques' },
    { to: rotas.placar(), ativo: p0 === 'placar' || p0 === 'candidato', icon: Trophy, label: 'Placar' },
    { to: rotas.buscar(), ativo: p0 === 'buscar', icon: Search, label: 'Buscar' },
    { acao: () => setMais(m => !m), ativo: mais || MAIS.some(m => m.p === p0), icon: mais ? X : Menu, label: 'Mais' }
  ];
  return (
    <>
    {mais && (
      <div className="lg:hidden fixed inset-0 z-40 no-print" onClick={() => setMais(false)} style={{ background: 'rgba(0,0,0,.35)' }}>
        <div className="absolute inset-x-2 bottom-[68px] card p-2 safe-bottom" onClick={e => e.stopPropagation()} style={{ boxShadow: '0 0 0 1px var(--ring), 0 -12px 32px rgba(0,0,0,.25)' }}>
          {MAIS.map(m => {
            const I = m.icon;
            return (
              <a key={m.p} href={m.to} onClick={() => setMais(false)} className="flex items-center gap-3 px-3 py-3 rounded-lg" style={p0 === m.p ? { background: 'var(--surface-2)' } : undefined}>
                <I className="w-5 h-5 shrink-0" style={{ color: 'var(--accent)' }} />
                <span className="min-w-0"><span className="block text-sm font-semibold">{m.label}</span><span className="block text-xs muted">{m.sub}</span></span>
              </a>
            );
          })}
        </div>
      </div>
    )}
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
            ? <button key={it.label} className={cls} style={st} onClick={it.acao} aria-expanded={mais}>{conteudo}</button>
            : <a key={it.label} href={it.to} className={cls} style={st} aria-current={it.ativo ? 'page' : undefined}>{conteudo}</a>;
        })}
      </div>
    </nav>
    </>
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
  else if (p0 === 'buscar') page = <BuscarPage query={route.query} />;
  else if (p0 === 'placar') page = <PlacarPage query={route.query} />;
  else if (p0 === 'destaques') page = <DestaquesPage />;
  else if (p0 === 'candidato' && ps.length === 3) page = <CandidatoPage uf={ps[0].toUpperCase()} cargo={+ps[1]} n={+ps[2]} />;
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
              <SeletorTema theme={theme} setTheme={setTheme} />
            </div>
            {p0 !== 'buscar' ? <div className="flex-1 basis-full lg:basis-auto lg:min-w-[190px] flex justify-center"><SearchBox /></div> : <div className="hidden lg:block flex-1" />}
            <nav className="hidden lg:flex items-center gap-0.5">
              <NavLink to={rotas.brasil()} ativo={!p0 || p0 === 'uf'} icon={MapIcon}>Explorar</NavLink>
              <NavLink to={rotas.destaques()} ativo={p0 === 'destaques'} icon={Sparkles}>Destaques</NavLink>
              <NavLink to={rotas.placar()} ativo={p0 === 'placar'} icon={Trophy}>Placar</NavLink>
              <NavLink to={rotas.localizar()} ativo={p0 === 'localizar'} icon={Crosshair}>Localizar</NavLink>
              <NavLink to={rotas.comparar([])} ativo={p0 === 'comparar'} icon={GitCompare}>Comparar</NavLink>
              <NavLink to={rotas.painel()} ativo={p0 === 'painel'} icon={LayoutDashboard}>Painel</NavLink>
              <NavLink to={rotas.auditoria()} ativo={p0 === 'auditoria'} icon={ShieldCheck}>Auditoria</NavLink>
              <SeletorTema theme={theme} setTheme={setTheme} />
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-5 pb-8 lg:pb-28"><Protecao key={route.path}>{page}</Protecao></main>

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

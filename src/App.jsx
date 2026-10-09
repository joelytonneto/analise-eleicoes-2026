import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Breadcrumb from './components/Breadcrumb';
import KpiCards from './components/KpiCards';
import BrazilMap from './components/BrazilMap';
import CandidatesChart from './components/CandidatesChart';
import DrillDownPanel from './components/DrillDownPanel';
import SectionModal from './components/SectionModal';
import SearchModal from './components/SearchModal';
import TseImportModal from './components/TseImportModal';
import { BRAZIL_STATES } from './data/brazilStates';
import { getLocaisVotacao, getBoletimDeUrna } from './data/electoralEngine';
import allMunicipalities from './data/allMunicipalities.json';

export default function App() {
  const [cargoAtual, setCargoAtual] = useState('PRESIDENTE');
  const [turnoAtual, setTurnoAtual] = useState(1);

  // Tema Claro / Escuro (com persistência em localStorage)
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved) return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    } catch (e) {
      return 'dark';
    }
  });

  useEffect(() => {
    try {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
      localStorage.setItem('theme', theme);
    } catch (e) {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Estados de Navegação Hierárquica
  const [estadoAtual, setEstadoAtual] = useState(null);
  const [municipioAtual, setMunicipioAtual] = useState(null);
  const [locaisVotacao, setLocaisVotacao] = useState([]);
  const [localSelecionado, setLocalSelecionado] = useState(null);
  const [secaoSelecionada, setSecaoSelecionada] = useState(null);

  // Modais
  const [isSecaoModalOpen, setIsSecaoModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Estado de Zona Eleitoral (Filtro quando cidade possui múltiplas zonas, ex: Fortaleza com 17 Zonas)
  const [zonaSelecionada, setZonaSelecionada] = useState('TODAS');

  // Manipulador de Seleção de Estado
  const handleSelectEstado = (estado) => {
    setEstadoAtual(estado);
    setMunicipioAtual(null);
    setZonaSelecionada('TODAS');
    setLocaisVotacao([]);
    setLocalSelecionado(null);
    setSecaoSelecionada(null);
  };

  // Manipulador de Seleção de Município
  const handleSelectMunicipio = (mun) => {
    setMunicipioAtual(mun);
    setZonaSelecionada('TODAS');
    setLocalSelecionado(null);
    setSecaoSelecionada(null);

    if (mun && estadoAtual) {
      const locais = getLocaisVotacao(
        estadoAtual.sigla,
        mun,
        mun.lat,
        mun.lng
      );
      setLocaisVotacao(locais);
    } else {
      setLocaisVotacao([]);
    }
  };

  // Manipulador de Seleção de Local de Votação (Colégio)
  const handleSelectLocal = (local) => {
    setLocalSelecionado(local);
    setSecaoSelecionada(null);
  };

  // Manipulador de Seleção de Seção Eleitoral
  const handleSelectSecao = (secao) => {
    setSecaoSelecionada(secao);
  };

  // Reset de níveis no Breadcrumb
  const handleResetToBrasil = () => {
    setEstadoAtual(null);
    setMunicipioAtual(null);
    setZonaSelecionada('TODAS');
    setLocaisVotacao([]);
    setLocalSelecionado(null);
    setSecaoSelecionada(null);
  };

  const handleResetToEstado = () => {
    setMunicipioAtual(null);
    setZonaSelecionada('TODAS');
    setLocaisVotacao([]);
    setLocalSelecionado(null);
    setSecaoSelecionada(null);
  };

  const handleResetToMunicipio = () => {
    setLocalSelecionado(null);
    setSecaoSelecionada(null);
  };

  const handleResetToLocal = () => {
    setSecaoSelecionada(null);
  };

  // Busca rápida (Search Modal)
  const handleSelectStateAndCityFromSearch = (estado, mun, secaoNum) => {
    if (estado) {
      setEstadoAtual(estado);
      if (mun) {
        setMunicipioAtual(mun);
        setZonaSelecionada('TODAS');
        const locais = getLocaisVotacao(estado.sigla, mun, mun.lat, mun.lng);
        setLocaisVotacao(locais);

        if (secaoNum && locais.length > 0) {
          // Localiza a escola/local exato que contém a seção buscada
          let targetLoc = locais.find(l => l.secoes.some(s => s.numero === secaoNum));
          if (!targetLoc) {
            targetLoc = locais[0];
            targetLoc.secoes.unshift({
              numero: secaoNum,
              zona: mun.zonas?.[0] || targetLoc.zona || '0001',
              localNome: targetLoc.nome,
              urnasModelo: 'UE2022',
              aptos: 378
            });
          }
          setLocalSelecionado(targetLoc);
          const targetSec = targetLoc.secoes.find(s => s.numero === secaoNum) || {
            numero: secaoNum,
            zona: targetLoc.zona,
            localNome: targetLoc.nome,
            aptos: 378
          };
          setSecaoSelecionada(targetSec);
          setIsSecaoModalOpen(true);
        }
      }
    }
  };

  // Obter lista completa oficial de municípios para o estado selecionado (ex: 184 no CE, 645 em SP)
  const municipiosDisponiveis = estadoAtual
    ? allMunicipalities[estadoAtual.sigla] || []
    : [];

  // Dados do Boletim da Seção (se uma seção estiver ativa)
  const boletimSecaoAtual = secaoSelecionada && municipioAtual && estadoAtual
    ? getBoletimDeUrna(
        estadoAtual.sigla,
        municipioAtual.nome,
        secaoSelecionada.zona,
        secaoSelecionada.numero,
        cargoAtual,
        turnoAtual
      )
    : null;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white transition-colors duration-150">
      {/* Top Navbar */}
      <Header
        cargoAtual={cargoAtual}
        setCargoAtual={setCargoAtual}
        turnoAtual={turnoAtual}
        setTurnoAtual={setTurnoAtual}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        onOpenImport={() => setIsImportModalOpen(true)}
        nivelAtual={secaoSelecionada ? 'SECAO' : municipioAtual ? 'MUNICIPIO' : estadoAtual ? 'ESTADO' : 'BRASIL'}
        ufAtual={estadoAtual?.sigla}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Breadcrumb de Navegação Hierárquica */}
        <Breadcrumb
          estado={estadoAtual}
          municipio={municipioAtual}
          localVotacao={localSelecionado}
          secao={secaoSelecionada}
          onResetToBrasil={handleResetToBrasil}
          onResetToEstado={handleResetToEstado}
          onResetToMunicipio={handleResetToMunicipio}
          onResetToLocal={handleResetToLocal}
        />

        {/* Indicadores Principais (KPI Cards) */}
        <KpiCards
          cargoAtual={cargoAtual}
          estado={estadoAtual}
          municipio={municipioAtual}
          secao={secaoSelecionada}
          boletimSecao={boletimSecaoAtual}
        />

        {/* Grid Principal: Mapa Interativo e Gráficos de Resultados */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Coluna do Mapa do Brasil (7/12) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            <BrazilMap
              theme={theme}
              cargoAtual={cargoAtual}
              turnoAtual={turnoAtual}
              estadoAtual={estadoAtual}
              municipiosDisponiveis={municipiosDisponiveis}
              municipioAtual={municipioAtual}
              locaisVotacao={locaisVotacao}
              localSelecionado={localSelecionado}
              secaoSelecionada={secaoSelecionada}
              zonaSelecionada={zonaSelecionada}
              onSelectZona={setZonaSelecionada}
              onSelectEstado={handleSelectEstado}
              onSelectMunicipio={handleSelectMunicipio}
              onSelectLocal={handleSelectLocal}
              onSelectSecao={handleSelectSecao}
              onOpenSecaoModal={() => setIsSecaoModalOpen(true)}
              onResetToBrasil={handleResetToBrasil}
            />
          </div>

          {/* Coluna Lateral: Gráficos de Votação por Cargo (5/12) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4">
            <CandidatesChart
              cargoAtual={cargoAtual}
              turnoAtual={turnoAtual}
              estado={estadoAtual}
              municipio={municipioAtual}
              secao={secaoSelecionada}
              boletimSecao={boletimSecaoAtual}
            />
          </div>
        </div>

        {/* Painel de Drill-down Territorial: Cidades, Escolas e Urnas */}
        <DrillDownPanel
          cargoAtual={cargoAtual}
          estado={estadoAtual}
          municipiosDisponiveis={municipiosDisponiveis}
          municipioAtual={municipioAtual}
          onSelectMunicipio={handleSelectMunicipio}
          locaisVotacao={locaisVotacao}
          localSelecionado={localSelecionado}
          onSelectLocal={handleSelectLocal}
          secaoSelecionada={secaoSelecionada}
          onSelectSecao={handleSelectSecao}
          zonaSelecionada={zonaSelecionada}
          onSelectZona={setZonaSelecionada}
          onOpenSecaoModal={() => setIsSecaoModalOpen(true)}
        />
      </main>

      {/* Rodapé Oficial */}
      <footer className="mt-12 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-6 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">DivulgaBR 2026</span>
            <span>• Painel de Auditoria e Inteligência Eleitoral das Eleições Gerais</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Dados Oficiais: TSE (Tribunal Superior Eleitoral)</span>
            <span>Urnas UE2020 / UE2022</span>
          </div>
        </div>
      </footer>

      {/* Modais Globais */}
      <SectionModal
        isOpen={isSecaoModalOpen}
        onClose={() => setIsSecaoModalOpen(false)}
        secao={secaoSelecionada}
        municipio={municipioAtual}
        estado={estadoAtual}
        turnoAtual={turnoAtual}
      />

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectStateAndCity={handleSelectStateAndCityFromSearch}
        estadoAtual={estadoAtual}
        municipioAtual={municipioAtual}
      />

      <TseImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
}

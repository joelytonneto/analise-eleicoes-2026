import React, { useState } from 'react';
import { 
  Building2, 
  School, 
  Vote, 
  ChevronRight, 
  Search, 
  MapPin, 
  Layers, 
  Eye, 
  FileText,
  Award,
  Check,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import tseFullData from '../data/tseFullResults2026.json';
import { PARTIDOS_CORES } from '../data/brazilStates';
import { getTseRawJsonUrl, getTseBuPortalUrl, getTseSectionDirectUrl } from '../utils/tseUrls';

export default function DrillDownPanel({
  cargoAtual = 'PRESIDENTE',
  estado,
  municipiosDisponiveis,
  municipioAtual,
  onSelectMunicipio,
  locaisVotacao,
  localSelecionado,
  onSelectLocal,
  secaoSelecionada,
  onSelectSecao,
  zonaSelecionada = 'TODAS',
  onSelectZona,
  onOpenSecaoModal
}) {
  const [busca, setBusca] = useState('');
  const [buscaLocal, setBuscaLocal] = useState('');

  if (!estado) {
    return (
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-center shadow-xs dark:shadow-md transition-colors">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center mx-auto mb-3">
          <Layers className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">Explorador de Cidades e Seções Eleitorais</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Clique em qualquer estado no mapa acima para ver os resultados oficiais por cidade, locais de votação e o Boletim de Urna de cada seção.
        </p>
      </div>
    );
  }

  // Filtragem
  const munFiltrados = (municipiosDisponiveis || []).filter(m => 
    m.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs dark:shadow-xl space-y-4 transition-colors">
      {/* Cabeçalho do Explorador */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Navegador Territorial: {estado.nome} ({estado.sigla})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {municipioAtual ? `Cidade Selecionada: ${municipioAtual.nome} (Cód. TSE: ${municipioAtual.codigoTse})` : `Explorar cidades do estado para o cargo de ${cargoAtual}`}
          </p>
        </div>

        {/* Input de filtro de cidades (apenas se nenhuma cidade estiver selecionada) */}
        {!municipioAtual ? (
          <div className="relative w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrar cidade..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 pl-8 pr-2.5 py-1.5 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
        ) : (
          <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-500/30 shrink-0">
            ✓ Visualizando: {municipioAtual.nome}
          </span>
        )}
      </div>

      {/* ETAPA 1: Lista de Cidades do Estado com Vencedor na Cidade */}
      {!municipioAtual ? (
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span>Selecione uma Cidade para ver a Apuração Local:</span>
            <span className="text-[11px] text-slate-500">Exibindo líder para {cargoAtual}</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
            {munFiltrados.map((mun) => {
              const cityKey = `${estado.sigla}_${mun.codigoTse}`;
              const cityData = tseFullData.cidades[cityKey];
              const cargoCity = cityData?.cargos[cargoAtual];
              const topCand = cargoCity?.candidatos?.[0];
              const partyColor = topCand ? (PARTIDOS_CORES[topCand.partido] || '#3b82f6') : '#64748b';

              return (
                <button
                  key={mun.codigoTse || mun.nome}
                  onClick={() => onSelectMunicipio(mun)}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 hover:border-blue-400 dark:hover:border-blue-500/50 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition text-left group"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <h5 className="font-bold text-xs text-slate-900 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate">
                        {mun.nome}
                      </h5>
                    </div>

                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {mun.eleitores.toLocaleString('pt-BR')} eleitores • {mun.secoesTotais} urnas
                    </p>

                    {topCand && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: partyColor }}></span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium truncate">
                          1º: {topCand.nome} ({topCand.partido})
                        </span>
                        <span className="font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                          {topCand.pct}%
                        </span>
                      </div>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* ETAPA 2: Cidade Selecionada -> Exibir Locais de Votação (Colégios) */
        <div className="space-y-3.5">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                  <School className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Locais de Votação em {municipioAtual.nome} ({estado.sigla}):
                </span>
                {municipioAtual.zonasTotais > 1 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30">
                    {municipioAtual.zonasTotais} Zonas Oficiais
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  onSelectMunicipio(null);
                  if (onSelectZona) onSelectZona('TODAS');
                }}
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline flex items-center gap-1 self-start sm:self-auto font-medium"
              >
                ← Voltar para Lista de Cidades de {estado.sigla}
              </button>
            </div>

            {/* Barra de Auditoria Direta TSE para o Município */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-2.5 mb-3 shadow-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  Verificar dados de <b>{municipioAtual.nome} ({estado.sigla})</b> diretamente no TSE:
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={getTseRawJsonUrl({ uf: estado.sigla, codigoTse: municipioAtual.codigoTse, cargoId: cargoAtual })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-500/30 rounded-lg transition"
                  title="Abrir arquivo JSON oficial do TSE para esta cidade"
                >
                  <span>JSON Oficial TSE</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={getTseBuPortalUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-500/30 rounded-lg transition"
                  title="Consultar Boletins de Urna no Portal Web do TSE"
                >
                  <span>Portal BU TSE</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* SELETOR DE ZONAS ELEITORAIS (Ex: 17 Zonas em Fortaleza) */}
            {municipioAtual.zonas && municipioAtual.zonas.length > 1 && (
              <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 mb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    🏛️ Filtrar por Zona Eleitoral ({municipioAtual.zonas.length} zonas):
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    {municipioAtual.secoesTotais.toLocaleString('pt-BR')} seções • {municipioAtual.eleitores.toLocaleString('pt-BR')} eleitores
                  </span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  <button
                    onClick={() => onSelectZona && onSelectZona('TODAS')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      zonaSelecionada === 'TODAS'
                        ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    Todas as Zonas ({locaisVotacao?.length || 0} locais)
                  </button>

                  {municipioAtual.zonas
                    .slice()
                    .sort((a, b) => parseInt(a) - parseInt(b))
                    .map((z) => {
                      const zLocs = (locaisVotacao || []).filter((l) => l.zona === z);
                      const zNomeCurto = zLocs[0]?.bairro ? zLocs[0].bairro.split('/')[0].trim() : '';
                      const isActive = zonaSelecionada === z;
                      return (
                        <button
                          key={z}
                          onClick={() => onSelectZona && onSelectZona(z)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                            isActive
                              ? 'bg-blue-600 text-white font-bold shadow-sm ring-1 ring-blue-400'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                          title={`Zona ${z}${zNomeCurto ? ' - ' + zNomeCurto : ''}`}
                        >
                          <span className="font-mono font-bold">Zona {z}</span>
                          {zNomeCurto && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-300 opacity-80">
                              ({zNomeCurto})
                            </span>
                          )}
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-950 px-1 py-0.2 rounded text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                            {zLocs.length}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Input de filtro de escolas e seções */}
            <div className="relative mb-2.5">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por escola, colégio, bairro ou número da seção (ex: 0393)..."
                value={buscaLocal}
                onChange={(e) => setBuscaLocal(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Atalho se o usuário digitou um número de seção específico (ex: 0393) */}
            {buscaLocal && /^\d+$/.test(buscaLocal.trim()) && (() => {
              const secBuscada = buscaLocal.trim().padStart(4, '0');
              const localComSecao = (locaisVotacao || []).find(l => l.secoes.some(s => s.numero === secBuscada));
              if (localComSecao) {
                const targetSec = localComSecao.secoes.find(s => s.numero === secBuscada);
                return (
                  <div className="mb-2.5 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/50 rounded-xl flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <Vote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs text-emerald-900 dark:text-emerald-300 font-semibold">
                        Seção <b>{secBuscada}</b> encontrada na escola <b>{localComSecao.nome}</b>!
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          onSelectLocal(localComSecao);
                          onSelectSecao(targetSec);
                          onOpenSecaoModal();
                        }}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        Abrir BU Oficial da Seção {secBuscada} →
                      </button>
                      <a
                        href={getTseSectionDirectUrl({
                          uf: estado.sigla,
                          codigoTse: municipioAtual.codigoTse,
                          zona: targetSec.zona,
                          secao: secBuscada,
                          cargoId: cargoAtual
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-blue-50 dark:bg-blue-600/30 hover:bg-blue-100 dark:hover:bg-blue-600/50 text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-white font-semibold text-xs rounded-lg border border-blue-200 dark:border-blue-500/40 transition flex items-center gap-1"
                        title="Abrir este Boletim de Urna diretamente no site do TSE"
                      >
                        <span>TSE Oficial</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Grid de Escolas / Locais Filtrados */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
              {(locaisVotacao || [])
                .filter((local) => {
                  const matchZona = (zonaSelecionada === 'TODAS' || !zonaSelecionada) ? true : local.zona === zonaSelecionada;
                  const q = buscaLocal.trim().toLowerCase();
                  const qPad = /^\d+$/.test(q) ? q.padStart(4, '0') : q;

                  const matchBusca = q
                    ? local.nome.toLowerCase().includes(q) ||
                      local.endereco.toLowerCase().includes(q) ||
                      (local.bairro && local.bairro.toLowerCase().includes(q)) ||
                      local.zona.includes(q) ||
                      (local.secoes && local.secoes.some(s => s.numero.includes(q) || s.numero.includes(qPad)))
                    : true;
                  return matchZona && matchBusca;
                })
                .map((local) => {
                  const isSelected = localSelecionado && localSelecionado.id === local.id;
                  const q = buscaLocal.trim();
                  const qPad = /^\d+$/.test(q) ? q.padStart(4, '0') : q;
                  const temSecaoBuscada = q && local.secoes.some(s => s.numero === qPad);

                  return (
                    <button
                      key={local.id}
                      onClick={() => onSelectLocal(local)}
                      className={`p-3 rounded-xl border text-left transition ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-600/15 border-blue-500 dark:border-blue-500/70 shadow-xs ring-1 ring-blue-400 dark:ring-blue-500/50'
                          : temSecaoBuscada
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-500/60 ring-1 ring-emerald-400 dark:ring-emerald-500/40 shadow-xs'
                          : 'bg-slate-50/70 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/70 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
                          🏫 {local.nome}
                        </span>
                        <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-mono border border-slate-300 dark:border-slate-700 shrink-0">
                          Zona {local.zona}
                        </span>
                      </div>
                      {local.bairro && (
                        <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mb-0.5 truncate">
                          📍 {local.bairro}
                        </p>
                      )}
                      {temSecaoBuscada && (
                        <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-500/30 mb-1 inline-block">
                          🎯 Contém a Seção {qPad}!
                        </p>
                      )}
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mb-1">
                        {local.endereco}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>Total de urnas neste local:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{local.totalSecoes} seções eleitorais</span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* ETAPA 3: Se um Local de Votação foi Selecionado -> Grade de Seções Eleitorais */}
          {localSelecionado && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Vote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Seções Eleitorais em "{localSelecionado.nome}":
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Clique em qualquer seção para abrir o Boletim de Urna (BU) oficial de todos os cargos
                  </p>
                </div>
                <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  {localSelecionado.secoes.length} urnas apuradas
                </span>
              </div>

              {/* Grid de Seções */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {localSelecionado.secoes.map((sec) => {
                  const isSelected = secaoSelecionada && secaoSelecionada.numero === sec.numero;
                  return (
                    <button
                      key={sec.numero}
                      onClick={() => {
                        onSelectSecao(sec);
                        onOpenSecaoModal();
                      }}
                      className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 group ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-600/20 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold shadow-xs'
                          : 'bg-slate-50/70 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500/60 hover:bg-emerald-50/40 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Seção
                      </span>
                      <span className="text-sm font-mono tabular-nums font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                        {sec.numero}
                      </span>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <FileText className="w-2.5 h-2.5 text-blue-500 dark:text-blue-400" />
                        Ver BU Oficial
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

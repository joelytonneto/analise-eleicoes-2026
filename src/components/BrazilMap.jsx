import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { BRAZIL_STATES, PARTIDOS_CORES } from '../data/brazilStates';
import brazilStatesGeo from '../data/brazilStatesGeo.json';
import tseFullData from '../data/tseFullResults2026.json';
import { 
  Layers, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  School, 
  MapPin, 
  Building2, 
  Vote, 
  FileText, 
  X,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

const IBGE_CODE_TO_UF = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL',
  '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR',
  '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF'
};

const BASEMAP_TILES = {
  dark: {
    name: 'Dark Canvas',
    url: 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16
  },
  light: {
    name: 'Light Gray',
    url: 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16
  },
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  },
  satellite: {
    name: 'Satélite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS',
    maxZoom: 18
  }
};

export default function BrazilMap({
  theme = 'dark',
  cargoAtual = 'PRESIDENTE',
  turnoAtual = 1,
  estadoAtual,
  municipiosDisponiveis = [],
  municipioAtual,
  locaisVotacao = [],
  localSelecionado,
  secaoSelecionada,
  zonaSelecionada = 'TODAS',
  onSelectZona,
  onSelectEstado,
  onSelectMunicipio,
  onSelectLocal,
  onSelectSecao,
  onOpenSecaoModal,
  onResetToBrasil
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const geojsonLayerRef = useRef(null);
  const markersGroupRef = useRef(null);
  
  const [currentBasemap, setCurrentBasemap] = useState(theme === 'light' ? 'light' : 'dark');

  // Sincroniza basemap com o tema claro/escuro
  useEffect(() => {
    if (theme === 'light' && currentBasemap === 'dark') {
      handleBasemapChange('light');
    } else if (theme === 'dark' && currentBasemap === 'light') {
      handleBasemapChange('dark');
    }
  }, [theme]);

  // Inicializa o mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-14.235, -51.9253],
        zoom: 4,
        minZoom: 3,
        maxZoom: 18,
        zoomControl: false,
        attributionControl: false
      });

      // Basemap layer
      const basemap = BASEMAP_TILES[currentBasemap];
      tileLayerRef.current = L.tileLayer(basemap.url, {
        maxZoom: basemap.maxZoom,
        attribution: basemap.attribution
      }).addTo(map);

      // Grupos de camadas
      geojsonLayerRef.current = L.geoJSON(null).addTo(map);
      markersGroupRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }
  }, []);

  // Troca de Basemap
  const handleBasemapChange = (type) => {
    setCurrentBasemap(type);
    const map = mapInstanceRef.current;
    if (!map || !tileLayerRef.current) return;

    map.removeLayer(tileLayerRef.current);
    const basemap = BASEMAP_TILES[type];
    tileLayerRef.current = L.tileLayer(basemap.url, {
      maxZoom: basemap.maxZoom,
      attribution: basemap.attribution
    }).addTo(map);

    if (geojsonLayerRef.current) geojsonLayerRef.current.bringToFront();
  };

  // Helper para identificar o vencedor/cor do estado para o cargo atual
  const getStateElectoralData = (sigla) => {
    const state = BRAZIL_STATES.find(s => s.sigla === sigla) || BRAZIL_STATES[0];
    const estadoUf = tseFullData.estados[sigla];
    const cargoData = estadoUf?.cargos[cargoAtual];
    const topCand = cargoData?.candidatos?.[0];

    let partidoPredominante = topCand ? topCand.partido : 'PL';
    let legendaVencedor = topCand ? `${topCand.nome} (${topCand.partido}) - ${topCand.pct}%` : `${state.nome}`;

    const partyColor = PARTIDOS_CORES[partidoPredominante] || '#3b82f6';
    return { state, partidoPredominante, legendaVencedor, partyColor };
  };

  // Atualiza as camadas de acordo com o nível atual
  useEffect(() => {
    const map = mapInstanceRef.current;
    const geojsonLayer = geojsonLayerRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !geojsonLayer || !markersGroup) return;

    markersGroup.clearLayers();
    geojsonLayer.clearLayers();

    // =========================================================================
    // NÍVEL 3: MUNICÍPIO -> Exibir Locais de Votação (Colégios / Escolas) no Mapa
    // =========================================================================
    if (municipioAtual && locaisVotacao && locaisVotacao.length > 0) {
      const locaisParaExibir = (zonaSelecionada && zonaSelecionada !== 'TODAS')
        ? locaisVotacao.filter(l => l.zona === zonaSelecionada)
        : locaisVotacao;

      if (localSelecionado) {
        map.flyTo([localSelecionado.lat, localSelecionado.lng], 16, { duration: 1.0 });
      } else if (zonaSelecionada && zonaSelecionada !== 'TODAS' && locaisParaExibir.length > 0) {
        map.flyTo([locaisParaExibir[0].lat, locaisParaExibir[0].lng], 14, { duration: 1.0 });
      } else if (locaisParaExibir.length > 0) {
        const bounds = L.latLngBounds(locaisParaExibir.map(l => [l.lat, l.lng]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      } else {
        map.flyTo([municipioAtual.lat, municipioAtual.lng], 13, { duration: 1.2 });
      }

      locaisParaExibir.forEach((local) => {
        const isSelected = localSelecionado && localSelecionado.id === local.id;

        const markerHtml = `
          <div class="relative flex items-center justify-center cursor-pointer group">
            <div class="absolute -inset-2 rounded-full ${
              isSelected ? 'bg-emerald-400 animate-ping opacity-75' : 'bg-blue-500 opacity-30'
            }"></div>
            <div class="relative w-9 h-9 rounded-full flex items-center justify-center shadow-2xl transition-transform transform group-hover:scale-125 ${
              isSelected
                ? 'bg-emerald-600 text-white ring-4 ring-emerald-300'
                : 'bg-slate-900 text-blue-400 border-2 border-blue-500/80'
            }">
              <span class="text-base">🏫</span>
            </div>
            <div class="absolute -top-7 whitespace-nowrap bg-slate-950/95 text-white border border-slate-700 text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none">
              ${local.totalSecoes} Urnas (${local.bairro ? local.bairro + ' • ' : ''}Zona ${local.zona})
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: markerHtml,
          className: 'custom-school-marker',
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        const marker = L.marker([local.lat, local.lng], { icon: customIcon });

        // Cria a grade de botões de seções dentro do Popup do Leaflet
        const secoesButtonsHtml = local.secoes.map(sec => `
          <button 
            id="btn-popup-sec-${local.id}-${sec.numero}" 
            class="px-2 py-1 text-[11px] font-mono font-bold bg-slate-900 hover:bg-emerald-600 text-slate-200 hover:text-white rounded border border-slate-700 transition"
          >
            Seção ${sec.numero}
          </button>
        `).join('');

        const popupContent = `
          <div class="p-2 space-y-2 text-slate-100 max-w-[290px]">
            <div class="border-b border-slate-800 pb-1.5">
              <h4 class="font-bold text-xs text-white flex items-center gap-1">
                🏫 ${local.nome}
              </h4>
              <p class="text-[10px] text-emerald-400 font-semibold">
                Zona Eleitoral ${local.zona} ${local.bairro ? `• ${local.bairro}` : ''}
              </p>
              <p class="text-[10px] text-slate-400">${local.totalSecoes} Urnas Eletrônicas Apuradas</p>
            </div>
            <p class="text-[11px] text-slate-300">${local.endereco}</p>
            <div>
              <span class="text-[10px] text-emerald-400 font-bold block mb-1">
                Escolha a Seção Eleitoral desta escola:
              </span>
              <div class="grid grid-cols-3 gap-1 max-h-36 overflow-y-auto pr-0.5">
                ${secoesButtonsHtml}
              </div>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, { maxWidth: 300 });

        marker.on('popupopen', () => {
          onSelectLocal(local);
          // Adiciona listener para cada botão de seção dentro do popup
          local.secoes.forEach(sec => {
            const btn = document.getElementById(`btn-popup-sec-${local.id}-${sec.numero}`);
            if (btn) {
              btn.onclick = () => {
                onSelectSecao(sec);
                if (onOpenSecaoModal) onOpenSecaoModal();
                map.closePopup();
              };
            }
          });
        });

        marker.on('click', () => {
          onSelectLocal(local);
        });

        marker.addTo(markersGroup);

        if (isSelected) {
          setTimeout(() => {
            marker.openPopup();
          }, 350);
        }
      });

      return;
    }

    // =========================================================================
    // NÍVEL 2: ESTADO (UF) -> Exibir Cidades (Municípios) do Estado no Mapa!
    // =========================================================================
    if (estadoAtual) {
      map.flyTo([estadoAtual.lat, estadoAtual.lng], 7, { duration: 1.2 });

      // Destacar o polígono do estado atual
      geojsonLayer.addData(brazilStatesGeo);
      geojsonLayer.eachLayer((layer) => {
        const codarea = layer.feature.properties.codarea;
        const sigla = IBGE_CODE_TO_UF[codarea];
        const isCurrent = sigla === estadoAtual.sigla;
        const { partyColor } = getStateElectoralData(sigla);

        layer.setStyle({
          fillColor: partyColor,
          fillOpacity: isCurrent ? 0.35 : 0.05,
          weight: isCurrent ? 3 : 1,
          color: isCurrent ? '#ffffff' : '#334155',
          dashArray: isCurrent ? '' : '3'
        });

        if (isCurrent) layer.bringToFront();
      });

      // RENDERIZAR TODAS AS CIDADES DO ESTADO (ex: 184 no CE, 645 em SP)
      (municipiosDisponiveis || []).forEach((mun, idx) => {
        const cityKey = `${estadoAtual.sigla}_${mun.codigoTse}`;
        const cityData = tseFullData.cidades[cityKey];
        const cargoCity = cityData?.cargos[cargoAtual];
        const topCand = cargoCity?.candidatos?.[0];
        const partyColor = topCand ? (PARTIDOS_CORES[topCand.partido] || '#3b82f6') : '#3b82f6';
        const isDestaque = mun.capital || idx < 5;

        let marker;

        if (isDestaque) {
          // Capital e cidades polo com badge completo
          const cityMarkerHtml = `
            <div class="cursor-pointer group flex flex-col items-center">
              <div class="relative w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-xl transition-transform duration-200 group-hover:scale-125" style="background-color: ${partyColor}; border: 2px solid #ffffff; box-shadow: 0 4px 12px ${partyColor}90;">
                ★
              </div>
              <div class="mt-0.5 whitespace-nowrap bg-slate-950/90 text-slate-100 border border-slate-700 text-[10px] font-bold px-1.5 py-0.2 rounded shadow pointer-events-none group-hover:text-blue-400">
                ${mun.nome}
              </div>
            </div>
          `;

          const cityIcon = L.divIcon({
            html: cityMarkerHtml,
            className: 'custom-city-marker',
            iconSize: [32, 42],
            iconAnchor: [16, 21]
          });

          marker = L.marker([mun.lat, mun.lng], { icon: cityIcon });
        } else {
          // Demais municípios como círculos vetoriais de alta performance e elegância
          marker = L.circleMarker([mun.lat, mun.lng], {
            radius: 5,
            color: '#ffffff',
            weight: 1,
            fillColor: partyColor,
            fillOpacity: 0.85
          });

          marker.bindTooltip(`<b>${mun.nome}</b><br/><span style="font-size:10px;color:#94a3b8">${topCand ? topCand.nome + ' (' + topCand.pct + '%)' : mun.secoesTotais + ' seções'}</span>`, {
            direction: 'top',
            offset: [0, -6],
            className: 'custom-leaflet-tooltip'
          });

          marker.on('mouseover', () => {
            marker.setStyle({ radius: 8, weight: 2, fillOpacity: 1 });
          });
          marker.on('mouseout', () => {
            marker.setStyle({ radius: 5, weight: 1, fillOpacity: 0.85 });
          });
        }

        const popupContent = `
          <div class="p-2 space-y-2 text-slate-100 min-w-[240px]">
            <div class="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <div>
                <h4 class="font-bold text-xs text-white">${mun.nome} (${estadoAtual.sigla})</h4>
                <p class="text-[10px] text-slate-400">Cód. TSE: ${mun.codigoTse || 'N/A'}</p>
              </div>
              <span class="px-2 py-0.5 text-[10px] font-bold rounded" style="background-color: ${partyColor}30; color: ${partyColor}; border: 1px solid ${partyColor}">
                ${topCand?.partido || 'TSE'}
              </span>
            </div>

            <div class="space-y-1 text-xs">
              <div class="flex justify-between text-slate-300">
                <span>Eleitorado Apto:</span>
                <span class="font-bold font-mono text-white">${mun.eleitores.toLocaleString('pt-BR')}</span>
              </div>
              <div class="flex justify-between text-slate-300">
                <span>Urnas Eletrônicas:</span>
                <span class="font-bold font-mono text-emerald-400">${mun.secoesTotais.toLocaleString('pt-BR')} seções</span>
              </div>
              ${topCand ? `
                <div class="p-1.5 bg-slate-950 rounded border border-slate-800 text-[11px]">
                  <span class="text-slate-400 block text-[10px]">Líder em ${cargoAtual}:</span>
                  <span class="font-bold text-white">${topCand.nome} (${topCand.partido})</span>
                  <span class="text-emerald-400 font-bold ml-1">${topCand.pct}%</span>
                </div>
              ` : ''}
            </div>

            <button id="btn-enter-city-${mun.codigoTse || mun.nome}" class="w-full mt-2 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition shadow-md flex items-center justify-center gap-1">
              Entrar na Cidade (Ver Colégios e Seções) →
            </button>
          </div>
        `;

        marker.bindPopup(popupContent, { maxWidth: 280 });

        marker.on('popupopen', () => {
          const btn = document.getElementById(`btn-enter-city-${mun.codigoTse || mun.nome}`);
          if (btn) {
            btn.onclick = () => {
              onSelectMunicipio(mun);
              map.closePopup();
            };
          }
        });

        marker.on('click', () => {
          onSelectMunicipio(mun);
        });

        marker.addTo(markersGroup);
      });

      return;
    }

    // =========================================================================
    // NÍVEL 1: BRASIL -> Polígonos Oficiais do IBGE das 27 UFs
    // =========================================================================
    map.flyTo([-14.235, -51.9253], 4, { duration: 1.0 });

    geojsonLayer.addData(brazilStatesGeo);

    geojsonLayer.eachLayer((layer) => {
      const codarea = layer.feature.properties.codarea;
      const sigla = IBGE_CODE_TO_UF[codarea];
      const { state, partidoPredominante, legendaVencedor, partyColor } = getStateElectoralData(sigla);

      layer.setStyle({
        fillColor: partyColor,
        fillOpacity: 0.50,
        weight: 1.5,
        color: '#1e293b',
        opacity: 0.9
      });

      layer.on('mouseover', () => {
        layer.setStyle({
          fillOpacity: 0.80,
          weight: 2.5,
          color: '#ffffff'
        });
        layer.bringToFront();
      });

      layer.on('mouseout', () => {
        layer.setStyle({
          fillColor: partyColor,
          fillOpacity: 0.50,
          weight: 1.5,
          color: '#1e293b'
        });
      });

      const popupContent = `
        <div class="p-2 space-y-2 text-slate-100 min-w-[220px]">
          <div class="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div>
              <h4 class="font-bold text-sm text-white">${state.nome} (${state.sigla})</h4>
              <span class="text-[10px] text-slate-400">Região ${state.regiao}</span>
            </div>
            <span class="px-2 py-0.5 text-xs font-bold rounded" style="background-color: ${partyColor}30; color: ${partyColor}; border: 1px solid ${partyColor}">
              ${partidoPredominante}
            </span>
          </div>

          <div class="space-y-1 text-xs">
            <div class="flex justify-between text-slate-300">
              <span>Liderança (${cargoAtual}):</span>
              <span class="font-semibold text-white truncate max-w-[140px]">${legendaVencedor}</span>
            </div>
            <div class="flex justify-between text-slate-400">
              <span>Eleitorado:</span>
              <span class="text-white font-mono">${state.eleitores.toLocaleString('pt-BR')}</span>
            </div>
            <div class="flex justify-between text-slate-400">
              <span>Total de Seções:</span>
              <span class="text-emerald-400 font-mono font-bold">${state.secoesTotais.toLocaleString('pt-BR')}</span>
            </div>
          </div>

          <button id="btn-select-uf-${state.sigla}" class="w-full mt-2 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition shadow-md">
            Ver Cidades de ${state.sigla} no Mapa →
          </button>
        </div>
      `;

      layer.bindPopup(popupContent, { maxWidth: 300 });
      layer.on('popupopen', () => {
        const btn = document.getElementById(`btn-select-uf-${state.sigla}`);
        if (btn) {
          btn.onclick = () => {
            onSelectEstado(state);
            map.closePopup();
          };
        }
      });

      layer.on('click', () => {
        onSelectEstado(state);
      });
    });

    // Marcadores de Sigla
    BRAZIL_STATES.forEach((state) => {
      const { partyColor } = getStateElectoralData(state.sigla);

      const stateMarkerHtml = `
        <div class="cursor-pointer group flex flex-col items-center">
          <div class="relative w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] text-white shadow-xl transition-transform duration-200 group-hover:scale-125" style="background-color: ${partyColor}; border: 1.5px solid rgba(255,255,255,0.9); box-shadow: 0 4px 12px ${partyColor}80;">
            ${state.sigla}
          </div>
        </div>
      `;

      const stateIcon = L.divIcon({
        html: stateMarkerHtml,
        className: 'custom-state-marker',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([state.lat, state.lng], { icon: stateIcon });
      marker.on('click', () => onSelectEstado(state));
      marker.addTo(markersGroup);
    });

  }, [cargoAtual, turnoAtual, estadoAtual, municipiosDisponiveis, municipioAtual, locaisVotacao, localSelecionado, zonaSelecionada]);

  return (
    <div className="relative w-full h-[560px] lg:h-[640px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-2xl bg-slate-100 dark:bg-slate-950 transition-colors">
      {/* Container do Mapa Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Floating Controls Overlay (Top-Right) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={onResetToBrasil}
          title="Visão Geral do Brasil"
          className="p-2.5 bg-white/95 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-md backdrop-blur-md transition flex items-center justify-center hover:text-blue-600 dark:hover:text-white"
        >
          <RotateCcw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </button>
        <button
          onClick={() => mapInstanceRef.current?.zoomIn()}
          title="Aproximar Zoom"
          className="p-2.5 bg-white/95 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-md backdrop-blur-md transition flex items-center justify-center hover:text-blue-600 dark:hover:text-white"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => mapInstanceRef.current?.zoomOut()}
          title="Afastar Zoom"
          className="p-2.5 bg-white/95 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-md backdrop-blur-md transition flex items-center justify-center hover:text-blue-600 dark:hover:text-white"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* Selector de Basemap Layer & Status Pill (Top-Left) */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 flex-wrap max-w-xl">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-xs px-3.5 py-1.5 rounded-xl shadow-md flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-slate-500 dark:text-slate-400">Nível no Mapa:</span>
          <span className="font-bold text-slate-900 dark:text-white">
            {!estadoAtual
              ? 'Nacional (Clique no Estado)'
              : !municipioAtual
              ? `Estadual: ${estadoAtual.nome} (Clique na Cidade)`
              : `Municipal: ${municipioAtual.nome} (Clique na Escola)`}
          </span>
        </div>

        {/* Seletor de visual do mapa */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-1 rounded-xl shadow-md flex items-center gap-1 text-[11px]">
          <button
            onClick={() => handleBasemapChange('light')}
            className={`px-2 py-1 rounded-lg transition font-medium ${
              currentBasemap === 'light'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Light
          </button>
          <button
            onClick={() => handleBasemapChange('dark')}
            className={`px-2 py-1 rounded-lg transition font-medium ${
              currentBasemap === 'dark'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Dark
          </button>
          <button
            onClick={() => handleBasemapChange('osm')}
            className={`px-2 py-1 rounded-lg transition font-medium ${
              currentBasemap === 'osm'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            OSM
          </button>
          <button
            onClick={() => handleBasemapChange('satellite')}
            className={`px-2 py-1 rounded-lg transition font-medium ${
              currentBasemap === 'satellite'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Satélite
          </button>
        </div>
      </div>

      {/* Barra de Filtro de Zona Eleitoral (quando no nível municipal e houver múltiplas zonas) */}
      {municipioAtual && municipioAtual.zonas && municipioAtual.zonas.length > 1 && (
        <div className="absolute top-16 left-4 right-16 z-20 flex items-center gap-1.5 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md border border-slate-200 dark:border-slate-800/90 p-1.5 rounded-xl shadow-lg overflow-x-auto scrollbar-thin">
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 px-2 shrink-0 flex items-center gap-1">
            🏛️ Zonas ({municipioAtual.zonas.length}):
          </span>
          <button
            onClick={() => onSelectZona && onSelectZona('TODAS')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition shrink-0 ${
              zonaSelecionada === 'TODAS'
                ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-500'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80'
            }`}
          >
            Todas as Zonas ({locaisVotacao.length} locais)
          </button>
          {municipioAtual.zonas
            .slice()
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map((z) => {
              const zLocs = locaisVotacao.filter((l) => l.zona === z);
              const zNomeCurto = zLocs[0]?.bairro ? zLocs[0].bairro.split('/')[0].trim() : '';
              const isActive = zonaSelecionada === z;
              return (
                <button
                  key={z}
                  onClick={() => onSelectZona && onSelectZona(z)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition shrink-0 flex items-center gap-1 ${
                    isActive
                      ? 'bg-blue-600 text-white font-bold shadow-xs ring-1 ring-blue-400'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80'
                  }`}
                  title={`Zona ${z}${zNomeCurto ? ' - ' + zNomeCurto : ''}`}
                >
                  <span className="font-mono">Zona {z}</span>
                  {zNomeCurto && (
                    <span className="text-[10px] opacity-80">({zNomeCurto})</span>
                  )}
                </button>
              );
            })}
        </div>
      )}

      {/* PAINEL FLUTUANTE DE ESCOLHA DE SEÇÃO DIRETO NO MAPA! */}
      {municipioAtual && localSelecionado && (
        <div className="absolute bottom-4 left-4 right-4 md:right-auto md:max-w-md z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border border-emerald-400 dark:border-emerald-500/50 p-3.5 rounded-2xl shadow-xl space-y-2.5 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <School className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="truncate max-w-[240px]">{localSelecionado.nome}</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Zona {localSelecionado.zona} • {municipioAtual.nome} - {estadoAtual.sigla}
              </p>
            </div>
            <button
              onClick={() => onSelectLocal(null)}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mb-1.5">
              <Vote className="w-3.5 h-3.5" />
              Clique na Urna/Seção para Abrir o Boletim de Urna (BU):
            </span>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-36 overflow-y-auto pr-1">
              {localSelecionado.secoes.map((sec) => (
                <button
                  key={sec.numero}
                  onClick={() => {
                    onSelectSecao(sec);
                    if (onOpenSecaoModal) onOpenSecaoModal();
                  }}
                  className="px-2 py-1.5 bg-slate-50 dark:bg-slate-900 hover:bg-emerald-600 dark:hover:bg-emerald-600 text-slate-800 dark:text-slate-200 hover:text-white dark:hover:text-white rounded-lg border border-slate-200 dark:border-slate-700/80 hover:border-emerald-500 text-center transition flex flex-col items-center justify-center group shadow-2xs"
                >
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 group-hover:text-white uppercase">Seção</span>
                  <span className="text-xs font-mono font-bold">{sec.numero}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

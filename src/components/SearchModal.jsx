import React, { useState, useEffect } from 'react';
import { Search, X, MapPin, Building2, Vote, School, ArrowRight } from 'lucide-react';
import { BRAZIL_STATES } from '../data/brazilStates';
import allMunicipalities from '../data/allMunicipalities.json';

export default function SearchModal({
  isOpen,
  onClose,
  onSelectStateAndCity,
  estadoAtual,
  municipioAtual
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const qRaw = query.trim();
    const qLower = qRaw.toLowerCase();
    const matches = [];

    // 1. Extração estruturada de parâmetros eleitorais da query
    // Suporta: "Zona 78", "Zona: 078", "Seção: 0393", "Sessão 0393", "0393", "078"
    const zonaMatch = qRaw.match(/(?:zona|\bze\b|\bz\b)\s*[:#]?\s*(\d{1,4})/i);
    const secaoMatch = qRaw.match(/(?:se[çc][ãa]o|sess[ãa]o|\bsec\b|\bs\b)\s*[:#]?\s*(\d{1,4})/i);
    const allNumbers = [...qRaw.matchAll(/\b(\d{1,4})\b/g)].map(m => m[1]);

    let zonaParsed = zonaMatch ? zonaMatch[1].padStart(4, '0') : null;
    let secaoParsed = secaoMatch ? secaoMatch[1].padStart(4, '0') : null;

    // 2. Busca por Cidade correspondente mencionada no texto
    let cidadeAlvo = null;
    let estadoAlvo = null;

    for (const [uf, cidades] of Object.entries(allMunicipalities)) {
      const stateObj = BRAZIL_STATES.find(s => s.sigla === uf);
      for (const c of cidades) {
        if (qLower.includes(c.nome.toLowerCase())) {
          cidadeAlvo = c;
          estadoAlvo = stateObj;
          break;
        }
      }
      if (cidadeAlvo) break;
    }

    // Se a cidade alvo não foi identificada no texto, usar o contexto atualmente selecionado no app
    if (!cidadeAlvo && municipioAtual && estadoAtual) {
      cidadeAlvo = municipioAtual;
      estadoAlvo = estadoAtual;
    }

    // Se houver números soltos (ex: "Itaitinga 0393" ou "078 0393")
    if (allNumbers.length > 0) {
      for (const n of allNumbers) {
        const pad4 = n.padStart(4, '0');
        if (cidadeAlvo && cidadeAlvo.zonas && cidadeAlvo.zonas.includes(pad4)) {
          if (!zonaParsed) zonaParsed = pad4;
        } else {
          if (!secaoParsed && n.length >= 2) {
            secaoParsed = pad4;
          }
        }
      }
    }

    // CASO 1: Cidade + Seção Específica (Prioridade Máxima!)
    if (cidadeAlvo && secaoParsed) {
      const zonaDesc = zonaParsed 
        ? `Zona ${zonaParsed}` 
        : (cidadeAlvo.zonas?.[0] ? `Zona ${cidadeAlvo.zonas[0]}` : '');

      matches.push({
        tipo: 'SECAO',
        titulo: `${cidadeAlvo.nome} - ${estadoAlvo.sigla} • Seção ${secaoParsed} ${zonaDesc ? `(${zonaDesc})` : ''}`,
        subtitulo: `Abrir Boletim de Urna (BU) oficial de todos os cargos para a Seção ${secaoParsed}`,
        estado: estadoAlvo,
        municipio: cidadeAlvo,
        secaoNum: secaoParsed
      });
    }

    // CASO 2: Cidade identificada (ou digitada)
    if (cidadeAlvo) {
      const zonaInfo = zonaParsed 
        ? `Zona Eleitoral ${zonaParsed}` 
        : (cidadeAlvo.zonasTotais > 1 
            ? `${cidadeAlvo.zonasTotais} Zonas Eleitorais` 
            : `Zona ${cidadeAlvo.zonas?.[0] || '0001'}`);

      matches.push({
        tipo: 'CIDADE',
        titulo: `${cidadeAlvo.nome} - ${estadoAlvo.sigla} (${zonaInfo})`,
        subtitulo: `${cidadeAlvo.eleitores.toLocaleString('pt-BR')} eleitores aptos • ${cidadeAlvo.secoesTotais} urnas eletrônicas`,
        estado: estadoAlvo,
        municipio: cidadeAlvo,
        secaoNum: secaoParsed || null
      });
    }

    // CASO 3: Busca por Zona Eleitoral se digitada (ex: "Zona 078", "078")
    if (zonaParsed && !cidadeAlvo) {
      Object.entries(allMunicipalities).forEach(([uf, cidades]) => {
        const stateObj = BRAZIL_STATES.find(s => s.sigla === uf);
        cidades.forEach((c) => {
          if (c.zonas && c.zonas.includes(zonaParsed) && matches.length < 8) {
            matches.push({
              tipo: 'CIDADE',
              titulo: `${c.nome} - ${uf} (Zona ${zonaParsed})`,
              subtitulo: `Município pertencente à Zona Eleitoral ${zonaParsed} • ${c.eleitores.toLocaleString('pt-BR')} eleitores`,
              estado: stateObj,
              municipio: c,
              secaoNum: secaoParsed || null
            });
          }
        });
      });
    }

    // CASO 4: Busca por Seção isolada sem cidade (ex: usuário digitou "0393")
    if (secaoParsed && !cidadeAlvo) {
      const ufRef = estadoAtual?.sigla || 'CE';
      const cityRef = (allMunicipalities[ufRef] && allMunicipalities[ufRef].find(c => c.nome === 'Itaitinga')) 
        || (allMunicipalities[ufRef] && allMunicipalities[ufRef][0]) 
        || allMunicipalities['CE'][0];
      const stateRef = BRAZIL_STATES.find(s => s.sigla === ufRef) || BRAZIL_STATES[0];

      matches.push({
        tipo: 'SECAO',
        titulo: `Ir para Seção ${secaoParsed} (${cityRef.nome} - ${ufRef})`,
        subtitulo: `Abrir Boletim de Urna (BU) oficial da seção ${secaoParsed}`,
        estado: stateRef,
        municipio: cityRef,
        secaoNum: secaoParsed
      });
    }

    // CASO 5: Busca textual por Estado
    BRAZIL_STATES.forEach((s) => {
      if (s.nome.toLowerCase().includes(qLower) || s.sigla.toLowerCase() === qLower) {
        if (!matches.some(m => m.tipo === 'ESTADO' && m.estado?.sigla === s.sigla)) {
          matches.push({
            tipo: 'ESTADO',
            titulo: `${s.nome} (${s.sigla})`,
            subtitulo: `Região ${s.regiao} • ${s.eleitores.toLocaleString('pt-BR')} eleitores`,
            estado: s,
            municipio: null
          });
        }
      }
    });

    // CASO 6: Busca textual por Município em todos os 5.570 municípios
    Object.entries(allMunicipalities).forEach(([uf, cidades]) => {
      const stateObj = BRAZIL_STATES.find(s => s.sigla === uf);
      cidades.forEach((c) => {
        if (c.nome.toLowerCase().includes(qLower) && matches.length < 15) {
          if (!matches.some(m => m.municipio?.codigoTse === c.codigoTse)) {
            matches.push({
              tipo: 'CIDADE',
              titulo: `${c.nome} - ${uf}`,
              subtitulo: `Zona ${c.zonas?.[0] || '0001'} • ${c.eleitores.toLocaleString('pt-BR')} eleitores • ${c.secoesTotais} urnas`,
              estado: stateObj,
              municipio: c
            });
          }
        }
      });
    });

    setResults(matches.slice(0, 8));
  }, [query, estadoAtual, municipioAtual]);

  // Listener para Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden transition-colors">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <Search className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 shrink-0" />
          <input
            type="text"
            placeholder="Digite o estado, cidade ou número da seção (ex: SP, Itaitinga, 0393)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length > 0 ? (
            <div className="space-y-1">
              {results.map((res, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onSelectStateAndCity(res.estado, res.municipio, res.secaoNum);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition group border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition">
                      {res.tipo === 'ESTADO' && <MapPin className="w-4 h-4" />}
                      {res.tipo === 'CIDADE' && <Building2 className="w-4 h-4" />}
                      {res.tipo === 'SECAO' && <Vote className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                        {res.titulo}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {res.subtitulo}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition" />
                </button>
              ))}
            </div>
          ) : query.trim() ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              Nenhum resultado encontrado para "{query}". Tente buscar por sigla (SP, CE, MG) ou nome de cidade.
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-500">
              <p className="font-semibold text-slate-600 dark:text-slate-400 mb-1">Sugestões de busca rápida:</p>
              <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                {['Itaitinga (CE)', 'Zona 078', 'Seção 0393', 'Fortaleza (CE)', 'São Paulo', 'Brasília'].map(s => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-300 rounded-lg text-[11px] border border-slate-200 dark:border-slate-700/60 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

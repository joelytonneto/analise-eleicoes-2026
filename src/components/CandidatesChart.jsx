import React from 'react';
import { Award, CheckCircle2, ChevronRight, User, ShieldCheck, Building2, MapPin } from 'lucide-react';
import { PARTIDOS_CORES, tseOfficial } from '../data/brazilStates';
import tseFullData from '../data/tseFullResults2026.json';

export default function CandidatesChart({
  cargoAtual,
  turnoAtual,
  estado,
  municipio,
  secao,
  boletimSecao
}) {
  let candidatos = [];
  let totalValidos = 0;
  let subtitulo = '';

  let isSecaoPendente = false;

  // 1. Nível Seção (Boletim de Urna Oficial)
  if (secao && boletimSecao && !boletimSecao.naoDisponivel && boletimSecao.estatisticas) {
    candidatos = boletimSecao.candidatos;
    totalValidos = boletimSecao.estatisticas.validos;
    subtitulo = `Boletim de Urna Oficial TSE • Seção ${secao.numero} (Zona ${secao.zona})`;
  } 
  // 1b. Nível Seção com microdados pendentes de download (fallback transparente para o Município)
  else if (secao && boletimSecao?.naoDisponivel && municipio && estado) {
    isSecaoPendente = true;
    const cityKey = `${estado.sigla}_${municipio.codigoTse}`;
    const cityData = tseFullData.cidades[cityKey];
    if (cityData && cityData.cargos[cargoAtual]) {
      const cargoCity = cityData.cargos[cargoAtual];
      totalValidos = cargoCity.validos;
      candidatos = cargoCity.candidatos.map(c => ({
        ...c,
        cor: PARTIDOS_CORES[c.partido] || '#64748b'
      }));
    }
    subtitulo = `Seção ${secao.numero} (Microdados pendentes) • Apuração Municipal de ${municipio.nome}`;
  }
  // 2. Nível Município (Dados Oficiais TSE por Cidade)
  else if (municipio && estado) {
    const cityKey = `${estado.sigla}_${municipio.codigoTse}`;
    const cityData = tseFullData.cidades[cityKey];

    if (cityData && cityData.cargos[cargoAtual]) {
      const cargoCity = cityData.cargos[cargoAtual];
      totalValidos = cargoCity.validos;
      candidatos = cargoCity.candidatos.map(c => ({
        ...c,
        cor: PARTIDOS_CORES[c.partido] || '#64748b'
      }));
      subtitulo = `Apuração Oficial TSE em ${municipio.nome} - ${estado.sigla}`;
    } else {
      // Fallback proporcional ao município baseado no estado
      const estadoUf = tseFullData.estados[estado.sigla];
      const cargoEst = estadoUf?.cargos[cargoAtual];
      if (cargoEst) {
        totalValidos = Math.round(cargoEst.validos * (municipio.eleitores / estado.eleitores));
        candidatos = cargoEst.candidatos.map(c => ({
          ...c,
          votos: Math.round(c.votos * (municipio.eleitores / estado.eleitores)),
          cor: PARTIDOS_CORES[c.partido] || '#64748b'
        }));
      }
      subtitulo = `Resultado Municipal: ${municipio.nome} (${estado.sigla})`;
    }
  } 
  // 3. Nível Estadual (Dados Oficiais TSE por Estado)
  else if (estado && tseFullData.estados[estado.sigla]) {
    const estadoUf = tseFullData.estados[estado.sigla];
    const cargoEst = estadoUf.cargos[cargoAtual];

    if (cargoEst) {
      totalValidos = cargoEst.validos;
      candidatos = cargoEst.candidatos.map(c => ({
        ...c,
        cor: PARTIDOS_CORES[c.partido] || '#64748b'
      }));
      subtitulo = `Totalização Oficial TSE no Estado de ${estado.nome} (${estado.sigla})`;
    }
  } 
  // 4. Nível Brasil (Nacional)
  else {
    if (cargoAtual === 'PRESIDENTE') {
      totalValidos = tseOfficial.totalValidos;
      candidatos = tseOfficial.candidatosBrasil.map(c => ({
        ...c,
        cor: PARTIDOS_CORES[c.partido] || '#64748b'
      }));
      subtitulo = 'Totalização Nacional Oficial (TSE Brasil)';
    } else {
      // Se selecionou Governador, Senador ou Deputado sem ter clicado em um estado
      candidatos = [
        {
          numero: '-',
          nome: `Selecione um Estado ou Cidade no Mapa para ver a apuração oficial de ${cargoAtual}`,
          partido: 'TSE',
          pct: '100.00',
          votos: 0,
          cor: '#64748b'
        }
      ];
      subtitulo = `Eleição para ${cargoAtual} é de circunscrição Estadual`;
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm dark:shadow-xl transition-colors">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              Resultado Oficial: {cargoAtual}
            </h3>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Oficial TSE
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-sm">
            {subtitulo}
          </p>
        </div>

        {cargoAtual === 'SENADOR' && (
          <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30 px-2 py-0.5 rounded-full font-medium shrink-0">
            2 Vagas (Renovação 2/3)
          </span>
        )}
      </div>

      {/* Aviso de Transparência se a seção estiver pendente */}
      {isSecaoPendente && (
        <div className="mb-3.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-300 text-xs flex items-start gap-2">
          <span className="shrink-0 text-sm">ℹ️</span>
          <div>
            <strong className="block font-semibold">Microdados desta Seção Pendentes:</strong>
            <span className="text-[11px] leading-relaxed">
              Diretriz de Transparência (Zero Fabricação): Para garantir 100% de precisão, exibimos a totalização oficial do município no TSE até que o arquivo criptográfico (<code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 rounded">.bu.dat</code>) desta urna seja sincronizado.
            </span>
          </div>
        </div>
      )}

      {/* Lista de Candidatos */}
      <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
        {candidatos.map((cand, idx) => {
          const isSenado = cargoAtual === 'SENADOR';
          const isWinner = cand.eleito || (isSenado && idx < 2);
          const badgeText = isSenado 
            ? (idx === 0 ? 'Eleito (1ª Vaga)' : (idx === 1 ? 'Eleito (2ª Vaga)' : null))
            : (cand.eleito ? 'Eleito' : null);

          return (
            <div
              key={cand.numero || idx}
              className={`p-3 rounded-xl border transition ${
                isWinner
                  ? 'bg-emerald-50/60 dark:bg-slate-950/90 border-emerald-300 dark:border-emerald-500/30 shadow-xs'
                  : 'bg-slate-50/70 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm font-mono tabular-nums"
                    style={{ backgroundColor: cand.cor || '#3b82f6' }}
                  >
                    {cand.numero}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {cand.nome}
                      </span>
                      {cand.partido && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                          {cand.partido}
                        </span>
                      )}
                    </div>
                    {cand.coligacao && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {cand.coligacao}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                    {cand.pct}%
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    {cand.votos ? cand.votos.toLocaleString('pt-BR') : '0'} votos
                  </div>
                </div>
              </div>

              {/* Barra de Progresso com Cor Partidária */}
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full transition-all duration-700 shadow-sm"
                  style={{
                    width: `${Math.min(100, Math.max(1.5, parseFloat(cand.pct) || 0))}%`,
                    backgroundColor: cand.cor || '#3b82f6'
                  }}
                />
              </div>

              {/* Badges de Resultado / Eleito */}
              {badgeText && (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/30 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    {badgeText}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

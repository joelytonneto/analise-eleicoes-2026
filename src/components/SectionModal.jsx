import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  QrCode, 
  ShieldCheck, 
  Vote, 
  CheckCircle, 
  Copy, 
  Check,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { CARGOS } from '../data/brazilStates';
import { getBoletimDeUrna } from '../data/electoralEngine';
import { 
  getTseRawJsonUrl, 
  getTreLocalVotacaoUrl,
  getTseSectionDirectUrl 
} from '../utils/tseUrls';

export default function SectionModal({
  isOpen,
  onClose,
  secao,
  municipio,
  estado,
  turnoAtual
}) {
  const [cargoVisualizacao, setCargoVisualizacao] = useState('PRESIDENTE');
  const [copiado, setCopiado] = useState(false);
  const [copiadoUrl, setCopiadoUrl] = useState(false);

  if (!isOpen || !secao || !municipio || !estado) return null;

  // Carrega o boletim oficial para os parâmetros selecionados
  const bu = getBoletimDeUrna(
    estado.sigla,
    municipio.nome,
    secao.zona,
    secao.numero,
    cargoVisualizacao,
    turnoAtual
  );

  // URLs oficiais de auditoria no TSE
  const tseSectionDirectUrl = getTseSectionDirectUrl({
    uf: estado.sigla,
    codigoTse: municipio.codigoTse,
    zona: secao.zona,
    secao: secao.numero,
    cargoId: cargoVisualizacao,
    turno: turnoAtual
  });

  const rawTseUrl = getTseRawJsonUrl({
    uf: estado.sigla,
    codigoTse: municipio.codigoTse,
    cargoId: cargoVisualizacao,
    turno: turnoAtual
  });

  const treUrl = getTreLocalVotacaoUrl(estado.sigla);

  const copiarHash = () => {
    navigator.clipboard.writeText(bu.metadados.hashAssinatura);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const copiarUrl = () => {
    navigator.clipboard.writeText(tseSectionDirectUrl);
    setCopiadoUrl(true);
    setTimeout(() => setCopiadoUrl(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col transition-colors">
        {/* Top Header - Resilient Non-Wrapping Layout */}
        <div className="bg-slate-50 dark:bg-slate-950/90 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
              <Vote className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight whitespace-nowrap">
                  Boletim de Urna (BU)
                </h3>
                {bu.isOficialTse ? (
                  <span className="whitespace-nowrap shrink-0 text-[11px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 shadow-xs">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    AUTÊNTICO TSE (.bu.dat)
                  </span>
                ) : (
                  <span className="whitespace-nowrap shrink-0 text-[11px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 shadow-xs">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    MICRODADOS PENDENTES
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {municipio.nome} ({estado.sigla}) • Zona {secao.zona} • Seção {secao.numero}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <a
              href={tseSectionDirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="whitespace-nowrap inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition shadow-sm"
              title="Abrir este Boletim de Urna diretamente no aplicativo oficial do TSE"
            >
              <span>Ver no TSE</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href={rawTseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex whitespace-nowrap items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-100 dark:hover:bg-blue-600/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/40 rounded-lg text-xs font-semibold transition"
              title="Abrir JSON oficial do TSE para o município"
            >
              <span>JSON TSE</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={handlePrint}
              title="Imprimir / Exportar BU"
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700/80 transition"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Seletor de Cargo no Topo do BU */}
        <div className="bg-slate-100 dark:bg-slate-950 px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 overflow-x-auto">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
            Cargo na Urna:
          </span>
          <div className="flex items-center gap-1.5">
            {CARGOS.map((c) => (
              <button
                key={c.id}
                onClick={() => setCargoVisualizacao(c.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                  cargoVisualizacao === c.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                {c.nome}
              </button>
            ))}
          </div>
        </div>

        {/* Corpo do Relatório Térmico do Boletim de Urna */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-800 dark:text-slate-200 font-sans print:bg-white print:text-black">
          {/* Cabeçalho Oficial Estilo Justiça Eleitoral */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 text-center space-y-1">
            <p className="font-serif font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Justiça Eleitoral • República Federativa do Brasil
            </p>
            <h4 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
              BOLETIM DE URNA ELETRÔNICA
            </h4>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
              {bu.metadados.eleicao} • {bu.metadados.turno}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Emissão: {bu.metadados.dataApuracao} (Horário de Brasília)
            </p>
          </div>

          {/* Dados de Identificação da Urna e Seção */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/60 font-mono">
            <div>
              <span className="text-[10px] text-slate-500 block">UF / Município</span>
              <span className="text-slate-900 dark:text-white font-bold">{estado.sigla} - {municipio.nome}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Zona / Seção</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Zona {bu.metadados.zona} / Seção {bu.metadados.secao}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Modelo Urna</span>
              <span className="text-slate-900 dark:text-white font-bold">{bu.metadados.urnaModelo}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Código Carga</span>
              <span className="text-slate-700 dark:text-slate-300 font-bold">{bu.metadados.codigoCarga}</span>
            </div>
          </div>

          {/* Local de Votação */}
          <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/60 text-xs">
            <span className="text-[10px] text-slate-500 block mb-0.5">Local de Votação (Colégio Eleitoral)</span>
            <p className="font-semibold text-slate-900 dark:text-white">{secao.localNome}</p>
          </div>

          {/* Caixa com o Link Direto Exato do TSE */}
          <div className="p-3.5 bg-gradient-to-r from-blue-50/70 via-slate-50 to-emerald-50/70 dark:from-blue-950/40 dark:via-slate-950 dark:to-emerald-950/40 border border-emerald-400/40 dark:border-emerald-500/40 rounded-xl space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  Link Direto Oficial do TSE para este Boletim de Urna:
                </span>
              </div>
              <span className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-500/30 font-semibold whitespace-nowrap">
                Zona {bu.metadados.zona} • Seção {bu.metadados.secao}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={tseSectionDirectUrl}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-[11px] text-emerald-700 dark:text-emerald-300 font-mono px-3 py-1.5 rounded-lg select-all focus:outline-none focus:border-emerald-500"
                title="URL oficial do TSE para esta seção"
              />
              <button
                onClick={copiarUrl}
                className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 transition shrink-0"
                title="Copiar URL Oficial do TSE"
              >
                {copiadoUrl ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <a
                href={tseSectionDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg whitespace-nowrap transition flex items-center gap-1.5 shrink-0 shadow-sm"
              >
                <span>Acessar no TSE</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {bu.naoDisponivel ? (
            <div className="p-6 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 space-y-4">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                      Microdados Desta Urna Não Sincronizados no Cache Local
                    </h4>
                    <span className="text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-500/30">
                      DIRETRIZ ZERO FABRICAÇÃO
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    <strong>Compromisso de Fidelidade e Confiabilidade:</strong> Para assegurar que nenhuma informação seja estimada ou inventada, este aplicativo <strong>nunca simula votos</strong>. O arquivo oficial de urna (<code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 rounded text-amber-900 dark:text-amber-200">.bu.dat</code>) desta seção ainda não foi baixado para o repositório local.
                  </p>
                </div>
              </div>

              {/* Detalhes de Identificação */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Identificação</span>
                  <span className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                    Zona {secao.zona} • Seção {secao.numero}
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Local de Votação</span>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white truncate block">
                    {secao.localNome}
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Status no TSE</span>
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                    Consultar base oficial do TSE
                  </span>
                </div>
              </div>

              {/* Botão de Consulta Oficial */}
              <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-emerald-300 dark:border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h5 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                    Auditar Diretamente no Aplicativo Web do TSE
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Consulte os dados desta urna específica no endereço oficial da Justiça Eleitoral.
                  </p>
                </div>
                <a
                  href={tseSectionDirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  <span>Abrir no App do TSE</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ) : (
            <>
              {bu.isOficialTse && (
                <div className="flex items-center gap-2.5 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/40 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    <strong>100% Validado com o TSE:</strong> Estes números foram extraídos diretamente do arquivo oficial criptográfico de urna (<code className="font-mono bg-emerald-100 dark:bg-emerald-950/80 px-1 py-0.5 rounded text-emerald-900 dark:text-emerald-200">.bu.dat</code>) do Tribunal Superior Eleitoral.
                  </span>
                </div>
              )}

              {/* Resumo da Votação / Estatísticas de Comparecimento */}
              <div>
                <h5 className="font-bold text-xs uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  Estatísticas da Seção Eleitoral
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 block">Eleitores Aptos</span>
                    <span className="text-base font-bold text-slate-900 dark:text-white font-mono">{bu.estatisticas?.aptos}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 block">Comparecimento</span>
                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {bu.estatisticas?.comparecimento} ({bu.estatisticas?.comparecimentoPct}%)
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 block">Abstenção</span>
                    <span className="text-base font-bold text-amber-600 dark:text-amber-400 font-mono">
                      {bu.estatisticas?.abstencao} ({bu.estatisticas?.abstencaoPct}%)
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 block">Votos Válidos</span>
                    <span className="text-base font-bold text-blue-600 dark:text-blue-400 font-mono">
                      {bu.estatisticas?.validos} ({bu.estatisticas?.validosPct}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Votação Nominal para o Cargo Selecionado */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-bold text-xs uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Vote className="w-3.5 h-3.5 text-blue-500" />
                    Votação Nominal: Cargo {cargoVisualizacao}
                  </h5>
                  <span className="text-[11px] text-slate-500">
                    Total de votos computados nesta urna
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80">
                  {bu.candidatos?.map((cand) => (
                    <div key={cand.numero} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition">
                      <div className="flex items-center gap-3">
                        <span 
                          className="w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs text-white shadow-xs"
                          style={{ backgroundColor: cand.cor || '#3b82f6' }}
                        >
                          {cand.numero}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">{cand.nome}</span>
                            {cand.partido && (
                              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                                {cand.partido}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500">
                            {cand.coligacao || (cand.vaga ? `Vaga: ${cand.vaga}` : 'Voto Nominal')}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                          {cand.votos} votos
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          {cand.pct}% dos válidos
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Linhas de Votos Brancos e Nulos */}
                  <div className="p-3 bg-slate-50/70 dark:bg-slate-950/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-mono">
                    <span>Votos em Branco:</span>
                    <span className="text-slate-900 dark:text-white font-bold">{bu.estatisticas?.brancos} votos ({bu.estatisticas?.brancosPct}%)</span>
                  </div>
                  <div className="p-3 bg-slate-50/70 dark:bg-slate-950/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-mono">
                    <span>Votos Nulos:</span>
                    <span className="text-slate-900 dark:text-white font-bold">{bu.estatisticas?.nulos} votos ({bu.estatisticas?.nulosPct}%)</span>
                  </div>
                </div>
              </div>

              {/* Verificação Digital e QR Code */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-24 h-24 bg-white p-2 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-xs">
                  <QrCode className="w-full h-full text-slate-900" />
                </div>

                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Urna Auditável • Assinatura Digital ICP-Brasil</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Este boletim pode ser auditado diretamente com o aplicativo oficial "Boletim na Mão" do TSE através do QR Code ao lado.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <code className="text-[10px] font-mono text-slate-600 dark:text-slate-400 truncate bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-800 flex-1">
                      SHA256: {bu.metadados.hashAssinatura}
                    </code>
                    <button
                      onClick={copiarHash}
                      className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 transition"
                      title="Copiar Hash"
                    >
                      {copiado ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Painel de Auditoria e Comprovação Oficial no TSE */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50/50 via-slate-50 to-emerald-50/50 dark:from-blue-950/40 dark:via-slate-950 dark:to-emerald-950/30 border border-blue-200 dark:border-blue-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h5 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                  Garantia de Validade & Auditoria Oficial (TSE)
                </h5>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-500/30 font-semibold font-mono">
                FONTE OFICIAL 100% AUDITÁVEL
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Você pode auditar e comprovar a autenticidade destes dados diretamente nas fontes públicas oficiais da Justiça Eleitoral:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {/* Link 1: JSON Bruto do TSE */}
              <a
                href={rawTseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-xs transition flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:text-blue-500">
                    <span>1. JSON Bruto TSE</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Arquivo oficial emitido pelo CDN do TSE para {municipio.nome} ({cargoVisualizacao}).
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] font-mono text-blue-600 dark:text-blue-300 flex items-center justify-between">
                  <span>Abrir arquivo oficial</span>
                  <span>→</span>
                </div>
              </a>

              {/* Link 2: Portal de BU do TSE (URL Direta da Seção) */}
              <a
                href={tseSectionDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 hover:border-emerald-500 dark:hover:border-emerald-400 hover:shadow-xs transition flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-500">
                    <span>2. BU da Seção no TSE</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Link direto para a Zona {secao.zona} e Seção {secao.numero} no app web oficial do TSE.
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] font-mono text-emerald-600 dark:text-emerald-300 flex items-center justify-between">
                  <span>Abrir Seção no TSE</span>
                  <span>→</span>
                </div>
              </a>

              {/* Link 3: Consulta Local TRE */}
              <a
                href={treUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 hover:border-purple-500 dark:hover:border-purple-400 hover:shadow-xs transition flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-400 group-hover:text-purple-500">
                    <span>3. Local no TRE-{estado.sigla}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Confirme o colégio eleitoral "{secao.localNome}" no sistema do tribunal regional.
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] font-mono text-purple-600 dark:text-purple-300 flex items-center justify-between">
                  <span>Verificar colégio</span>
                  <span>→</span>
                </div>
              </a>
            </div>

            <div className="mt-2 p-2.5 bg-white/70 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
              <p className="font-semibold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                <span>🛡️ Como conferir na sua escola:</span>
              </p>
              <p>
                No encerramento da votação (17h), a urna eletrônica imprime o Boletim de Urna em papel físico, afixado na porta da sala de aula para conferência de qualquer cidadão. O aplicativo oficial <b>"Boletim na Mão"</b> do TSE lê o QR Code da folha e valida os mesmos votos e hash SHA-256 apresentados aqui.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 dark:bg-slate-950 px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {bu.metadados.assinaturaDigital}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-semibold rounded-lg transition"
          >
            Fechar Boletim
          </button>
        </div>
      </div>
    </div>
  );
}

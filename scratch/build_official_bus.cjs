const fs = require('fs');

const tseFullData = JSON.parse(fs.readFileSync('src/data/tseFullResults2026.json', 'utf8'));
const ceCargos = tseFullData.estados['CE'].cargos;

// Cargo code mapping
const CARGO_MAP = {
  '1': 'PRESIDENTE',
  '3': 'GOVERNADOR',
  '5': 'SENADOR',
  '6': 'DEP_FEDERAL',
  '7': 'DEP_ESTADUAL'
};

// Build a candidate lookup by cargo and number
const candidateLookup = {};
for (const [cargoKey, cargoObj] of Object.entries(ceCargos)) {
  candidateLookup[cargoKey] = {};
  if (cargoObj.candidatos) {
    for (const cand of cargoObj.candidatos) {
      candidateLookup[cargoKey][cand.numero] = cand;
    }
  }
}

// Additional known candidates from CE / BU
const extraCandidates = {
  'PRESIDENTE': {
    '13': { nome: 'LULA', partido: 'PT', cor: '#ef4444' },
    '22': { nome: 'FLÁVIO BOLSONARO', partido: 'PL', cor: '#1d4ed8' },
    '70': { nome: 'ESCRITOR AUGUSTO CURY', partido: 'AVANTE', cor: '#10b981' },
    '14': { nome: 'RENAN SANTOS', partido: 'MISSÃO', cor: '#eab308' },
    '55': { nome: 'RONALDO CAIADO', partido: 'PSD', cor: '#0d9488' }
  },
  'GOVERNADOR': {
    '45': { nome: 'CIRO GOMES', partido: 'PSDB', cor: '#0284c7' },
    '13': { nome: 'ELMANO DE FREITAS', partido: 'PT', cor: '#ef4444' },
    '14': { nome: 'DELEGADO HUGGO', partido: 'MISSÃO', cor: '#eab308' },
    '30': { nome: 'VERA LÚCIA', partido: 'NOVO', cor: '#f97316' },
    '80': { nome: 'SERLEY LEAL', partido: 'UP', cor: '#9333ea' }
  },
  'SENADOR': {
    '222': { nome: 'ALCIDES FERNANDES', partido: 'PL', cor: '#1d4ed8' },
    '445': { nome: 'CAPITÃO WAGNER', partido: 'UNIÃO', cor: '#0284c7' },
    '400': { nome: 'CID GOMES', partido: 'PSB', cor: '#ea580c' },
    '180': { nome: 'LUIZIANNE', partido: 'REDE', cor: '#059669' },
    '800': { nome: 'CATARINA MATOS', partido: 'UP', cor: '#9333ea' },
    '300': { nome: 'GUILHERME THEOPHILO', partido: 'NOVO', cor: '#f97316' },
    '162': { nome: 'REGINALDO', partido: 'PSTU', cor: '#b91c1c' }
  },
  'DEP_FEDERAL': {
    '2222': { nome: 'ANDRÉ FERNANDES', partido: 'PL', cor: '#1d4ed8' },
    '4055': { nome: 'DR. ACILON', partido: 'PSB', cor: '#ea580c' },
    '5511': { nome: 'CÉLIO STUDART', partido: 'PSD', cor: '#0d9488' },
    '5050': { nome: 'RENATO ROSENO', partido: 'PSOL', cor: '#eab308' },
    '4077': { nome: 'TAINAH MARINHO', partido: 'PSB', cor: '#ea580c' },
    '2200': { nome: 'DAYANY DO CAPITÃO', partido: 'PL', cor: '#1d4ed8' },
    '2288': { nome: 'DR. JAZIEL', partido: 'PL', cor: '#1d4ed8' },
    '1010': { nome: 'RONALDO MARTINS', partido: 'REPUBLICANOS', cor: '#4338ca' }
  },
  'DEP_ESTADUAL': {
    '22221': { nome: 'ABREU JUNIOR', partido: 'PL', cor: '#1d4ed8' },
    '40555': { nome: 'MARCO AURÉLIO', partido: 'PSB', cor: '#ea580c' },
    '22022': { nome: 'BELLA CARMELO', partido: 'PL', cor: '#1d4ed8' },
    '50555': { nome: 'GABRIEL BIOLOGIA', partido: 'PSOL', cor: '#eab308' },
    '22777': { nome: 'DRA SILVANA', partido: 'PL', cor: '#1d4ed8' },
    '13000': { nome: 'DE ASSIS DINIZ', partido: 'PT', cor: '#ef4444' }
  }
};

function formatBuDate(jeDate) {
  // Format 20261004T171521 -> 04/10/2026 17:15:21
  if (!jeDate || jeDate.length < 15) return '04/10/2026 17:00:00';
  const y = jeDate.slice(0, 4);
  const m = jeDate.slice(4, 6);
  const d = jeDate.slice(6, 8);
  const hh = jeDate.slice(9, 11);
  const mm = jeDate.slice(11, 13);
  const ss = jeDate.slice(13, 15);
  return `${d}/${m}/${y} ${hh}:${mm}:${ss}`;
}

const secoes = ['0393', '0396', '0397', '0398', '0400'];
const officialBUs = {};

for (const sec of secoes) {
  const filePath = `C:/Users/Joelyton/.gemini/antigravity-cli/brain/1b3fb612-6d8c-47f3-848e-8c07c0083616/scratch/parsed_bu_${sec}.json`;
  if (!fs.existsSync(filePath)) continue;

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const ent = raw.conteudo.entidadeBoletimUrna;
  const ident = ent.identificacao;
  const mun = String(ident.municipioZona.municipio.value).padStart(5, '0');
  const zona = String(ident.municipioZona.zona.value).padStart(4, '0');
  const secaoNum = String(ident.secao.value).padStart(4, '0');
  const localNum = String(ident.local.value);
  const comparecimentoTotal = parseInt(ent.qtdEleitoresCompareceram.value, 10);
  const dataEmissao = formatBuDate(ent.dataHoraEmissao?.value);
  const urnModelo = ent.urna?.tipoUrna?.valueDesc || 'UE 2022';
  const codigoCarga = ent.urna?.correspondenciaResultado?.carga?.codigoCarga?.value || '987.654.321.000';

  const sectionData = {
    municipio: mun,
    zona: zona,
    secao: secaoNum,
    local: localNum,
    comparecimentoGeral: comparecimentoTotal,
    dataHoraEmissao: dataEmissao,
    urnaModelo: urnModelo,
    codigoCarga: codigoCarga,
    cargos: {}
  };

  const eleicoes = ent.resultadosVotacaoPorEleicao.content;
  for (const el of eleicoes) {
    const idEleicao = el.idEleicao.value;
    const aptos = parseInt(el.qtdEleitoresAptos?.value || '0', 10);
    const resVotacaoList = el.resultadosVotacao.content;

    for (const res of resVotacaoList) {
      const totaisCargo = res.totaisVotosCargo.content;
      for (const tot of totaisCargo) {
        const cargoCodTse = String(tot.codigoCargoConsulta.value);
        const cargoKey = CARGO_MAP[cargoCodTse] || `CARGO_${cargoCodTse}`;
        const cargoNome = tot.codigoCargoConsulta.valueDesc?.replace(/\.$/, '') || cargoKey;

        let brancos = 0;
        let nulos = 0;
        let nominais = 0;
        let legenda = 0;
        const candidatosList = [];

        if (tot.votosVotaveis && tot.votosVotaveis.content) {
          for (const v of tot.votosVotaveis.content) {
            const tipo = v.tipoVoto?.valueDesc || v.tipoVoto?.value;
            const qtd = parseInt(v.quantidadeVotos?.value || '0', 10);
            const num = v.identificacaoVotavel?.codigo?.value;
            const partidoNum = v.identificacaoVotavel?.partido?.value;

            if (tipo === 'branco' || tipo === '2') {
              brancos += qtd;
            } else if (tipo === 'nulo' || tipo === '3') {
              nulos += qtd;
            } else if (tipo === 'legenda' || tipo === '4') {
              legenda += qtd;
              candidatosList.push({
                numero: num || partidoNum,
                nome: `VOTO DE LEGENDA (${partidoNum})`,
                partido: partidoNum,
                votos: qtd,
                tipo: 'legenda'
              });
            } else {
              // nominal
              nominais += qtd;
              // lookup candidate info
              const candInfo = candidateLookup[cargoKey]?.[num] || extraCandidates[cargoKey]?.[num] || {
                nome: `CANDIDATO ${num}`,
                partido: partidoNum || 'OUTROS',
                cor: '#64748b'
              };

              candidatosList.push({
                numero: num,
                nome: candInfo.nome,
                partido: candInfo.partido || partidoNum,
                coligacao: candInfo.coligacao || '',
                cor: candInfo.cor || '#3b82f6',
                votos: qtd,
                tipo: 'nominal'
              });
            }
          }
        }

        const validos = nominais + legenda;
        const abstencao = aptos - comparecimentoTotal;

        // Sort descending
        candidatosList.sort((a, b) => b.votos - a.votos);

        // Add percentages
        const candidatosComPct = candidatosList.map(c => ({
          ...c,
          pct: validos > 0 ? ((c.votos / validos) * 100).toFixed(2) : '0.00'
        }));

        sectionData.cargos[cargoKey] = {
          cargoId: cargoKey,
          cargoNome: cargoNome,
          eleicaoId: idEleicao,
          aptos: aptos,
          comparecimento: comparecimentoTotal,
          comparecimentoPct: aptos > 0 ? ((comparecimentoTotal / aptos) * 100).toFixed(2) : '0.00',
          abstencao: abstencao,
          abstencaoPct: aptos > 0 ? ((abstencao / aptos) * 100).toFixed(2) : '0.00',
          validos: validos,
          validosPct: comparecimentoTotal > 0 ? ((validos / comparecimentoTotal) * 100).toFixed(2) : '0.00',
          brancos: brancos,
          brancosPct: comparecimentoTotal > 0 ? ((brancos / comparecimentoTotal) * 100).toFixed(2) : '0.00',
          nulos: nulos,
          nulosPct: comparecimentoTotal > 0 ? ((nulos / comparecimentoTotal) * 100).toFixed(2) : '0.00',
          candidatos: candidatosComPct
        };
      }
    }
  }

  officialBUs[`CE_13480_0078_${secaoNum}`] = sectionData;
}

const outPath = 'src/data/realSectionBUs.json';
fs.writeFileSync(outPath, JSON.stringify(officialBUs, null, 2));
console.log(`Saved ${Object.keys(officialBUs).length} official section BUs to ${outPath}!`);

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scratchDir = 'C:/Users/Joelyton/.gemini/antigravity-cli/brain/1b3fb612-6d8c-47f3-848e-8c07c0083616/scratch';
const chunk5857 = fs.readFileSync(path.join(scratchDir, 'chunk5857.js'), 'utf8');
const chunk369 = fs.readFileSync(path.join(scratchDir, 'chunk369.js'), 'utf8');

// Create webpack emulation environment
const modules = {};
const context = {
  console,
  self: {},
  window: {},
  document: {},
  Date,
  RegExp,
  Array,
  Object,
  String,
  Number,
  Boolean,
  Error,
  Promise,
  TextEncoder,
  TextDecoder,
  Uint8Array,
  FileReader: function() {}
};
context.self.webpackChunkapp = {
  push: function([ids, mods]) {
    Object.assign(modules, mods);
  }
};

vm.createContext(context);
vm.runInContext(chunk5857, context);
vm.runInContext(chunk369, context);

const installedModules = {};
function __webpack_require__(moduleId) {
  if (installedModules[moduleId]) return installedModules[moduleId].exports;
  const module = installedModules[moduleId] = { exports: {} };
  if (!modules[moduleId]) {
    return {
      rXU: () => {},
      VBU: () => {},
      jDH: () => {},
      $C: () => {},
      G2t: () => {},
      nKC: class {},
      d: (exports, defs) => {
        for (const key in defs) exports[key] = defs[key]();
      }
    };
  }
  modules[moduleId](module, module.exports, __webpack_require__);
  return module.exports;
}
__webpack_require__.d = (e, f) => {
  for (var d in f) {
    if (Object.prototype.hasOwnProperty.call(f, d) && !Object.prototype.hasOwnProperty.call(e, d)) {
      Object.defineProperty(e, d, { enumerable: true, get: f[d] });
    }
  }
};
__webpack_require__.r = (e) => {
  Object.defineProperty(e, "__esModule", { value: true });
};

const k = __webpack_require__(1648);
const F = __webpack_require__(1411);
const q = __webpack_require__(2611);
__webpack_require__(9071);

const start = chunk369.indexOf('const $={');
const end = chunk369.indexOf(',X=function(t){', start);
const specCode = chunk369.slice(start + 8, end);
const specObj = vm.runInContext('(' + specCode + ')', context);

const N = /^\s*(?:[0-9A-Fa-f][0-9A-Fa-f]\s*)+$/;
function decodeBu(binaryBuffer) {
  let t = binaryBuffer.toString('binary');
  let r = N.test(t) ? q.A.decode(t) : (F.A.re && F.A.re.test(t)) ? F.A.unarmor(t) : t;
  let n = k.A.decode(r, 0);
  n.setSpecification(specObj);
  return n.toJSON("", "");
}

// Load candidate databases
const tseFullData = JSON.parse(fs.readFileSync('src/data/tseFullResults2026.json', 'utf8'));
const ceCargos = tseFullData.estados['CE'].cargos;

const CARGO_MAP = {
  '1': 'PRESIDENTE',
  '3': 'GOVERNADOR',
  '5': 'SENADOR',
  '6': 'DEP_FEDERAL',
  '7': 'DEP_ESTADUAL'
};

const candidateLookup = {};
for (const [cargoKey, cargoObj] of Object.entries(ceCargos)) {
  candidateLookup[cargoKey] = {};
  if (cargoObj.candidatos) {
    for (const cand of cargoObj.candidatos) {
      candidateLookup[cargoKey][cand.numero] = cand;
    }
  }
}

const PARTIDOS_CORES = {
  'PT': '#ef4444',
  'PL': '#1d4ed8',
  'AVANTE': '#10b981',
  'MISSÃO': '#eab308',
  'PSD': '#0d9488',
  'NOVO': '#f97316',
  'UP': '#9333ea',
  'PSTU': '#b91c1c',
  'DC': '#0284c7',
  'PCB': '#dc2626',
  'DEMOCRATA': '#6366f1',
  'PCO': '#991b1b',
  'UNIÃO': '#0284c7',
  'MDB': '#16a34a',
  'REPUBLICANOS': '#4338ca',
  'PP': '#0369a1',
  'PSB': '#ea580c',
  'PDT': '#b91c1c',
  'PSOL': '#eab308',
  'PODEMOS': '#059669',
  'OUTROS': '#64748b'
};

function formatBuDate(jeDate) {
  if (!jeDate || jeDate.length < 15) return '04/10/2026 17:00:00';
  const y = jeDate.slice(0, 4);
  const m = jeDate.slice(4, 6);
  const d = jeDate.slice(6, 8);
  const hh = jeDate.slice(9, 11);
  const mm = jeDate.slice(11, 13);
  const ss = jeDate.slice(13, 15);
  return `${d}/${m}/${y} ${hh}:${mm}:${ss}`;
}

const officialBUs = {};

// Process all bu_*.dat files in scratch
const files = fs.readdirSync(scratchDir).filter(f => f.startsWith('bu_') && f.endsWith('.dat'));
console.log(`Found ${files.length} dat files to process:`, files);

for (const file of files) {
  const filePath = path.join(scratchDir, file);
  const buf = fs.readFileSync(filePath);
  const raw = decodeBu(buf);

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
                tipo: 'legenda',
                cor: PARTIDOS_CORES[partidoNum] || '#64748b'
              });
            } else {
              nominais += qtd;
              const candInfo = candidateLookup[cargoKey]?.[num] || {
                nome: `CANDIDATO ${num}`,
                partido: partidoNum || 'OUTROS',
                cor: '#64748b'
              };

              const partido = candInfo.partido || partidoNum;
              candidatosList.push({
                numero: num,
                nome: candInfo.nome,
                partido: partido,
                coligacao: candInfo.coligacao || '',
                cor: PARTIDOS_CORES[partido] || candInfo.cor || '#3b82f6',
                votos: qtd,
                tipo: 'nominal'
              });
            }
          }
        }

        const validos = nominais + legenda;
        const abstencao = aptos - comparecimentoTotal;

        candidatosList.sort((a, b) => b.votos - a.votos);

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

  officialBUs[`CE_${mun}_${zona}_${secaoNum}`] = sectionData;
  console.log(`Processed Seção ${secaoNum} successfully.`);
}

const outPath = 'src/data/realSectionBUs.json';
fs.writeFileSync(outPath, JSON.stringify(officialBUs, null, 2));
console.log(`Saved ${Object.keys(officialBUs).length} official section BUs to ${outPath}!`);

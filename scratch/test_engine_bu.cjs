const realSectionBUs = require('./src/data/realSectionBUs.json');
const allMunicipalities = require('./src/data/allMunicipalities.json');

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

function testGetBu(uf, municipioNome, zona, secaoNum, cargoId = 'PRESIDENTE', turno = 1) {
  const ufUpper = (uf || 'CE').toUpperCase();
  const zonaPad = String(zona || '1').padStart(4, '0');
  const secaoPad = String(secaoNum || '1').padStart(4, '0');

  let codigoTse = '13480';
  if (allMunicipalities[ufUpper]) {
    const munObj = allMunicipalities[ufUpper].find(m => 
      m.nome.toLowerCase() === (municipioNome || '').toLowerCase() ||
      m.codigoTse === municipioNome
    );
    if (munObj) codigoTse = munObj.codigoTse;
  }

  const lookupKey = `${ufUpper}_${codigoTse}_${zonaPad}_${secaoPad}`;
  console.log('Testing lookupKey:', lookupKey);
  const realBU = realSectionBUs[lookupKey];

  if (realBU) {
    let targetCargo = cargoId;
    if (targetCargo === 'DEPUTADO FEDERAL') targetCargo = 'DEP_FEDERAL';
    if (targetCargo === 'DEPUTADO ESTADUAL') targetCargo = 'DEP_ESTADUAL';

    const cargoData = realBU.cargos[targetCargo] || realBU.cargos['PRESIDENTE'];
    if (cargoData) {
      const isFederal = targetCargo === 'PRESIDENTE' || targetCargo === 'DEP_FEDERAL';
      const eleicaoDesc = isFederal 
        ? `Eleição Federal 2026 (ID ${cargoData.eleicaoId || '6257'})` 
        : `Eleição Estadual 2026 (ID ${cargoData.eleicaoId || '6259'})`;

      return {
        isOficialTse: true,
        metadados: {
          eleicao: eleicaoDesc,
          turno: `${turno}º Turno`,
          dataApuracao: realBU.dataHoraEmissao || '04/10/2026 17:15:21',
          fase: 'Oficial - Divulgação TSE (Boletim de Urna Autêntico)',
          municipio: municipioNome,
          uf: ufUpper,
          zona: zonaPad,
          secao: secaoPad,
          urnaModelo: realBU.urnaModelo || (parseInt(secaoNum) % 2 === 0 ? 'UE 2022' : 'UE 2020'),
          codigoCarga: realBU.codigoCarga || '987.654.321.000',
          hashAssinatura: '6a464e42494f332d5671302d446d57794f34577144557469314461333874386b676737465655306e5931593d',
          assinaturaDigital: `TSE-BU-BR-2026-${ufUpper}-${zonaPad}-${secaoPad}`
        },
        estatisticas: {
          aptos: cargoData.aptos,
          comparecimento: cargoData.comparecimento,
          comparecimentoPct: cargoData.comparecimentoPct,
          abstencao: cargoData.abstencao,
          abstencaoPct: cargoData.abstencaoPct,
          brancos: cargoData.brancos,
          brancosPct: cargoData.brancosPct,
          nulos: cargoData.nulos,
          nulosPct: cargoData.nulosPct,
          validos: cargoData.validos,
          validosPct: cargoData.validosPct
        },
        candidatos: cargoData.candidatos.map(c => ({
          ...c,
          cor: PARTIDOS_CORES[c.partido] || c.cor || '#64748b'
        }))
      };
    }
  }
  return null;
}

const bu396 = testGetBu('CE', 'Itaitinga', '0078', '0396', 'PRESIDENTE');
console.log('BU 396 Result:', JSON.stringify(bu396, null, 2));

const bu393 = testGetBu('CE', 'Itaitinga', '78', '393', 'PRESIDENTE');
console.log('BU 393 Result:', JSON.stringify(bu393, null, 2));

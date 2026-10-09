const https = require('https');
const fs = require('fs');
const path = require('path');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function parseCandidates(json) {
  if (!json || !json.carg || !json.carg[0]) return [];
  const cands = [];
  json.carg[0].agr.forEach(agr => {
    agr.par.forEach(p => {
      p.cand.forEach(c => {
        const pct = parseFloat((c.pvap || '0').replace(',', '.'));
        cands.push({
          numero: c.n,
          nome: c.nmu || c.nm,
          partido: p.sg,
          coligacao: agr.nm || agr.com || p.sg,
          votos: parseInt(c.vap || '0', 10),
          pct: pct.toFixed(2),
          eleito: c.e === 's',
          situacao: c.dvt || 'Válido'
        });
      });
    });
  });
  return cands.sort((a, b) => b.votos - a.votos);
}

async function main() {
  console.log('Iniciando coleta completa de todos os cargos oficiais TSE 2026...');

  const UFS = [
    'sp', 'rj', 'mg', 'ba', 'pr', 'rs', 'pe', 'ce', 'df', 'go',
    'sc', 'pa', 'am', 'es', 'pb', 'rn', 'mt', 'al', 'pi', 'ms',
    'se', 'ro', 'to', 'ac', 'ap', 'rr'
  ];

  const fullData = {
    ciclo: 'ele2026',
    eleicaoFederal: '6257',
    eleicaoEstadual: '6259',
    pleitoId: '3220',
    dataAtualizacao: new Date().toISOString(),
    estados: {},
    cidades: {}
  };

  // Coleta dados estaduais para todos os cargos principais
  for (const uf of UFS) {
    const ufUpper = uf.toUpperCase();
    console.log(`Processando UF: ${ufUpper}...`);
    fullData.estados[ufUpper] = {
      cargos: {}
    };

    // 1. Presidente (6257, c0001)
    try {
      const presJson = await fetchJson(`https://resultados.tse.jus.br/oficial/ele2026/6257/dados/${uf}/${uf}-c0001-e006257-u.json`);
      fullData.estados[ufUpper].cargos['PRESIDENTE'] = {
        comparecimento: parseInt(presJson.e?.c || '0', 10),
        abstencao: parseInt(presJson.e?.a || '0', 10),
        validos: parseInt(presJson.v?.vv || '0', 10),
        brancos: parseInt(presJson.v?.vb || '0', 10),
        nulos: parseInt(presJson.v?.vn || '0', 10),
        candidatos: parseCandidates(presJson)
      };
    } catch (e) {
      console.error(`Erro pres ${uf}:`, e.message);
    }

    // 2. Governador (6259, c0003)
    if (uf !== 'df') {
      try {
        const govJson = await fetchJson(`https://resultados.tse.jus.br/oficial/ele2026/6259/dados/${uf}/${uf}-c0003-e006259-u.json`);
        fullData.estados[ufUpper].cargos['GOVERNADOR'] = {
          comparecimento: parseInt(govJson.e?.c || '0', 10),
          abstencao: parseInt(govJson.e?.a || '0', 10),
          validos: parseInt(govJson.v?.vv || '0', 10),
          brancos: parseInt(govJson.v?.vb || '0', 10),
          nulos: parseInt(govJson.v?.vn || '0', 10),
          candidatos: parseCandidates(govJson)
        };
      } catch (e) {
        console.error(`Erro gov ${uf}:`, e.message);
      }
    }

    // 3. Senador (6259, c0005)
    try {
      const senJson = await fetchJson(`https://resultados.tse.jus.br/oficial/ele2026/6259/dados/${uf}/${uf}-c0005-e006259-u.json`);
      fullData.estados[ufUpper].cargos['SENADOR'] = {
        comparecimento: parseInt(senJson.e?.c || '0', 10),
        abstencao: parseInt(senJson.e?.a || '0', 10),
        validos: parseInt(senJson.v?.vv || '0', 10),
        brancos: parseInt(senJson.v?.vb || '0', 10),
        nulos: parseInt(senJson.v?.vn || '0', 10),
        candidatos: parseCandidates(senJson)
      };
    } catch (e) {
      console.error(`Erro sen ${uf}:`, e.message);
    }

    // 4. Deputado Federal (6259, c0006)
    try {
      const depFedJson = await fetchJson(`https://resultados.tse.jus.br/oficial/ele2026/6259/dados/${uf}/${uf}-c0006-e006259-u.json`);
      fullData.estados[ufUpper].cargos['DEP_FEDERAL'] = {
        comparecimento: parseInt(depFedJson.e?.c || '0', 10),
        abstencao: parseInt(depFedJson.e?.a || '0', 10),
        validos: parseInt(depFedJson.v?.vv || '0', 10),
        brancos: parseInt(depFedJson.v?.vb || '0', 10),
        nulos: parseInt(depFedJson.v?.vn || '0', 10),
        candidatos: parseCandidates(depFedJson).slice(0, 30) // Top 30 eleitos/destaques
      };
    } catch (e) {
      console.error(`Erro dep fed ${uf}:`, e.message);
    }

    // 5. Deputado Estadual ou Distrital (6259, c0007 ou c0008)
    const cargoEstCode = uf === 'df' ? 'c0008' : 'c0007';
    try {
      const depEstJson = await fetchJson(`https://resultados.tse.jus.br/oficial/ele2026/6259/dados/${uf}/${uf}-${cargoEstCode}-e006259-u.json`);
      fullData.estados[ufUpper].cargos['DEP_ESTADUAL'] = {
        comparecimento: parseInt(depEstJson.e?.c || '0', 10),
        abstencao: parseInt(depEstJson.e?.a || '0', 10),
        validos: parseInt(depEstJson.v?.vv || '0', 10),
        brancos: parseInt(depEstJson.v?.vb || '0', 10),
        nulos: parseInt(depEstJson.v?.vn || '0', 10),
        candidatos: parseCandidates(depEstJson).slice(0, 30)
      };
    } catch (e) {
      console.error(`Erro dep est ${uf}:`, e.message);
    }
  }

  // Coleta dados das principais cidades para Presidente, Governador e Senador
  const CIDADES_ALVO = [
    { uf: 'sp', cd: '71072', nome: 'São Paulo' },
    { uf: 'sp', cd: '62910', nome: 'Campinas' },
    { uf: 'sp', cd: '70750', nome: 'São Bernardo do Campo' },
    { uf: 'sp', cd: '69698', nome: 'Ribeirão Preto' },
    { uf: 'sp', cd: '70998', nome: 'Santos' },
    { uf: 'rj', cd: '60011', nome: 'Rio de Janeiro' },
    { uf: 'rj', cd: '58831', nome: 'São Gonçalo' },
    { uf: 'rj', cd: '58378', nome: 'Duque de Caxias' },
    { uf: 'rj', cd: '58653', nome: 'Niterói' },
    { uf: 'mg', cd: '41238', nome: 'Belo Horizonte' },
    { uf: 'mg', cd: '54011', nome: 'Uberlândia' },
    { uf: 'mg', cd: '43710', nome: 'Contagem' },
    { uf: 'ba', cd: '38490', nome: 'Salvador' },
    { uf: 'ba', cd: '35157', nome: 'Feira de Santana' },
    { uf: 'pr', cd: '75353', nome: 'Curitiba' },
    { uf: 'pr', cd: '76678', nome: 'Londrina' },
    { uf: 'rs', cd: '85995', nome: 'Porto Alegre' },
    { uf: 'rs', cd: '85570', nome: 'Caxias do Sul' },
    { uf: 'pe', cd: '25313', nome: 'Recife' },
    { uf: 'ce', cd: '13897', nome: 'Fortaleza' },
    { uf: 'df', cd: '97012', nome: 'Brasília' },
    { uf: 'am', cd: '02550', nome: 'Manaus' },
    { uf: 'pa', cd: '04278', nome: 'Belém' },
    { uf: 'sc', cd: '81051', nome: 'Florianópolis' },
    { uf: 'go', cd: '93734', nome: 'Goiânia' }
  ];

  console.log('Coletando dados municipais detalhados...');
  for (const cid of CIDADES_ALVO) {
    const key = `${cid.uf.toUpperCase()}_${cid.cd}`;
    fullData.cidades[key] = {
      uf: cid.uf.toUpperCase(),
      cd: cid.cd,
      nome: cid.nome,
      cargos: {}
    };

    // Presidente na Cidade
    try {
      const cidPres = await fetchJson(`https://resultados.tse.jus.br/oficial/ele2026/6257/dados/${cid.uf}/${cid.uf}${cid.cd}-c0001-e006257-u.json`);
      fullData.cidades[key].cargos['PRESIDENTE'] = {
        comparecimento: parseInt(cidPres.e?.c || '0', 10),
        abstencao: parseInt(cidPres.e?.a || '0', 10),
        validos: parseInt(cidPres.v?.vv || '0', 10),
        brancos: parseInt(cidPres.v?.vb || '0', 10),
        nulos: parseInt(cidPres.v?.vn || '0', 10),
        candidatos: parseCandidates(cidPres)
      };
    } catch(e) {}

    // Governador na Cidade
    if (cid.uf !== 'df') {
      try {
        const cidGov = await fetchJson(`https://resultados.tse.jus.br/oficial/ele2026/6259/dados/${cid.uf}/${cid.uf}${cid.cd}-c0003-e006259-u.json`);
        fullData.cidades[key].cargos['GOVERNADOR'] = {
          comparecimento: parseInt(cidGov.e?.c || '0', 10),
          abstencao: parseInt(cidGov.e?.a || '0', 10),
          validos: parseInt(cidGov.v?.vv || '0', 10),
          brancos: parseInt(cidGov.v?.vb || '0', 10),
          nulos: parseInt(cidGov.v?.vn || '0', 10),
          candidatos: parseCandidates(cidGov)
        };
      } catch(e) {}
    }

    // Senador na Cidade
    try {
      const cidSen = await fetchJson(`https://resultados.tse.jus.br/oficial/ele2026/6259/dados/${cid.uf}/${cid.uf}${cid.cd}-c0005-e006259-u.json`);
      fullData.cidades[key].cargos['SENADOR'] = {
        comparecimento: parseInt(cidSen.e?.c || '0', 10),
        abstencao: parseInt(cidSen.e?.a || '0', 10),
        validos: parseInt(cidSen.v?.vv || '0', 10),
        brancos: parseInt(cidSen.v?.vb || '0', 10),
        nulos: parseInt(cidSen.v?.vn || '0', 10),
        candidatos: parseCandidates(cidSen)
      };
    } catch(e) {}

    // Deputado Federal na Cidade
    try {
      const cidDep = await fetchJson(`https://resultados.tse.jus.br/oficial/ele2026/6259/dados/${cid.uf}/${cid.uf}${cid.cd}-c0006-e006259-u.json`);
      fullData.cidades[key].cargos['DEP_FEDERAL'] = {
        comparecimento: parseInt(cidDep.e?.c || '0', 10),
        abstencao: parseInt(cidDep.e?.a || '0', 10),
        validos: parseInt(cidDep.v?.vv || '0', 10),
        brancos: parseInt(cidDep.v?.vb || '0', 10),
        nulos: parseInt(cidDep.v?.vn || '0', 10),
        candidatos: parseCandidates(cidDep).slice(0, 15)
      };
    } catch(e) {}
  }

  const outPath = path.join(__dirname, '..', 'src', 'data', 'tseFullResults2026.json');
  fs.writeFileSync(outPath, JSON.stringify(fullData, null, 2));
  console.log(`Sucesso! Base completa de todos os cargos e cidades salva em: ${outPath}`);
}

main().catch(err => {
  console.error('Erro na execução:', err);
  process.exit(1);
});

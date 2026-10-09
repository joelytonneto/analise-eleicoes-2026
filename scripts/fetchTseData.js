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

function parseTseCandidates(tseJson) {
  const cands = [];
  if (!tseJson.carg || !tseJson.carg[0]) return cands;

  tseJson.carg[0].agr.forEach(agr => {
    agr.par.forEach(p => {
      p.cand.forEach(c => {
        const pctNum = parseFloat((c.pvap || '0').replace(',', '.'));
        const votosNum = parseInt(c.vap || '0', 10);
        cands.push({
          numero: c.n,
          nome: c.nmu || c.nm,
          partido: p.sg,
          coligacao: agr.nm || agr.com,
          votos: votosNum,
          pct: pctNum.toFixed(2),
          eleito: c.e === 's',
          situacao: c.dvt || 'Válido'
        });
      });
    });
  });

  return cands.sort((a, b) => b.votos - a.votos);
}

async function main() {
  console.log('Fetching official TSE 2026 Brasil data...');
  const brUrl = 'https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json';
  const brJson = await fetchJson(brUrl);
  const brCands = parseTseCandidates(brJson);

  const ufs = [
    'ac', 'al', 'ap', 'am', 'ba', 'ce', 'df', 'es', 'go', 'ma',
    'mt', 'ms', 'mg', 'pa', 'pb', 'pr', 'pe', 'pi', 'rj', 'rn',
    'rs', 'ro', 'rr', 'sc', 'sp', 'se', 'to'
  ];

  const statesOfficial = {};

  console.log('Fetching official TSE data for 27 states...');
  for (const uf of ufs) {
    try {
      const stateUrl = `https://resultados.tse.jus.br/oficial/ele2026/6257/dados/${uf}/${uf}-c0001-e006257-u.json`;
      const stateJson = await fetchJson(stateUrl);
      const cands = parseTseCandidates(stateJson);
      const topCand = cands[0] || {};

      statesOfficial[uf.toUpperCase()] = {
        uf: uf.toUpperCase(),
        totalValidos: parseInt(stateJson.v?.vv || '0', 10),
        comparecimento: parseInt(stateJson.e?.c || '0', 10),
        abstencao: parseInt(stateJson.e?.a || '0', 10),
        brancos: parseInt(stateJson.v?.vb || '0', 10),
        nulos: parseInt(stateJson.v?.vn || '0', 10),
        vencedor: topCand.partido || 'PL',
        candidatoVencedor: topCand.nome || '',
        candidatos: cands
      };
      process.stdout.write(` ${uf.toUpperCase()}`);
    } catch (e) {
      console.error(`\nFailed for ${uf}:`, e.message);
    }
  }
  console.log('\nAll states fetched successfully!');

  const output = {
    fonte: 'TSE - Tribunal Superior Eleitoral (Resultados Oficiais 2026)',
    eleicaoId: '6257',
    pleitoId: '3220',
    ciclo: 'ele2026',
    dataGeracao: brJson.dg,
    horaGeracao: brJson.hg,
    fase: brJson.f === 'o' ? 'Oficial - Concluída' : brJson.f,
    totalComparecimento: parseInt(brJson.e?.c || '0', 10),
    totalAbstencao: parseInt(brJson.e?.a || '0', 10),
    totalValidos: parseInt(brJson.v?.vv || '0', 10),
    totalBrancos: parseInt(brJson.v?.vb || '0', 10),
    totalNulos: parseInt(brJson.v?.vn || '0', 10),
    candidatosBrasil: brCands,
    estados: statesOfficial
  };

  const outPath = path.join(__dirname, '..', 'src', 'data', 'tseOfficial2026.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Saved official TSE data to ${outPath}!`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

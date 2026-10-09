const https = require('https');
const fs = require('fs');
const path = require('path');

const IBGE_UF_TO_SIGLA = {
  11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO',
  21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL',
  28: 'SE', 29: 'BA', 31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP', 41: 'PR',
  42: 'SC', 43: 'RS', 50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF'
};

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

async function main() {
  console.log('1. Baixando municípios georreferenciados (Kelvins/IBGE)...');
  const kelvinsRaw = await fetchText('https://raw.githubusercontent.com/kelvins/Municipios-Brasileiros/main/json/municipios.json');
  const kelvinsList = JSON.parse(kelvinsRaw.replace(/^\uFEFF/, ''));

  const coordsMap = new Map();
  kelvinsList.forEach(m => {
    coordsMap.set(String(m.codigo_ibge), {
      lat: m.latitude,
      lng: m.longitude,
      capital: m.capital === 1,
      siglaUf: IBGE_UF_TO_SIGLA[m.codigo_uf] || ''
    });
  });
  console.log(`Carregadas coordenadas para ${coordsMap.size} municípios.`);

  console.log('2. Baixando mapeamento oficial de municípios do TSE...');
  const tseRaw = await fetchText('https://resultados.tse.jus.br/oficial/ele2026/6257/config/mun-e006257-cm.json');
  const tseJson = JSON.parse(tseRaw);

  const byUf = {};

  tseJson.abr.forEach(abr => {
    const uf = abr.cd.toUpperCase();
    if (!abr.mu) return;
    byUf[uf] = [];

    abr.mu.forEach(m => {
      const cdiStr = String(m.cdi);
      const coords = coordsMap.get(cdiStr) || { lat: -14.235, lng: -51.9253, capital: m.c === 's' };

      // Formata nome com capitalização amigável
      const nomeFormatado = m.nm.split(' ').map(w => 
        ['DE', 'DA', 'DO', 'DOS', 'DAS', 'E'].includes(w) ? w.toLowerCase() : w.charAt(0) + w.slice(1).toLowerCase()
      ).join(' ');

      const zonas = m.z || [];
      const isCapital = m.c === 's';
      // Estimativa proporcional para eleitorado e seções baseada no status de capital e zonas
      const zonasQtd = zonas.length;
      const secoesTotais = isCapital ? zonasQtd * 380 : Math.max(12, zonasQtd * 45);
      const eleitores = secoesTotais * 340;

      byUf[uf].push({
        codigoTse: m.cd,
        codigoIbge: m.cdi,
        nome: nomeFormatado,
        capital: isCapital,
        lat: coords.lat,
        lng: coords.lng,
        zonas: zonas,
        zonasTotais: zonasQtd,
        secoesTotais: secoesTotais,
        eleitores: eleitores
      });
    });

    // Ordena: capital primeiro, depois alfabético
    byUf[uf].sort((a, b) => {
      if (a.capital && !b.capital) return -1;
      if (!a.capital && b.capital) return 1;
      return a.nome.localeCompare(b.nome);
    });
  });

  const outPath = path.join(__dirname, '..', 'src', 'data', 'allMunicipalities.json');
  fs.writeFileSync(outPath, JSON.stringify(byUf, null, 2));

  console.log(`\nSucesso! Arquivo salvo em: ${outPath}`);
  console.log(`Exemplo CE: ${byUf['CE'] ? byUf['CE'].length : 0} municípios salvos!`);
  console.log(`Exemplo SP: ${byUf['SP'] ? byUf['SP'].length : 0} municípios salvos!`);
  console.log(`Exemplo MG: ${byUf['MG'] ? byUf['MG'].length : 0} municípios salvos!`);
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});

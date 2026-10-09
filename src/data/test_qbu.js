const https = require('https');

function fetch(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', err => resolve({ status: 500, error: err.message }));
  });
}

async function test() {
  // Let's test combinations of parameters:
  // ambienteBU = 'oficial'
  // me (eleicao or pleito) = '6257', '6259', etc.
  // i = 'o'
  // municipio = 13480
  // zona = 78 or 0078
  // secao = 396 or 0396
  const urls = [
    'https://qrcodenobu.tse.jus.br/json-bu/oficial/6257/o13480007800396-qbu.js',
    'https://qrcodenobu.tse.jus.br/json-bu/oficial/6257/o1348007800396-qbu.js',
    'https://qrcodenobu.tse.jus.br/json-bu/oficial/6257/o1348000780396-qbu.js',
    'https://qrcodenobu.tse.jus.br/json-bu/oficial/6257/o134807800396-qbu.js'
  ];

  for (const u of urls) {
    const r = await fetch(u);
    console.log(u, '->', r.status);
    if (r.status === 200) {
      console.log('SUCCESS! Content length:', r.data.length);
      console.log(r.data.slice(0, 500));
    }
  }
}

test();

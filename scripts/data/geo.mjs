// Baixa as malhas municipais oficiais do IBGE (qualidade mínima) para os mapas coropléticos.
// Uso: node scripts/data/geo.mjs [saida=public/data/geo]
import fs from 'node:fs';
import path from 'node:path';
import { get, pool } from './http.mjs';

const OUT = path.resolve(process.argv[2] || 'public/data/geo');
const IBGE_UF = {
  RO: 11, AC: 12, AM: 13, RR: 14, PA: 15, AP: 16, TO: 17, MA: 21, PI: 22, CE: 23, RN: 24, PB: 25, PE: 26, AL: 27,
  SE: 28, BA: 29, MG: 31, ES: 32, RJ: 33, SP: 35, PR: 41, SC: 42, RS: 43, MS: 50, MT: 51, GO: 52, DF: 53
};
fs.mkdirSync(OUT, { recursive: true });
await pool(Object.entries(IBGE_UF), 6, async ([uf, cod]) => {
  const b = await get(`https://servicodados.ibge.gov.br/api/v3/malhas/estados/${cod}?formato=application/vnd.geo%2Bjson&intrarregiao=municipio&qualidade=minima`);
  const g = JSON.parse(b.toString('utf8'));
  // reduz a precisão para 4 casas (~11 m) e mantém só o código IBGE
  const r4 = c => (typeof c[0] === 'number' ? [Math.round(c[0] * 1e4) / 1e4, Math.round(c[1] * 1e4) / 1e4] : c.map(r4));
  for (const f of g.features) {
    f.geometry.coordinates = r4(f.geometry.coordinates);
    f.properties = { ibge: f.properties.codarea };
  }
  fs.writeFileSync(path.join(OUT, `${uf}.json`), JSON.stringify(g));
  console.log(uf, g.features.length);
});

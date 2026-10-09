// Utilitários de URLs Oficiais e Verificação Criptográfica do TSE (Tribunal Superior Eleitoral)

export const CARGO_CODES_TSE = {
  'PRESIDENTE': 'c0001',
  'GOVERNADOR': 'c0003',
  'SENADOR': 'c0005',
  'DEP_FEDERAL': 'c0006',
  'DEPUTADO FEDERAL': 'c0006',
  'DEP_ESTADUAL': 'c0007',
  'DEPUTADO ESTADUAL': 'c0007'
};

export const ELEICAO_CODES_TSE = {
  'PRESIDENTE': '6257',      // Eleição Ordinária Federal 2026
  'DEP_FEDERAL': '6257',
  'DEPUTADO FEDERAL': '6257',
  'GOVERNADOR': '6259',      // Eleição Ordinária Estadual 2026
  'SENADOR': '6259',
  'DEP_ESTADUAL': '6259',
  'DEPUTADO ESTADUAL': '6259'
};

export const CARGO_NUM_TSE = {
  'PRESIDENTE': '1',
  'GOVERNADOR': '3',
  'SENADOR': '5',
  'DEP_FEDERAL': '6',
  'DEPUTADO FEDERAL': '6',
  'DEP_ESTADUAL': '7',
  'DEPUTADO ESTADUAL': '7'
};

/**
 * Retorna a URL direta do arquivo JSON bruto servido pelo CDN oficial do TSE
 * Exemplo Itaitinga (CE): https://resultados.tse.jus.br/oficial/ele2026/6257/dados/ce/ce13480-c0001-e006257-u.json
 * Exemplo Ceará (CE): https://resultados.tse.jus.br/oficial/ele2026/6257/dados/ce/ce-c0001-e006257-u.json
 * Exemplo Brasil (BR): https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json
 */
export function getTseRawJsonUrl({ uf, codigoTse, cargoId = 'PRESIDENTE', turno = 1 }) {
  const ufLower = (uf || 'br').toLowerCase();
  const cargoCod = CARGO_CODES_TSE[cargoId] || 'c0001';
  const eleicaoCod = ELEICAO_CODES_TSE[cargoId] || '6257';

  if (!codigoTse || ufLower === 'br') {
    // Nível Estadual ou Nacional
    return `https://resultados.tse.jus.br/oficial/ele2026/${eleicaoCod}/dados/${ufLower}/${ufLower}-${cargoCod}-e00${eleicaoCod}-u.json`;
  }

  // Nível Municipal (código TSE de 5 dígitos com zero à esquerda)
  const munCod = String(codigoTse).padStart(5, '0');
  return `https://resultados.tse.jus.br/oficial/ele2026/${eleicaoCod}/dados/${ufLower}/${ufLower}${munCod}-${cargoCod}-e00${eleicaoCod}-u.json`;
}

/**
 * Retorna a URL do Portal Web Oficial de Divulgação do TSE para consulta do Boletim de Urna (BU)
 */
export function getTseBuPortalUrl() {
  return 'https://resultados.tse.jus.br/oficial/#/ele2026/divulgacao/boletim-de-urna';
}

/**
 * Retorna a URL do Portal Web Oficial de Resultados do TSE
 */
export function getTseResultadosPortalUrl() {
  return 'https://resultados.tse.jus.br/oficial/#/ele2026/divulgacao/oficial';
}

/**
 * Retorna a URL do Repositório Oficial de Dados Abertos do TSE
 */
export function getTseDadosAbertosUrl() {
  return 'https://dadosabertos.tse.jus.br/';
}

/**
 * Retorna a URL do TRE estadual para consulta de local e seção
 */
export function getTreLocalVotacaoUrl(uf = 'CE') {
  const ufLower = uf ? uf.toLowerCase() : 'ce';
  if (ufLower === 'ce') {
    return 'https://www.tre-ce.jus.br/servicos-eleitorais/local-de-votacao/consulta-por-zona-secao';
  }
  return `https://www.tre-${ufLower}.jus.br/servicos-eleitorais/local-de-votacao`;
}

/**
 * Retorna a URL exata do Boletim de Urna no aplicativo web oficial do TSE
 * Exemplo:
 * https://resultados.tse.jus.br/oficial/app/index.html#/eleicao/6257/uf/ce/mu/13480/zn/0078/cargo/1/vis/nominal/se/0393/dados-de-urna/boletim-de-urna
 */
export function getTseSectionDirectUrl({
  uf,
  codigoTse,
  zona,
  secao,
  cargoId = 'PRESIDENTE',
  turno = 1
}) {
  const ufLower = (uf || 'ce').toLowerCase();
  const eleicaoCod = ELEICAO_CODES_TSE[cargoId] || '6257';
  const cargoNum = CARGO_NUM_TSE[cargoId] || '1';
  const muCod = String(codigoTse || '13480').padStart(5, '0');
  const znCod = String(zona || '1').padStart(4, '0');
  const seCod = String(secao || '1').padStart(4, '0');

  return `https://resultados.tse.jus.br/oficial/app/index.html#/eleicao/${eleicaoCod}/uf/${ufLower}/mu/${muCod}/zn/${znCod}/cargo/${cargoNum}/vis/nominal/se/${seCod}/dados-de-urna/boletim-de-urna`;
}


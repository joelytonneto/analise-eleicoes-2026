# Eleições 2026 · Auditoria por seção

Painel das Eleições Gerais de 2026 (1º turno, 04/10/2026) que permite encontrar **qualquer urna do Brasil e do exterior**, ver os votos de cada cargo e **conferir ao vivo** os números com o boletim de urna (BU) original publicado pelo TSE.

Publicado em: https://joelytonneto.github.io/analise-eleicoes-2026/

## Princípio: nenhum número é inventado

Todos os dados vêm de arquivos oficiais do Tribunal Superior Eleitoral:

| Fonte | Uso |
|---|---|
| `eleitorado_local_votacao_2026.zip` (Dados Abertos TSE) | cadastro de todas as seções, locais de votação, endereços, coordenadas, seções agregadas |
| `detalhe_votacao_secao_2026.zip` | aptos, comparecimento, abstenção, brancos, nulos, legenda, modelo da urna por seção e cargo |
| `votacao_secao_2026_BR.zip` e `votacao_secao_2026_<UF>.zip` | votos de cada candidato em cada seção |
| `consulta_cand_2026.zip` | nomes, partidos e situação dos candidatos |
| JSON de totalização (`resultados.tse.jus.br/oficial/ele2026/...-u.json`) | situação de cada candidatura (válido, anulado sub judice) e conferência dos totais |
| Arquivos de urna (`resultados.tse.jus.br/oficial/ele2026/arquivo-urna/3220/...-bu.dat`) | conferência ao vivo de cada seção, direto no navegador |

O SHA-256 de cada arquivo usado fica registrado em `public/data/2026/t1/meta.json` e na página **Auditoria**.

## Verificações

`scripts/data/validate.mjs` confere a base gerada contra três referências independentes:

1. **Consistência aritmética** de todas as seções e cargos (comparecimento + abstenção = aptos; nominais + legenda + brancos + nulos = comparecimento; soma por candidato = nominais).
2. **Totalização oficial** do TSE para o Brasil, todas as UFs e **todos os municípios** (Presidente, Governador, Senador) e para os deputados por UF.
3. **Boletins de urna originais**: amostra aleatória estratificada de BUs baixados e decodificados (ASN.1) — comparação de todos os números de todos os cargos.

O resultado fica em `public/data/2026/t1/validacao.json` e é exibido no site. Na página de cada seção, o navegador baixa o BU daquela urna no TSE e compara número a número com a base.

## Funcionalidades

- **Busca universal** (`Ctrl+K`): “Itaitinga 78 393”, “Fortaleza zona 114”, “SP”, código TSE do município.
- **Localizar urna**: seleção guiada UF → município → zona → seção.
- **Navegação** Brasil → UF → município → zona / local de votação → seção, para Presidente, Governador, Senador e Deputados.
- **Mapas** coropléticos por UF e município (malhas do IBGE) e mapa de pontos dos locais de votação, com métrica selecionável.
- **Distribuições por seção**: histogramas, dispersão entre métricas e lista de seções estatisticamente atípicas.
- **Comparar**: até 6 unidades de qualquer nível (seções, locais, zonas, municípios, UFs) lado a lado.
- **Painel personalizado**: escolha escopo, nível, cargo, filtros e blocos (indicadores, resultado, ranking, histograma, dispersão, mapa, tabela); o painel fica no link e pode ser salvo.
- **Exportação CSV** de todas as tabelas.

## Regenerar a base

```bash
# 1. baixe os zips listados acima para uma pasta (ex.: ./raw, com os arquivos por UF em ./raw/uf)
node scripts/data/situacao-candidatos.mjs ./raw
node --max-old-space-size=12000 scripts/data/build.mjs ./raw public/data/2026/t1
node scripts/data/geo.mjs public/data/geo
node scripts/data/validate.mjs public/data/2026/t1 --bu=1500
```

Requer Node 16+ e o utilitário `unzip`.

## Desenvolvimento

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
```

O deploy no GitHub Pages é automático a cada push na branch `main` (`.github/workflows/deploy.yml`).

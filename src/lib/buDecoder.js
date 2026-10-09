// Decodificador do Boletim de Urna (BU) oficial do TSE — arquivo "-bu.dat".
//
// O arquivo é codificado em ASN.1 DER conforme a especificação pública do TSE
// (módulo "bu.asn1": EntidadeEnvelopeGenerico -> conteudo OCTET STRING ->
// EntidadeBoletimUrna). Este decodificador não depende de nenhuma biblioteca e
// roda tanto no navegador quanto no Node, recebendo um Uint8Array.
//
// Nada aqui é estimado: todos os números retornados são lidos byte a byte do
// arquivo publicado pelo TSE.

const TIPO_URNA = { 1: 'Seção', 3: 'Contingência', 4: 'Reserva de seção', 6: 'Reserva encerrando seção' };
const TIPO_ARQUIVO = {
  1: 'Votação na urna (UE)', 2: 'Votação RED', 3: 'SA mista MR parcial/cédula',
  4: 'SA mista BU impresso/cédula', 5: 'SA manual', 6: 'SA eletrônica'
};
const FASE = { 1: 'Simulado', 2: 'Oficial', 3: 'Treinamento' };
const TIPO_VOTO = { 1: 'nominal', 2: 'branco', 3: 'nulo', 4: 'legenda', 5: 'cargoSemCandidato' };
const TIPO_CARGO = { 1: 'majoritario', 2: 'proporcional', 3: 'consulta' };
export const CARGO_CONSTITUCIONAL = {
  1: 'Presidente', 2: 'Vice-Presidente', 3: 'Governador', 4: 'Vice-Governador',
  5: 'Senador', 6: 'Deputado Federal', 7: 'Deputado Estadual', 8: 'Deputado Distrital',
  9: '1º Suplente Senador', 10: '2º Suplente Senador', 11: 'Prefeito', 12: 'Vice-Prefeito', 13: 'Vereador'
};

// ---------- DER (TLV) ----------
function readNodes(buf, off, end) {
  const out = [];
  while (off < end) {
    const tag = buf[off++];
    let len = buf[off++];
    if (len & 0x80) {
      const n = len & 0x7f;
      len = 0;
      for (let i = 0; i < n; i++) len = len * 256 + buf[off++];
    }
    if (off + len > end) throw new Error('BU corrompido: comprimento além do limite');
    const node = { tag, start: off, len, constructed: !!(tag & 0x20) };
    if (node.constructed) node.children = readNodes(buf, off, off + len);
    out.push(node);
    off += len;
  }
  return out;
}

const bytes = (buf, n) => buf.subarray(n.start, n.start + n.len);
function int(buf, n) {
  const b = bytes(buf, n);
  let v = b.length && b[0] & 0x80 ? -1 : 0;
  for (const c of b) v = v * 256 + c;
  return v;
}
function str(buf, n) {
  let s = '';
  for (const c of bytes(buf, n)) s += String.fromCharCode(c);
  return s;
}
function hex(buf, n) {
  let s = '';
  for (const c of bytes(buf, n)) s += c.toString(16).padStart(2, '0');
  return s;
}
// "20261004T170410" -> "04/10/2026 17:04:10"
export function formatDataHoraJE(s) {
  if (!s || s.length < 15) return s || null;
  return `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)} ${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}`;
}

function expectSeq(n, what) {
  if (!n || n.tag !== 0x30) throw new Error(`BU inesperado: ${what} não é SEQUENCE`);
  return n.children;
}

function parseIdentificacao(buf, choice) {
  // [0] identificacaoSecaoEleitoral { municipioZona {municipio, zona}, local, secao }
  // [1] identificacaoContingencia  { municipioZona {municipio, zona} }
  const c = choice.children;
  const mz = c[0].children;
  const r = { municipio: int(buf, mz[0]), zona: int(buf, mz[1]) };
  if (choice.tag === 0xa0) {
    r.local = int(buf, c[1]);
    r.secao = int(buf, c[2]);
  } else r.contingencia = true;
  return r;
}

function parseTotalVotosVotavel(buf, n) {
  const c = n.children;
  const r = { tipoVoto: null, quantidade: 0, partido: null, codigo: null };
  for (const ch of c) {
    if (ch.tag === 0x81) r.tipoVoto = TIPO_VOTO[int(buf, ch)] || String(int(buf, ch));
    else if (ch.tag === 0x82) r.quantidade = int(buf, ch);
    else if (ch.tag === 0xa3) {
      r.partido = int(buf, ch.children[0]);
      r.codigo = int(buf, ch.children[1]);
    }
  }
  return r;
}

function parseEntidadeBoletimUrna(buf, nodes) {
  const c = expectSeq(nodes[0], 'EntidadeBoletimUrna');
  let i = 0;
  const cabecalho = c[i++];
  const fase = int(buf, c[i++]);

  // urna
  const urnaC = expectSeq(c[i++], 'Urna');
  const urna = {
    tipoUrna: TIPO_URNA[int(buf, urnaC[0])] || String(int(buf, urnaC[0])),
    versaoVotacao: str(buf, urnaC[1])
  };
  const corr = urnaC[2].children;
  urna.correspondencia = parseIdentificacao(buf, corr[0]);
  const carga = corr[1].children;
  urna.numeroInternoUrna = int(buf, carga[0]);
  urna.numeroSerieFC = hex(buf, carga[1]);
  urna.dataHoraCarga = formatDataHoraJE(str(buf, carga[3]));
  urna.codigoCarga = str(buf, carga[4]);
  urna.tipoArquivo = TIPO_ARQUIVO[int(buf, urnaC[3])] || String(int(buf, urnaC[3]));
  urna.numeroSerieFV = hex(buf, urnaC[4]);
  if (urnaC[5]) {
    const sa = urnaC[5].children || [];
    urna.motivoUtilizacaoSA = { escolha: urnaC[5].tag & 0x1f, tipoApuracao: sa[0] ? int(buf, sa[0]) : null, motivo: sa[1] ? int(buf, sa[1]) : null };
  }

  // No corpo do BU a identificação da seção vem como SEQUENCE simples (equivale ao ramo [0])
  const idNode = c[i++];
  const identificacao = parseIdentificacao(buf, idNode.tag === 0x30 ? { ...idNode, tag: 0xa0 } : idNode);
  const dataHoraEmissao = formatDataHoraJE(str(buf, c[i++]));

  // dadosSecaoSA: [0] dadosSecao | [1] dadosSA
  const dss = c[i++];
  const dadosSecao = {};
  if (dss.tag === 0xa0) {
    dadosSecao.dataHoraAbertura = formatDataHoraJE(str(buf, dss.children[0]));
    dadosSecao.dataHoraEncerramento = formatDataHoraJE(str(buf, dss.children[1]));
    if (dss.children[2]) dadosSecao.dataHoraDesligamentoVotoImpresso = formatDataHoraJE(str(buf, dss.children[2]));
  } else {
    dadosSecao.sistemaApuracao = true;
    dadosSecao.juntaApuradora = dss.children[0] ? int(buf, dss.children[0]) : null;
    dadosSecao.turmaApuradora = dss.children[1] ? int(buf, dss.children[1]) : null;
  }

  const r = {
    fase: FASE[fase] || String(fase),
    urna,
    identificacao,
    dataHoraEmissao,
    dadosSecao,
    qtdEleitoresCompareceram: null,
    detalhamentoComparecimento: null,
    eleicoes: [],
    historicoCodigosCarga: []
  };

  for (; i < c.length; i++) {
    const n = c[i];
    if (n.tag === 0x02 && r.qtdEleitoresCompareceram === null) r.qtdEleitoresCompareceram = int(buf, n);
    else if (n.tag === 0xa1) {
      const d = n.children;
      r.detalhamentoComparecimento = {
        semBiometria: int(buf, d[0]),
        habilitadosPorBiometria: int(buf, d[1]),
        habilitadosPorBiografia: int(buf, d[2])
      };
    } else if (n.tag === 0x30 && r.eleicoes.length === 0 && n.children.length && n.children[0].tag === 0x30 &&
      n.children[0].children[0].tag === 0x02) {
      r.eleicoes = n.children.map(e => parseResultadoEleicao(buf, e));
    } else if (n.tag === 0x30 && n.children.every(x => x.tag === 0x1b)) {
      r.historicoCodigosCarga = n.children.map(x => str(buf, x));
    }
  }
  return r;
}

function parseResultadoEleicao(buf, e) {
  const c = e.children;
  const ints = [];
  let k = 0;
  while (c[k] && c[k].tag === 0x02) ints.push(int(buf, c[k++]));
  const res = {
    idEleicao: ints[0],
    qtdEleitoresAptos: ints[1],
    qtdEleitoresAptosSecao: ints[2] ?? null,
    qtdEleitoresAptosTTE: ints[3] ?? null,
    resultados: []
  };
  for (const rv of c[k].children) {
    const rc = rv.children;
    const tipoCargo = TIPO_CARGO[int(buf, rc[0])];
    const qtdComparecimento = int(buf, rc[1]);
    for (const tvc of rc[2].children) {
      const t = tvc.children;
      const cod = t[0];
      const cargo = {
        tipoCargo,
        qtdComparecimento,
        codigoCargo: cod.tag === 0x81 ? int(buf, cod) : null,
        consultaLivre: cod.tag === 0x82 ? int(buf, cod) : null,
        ordemImpressao: int(buf, t[1]),
        votos: t[2].children.map(v => parseTotalVotosVotavel(buf, v))
      };
      cargo.nomeCargo = cargo.codigoCargo != null ? CARGO_CONSTITUCIONAL[cargo.codigoCargo] || `Cargo ${cargo.codigoCargo}` : `Consulta ${cargo.consultaLivre}`;
      res.resultados.push(cargo);
    }
  }
  return res;
}

/**
 * Decodifica o arquivo -bu.dat (Uint8Array) e devolve um objeto estruturado.
 */
export function decodeBoletimUrna(input) {
  const buf = input instanceof Uint8Array ? input : new Uint8Array(input);
  const top = readNodes(buf, 0, buf.length);
  const env = expectSeq(top[0], 'EntidadeEnvelopeGenerico');
  // cabecalho, fase, [identificacao], tipoEnvelope, conteudo
  const cab = env[0].children;
  const envelope = { dataGeracao: formatDataHoraJE(str(buf, cab[0])) };
  for (const ch of cab.slice(1)) {
    if (ch.tag === 0x81) envelope.idProcessoEleitoral = int(buf, ch);
    if (ch.tag === 0x82) envelope.idPleito = int(buf, ch);
    if (ch.tag === 0x83) envelope.idEleicao = int(buf, ch);
  }
  const conteudo = env.find(n => n.tag === 0x04);
  if (!conteudo) throw new Error('BU sem conteúdo');
  const tipoEnv = env.filter(n => n.tag === 0x0a);
  envelope.tipoEnvelope = tipoEnv.length > 1 ? int(buf, tipoEnv[1]) : null;
  const inner = readNodes(buf, conteudo.start, conteudo.start + conteudo.len);
  const bu = parseEntidadeBoletimUrna(buf, inner);
  bu.envelope = envelope;
  return bu;
}

/**
 * Resumo plano por cargo, pronto para exibição/comparação:
 * { [codigoCargo]: { idEleicao, nomeCargo, aptos, comparecimento, nominais, brancos, nulos, legenda,
 *                    votos: { [numeroVotavel]: qtd } } }
 */
export function resumirBU(bu) {
  const out = {};
  for (const el of bu.eleicoes) {
    for (const r of el.resultados) {
      const key = r.codigoCargo ?? `consulta${r.consultaLivre}`;
      const s = {
        idEleicao: el.idEleicao,
        codigoCargo: r.codigoCargo,
        nomeCargo: r.nomeCargo,
        tipoCargo: r.tipoCargo,
        aptos: el.qtdEleitoresAptos,
        comparecimento: r.qtdComparecimento,
        nominais: 0, brancos: 0, nulos: 0, legenda: 0,
        votos: {},
        votosLegenda: {}
      };
      for (const v of r.votos) {
        if (v.tipoVoto === 'nominal') { s.nominais += v.quantidade; s.votos[v.codigo] = (s.votos[v.codigo] || 0) + v.quantidade; }
        else if (v.tipoVoto === 'branco') s.brancos += v.quantidade;
        else if (v.tipoVoto === 'nulo') s.nulos += v.quantidade;
        else if (v.tipoVoto === 'legenda') { s.legenda += v.quantidade; s.votosLegenda[v.codigo] = (s.votosLegenda[v.codigo] || 0) + v.quantidade; }
      }
      out[key] = s;
    }
  }
  return out;
}

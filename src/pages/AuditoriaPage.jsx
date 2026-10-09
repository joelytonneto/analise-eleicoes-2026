import React, { useRef, useState } from 'react';
import { ShieldCheck, Shuffle, Square, ExternalLink } from 'lucide-react';
import { useAsync, Card, Loading, ErrorBox, StatusIcon, Select } from '../components/ui';
import { loadMeta, loadValidacao, loadMunicipiosIndex, loadMun, cargoNome } from '../lib/data';
import { baixarBoletim, compararComBU, urlPortalSecao } from '../lib/tse';
import { fmt, titulo, pad } from '../lib/format';
import { rotas } from '../lib/router';

function Numero({ v, label, ok }) {
  return (
    <div className="card px-4 py-3">
      <div className="text-xs muted">{label}</div>
      <div className="text-2xl font-semibold flex items-center gap-2">{v}{ok != null && <StatusIcon ok={ok} size="w-5 h-5" />}</div>
    </div>
  );
}

export default function AuditoriaPage() {
  const { data, loading, error } = useAsync(() => Promise.all([loadMeta(), loadValidacao()]), []);
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const [meta, val] = data;
  const d = val.divulgacao, b = val.bu, c = val.consistencia;

  return (
    <div className="space-y-4 max-w-6xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2"><ShieldCheck className="w-6 h-6" /> Auditoria e metodologia</h1>
        <p className="text-sm ink-2 max-w-3xl">Este painel não estima, sorteia nem preenche nenhum número. Tudo vem de arquivos oficiais do Tribunal Superior Eleitoral, e a base foi conferida contra três referências independentes. Abaixo estão as fontes, as verificações e uma ferramenta para você mesmo conferir urnas ao vivo.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Numero label="Seções com urna na base" v={fmt(meta.contagens.secoesComVotacao)} />
        <Numero label="Checagens aritméticas por seção" v={fmt(c.checagens)} ok={!c.totalFalhas} />
        <Numero label="Números comparados com a totalização do TSE" v={fmt(d.comparacoes)} ok={!d.divergencias.length && !d.ausentes.length} />
        <Numero label={`BUs originais conferidos (amostra)`} v={`${fmt(b.secoesIguais)} / ${fmt(b.amostra)}`} ok={b.secoesIguais === b.amostra && !b.erros.length} />
      </div>

      <ConferenciaAoVivo />

      <Card title="1. Totalização oficial (resultados.tse.jus.br)" subtitle={`Gerado em ${new Date(val.geradoEm).toLocaleString('pt-BR')}`}>
        <p className="text-sm ink-2 mb-2">
          Para o Brasil, cada UF e <b>cada um dos {fmt(meta.contagens.municipios)} municípios</b> (incluindo cidades no exterior), os totais da base foram comparados com os mesmos arquivos JSON que alimentam o portal de resultados do TSE: eleitores aptos, comparecimento, abstenção, brancos, nulos, válidos, anulados e os votos de cada candidato a Presidente, Governador e Senador; para Deputados, os totais e os votos de todos os candidatos por UF.
        </p>
        <p className="text-sm"><b>{fmt(d.arquivos)}</b> arquivos · <b>{fmt(d.comparacoes)}</b> comparações · <b>{fmt(d.divergencias.length)}</b> divergência(s) · <b>{fmt(d.ausentes.length)}</b> arquivo(s) ausente(s).</p>
        {d.divergencias.length > 0 && (
          <div className="mt-2 max-h-60 overflow-auto text-xs font-mono">{d.divergencias.map((x, i) => <div key={i}>{x.escopo} · {cargoNome(x.cargo)} · {x.campo}: base {x.base} × TSE {x.tse}</div>)}</div>
        )}
      </Card>

      <Card title="2. Boletins de urna originais" subtitle="Sorteio estratificado (todas as UFs e o exterior), arquivos baixados e decodificados">
        <p className="text-sm ink-2 mb-2">Para cada seção sorteada, o arquivo <code>-bu.dat</code> (assinado pela própria urna) foi baixado de resultados.tse.jus.br e decodificado pelo mesmo código que roda no seu navegador na página de cada seção. Foram comparados aptos, comparecimento, nominais, legenda, brancos, nulos e os votos de cada candidato em todos os cargos.</p>
        <p className="text-sm"><b>{fmt(b.amostra)}</b> BUs · <b>{fmt(b.secoesIguais)}</b> idênticos · <b>{fmt(b.comparacoes)}</b> números comparados · <b>{fmt(b.divergencias.length)}</b> divergência(s) · <b>{fmt(b.erros.length)}</b> erro(s) de download.</p>
        <details className="mt-2">
          <summary className="text-sm link cursor-pointer">Ver as {fmt(b.verificadas.length)} seções conferidas</summary>
          <div className="flex flex-wrap gap-1 mt-2 max-h-72 overflow-auto">
            {b.verificadas.map(x => (
              <a key={`${x.uf}${x.cd}${x.zona}${x.secao}`} className="chip hover:underline" href={rotas.secao(x.uf, x.cd, x.zona, x.secao)}>
                {x.ok ? '✓' : '✗'} {x.uf} · {titulo(x.municipio)} · Z{pad(x.zona)} S{pad(x.secao)}
              </a>
            ))}
          </div>
        </details>
      </Card>

      <Card title="3. Consistência aritmética" subtitle="Executada em todas as seções e todos os cargos">
        <ul className="text-sm ink-2 list-disc pl-5 space-y-1">
          <li>comparecimento + abstenção = eleitores aptos;</li>
          <li>nominais + legenda + brancos + nulos = comparecimento (× 2 para Senador, pois em 2026 há 2 vagas);</li>
          <li>soma dos votos de cada candidato = votos nominais da seção.</li>
        </ul>
        <p className="text-sm mt-2"><b>{fmt(c.checagens)}</b> checagens · <b>{fmt(c.totalFalhas || 0)}</b> falha(s).</p>
        {c.falhas.length > 0 && <div className="mt-2 max-h-40 overflow-auto text-xs font-mono">{c.falhas.map((f, i) => <div key={i}>{f}</div>)}</div>}
      </Card>

      <Card title="Regras de contagem (iguais às do TSE)">
        <ul className="text-sm ink-2 list-disc pl-5 space-y-1.5">
          <li><b>Votos válidos</b> = votos nominais em candidaturas válidas + votos de legenda. Percentuais de candidatos são sobre os válidos.</li>
          <li><b>Nulos técnicos</b>: a urna registra como nominal o voto em um número que existia na urna, mas a candidatura não é reconhecida na totalização (ex.: nº 28 para Presidente, após substituição de candidato). O TSE soma esses votos aos nulos; aqui também.</li>
          <li><b>Anulados sub judice</b>: votos em candidaturas com situação pendente na Justiça; aparecem separados e não entram nos válidos, como no portal do TSE.</li>
          <li><b>Seções agregadas</b>: votam na urna da seção principal; não possuem BU próprio. A página da seção agregada aponta para a principal.</li>
          <li><b>Seções não instaladas</b> (algumas no exterior): constam no cadastro com eleitores aptos, sem comparecimento nem abstenção apurados.</li>
          <li><b>Comparação com o BU</b>: o BU guarda os votos digitados. Por isso, na página da seção, “nominais” e “nulos” são comparados no formato do BU; a reclassificação acima é feita apenas na totalização.</li>
        </ul>
      </Card>

      <Card title="Fontes oficiais utilizadas" subtitle="Arquivos baixados do Portal de Dados Abertos do TSE; o SHA-256 permite verificar que são os mesmos arquivos">
        <div className="overflow-auto">
          <table className="tbl">
            <thead><tr><th>Arquivo</th><th>Gerado pelo TSE</th><th className="text-right">Registros</th><th className="text-right">Tamanho</th><th>SHA-256</th></tr></thead>
            <tbody>
              {meta.fontes.map(f => (
                <tr key={f.arquivo + f.conteudo}>
                  <td className="whitespace-nowrap"><a className="link" href={f.url} target="_blank" rel="noreferrer">{f.arquivo}</a><div className="text-xs muted truncate max-w-[260px]" title={f.conteudo}>{f.conteudo}</div></td>
                  <td className="whitespace-nowrap">{f.dtGeracao || '—'}</td>
                  <td className="text-right num">{fmt(f.linhas)}</td>
                  <td className="text-right num whitespace-nowrap">{(f.bytes / 1e6).toFixed(1).replace('.', ',')} MB</td>
                  <td className="font-mono text-[11px] break-all">{f.sha256}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs muted mt-2">Base gerada em {new Date(meta.geradoEm).toLocaleString('pt-BR')}. Para reproduzir: baixe os arquivos acima e execute <code>node scripts/data/build.mjs</code> e <code>node scripts/data/validate.mjs</code> (código aberto no repositório).</p>
      </Card>
    </div>
  );
}

function ConferenciaAoVivo() {
  const [n, setN] = useState(10);
  const [linhas, setLinhas] = useState([]);
  const [rodando, setRodando] = useState(false);
  const parar = useRef(false);
  const idx = useAsync(() => loadMunicipiosIndex(), []);

  const rodar = async () => {
    parar.current = false;
    setRodando(true);
    setLinhas([]);
    const lista = idx.data.filter(m => m.nSecoes > 0);
    const totalSec = lista.reduce((a, m) => a + m.nSecoes, 0);
    for (let k = 0; k < n && !parar.current; k++) {
      let r = Math.random() * totalSec, m = lista[0];
      for (const x of lista) { r -= x.nSecoes; if (r <= 0) { m = x; break; } }
      const linha = { id: k, uf: m.uf, cd: m.cd, municipio: titulo(m.nome), estado: 'carregando' };
      setLinhas(l => [...l, linha]);
      try {
        const mf = await loadMun(m.uf, m.cd);
        const secs = mf.secoes.filter(s => s.st && !s.ag);
        const s = secs[Math.floor(Math.random() * secs.length)];
        Object.assign(linha, { z: s.z, s: s.s });
        const bu = await baixarBoletim(m.uf, m.cd, s.z, s.s);
        const comp = compararComBU(s, { 1: mf.cand[1], 3: mf.cand[3], 5: mf.cand[5] }, bu.resumo);
        Object.assign(linha, { estado: 'ok', total: comp.length, iguais: comp.filter(c => c.ok).length });
      } catch (e) {
        Object.assign(linha, { estado: 'erro', erro: e.message });
      }
      setLinhas(l => l.map(x => (x.id === k ? { ...linha } : x)));
    }
    setRodando(false);
  };

  const ok = linhas.filter(l => l.estado === 'ok');
  return (
    <Card title="Confira você mesmo, agora" subtitle="Sorteia seções de todo o Brasil, baixa os BUs direto do TSE no seu navegador e compara com a base">
      <div className="flex flex-wrap gap-2 items-center mb-3">
        <Select value={n} onChange={v => setN(+v)} className="!py-1">{[5, 10, 25, 50, 100].map(x => <option key={x} value={x}>{x} urnas</option>)}</Select>
        {!rodando
          ? <button className="btn btn-primary" disabled={!idx.data} onClick={rodar}><Shuffle className="w-4 h-4" /> Sortear e conferir</button>
          : <button className="btn" onClick={() => { parar.current = true; }}><Square className="w-4 h-4" /> Parar</button>}
        {ok.length > 0 && <span className="text-sm">{ok.filter(l => l.iguais === l.total).length} de {ok.length} urnas 100% idênticas · {fmt(ok.reduce((a, l) => a + l.total, 0))} números comparados</span>}
      </div>
      {linhas.length > 0 && (
        <div className="overflow-auto max-h-96">
          <table className="tbl">
            <thead><tr><th>Seção</th><th>Resultado</th><th></th></tr></thead>
            <tbody>
              {linhas.map(l => (
                <tr key={l.id}>
                  <td>{l.z ? <a className="link" href={rotas.secao(l.uf, l.cd, l.z, l.s)}>{l.municipio} – {l.uf} · Z{pad(l.z)} S{pad(l.s)}</a> : `${l.municipio} – ${l.uf}`}</td>
                  <td>
                    {l.estado === 'carregando' && <span className="muted">baixando BU…</span>}
                    {l.estado === 'ok' && <span className="inline-flex items-center gap-1.5"><StatusIcon ok={l.iguais === l.total} /> {l.iguais}/{l.total} números conferem</span>}
                    {l.estado === 'erro' && <span style={{ color: 'var(--bad)' }}>{l.erro}</span>}
                  </td>
                  <td>{l.z && <a className="link text-xs inline-flex items-center gap-1" href={urlPortalSecao(l.uf, l.cd, l.z, l.s)} target="_blank" rel="noreferrer">TSE <ExternalLink className="w-3 h-3" /></a>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { LayoutDashboard, Plus, Trash2, ArrowUp, ArrowDown, Link2, Filter, Save, X } from 'lucide-react';
import { useAsync, Card, Loading, ErrorBox, Select, Seg, Empty } from '../components/ui';
import { Indicadores, ResultadoCandidatos, ComposicaoVotos } from '../components/Resultado';
import { RankBars, Histogram, Scatter } from '../components/charts';
import MapaResultado from '../components/MapaResultado';
import DataTable from '../components/DataTable';
import { BotaoComparar } from '../components/Comparacao';
import { loadBrasil, loadUf, loadMun, loadGeoUf, loadGeoBrasil, loadMunicipiosIndex, UF_NOMES, IBGE_UF, CARGOS, cargosDaUf, somarSt, somarV, secoesDoMunicipio, agrupar, S, validosSt, nulosSt, cargoNome } from '../lib/data';
import { itensDeVetor } from '../lib/resultados';
import { fmt, fmtPct, pct, titulo, pad, semAcento } from '../lib/format';
import { rotas, setQuery } from '../lib/router';
import { idUf, idMun, idZona, idLocal, idSecao } from '../lib/unidades';
import { vencedor } from '../lib/metricasMapa';

const NIVEIS = { uf: 'UFs', mun: 'Municípios', zona: 'Zonas', local: 'Locais de votação', secao: 'Seções (urnas)' };
const WIDGETS = {
  kpis: 'Indicadores do recorte', resultado: 'Resultado agregado', ranking: 'Ranking', histograma: 'Histograma',
  dispersao: 'Dispersão (X × Y)', mapa: 'Mapa', tabela: 'Tabela'
};

const PRESETS = [
  {
    nome: 'Seções com maior abstenção em Fortaleza (CE)',
    cfg: { uf: 'CE', cd: '13897', nivel: 'secao', cargo: 1, filtros: [], widgets: [{ tipo: 'kpis' }, { tipo: 'ranking', metrica: 'abstencao', n: 20 }, { tipo: 'histograma', metrica: 'abstencao' }, { tipo: 'mapa', metrica: 'abstencao' }] }
  },
  {
    nome: 'Municípios do Brasil com comparecimento abaixo de 70%',
    cfg: { nivel: 'mun', cargo: 1, filtros: [{ campo: 'comparecimento', op: '<', valor: 70 }], widgets: [{ tipo: 'kpis' }, { tipo: 'resultado' }, { tipo: 'tabela', metrica: 'comparecimento' }] }
  },
  {
    nome: 'Locais de votação de São Paulo (capital): Lula × Flávio',
    cfg: { uf: 'SP', cd: '71072', nivel: 'local', cargo: 1, filtros: [], widgets: [{ tipo: 'dispersao', metrica: 'cand:22', metricaY: 'cand:13' }, { tipo: 'mapa', metrica: 'vencedor' }, { tipo: 'ranking', metrica: 'margem', n: 15 }] }
  },
  {
    nome: 'Governador no Ceará: municípios onde o 2º colocado venceu',
    cfg: { uf: 'CE', nivel: 'mun', cargo: 3, filtros: [{ campo: 'vencedorPos', op: '=', valor: 2 }], widgets: [{ tipo: 'kpis' }, { tipo: 'mapa', metrica: 'vencedor' }, { tipo: 'tabela', metrica: 'aptos' }] }
  }
];

const PADRAO = { nivel: 'uf', cargo: 1, filtros: [], widgets: [{ tipo: 'kpis' }, { tipo: 'resultado' }, { tipo: 'mapa', metrica: 'vencedor' }, { tipo: 'ranking', metrica: 'comparecimento', n: 15 }] };

const enc = o => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
const dec = s => { try { return JSON.parse(decodeURIComponent(escape(atob(s)))); } catch { return null; } };

/** Catálogo de métricas numéricas disponíveis para filtros, rankings e gráficos. */
function catalogo(candRef, cargo) {
  const vagas = +cargo === 5 ? 2 : 1;
  const m = [
    { value: 'aptos', label: 'Eleitores aptos', f: r => r.st[S.aptos], fmt },
    { value: 'comparecimentoAbs', label: 'Comparecimento (eleitores)', f: r => r.st[S.comp], fmt },
    { value: 'comparecimento', label: '% comparecimento', f: r => pct(r.st[S.comp], r.st[S.aptos]), fmt: fmtPct, pct: true },
    { value: 'abstencao', label: '% abstenção', f: r => pct(r.st[S.abst], r.st[S.aptos]), fmt: fmtPct, pct: true },
    { value: 'brancos', label: '% brancos', f: r => pct(r.st[S.br], r.st[S.comp] * vagas), fmt: fmtPct, pct: true },
    { value: 'nulos', label: '% nulos', f: r => pct(nulosSt(r.st), r.st[S.comp] * vagas), fmt: fmtPct, pct: true },
    { value: 'validos', label: 'Votos válidos', f: r => validosSt(r.st), fmt },
    { value: 'nSecoes', label: 'Nº de seções', f: r => r.nSecoes, fmt },
    { value: 'vencedorPos', label: 'Posição (no recorte geral) do mais votado', f: r => (r._venc != null ? r._venc + 1 : null), fmt }
  ];
  for (const [i, c] of (candRef || []).entries()) {
    if (i >= 12 || c.votoValido) continue;
    m.push({ value: `cand:${c.n}`, label: `% ${c.nome} (${c.n})`, f: r => (r.v ? pct(r.v[i] || 0, validosSt(r.st)) : null), fmt: fmtPct, pct: true });
    m.push({ value: `votos:${c.n}`, label: `Votos ${c.nome} (${c.n})`, f: r => (r.v ? r.v[i] || 0 : null), fmt });
  }
  if (candRef?.length >= 2) m.push({ value: 'margem', label: `Margem ${candRef[0].nome} − ${candRef[1].nome} (p.p.)`, f: r => (r.v ? pct((r.v[0] || 0) - (r.v[1] || 0), validosSt(r.st)) : null), fmt: v => (v == null ? '—' : `${v.toFixed(2).replace('.', ',')} p.p.`) });
  return m;
}

async function carregarLinhas(cfg, onProgresso) {
  const brasil = await loadBrasil();
  const { uf, cd, nivel, cargo } = cfg;
  const candRef = +cargo === 1 ? brasil.cand[1] : uf ? (await loadUf(uf)).cand[cargo] : null;
  if (!candRef) throw new Error(`${cargoNome(cargo)} exige escolher uma UF no escopo.`);
  const base = { candRef, geo: null, geoKey: null };

  if (nivel === 'uf') {
    base.geo = await loadGeoBrasil();
    base.geoKey = f => IBGE_UF[f.properties.codarea];
    base.linhas = brasil.ufs.filter(u => u.st[cargo]).map(u => ({
      key: u.uf, nome: u.nome, sub: u.uf, st: u.st[cargo], v: u.v[cargo], nSecoes: u.nSecoes, href: rotas.uf(u.uf, { c: cargo }), idc: idUf(u.uf)
    }));
    return base;
  }
  if (nivel === 'mun') {
    const ufs = uf ? [uf] : brasil.ufs.map(u => u.uf);
    const uds = await Promise.all(ufs.map(loadUf));
    if (uf && uf !== 'ZZ') { base.geo = await loadGeoUf(uf).catch(() => null); base.geoKey = f => String(f.properties.ibge); }
    base.linhas = uds.flatMap(ud => ud.mun.filter(m => m.st[cargo]).map(m => ({
      key: uf ? String(m.ibge ?? m.cd) : `${ud.uf}-${m.cd}`, nome: `${titulo(m.nome)} – ${ud.uf}`, sub: `${m.zonas.length} zona(s)`, st: m.st[cargo], v: m.v[cargo],
      nSecoes: m.nSecoes, lat: m.lat, lng: m.lng, uf: ud.uf, href: rotas.mun(ud.uf, m.cd, { c: cargo }), idc: idMun(ud.uf, m.cd)
    })));
    return base;
  }
  // zona / local / seção: precisa dos arquivos de município
  let muns;
  if (cd) muns = [{ uf, cd }];
  else {
    const idx = await loadMunicipiosIndex();
    muns = idx.filter(m => m.uf === uf);
  }
  let feitos = 0;
  const arquivos = [];
  for (let i = 0; i < muns.length; i += 12) {
    const lote = await Promise.all(muns.slice(i, i + 12).map(m => loadMun(m.uf, m.cd)));
    arquivos.push(...lote);
    feitos += lote.length;
    onProgresso?.(feitos, muns.length);
  }
  const linhas = [];
  for (const mf of arquivos) {
    const secs = secoesDoMunicipio(mf, UF_NOMES[mf.uf]);
    const munNome = titulo(mf.nome);
    if (nivel === 'secao') {
      for (const s of secs) if (s.st?.[cargo]) linhas.push({
        key: s.id, nome: `S${pad(s.s)} Z${pad(s.z)}${cd ? '' : ` · ${munNome}`}`, sub: titulo(s.local?.nome || ''), st: s.st[cargo], v: s.v?.[cargo], nSecoes: 1,
        lat: s.local?.lat, lng: s.local?.lng, modelo: s.m, bairro: s.local?.bairro, zona: s.z, municipio: munNome,
        href: rotas.secao(mf.uf, mf.cd, s.z, s.s, { c: cargo }), idc: idSecao(mf.uf, mf.cd, s.z, s.s)
      });
    } else {
      for (const g of agrupar(secs, nivel)) {
        if (!g.st[cargo]) continue;
        linhas.push(nivel === 'zona'
          ? { key: `${mf.cd}-${g.z}`, nome: `Zona ${pad(g.z)}${cd ? '' : ` · ${munNome}`}`, sub: `${g.locais.size} locais`, st: g.st[cargo], v: g.v[cargo], nSecoes: g.nSecoes, zona: g.z, municipio: munNome, href: rotas.mun(mf.uf, mf.cd, { c: cargo, tab: 'secoes', zona: g.z }), idc: idZona(mf.uf, mf.cd, g.z) }
          : { key: `${mf.cd}-${g.z}-${g.local.n}`, nome: titulo(g.local.nome), sub: `Z${pad(g.z)} · ${titulo(g.local.bairro || '')}${cd ? '' : ` · ${munNome}`}`, st: g.st[cargo], v: g.v[cargo], nSecoes: g.nSecoes, lat: g.local.lat, lng: g.local.lng, bairro: g.local.bairro, zona: g.z, municipio: munNome, href: rotas.mun(mf.uf, mf.cd, { c: cargo, tab: 'secoes', zona: g.z, local: `${g.z}-${g.local.n}` }), idc: idLocal(mf.uf, mf.cd, g.z, g.local.n) });
      }
    }
  }
  base.linhas = linhas;
  return base;
}

function aplicarFiltros(linhas, filtros, cat) {
  return linhas.filter(r => filtros.every(f => {
    if (f.campo === 'texto') return semAcento(`${r.nome} ${r.sub || ''} ${r.bairro || ''} ${r.municipio || ''}`).includes(semAcento(String(f.valor || '')));
    if (f.campo === 'modelo') return !f.valor || r.modelo === f.valor;
    const m = cat.find(c => c.value === f.campo);
    if (!m) return true;
    const x = m.f(r);
    const v = parseFloat(String(f.valor).replace(',', '.'));
    if (f.valor === '' || f.valor == null || !Number.isFinite(v)) return true; // filtro incompleto não restringe
    if (x == null || !Number.isFinite(x)) return false;
    return f.op === '>=' ? x >= v : f.op === '<=' ? x <= v : f.op === '>' ? x > v : f.op === '<' ? x < v : Math.abs(x - v) < 1e-9;
  }));
}

export default function PainelPage({ query }) {
  const cfgUrl = query.cfg ? dec(query.cfg) : null;
  const cfg = { ...PADRAO, ...(cfgUrl || {}) };
  const setCfg = patch => setQuery({ cfg: enc({ ...cfg, ...patch }) });
  const [prog, setProg] = useState(null);
  const [salvos, setSalvos] = useState(() => { try { return JSON.parse(localStorage.getItem('paineis-v1')) || []; } catch { return []; } });
  useEffect(() => { try { localStorage.setItem('paineis-v1', JSON.stringify(salvos)); } catch { /* ok */ } }, [salvos]);

  const idx = useAsync(() => loadMunicipiosIndex(), []);
  const chave = `${cfg.uf}|${cfg.cd}|${cfg.nivel}|${cfg.cargo}`;
  const dados = useAsync(() => { setProg(null); return carregarLinhas(cfg, (a, b) => setProg([a, b])); }, [chave]);

  const cat = useMemo(() => catalogo(dados.data?.candRef, cfg.cargo), [dados.data, cfg.cargo]);
  const linhas = useMemo(() => {
    if (!dados.data) return [];
    const ref = dados.data.candRef;
    return dados.data.linhas.map(r => {
      const w = vencedor(r.v, ref);
      return { ...r, _venc: w ? ref.indexOf(w) : null };
    });
  }, [dados.data]);
  const filtradas = useMemo(() => aplicarFiltros(linhas, cfg.filtros, cat), [linhas, cfg.filtros, cat]);

  const niveisDisp = cfg.cd ? ['zona', 'local', 'secao'] : cfg.uf ? ['mun', 'zona', 'local', 'secao'] : ['uf', 'mun'];
  const cargosDisp = cfg.uf ? cargosDaUf(cfg.uf).filter(c => c.id <= 5) : CARGOS.filter(c => c.id === 1);
  const munsUf = (idx.data || []).filter(m => m.uf === cfg.uf).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const setWidget = (i, patch) => setCfg({ widgets: cfg.widgets.map((w, k) => (k === i ? { ...w, ...patch } : w)) });
  const mover = (i, d) => { const w = [...cfg.widgets]; const [x] = w.splice(i, 1); w.splice(i + d, 0, x); setCfg({ widgets: w }); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><LayoutDashboard className="w-6 h-6" /> Painel personalizado</h1>
          <p className="text-sm ink-2">Escolha o recorte, o nível de detalhe, os filtros e os blocos de visualização. Tudo fica no link — salve ou compartilhe.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn" onClick={() => navigator.clipboard?.writeText(window.location.href)}><Link2 className="w-4 h-4" /> Copiar link</button>
          <button className="btn" onClick={() => { const nome = prompt('Nome do painel:'); if (nome) setSalvos(s => [...s.filter(x => x.nome !== nome), { nome, cfg }]); }}><Save className="w-4 h-4" /> Salvar</button>
        </div>
      </div>

      <Card title="Modelos prontos e painéis salvos">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => <button key={p.nome} className="btn !py-1 text-xs" onClick={() => setQuery({ cfg: enc(p.cfg) })}>{p.nome}</button>)}
          {salvos.map(p => (
            <span key={p.nome} className="chip !py-1">
              <button className="hover:underline" onClick={() => setQuery({ cfg: enc(p.cfg) })}>★ {p.nome}</button>
              <button onClick={() => setSalvos(s => s.filter(x => x.nome !== p.nome))} aria-label="Excluir painel salvo"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      </Card>

      <Card title="Recorte" subtitle="Escopo territorial, nível de detalhe e cargo">
        <div className="flex flex-wrap gap-3 items-center">
          <label className="text-sm flex items-center gap-1.5">Escopo
            <Select value={cfg.uf || ''} onChange={v => setCfg({ uf: v || null, cd: null, nivel: v ? 'mun' : 'uf', cargo: v ? cfg.cargo : 1 })}>
              <option value="">Brasil</option>
              {Object.entries(UF_NOMES).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </Select>
          </label>
          {cfg.uf && (
            <label className="text-sm flex items-center gap-1.5">Município
              <Select value={cfg.cd || ''} onChange={v => setCfg({ cd: v || null, nivel: v ? 'secao' : 'mun' })} className="max-w-[220px]">
                <option value="">Todos</option>
                {munsUf.map(m => <option key={m.cd} value={m.cd}>{titulo(m.nome)}</option>)}
              </Select>
            </label>
          )}
          <label className="text-sm flex items-center gap-1.5">Nível
            <Seg value={cfg.nivel} onChange={v => setCfg({ nivel: v })} options={niveisDisp.map(n => ({ value: n, label: NIVEIS[n] }))} />
          </label>
          {cargosDisp.length > 1 && (
            <label className="text-sm flex items-center gap-1.5">Cargo
              <Seg value={cfg.cargo} onChange={v => setCfg({ cargo: v })} options={cargosDisp.map(c => ({ value: c.id, label: c.curto }))} />
            </label>
          )}
        </div>
        {cfg.uf && !cfg.cd && ['zona', 'local', 'secao'].includes(cfg.nivel) && <p className="text-xs muted mt-2">Para a UF inteira em nível de {NIVEIS[cfg.nivel].toLowerCase()}, todos os municípios são carregados (pode levar alguns segundos em UFs grandes).</p>}
      </Card>

      <Card title="Filtros" subtitle={dados.data ? `${fmt(filtradas.length)} de ${fmt(linhas.length)} ${NIVEIS[cfg.nivel].toLowerCase()} atendem aos filtros` : ''}>
        <div className="space-y-2">
          {cfg.filtros.map((f, i) => (
            <div key={i} className="flex flex-wrap gap-2 items-center">
              <Filter className="w-4 h-4 muted" />
              <Select value={f.campo} onChange={v => setCfg({ filtros: cfg.filtros.map((x, k) => (k === i ? { ...x, campo: v } : x)) })} className="!py-1 text-sm">
                <option value="texto">Texto contém</option>
                {cfg.nivel === 'secao' && <option value="modelo">Modelo da urna</option>}
                {cat.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Select>
              {f.campo !== 'texto' && f.campo !== 'modelo' && (
                <Select value={f.op} onChange={v => setCfg({ filtros: cfg.filtros.map((x, k) => (k === i ? { ...x, op: v } : x)) })} className="!py-1 text-sm">
                  {['>=', '<=', '>', '<', '='].map(o => <option key={o} value={o}>{o}</option>)}
                </Select>
              )}
              {f.campo === 'modelo'
                ? <Select value={f.valor} onChange={v => setCfg({ filtros: cfg.filtros.map((x, k) => (k === i ? { ...x, valor: v } : x)) })} className="!py-1 text-sm">{['', 'UE 2009', 'UE 2010', 'UE 2011', 'UE 2013', 'UE 2015', 'UE 2020', 'UE 2022'].map(o => <option key={o} value={o}>{o || 'Qualquer'}</option>)}</Select>
                : <input className="input !py-1 w-40" value={f.valor ?? ''} onChange={e => setCfg({ filtros: cfg.filtros.map((x, k) => (k === i ? { ...x, valor: e.target.value } : x)) })} placeholder={f.campo === 'texto' ? 'ex.: escola' : 'valor'} />}
              <button className="btn !p-1.5" onClick={() => setCfg({ filtros: cfg.filtros.filter((_, k) => k !== i) })} aria-label="Remover filtro"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          <button className="btn !py-1 text-xs" onClick={() => setCfg({ filtros: [...cfg.filtros, { campo: 'comparecimento', op: '>=', valor: '' }] })}><Plus className="w-3.5 h-3.5" /> Adicionar filtro</button>
        </div>
      </Card>

      {dados.loading && <Loading texto={prog ? `Carregando municípios ${prog[0]} de ${prog[1]}…` : 'Carregando dados…'} />}
      {dados.error && <ErrorBox error={dados.error} />}
      {dados.data && (
        <div className="grid lg:grid-cols-2 gap-4">
          {cfg.widgets.map((w, i) => (
            <Widget key={i} w={w} i={i} total={cfg.widgets.length} cfg={cfg} cat={cat} linhas={filtradas} dados={dados.data}
              onChange={p => setWidget(i, p)} onRemove={() => setCfg({ widgets: cfg.widgets.filter((_, k) => k !== i) })} onMove={d => mover(i, d)} />
          ))}
          <div className="card p-4 flex flex-wrap gap-2 items-center content-start lg:col-span-2">
            <span className="text-sm ink-2 mr-1">Adicionar bloco:</span>
            {Object.entries(WIDGETS).map(([k, l]) => <button key={k} className="btn !py-1 text-xs" onClick={() => setCfg({ widgets: [...cfg.widgets, { tipo: k, metrica: k === 'mapa' ? 'vencedor' : 'comparecimento', metricaY: 'abstencao', n: 15 }] })}><Plus className="w-3.5 h-3.5" /> {l}</button>)}
          </div>
        </div>
      )}
    </div>
  );
}

function Widget({ w, i, total, cfg, cat, linhas, dados, onChange, onRemove, onMove }) {
  const met = cat.find(c => c.value === w.metrica) || cat.find(c => c.value === 'comparecimento');
  const metY = cat.find(c => c.value === w.metricaY) || cat.find(c => c.value === 'abstencao');
  const largo = ['tabela', 'mapa', 'kpis'].includes(w.tipo);
  const seletor = (val, key, extra = []) => (
    <Select value={val} onChange={v => onChange({ [key]: v })} className="!py-1 text-xs max-w-[220px]">
      {extra.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      {cat.filter(c => c.value !== 'vencedorPos').map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
    </Select>
  );
  const agregado = useMemo(() => {
    const st = {}, v = {};
    for (const r of linhas) { somarSt(st, { x: r.st }); if (r.v) somarV(v, { x: r.v }); }
    return { st: st.x, v: v.x };
  }, [linhas]);

  let corpo;
  let controles = null;
  if (!linhas.length) corpo = <Empty>Nenhuma unidade atende aos filtros.</Empty>;
  else if (w.tipo === 'kpis') {
    corpo = <div className="space-y-3"><Indicadores st={agregado.st} cargo={cfg.cargo} extra={[`${fmt(linhas.length)} ${NIVEIS[cfg.nivel].toLowerCase()}`]} /><ComposicaoVotos st={agregado.st} cargo={cfg.cargo} /></div>;
  } else if (w.tipo === 'resultado') {
    corpo = <ResultadoCandidatos itens={itensDeVetor(agregado.v, dados.candRef)} st={agregado.st} cargo={cfg.cargo} />;
  } else if (w.tipo === 'ranking') {
    const dir = w.dir || 'desc';
    controles = <>{seletor(w.metrica, 'metrica')}<Seg size="xs" value={dir} onChange={v => onChange({ dir: v })} options={[{ value: 'desc', label: 'Maiores' }, { value: 'asc', label: 'Menores' }]} /><Select value={w.n || 15} onChange={v => onChange({ n: +v })} className="!py-1 text-xs">{[10, 15, 20, 25, 50].map(n => <option key={n} value={n}>Top {n}</option>)}</Select></>;
    const itens = linhas.map(r => ({ key: r.key, label: r.nome, sub: r.sub, value: met.f(r), onClick: () => { window.location.hash = r.href; } }))
      .filter(x => x.value != null && Number.isFinite(x.value)).sort((a, b) => (dir === 'desc' ? b.value - a.value : a.value - b.value));
    corpo = <RankBars itens={itens} format={met.fmt} max={w.n || 15} />;
  } else if (w.tipo === 'histograma') {
    controles = seletor(w.metrica, 'metrica');
    corpo = <Histogram values={linhas.map(met.f)} format={v => (met.pct ? `${v.toFixed(1).replace('.', ',')}%` : fmt(Math.round(v)))} xLabel={met.label} />;
  } else if (w.tipo === 'dispersao') {
    controles = <>{seletor(w.metrica, 'metrica')}<span className="text-xs muted">×</span>{seletor(w.metricaY, 'metricaY')}</>;
    corpo = <Scatter points={linhas.map(r => ({ x: met.f(r), y: metY.f(r), label: r.nome, onClick: () => { window.location.hash = r.href; } }))} xLabel={met.label} yLabel={metY.label} fx={v => (met.pct ? v.toFixed(1).replace('.', ',') : fmt(Math.round(v)))} fy={v => (metY.pct ? v.toFixed(1).replace('.', ',') : fmt(Math.round(v)))} />;
  } else if (w.tipo === 'mapa') {
    const temGeo = dados.geo && (cfg.nivel === 'uf' || cfg.nivel === 'mun');
    const unidades = linhas.map(r => ({ key: r.key, nome: r.nome, st: r.st, v: r.v, lat: r.lat, lng: r.lng, onClick: () => { window.location.hash = r.href; } }));
    corpo = temGeo
      ? <MapaResultado key={`${w.metrica}`} unidades={unidades} candRef={dados.candRef} cargo={cfg.cargo} geo={dados.geo} chaveFeature={dados.geoKey} metricaInicial={w.metrica || 'vencedor'} height={420} />
      : unidades.some(u => u.lat != null)
        ? <MapaResultado key={`${w.metrica}`} unidades={unidades} candRef={dados.candRef} cargo={cfg.cargo} pontos metricaInicial={w.metrica || 'vencedor'} height={420} />
        : <Empty>Este nível não possui coordenadas geográficas.</Empty>;
  } else if (w.tipo === 'tabela') {
    const cols = [
      { key: 'nome', label: NIVEIS[cfg.nivel].replace(/s$/, ''), value: r => r.nome, render: r => <a className="link" href={r.href}>{r.nome}</a> },
      { key: 'sub', label: 'Detalhe', value: r => r.sub },
      ...cat.filter(c => !c.value.startsWith('votos:') && c.value !== 'vencedorPos').slice(0, 16).map(c => ({ key: c.value, label: c.label.replace(/\s\(\d+\)$/, ''), value: r => c.f(r), align: 'right', render: r => c.fmt(c.f(r)) })),
      { key: 'cmp', label: '', value: () => null, render: r => <BotaoComparar compacto id={r.idc} rotulo={r.nome} /> }
    ];
    corpo = <DataTable linhas={linhas} colunas={cols} rowKey={r => r.key} ordemInicial={{ key: w.metrica || 'aptos', dir: 'desc' }} nomeArquivo="painel" porPagina={25} />;
  }

  return (
    <Card
      className={largo ? 'lg:col-span-2' : ''}
      title={`${WIDGETS[w.tipo]}${w.tipo === 'ranking' || w.tipo === 'histograma' ? ` · ${met.label}` : ''}`}
      actions={<>
        {controles}
        <button className="btn !p-1" disabled={i === 0} onClick={() => onMove(-1)} aria-label="Mover para cima"><ArrowUp className="w-3.5 h-3.5" /></button>
        <button className="btn !p-1" disabled={i === total - 1} onClick={() => onMove(1)} aria-label="Mover para baixo"><ArrowDown className="w-3.5 h-3.5" /></button>
        <button className="btn !p-1" onClick={onRemove} aria-label="Remover bloco"><Trash2 className="w-3.5 h-3.5" /></button>
      </>}
    >
      {corpo}
    </Card>
  );
}

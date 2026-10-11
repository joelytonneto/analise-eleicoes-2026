import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, School, UserRound, MapPin, Building2, Vote, Loader2 } from 'lucide-react';
import { Card, Seg, Select, Empty, SeloResultado } from '../components/ui';
import { interpretar, useMunicipios, useBuscaTexto } from '../components/SearchBox';
import { hrefLocal, subLocal, hrefCandidato, subCandidato } from '../lib/busca';
import { UF_NOMES, CARGOS } from '../lib/data';
import { titulo } from '../lib/format';
import { setQuery } from '../lib/router';

const ICONES = { secao: Vote, zona: MapPin, mun: Building2, uf: MapPin };

function Linha({ href, icon: I, label, sub, selo }) {
  return (
    <a href={href} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg hover:bg-[var(--surface-2)]">
      <I className="w-4 h-4 mt-0.5 muted shrink-0" />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}{selo && <SeloResultado resultado={selo} className="ml-1.5" />}</span>
        {sub && <span className="block text-xs muted">{sub}</span>}
      </span>
    </a>
  );
}

/** Busca completa: municípios/zonas/seções, locais de votação (escola, endereço, bairro) e candidaturas, com filtros. */
export default function BuscarPage({ query }) {
  const tipo = query.tipo || 'tudo';
  const filtros = { uf: query.uf || undefined, cargo: query.cargo ? +query.cargo : undefined, eleitos: query.eleitos === '1' };
  const [q, setQ] = useState(query.q || '');
  const [limLoc, setLimLoc] = useState(30);
  const [limCand, setLimCand] = useState(30);
  const ref = useRef(null);
  const municipios = useMunicipios();

  useEffect(() => { if (!query.q) ref.current?.focus(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // mantém o texto na URL (link compartilhável) sem empilhar histórico a cada tecla
  const naUrl = useRef(query.q || '');
  useEffect(() => {
    const t = setTimeout(() => { if (naUrl.current !== q) { naUrl.current = q; setQuery({ q: q || undefined }); } }, 400);
    return () => clearTimeout(t);
  }, [q]);
  // a URL mudou por fora (link, voltar do navegador): o campo acompanha
  useEffect(() => {
    const u = query.q || '';
    if (u !== naUrl.current) { naUrl.current = u; setQ(u); }
  }, [query.q]);
  useEffect(() => { setLimLoc(30); setLimCand(30); }, [q, tipo, query.uf, query.cargo, query.eleitos]);

  const lugares = useMemo(() => (q.trim() && tipo === 'tudo' ? interpretar(q, municipios) : []), [q, municipios, tipo]);
  const r = useBuscaTexto(q, municipios, {
    limiteLocais: limLoc, limiteCand: limCand, filtrosCand: filtros,
    locais: tipo !== 'candidatos', candidatos: tipo !== 'locais'
  });
  const cargos = CARGOS.filter(c => !filtros.uf || filtros.uf !== 'ZZ' || c.id === 1);
  const vazio = !q.trim() && !filtros.uf && !filtros.cargo && !filtros.eleitos;

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2"><Search className="w-6 h-6" /> Buscar</h1>
        <p className="text-sm ink-2">Município, zona e seção, <b>nome da escola</b> ou <b>endereço</b> do local de votação, ou <b>nome do candidato</b>.</p>
      </div>
      <div className="card p-3 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 muted" />
          <input ref={ref} className="input w-full pl-9 !py-2.5" placeholder="Ex.: Liceu do Ceará · Rua Barão do Rio Branco Fortaleza · André Fernandes" value={q} onChange={e => setQ(e.target.value)} type="search" enterKeyHint="search" aria-label="Texto da busca" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Seg value={tipo} onChange={v => setQuery({ tipo: v === 'tudo' ? undefined : v })} options={[{ value: 'tudo', label: 'Tudo' }, { value: 'locais', label: 'Escolas e endereços' }, { value: 'candidatos', label: 'Candidatos' }]} />
        </div>
        {tipo !== 'locais' && (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filtros.uf || ''} onChange={v => setQuery({ uf: v || undefined })} aria-label="UF do candidato" className="!py-1 text-sm">
              <option value="">Todas as UFs</option>
              {Object.entries(UF_NOMES).filter(([s]) => s !== 'ZZ').map(([s, nome]) => <option key={s} value={s}>{nome}</option>)}
            </Select>
            <Select value={filtros.cargo || ''} onChange={v => setQuery({ cargo: v || undefined })} aria-label="Cargo" className="!py-1 text-sm">
              <option value="">Todos os cargos</option>
              {cargos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
            <button className="btn" aria-pressed={filtros.eleitos} onClick={() => setQuery({ eleitos: filtros.eleitos ? undefined : '1' })} style={filtros.eleitos ? { boxShadow: '0 0 0 2px var(--ok)', color: 'var(--ok)' } : undefined}>
              {filtros.eleitos ? '✓ ' : ''}Só eleitos / 2º turno
            </button>
          </div>
        )}
        {tipo !== 'locais' && (filtros.uf || filtros.cargo || filtros.eleitos) && !q.trim() && (
          <p className="text-xs muted">Sem texto, a lista mostra todas as candidaturas que atendem aos filtros (ex.: todos os eleitos de uma UF).</p>
        )}
      </div>

      {vazio && (
        <Card title="Exemplos">
          <ul className="text-sm space-y-1.5 ink-2">
            <li><b>Itaitinga 78 393</b> — município, zona e seção</li>
            <li><b>Liceu do Ceará</b> ou <b>escola estadual Fortaleza</b> — nome da escola (o município no texto restringe a busca)</li>
            <li><b>Avenida das Graviolas</b> ou <b>Cidade 2000</b> — endereço ou bairro do local de votação</li>
            <li><b>Cid Gomes</b>, <b>PL</b> com UF e cargo, ou só o número <b>2222 CE</b> — candidatos</li>
            <li>Escolha uma UF, um cargo e “Só eleitos” para ver a lista de eleitos.</li>
          </ul>
        </Card>
      )}

      {lugares.length > 0 && (
        <Card title="Municípios, zonas e seções" bodyClass="p-1.5">
          {lugares.map((x, i) => <Linha key={x.href + i} href={x.href} icon={ICONES[x.tipo]} label={x.label} sub={x.sub} />)}
        </Card>
      )}

      {tipo !== 'locais' && (r.candidatos.length > 0 || (!vazio && !r.carregando && tipo === 'candidatos')) && (
        <Card title="Candidatos" subtitle={`${r.totalCand.toLocaleString('pt-BR')} candidatura(s) · resultado oficial do TSE no 1º turno`} bodyClass="p-1.5">
          {r.candidatos.length
            ? r.candidatos.map(c => <Linha key={`${c.cargo}-${c.uf}-${c.n}`} href={hrefCandidato(c)} icon={UserRound} label={c.nome} sub={subCandidato(c)} selo={c.resultado} />)
            : <Empty>Nenhuma candidatura encontrada.</Empty>}
          {r.totalCand > r.candidatos.length && <button className="btn w-full justify-center mt-1" onClick={() => setLimCand(l => l + 50)}>Mostrar mais ({(r.totalCand - r.candidatos.length).toLocaleString('pt-BR')} restantes)</button>}
        </Card>
      )}

      {tipo !== 'candidatos' && q.trim() && (r.locais.length > 0 || (!r.carregando && tipo === 'locais')) && (
        <Card title="Locais de votação" subtitle={`${r.totalLocais.toLocaleString('pt-BR')} local(is) · nome da escola, endereço ou bairro`} bodyClass="p-1.5">
          {r.locais.length
            ? r.locais.map(l => <Linha key={`${l.uf}-${l.cd}-${l.z}-${l.n}`} href={hrefLocal(l)} icon={School} label={titulo(l.nome)} sub={subLocal(l)} />)
            : <Empty>Nenhum local encontrado. Inclua o nome do município para restringir (ex.: “escola Maria Fortaleza”).</Empty>}
          {r.totalLocais > r.locais.length && <button className="btn w-full justify-center mt-1" onClick={() => setLimLoc(l => l + 50)}>Mostrar mais ({(r.totalLocais - r.locais.length).toLocaleString('pt-BR')} restantes)</button>}
        </Card>
      )}

      {r.carregando && <div className="text-sm muted flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Procurando… (na primeira busca por escola sem município, o índice nacional de locais é baixado uma vez)</div>}
      {!vazio && !r.carregando && !lugares.length && !r.candidatos.length && !r.locais.length && tipo === 'tudo' && (
        <Empty>Nada encontrado para “{q}”. Confira a grafia ou inclua o nome do município.</Empty>
      )}
    </div>
  );
}

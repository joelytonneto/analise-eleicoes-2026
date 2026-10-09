import React, { useMemo, useState } from 'react';
import { Crosshair, ExternalLink } from 'lucide-react';
import { useAsync, Card, Loading, ErrorBox, Select } from '../components/ui';
import { loadMunicipiosIndex, loadMun, UF_NOMES } from '../lib/data';
import { titulo, pad, semAcento } from '../lib/format';
import { rotas, setQuery } from '../lib/router';

export default function LocalizarPage({ query }) {
  const uf = query.uf || '';
  const cd = query.mun || '';
  const zona = query.zona || '';
  const [filtroMun, setFiltroMun] = useState('');
  const [secaoTxt, setSecaoTxt] = useState('');
  const idx = useAsync(() => loadMunicipiosIndex(), []);
  const mf = useAsync(() => (uf && cd ? loadMun(uf, cd) : Promise.resolve(null)), [uf, cd]);

  const muns = useMemo(() => (idx.data || []).filter(m => m.uf === uf).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')), [idx.data, uf]);
  const munsFiltrados = filtroMun ? muns.filter(m => semAcento(m.nome).includes(semAcento(filtroMun))) : muns;
  const zonas = useMemo(() => (mf.data ? [...new Set(mf.data.secoes.map(s => s.z))].sort((a, b) => a - b) : []), [mf.data]);
  const secoes = useMemo(() => (mf.data && zona ? mf.data.secoes.filter(s => s.z === +zona) : []), [mf.data, zona]);

  const irSecao = num => {
    const s = secoes.find(x => x.s === +num);
    if (!s) return;
    window.location.hash = rotas.secao(uf, cd, s.z, s.s);
  };

  if (idx.loading) return <Loading />;
  if (idx.error) return <ErrorBox error={idx.error} />;
  const naoExiste = secaoTxt && zona && !secoes.some(x => x.s === +secaoTxt);

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2"><Crosshair className="w-6 h-6" /> Localizar urna</h1>
        <p className="text-sm ink-2">Escolha a UF, o município, a zona e a seção. Todas as {(idx.data || []).reduce((a, m) => a + m.nSecoes, 0).toLocaleString('pt-BR')} seções com urna do Brasil e do exterior estão disponíveis. Dica: você também pode digitar na busca do topo, por exemplo <b>“Itaitinga 78 393”</b>.</p>
      </div>
      <Card title="1. Unidade da federação">
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(UF_NOMES).map(([sigla, nome]) => (
            <button key={sigla} className="btn !px-2.5 !py-1" title={nome} onClick={() => setQuery({ uf: sigla, mun: undefined, zona: undefined })} style={uf === sigla ? { boxShadow: '0 0 0 2px var(--accent)' } : undefined}>{sigla}</button>
          ))}
        </div>
      </Card>
      {uf && (
        <Card title={`2. ${uf === 'ZZ' ? 'Cidade no exterior' : 'Município'} · ${UF_NOMES[uf]}`} subtitle={`${muns.length} opções`}>
          <input className="input w-full mb-2" placeholder="Filtrar pelo nome…" value={filtroMun} onChange={e => setFiltroMun(e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1 max-h-72 overflow-auto">
            {munsFiltrados.map(m => (
              <button key={m.cd} className="text-left text-sm px-2 py-1 rounded-md hover:underline" onClick={() => setQuery({ mun: m.cd, zona: undefined })} style={cd === m.cd ? { background: 'var(--surface-2)', fontWeight: 600 } : undefined}>
                {titulo(m.nome)} <span className="muted text-xs">({m.nSecoes})</span>
              </button>
            ))}
          </div>
        </Card>
      )}
      {cd && mf.loading && <Loading />}
      {cd && mf.data && (
        <Card title={`3. Zona eleitoral · ${titulo(mf.data.nome)}`} subtitle={<a className="link" href={rotas.mun(uf, cd)}>Abrir o painel do município</a>}>
          <div className="flex flex-wrap gap-1.5">
            {zonas.map(z => <button key={z} className="btn !py-1" onClick={() => setQuery({ zona: z })} style={+zona === z ? { boxShadow: '0 0 0 2px var(--accent)' } : undefined}>Zona {pad(z)}</button>)}
          </div>
        </Card>
      )}
      {zona && mf.data && (
        <Card title={`4. Seção · Zona ${pad(zona)}`} subtitle={`${secoes.length} seções cadastradas (* = agregada, vota na urna da principal)`}>
          <form className="flex gap-2 mb-3" onSubmit={e => { e.preventDefault(); irSecao(secaoTxt); }}>
            <input className="input w-40" inputMode="numeric" placeholder="Nº da seção" value={secaoTxt} onChange={e => setSecaoTxt(e.target.value.replace(/\D/g, ''))} />
            <button className="btn btn-primary" disabled={!secaoTxt || naoExiste}>Abrir seção</button>
            {naoExiste && <span className="text-sm self-center" style={{ color: 'var(--bad)' }}>Seção {pad(secaoTxt)} não existe nesta zona.</span>}
          </form>
          <div className="flex flex-wrap gap-1 max-h-80 overflow-auto">
            {secoes.map(s => (
              <a key={s.s} href={rotas.secao(uf, cd, s.z, s.s)} className="chip hover:underline num" title={titulo(mf.data.locais[s.l]?.nome || '')}>{pad(s.s)}{s.ag ? '*' : ''}</a>
            ))}
          </div>
        </Card>
      )}
      <p className="text-xs muted">Não sabe sua zona e seção? Consulte pelo título de eleitor no <a className="link" href="https://www.tse.jus.br/servicos-eleitorais/autoatendimento-eleitoral#/atendimento-eleitor/onde-votar" target="_blank" rel="noreferrer">autoatendimento do TSE <ExternalLink className="w-3 h-3 inline" /></a> ou no app e-Título.</p>
    </div>
  );
}

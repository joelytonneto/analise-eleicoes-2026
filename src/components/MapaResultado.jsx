import React, { useMemo, useState } from 'react';
import MapView, { LegendaSequencial } from './MapView';
import { Select } from './ui';
import { opcoesMetrica, colorir } from '../lib/metricasMapa';
import { fmtPct } from '../lib/format';

/**
 * Mapa coroplético (geo + chaveFeature) ou de pontos (unidades com lat/lng) com métrica selecionável.
 * unidades: [{ key, nome, st, v, lat?, lng?, onClick? }]
 */
export default function MapaResultado({ unidades, candRef, cargo, geo, chaveFeature, height = 440, pontos = false, metricaInicial = 'vencedor', raio }) {
  const [metrica, setMetrica] = useState(metricaInicial);
  const ops = useMemo(() => opcoesMetrica(candRef, cargo), [candRef, cargo]);
  const met = ops.some(o => o.value === metrica) ? metrica : 'vencedor';
  const { cor, rotulo, legenda } = useMemo(() => colorir(met, unidades, candRef, cargo), [met, unidades, candRef, cargo]);
  const porChave = useMemo(() => new Map(unidades.map(u => [u.key, u])), [unidades]);

  const estilo = useMemo(() => (geo ? f => {
    const k = chaveFeature(f);
    const u = porChave.get(k);
    if (!u) return null;
    return { cor: cor.get(k), tooltip: `<b>${u.nome}</b><br/>${rotulo.get(k) || 'sem dados'}`, onClick: u.onClick };
  } : null), [geo, chaveFeature, porChave, cor, rotulo]);

  const pts = useMemo(() => (pontos ? unidades.filter(u => u.lat != null).map(u => ({
    lat: u.lat, lng: u.lng, cor: cor.get(u.key) || '#898781', r: raio ? raio(u) : 6, onClick: u.onClick, destaque: u.destaque,
    tooltip: `<b>${u.nome}</b><br/>${rotulo.get(u.key) || 'sem dados'}${u.extraTooltip ? `<br/>${u.extraTooltip}` : ''}`
  })) : null), [pontos, unidades, cor, rotulo, raio]);

  const semCoord = pontos ? unidades.filter(u => u.lat == null).length : 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={met} onChange={setMetrica} aria-label="Métrica do mapa" className="!py-1 text-xs max-w-xs">
          {ops.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        {legenda?.tipo === 'sequencial' && <LegendaSequencial min={legenda.min} max={legenda.max} cores={legenda.cores} rotulo="Quantis:" format={v => (met === 'margem' ? `${v.toFixed(1)} p.p.` : fmtPct(v, 1))} />}
        {legenda?.tipo === 'categorica' && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {legenda.itens.map(i => <span key={i.label} className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: i.cor }} />{i.label} <span className="muted num">({i.q})</span></span>)}
          </div>
        )}
      </div>
      <MapView geo={geo} estilo={estilo} pontos={pts} height={height} chaveAjuste={unidades.length} />
      {semCoord > 0 && <p className="text-xs muted">{semCoord} unidade(s) sem coordenadas publicadas pelo TSE não aparecem no mapa.</p>}
    </div>
  );
}

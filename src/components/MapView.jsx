import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const TILES = {
  light: 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  dark: 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
};
const ATTR = 'Base: &copy; Esri, HERE, Garmin, OpenStreetMap · Malhas: IBGE';

/**
 * Mapa genérico.
 *  geo: FeatureCollection; estilo(feature) -> { cor, tooltip, onClick } | null
 *  pontos: [{ lat, lng, cor, r, tooltip, onClick, destaque }]
 */
export default function MapView({ geo, estilo, pontos, height = 420, chaveAjuste }) {
  const el = useRef(null);
  const map = useRef(null);
  const tiles = useRef(null);
  const camada = useRef(null);
  const dark = document.documentElement.classList.contains('dark');

  useEffect(() => {
    map.current = L.map(el.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false, preferCanvas: true });
    map.current.setView([-14.2, -51.9], 4);
    map.current.on('focus', () => map.current.scrollWheelZoom.enable());
    map.current.on('blur', () => map.current.scrollWheelZoom.disable());
    return () => { map.current.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    if (tiles.current) tiles.current.remove();
    tiles.current = L.tileLayer(TILES[dark ? 'dark' : 'light'], { attribution: ATTR, maxZoom: 16 }).addTo(map.current);
    tiles.current.bringToBack();
  }, [dark]);

  useEffect(() => {
    const m = map.current;
    if (camada.current) camada.current.remove();
    const g = L.featureGroup();
    if (geo) {
      L.geoJSON(geo, {
        style: f => {
          const s = estilo?.(f);
          return { color: dark ? '#1a1a19' : '#fcfcfb', weight: 1, fillColor: s?.cor || (dark ? '#2c2c2a' : '#e1e0d9'), fillOpacity: s?.cor ? 0.85 : 0.5 };
        },
        onEachFeature: (f, layer) => {
          const s = estilo?.(f);
          if (s?.tooltip) layer.bindTooltip(s.tooltip, { sticky: true });
          if (s?.onClick) layer.on('click', s.onClick);
          layer.on('mouseover', () => layer.setStyle({ weight: 2.5, color: dark ? '#f0efec' : '#0b0b0b' }));
          layer.on('mouseout', () => layer.setStyle({ weight: 1, color: dark ? '#1a1a19' : '#fcfcfb' }));
        }
      }).addTo(g);
    }
    for (const p of pontos || []) {
      if (p.lat == null || p.lng == null) continue;
      const c = L.circleMarker([p.lat, p.lng], {
        radius: p.r || 6, color: p.destaque ? (dark ? '#f0efec' : '#0b0b0b') : (dark ? '#1a1a19' : '#fcfcfb'),
        weight: p.destaque ? 3 : 1.5, fillColor: p.cor || '#2a78d6', fillOpacity: 0.9
      });
      if (p.tooltip) c.bindTooltip(p.tooltip, { direction: 'top' });
      if (p.onClick) c.on('click', p.onClick);
      c.addTo(g);
    }
    g.addTo(m);
    camada.current = g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo, estilo, pontos, dark]);

  useEffect(() => {
    const g = camada.current;
    if (!g) return;
    const ajustar = () => {
      if (!map.current) return;
      map.current.invalidateSize();
      const b = g.getBounds();
      if (b.isValid()) map.current.fitBounds(b, { padding: [12, 12], maxZoom: 15 });
    };
    ajustar();
    const t = setTimeout(ajustar, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveAjuste, geo]);

  return <div ref={el} style={{ height }} className="rounded-lg overflow-hidden" tabIndex={0} aria-label="Mapa interativo" />;
}

export function LegendaSequencial({ min, max, cores, rotulo, format = v => v }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="ink-2">{rotulo}</span>
      <span className="num muted">{format(min)}</span>
      <span className="flex">{cores.map(c => <span key={c} className="w-5 h-2.5" style={{ background: c }} />)}</span>
      <span className="num muted">{format(max)}</span>
    </div>
  );
}

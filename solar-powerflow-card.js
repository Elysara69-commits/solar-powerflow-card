/* Solar Powerflow Card v1.3.0 - carte Lovelace de flux d'énergie solaire (sans dépendance) */
const ENTITY_KEYS = ['pv_entity','load_entity','soc_entity','battery_charge_entity','battery_discharge_entity','grid_export_entity','grid_import_entity'];
const STUB = {
  title: 'INSTALLATION PV', layout: 'standard', max_power: 5000, battery_capacity: 0,
  show_battery: true, show_grid: true, direct_flows: false,
  alert_battery_full: false, battery_full_threshold: 99,
  alert_battery_low: false, battery_low_threshold: 15,
  alert_no_production: false,
  consumption_breakdown: 'off', breakdown_max: 5, breakdown_legend: true, group_devices: false, other_label: 'Autres',
};
const DEFAULTS = { ...STUB, sun_entity: 'sun.sun' };
const DEMO_DEVS = [
  { i: 0, name: 'Chauffage', color: '', group: '', w: 800, off: false },
  { i: 1, name: 'Lave-linge', color: '', group: '', w: 540, off: false },
  { i: 2, name: 'Informatique', color: '', group: '', w: 160, off: false },
  { i: 3, name: 'Réfrigérateur', color: '', group: '', w: 110, off: false },
];
const DEMO = { pv: 3480, load: 2100, soc: 64, ch: 900, dis: 0, exp: 480, imp: 0 };
const SLATE = '#64748b';
const clamp = x => Math.max(0, Math.min(1, x));
const fmt = w => w >= 1000 ? (w / 1000).toFixed(2).replace('.', ',') + ' kW' : Math.round(w) + ' W';

/* ---------- Géométrie des trois dispositions ---------- */
const LAYOUTS = {
  standard:   { R: 40, hubR: 24, dx: 140, pvY: 92, hubY: 220, houseY: 348, h: 412 },
  compact:    { R: 30, hubR: 18, dx: 120, pvY: 80, hubY: 170, houseY: 260, h: 318 },
  horizontal: { R: 34, hubR: 22 },
};

function geometry(layout, showBat, showGrid) {
  const key = LAYOUTS[layout] ? layout : 'standard';
  const L = LAYOUTS[key];
  if (key === 'horizontal') {
    const bottom = showBat || showGrid, top = 48, bot = 168;
    return { layout: key, R: L.R, hubR: L.hubR, w: 620, h: bottom ? 226 : 106, pos: {
      pv: { x: 190, y: top }, house: { x: 430, y: top },
      hub: { x: 310, y: bottom ? (top + bot) / 2 : top },
      bat: showBat ? { x: 190, y: bot } : null, grid: showGrid ? { x: 430, y: bot } : null } };
  }
  // une seule colonne centrale ; le côté absent est supprimé et le reste recentré
  const col = 200 + (showBat === showGrid ? 0 : (showGrid ? -L.dx / 2 : L.dx / 2));
  return { layout: key, R: L.R, hubR: L.hubR, w: 400, h: L.h, pos: {
    pv: { x: col, y: L.pvY }, hub: { x: col, y: L.hubY }, house: { x: col, y: L.houseY },
    bat: showBat ? { x: col - L.dx, y: L.hubY } : null, grid: showGrid ? { x: col + L.dx, y: L.hubY } : null } };
}

/* ---------- Détail de la consommation (anneau coloré du cercle Maison) ---------- */
const PALETTE = ['#38bdf8', '#f97316', '#a78bfa', '#34d399', '#f472b6', '#facc15', '#22d3ee', '#fb7185'];
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function breakdown(conso, devs, c) {
  let items = devs.map(v => ({ i: v.i, name: v.name, color: v.color || PALETTE[v.i % PALETTE.length], group: v.group, w: v.w }));
  if (c.group_devices) {
    const map = new Map(), out = [];
    items.forEach(it => {
      if (!it.group) { out.push(it); return; }
      const g = map.get(it.group);
      if (g) g.w += it.w; else { const n = { ...it, name: it.group }; map.set(it.group, n); out.push(n); }
    });
    items = out;
  }
  const maxN = Math.max(1, Math.min(12, Math.round(Number(c.breakdown_max)) || 5));
  // les plus gros consommateurs du moment, affichés dans l'ordre de la configuration (couleurs stables)
  const top = items.filter(it => it.w > 10).sort((a, b) => b.w - a.w).slice(0, maxN).sort((a, b) => a.i - b.i);
  if (!top.length) return null;
  const sum = top.reduce((t, it) => t + it.w, 0);
  const total = Math.max(conso, sum);
  if (total <= 10) return null;
  const other = Math.max(0, conso - sum);
  const segs = top.map(it => ({ name: it.name, color: it.color, w: it.w, frac: it.w / total }));
  if (other / total > 0.005) segs.push({ name: c.other_label || 'Autres', color: SLATE, w: other, frac: other / total });
  return { segs, offline: devs.filter(v => v.off).length, legend: c.breakdown_legend !== false };
}

function segsSvg(n, R, k, C) {
  const gap = n.segs.length === 1 ? 0 : 3;
  let acc = 0;
  return n.segs.map(s => {
    const len = s.frac * C, dash = Math.max(0.5, len - gap);
    const o = `<circle class="seg" cx="${n.x}" cy="${n.y}" r="${R}" fill="none" stroke="${s.color}" stroke-width="${(6 * k).toFixed(1)}" stroke-dasharray="${dash.toFixed(1)} ${(C - dash).toFixed(1)}" stroke-dashoffset="${(-(acc + gap / 2)).toFixed(1)}" transform="rotate(-90 ${n.x} ${n.y})"/>`;
    acc += len;
    return o;
  }).join('');
}

function legendHtml(m) {
  const b = m.breakdown;
  if (!b || !b.legend) return '<div class="legend"></div>';
  const items = b.segs.map(s => `<div class="lg"><span class="ld" style="background:${s.color}"></span><span class="ln">${esc(s.name)}</span><span class="lv">${fmt(s.w)}</span></div>`).join('');
  const off = b.offline ? `<div class="lo">⚠ ${b.offline} appareil${b.offline > 1 ? 's' : ''} indisponible${b.offline > 1 ? 's' : ''}</div>` : '';
  return `<div class="legend">${items}${off}</div>`;
}

/* ---------- Modèle : toutes les valeurs calculées, sans HTML ---------- */
function buildModel(d, c, sunUp, devs) {
  const max = Number(c.max_power) || 5000;
  const cap = Number(c.battery_capacity) || 0;
  const showBat = c.show_battery !== false, showGrid = c.show_grid !== false;
  const g = geometry(c.layout, showBat, showGrid), P = g.pos;
  const pv = d.pv, conso = d.load, soc = d.soc;
  const ch = showBat ? d.ch : 0, dis = showBat ? d.dis : 0;
  const exp = showGrid ? d.exp : 0, imp = showGrid ? d.imp : 0;
  const E = k => c[k] || '';

  let txt = 'VEILLE', col = '#64748b';
  if (pv > 10) {
    if (exp > 10) { txt = 'SURPLUS INJECTÉ'; col = '#c084fc'; }
    else if (ch > 10) { txt = 'CHARGE BATTERIE'; col = '#22c55e'; }
    else { txt = 'AUTOCONSOMMATION'; col = '#fbbf24'; }
  } else if (dis > 10) { txt = 'SUR BATTERIE'; col = '#2dd4bf'; }
  else if (imp > 10) { txt = 'SOUTIRAGE RÉSEAU'; col = '#f87171'; }

  const cHouse = (conso > 10 && pv >= conso) ? '#22c55e' : '#38bdf8';
  const gridP = exp > 10 ? exp : imp;
  const cGrid = exp > 10 ? '#c084fc' : (imp > 10 ? '#f87171' : SLATE);
  const gridSub = exp > 10 ? '→ INJECTION' : (imp > 10 ? '← SOUTIRAGE' : 'INACTIF');
  const autonomie = (conso > 10 && showGrid) ? Math.round(clamp((conso - imp) / conso) * 100) : null;
  const anyFlow = [pv, conso, ch, dis, exp, imp].some(v => v > 10);

  // production (+ alerte « aucune production en plein jour »)
  let pvCol = pv > 10 ? '#fbbf24' : SLATE, pvSub = pv > 10 ? 'EN PRODUCTION' : 'AU REPOS', pvCls = '';
  if (c.alert_no_production && sunUp && pv <= 10) { pvCol = '#f87171'; pvSub = '⚠ AUCUNE PRODUCTION'; pvCls = 'lowbat'; }

  // batterie (+ alertes pleine / niveau bas)
  const batPow = ch > 10 ? '▲ ' + fmt(ch) : (dis > 10 ? '▼ ' + fmt(dis) : '');
  let batCol = ch > 10 ? '#22c55e' : (dis > 10 ? '#2dd4bf' : (soc < 30 ? '#ef4444' : (soc < 70 ? '#f97316' : '#22c55e')));
  let batSub = batPow || 'REPOS', batSubCol = batCol, batCls = '', batGlow = false;
  if (showBat) {
    const full = Number(c.battery_full_threshold) || 99, low = Number(c.battery_low_threshold) || 15;
    if (c.alert_battery_low && soc <= low) {
      batCol = batSubCol = '#ef4444'; batCls = 'lowbat';
      batSub = '⚠ FAIBLE' + (batPow ? ' · ' + batPow : '');
    } else if (c.alert_battery_full && soc >= full) {
      batSubCol = '#22c55e'; batGlow = true;
      batSub = 'PLEINE' + (batPow ? ' · ' + batPow : '');
    }
  }

  const bd = c.consumption_breakdown === 'ring' ? breakdown(conso, devs || [], c) : null;
  const nodes = {
    pv: { ...P.pv, color: pvCol, icon: 'mdi:solar-power-variant', val: fmt(pv), frac: clamp(pv / max), ent: E('pv_entity'), cls: pvCls, name: 'PRODUCTION', sub: pvSub, subCol: pvCol, spin: pv > 10 },
    house: { ...P.house, color: cHouse, icon: 'mdi:home-lightning-bolt', val: fmt(conso), frac: clamp(conso / max), ent: E('load_entity'), cls: '', name: 'MAISON', sub: '', subCol: '', segs: bd ? bd.segs : null },
    bat: showBat ? { ...P.bat, color: batCol, icon: 'mdi:home-battery', val: Math.round(soc) + '%', frac: clamp(soc / 100), ent: E('soc_entity'), cls: batCls, glow: batGlow,
      name: 'BATTERIE' + (cap > 0 ? ' · ' + (soc * cap / 100).toFixed(1).replace('.', ',') + ' kWh' : ''), sub: batSub, subCol: batSubCol } : null,
    grid: showGrid ? { ...P.grid, color: cGrid, icon: 'mdi:transmission-tower', val: fmt(gridP), frac: clamp(gridP / max), ent: E(exp > 10 ? 'grid_export_entity' : 'grid_import_entity'), cls: '', name: 'RÉSEAU', sub: gridSub, subCol: cGrid } : null,
  };

  // chemins entre deux éléments (du bord d'un cercle au bord de l'autre)
  const rad = k => (k === 'hub' ? g.hubR : g.R) + 5;
  const path = (a, b) => {
    const pa = P[a], pb = P[b], dx = pb.x - pa.x, dy = pb.y - pa.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    return `M${(pa.x + ux * rad(a)).toFixed(1)} ${(pa.y + uy * rad(a)).toFixed(1)} L${(pb.x - ux * rad(b)).toFixed(1)} ${(pb.y - uy * rad(b)).toFixed(1)}`;
  };
  const flows = [], tracks = [];
  const add = (a, b, color, w) => { if (P[a] && P[b]) flows.push({ from: a, to: b, color, w, d: path(a, b) }); };
  const trk = pairs => pairs.forEach(([a, b]) => { if (P[a] && P[b]) tracks.push(path(a, b)); });
  if (c.direct_flows) {
    // répartition estimée : la production alimente d'abord la batterie, puis le réseau, puis la maison
    const pvBat = Math.min(ch, pv), pvGrid = Math.min(exp, Math.max(0, pv - pvBat));
    const pvHouse = Math.max(0, pv - pvBat - pvGrid);
    const batGrid = Math.min(dis, Math.max(0, exp - pvGrid)), batHouse = Math.max(0, dis - batGrid);
    const gridBat = Math.min(imp, Math.max(0, ch - pvBat)), gridHouse = Math.max(0, imp - gridBat);
    trk([['pv', 'house'], ['pv', 'bat'], ['pv', 'grid'], ['bat', 'house'], ['grid', 'house'], ['bat', 'grid']]);
    add('pv', 'house', '#fbbf24', pvHouse); add('pv', 'bat', '#22c55e', pvBat); add('pv', 'grid', '#c084fc', pvGrid);
    add('bat', 'house', '#2dd4bf', batHouse); add('bat', 'grid', '#2dd4bf', batGrid);
    add('grid', 'house', '#f87171', gridHouse); add('grid', 'bat', '#f87171', gridBat);
  } else {
    trk([['pv', 'hub'], ['hub', 'house'], ['bat', 'hub'], ['grid', 'hub']]);
    add('pv', 'hub', '#fbbf24', pv); add('hub', 'house', '#38bdf8', conso);
    if (ch > 10) add('hub', 'bat', '#22c55e', ch); else add('bat', 'hub', '#2dd4bf', dis);
    if (exp > 10) add('hub', 'grid', '#c084fc', exp); else add('grid', 'hub', '#f87171', imp);
  }
  return { g, max, nodes, flows, tracks, status: { txt, col }, autonomie, anyFlow, active: pv > 10, hub: P.hub, breakdown: bd };
}

/* ---------- Vue : SVG à partir du modèle ---------- */
const T = (x, y, t, fill, size, wt, ls, anchor) =>
  `<text x="${x}" y="${y}" text-anchor="${anchor || 'middle'}" fill="${fill}" font-size="${size}" font-weight="${wt}" letter-spacing="${ls}">${t}</text>`;

function nodeSvg(m, key) {
  const n = m.nodes[key];
  if (!n) return '';
  const R = m.g.R, k = R / 40, C = 2 * Math.PI * R;
  const arc = n.segs ? segsSvg(n, R, k, C) : n.frac > 0.005
    ? `<circle cx="${n.x}" cy="${n.y}" r="${R}" fill="none" stroke="${n.color}" stroke-width="${(5 * k).toFixed(1)}" stroke-linecap="round" stroke-dasharray="${(C * n.frac).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${n.x} ${n.y})" style="filter:drop-shadow(0 0 5px ${n.color});"/>` : '';
  const fo = +(28 * k).toFixed(1), ico = +(24 * k).toFixed(1);
  const style = (n.ent ? 'cursor:pointer;' : '') + (n.glow ? `filter:drop-shadow(0 0 7px ${n.color});` : '');
  const spin = n.spin ? `<circle class="spin" cx="${n.x}" cy="${n.y}" r="${R + 9}" fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="2 9" stroke-linecap="round" opacity=".75"/>` : '';
  return `${spin}
    <g ${n.cls ? `class="${n.cls}"` : ''} ${n.ent ? `data-entity="${n.ent}"` : ''} style="${style}">
      <circle cx="${n.x}" cy="${n.y}" r="${R}" fill="rgba(15,23,42,.88)" stroke="rgba(148,163,184,.14)" stroke-width="${(5 * k).toFixed(1)}"/>
      ${arc}
      <foreignObject x="${(n.x - fo / 2).toFixed(1)}" y="${(n.y - 28 * k).toFixed(1)}" width="${fo}" height="${fo}">
        <div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;justify-content:center;width:${fo}px;height:${fo}px;color:${n.color};">
          <ha-icon icon="${n.icon}" style="--mdc-icon-size:${ico}px;"></ha-icon>
        </div>
      </foreignObject>
      ${T(n.x, (n.y + 17 * k).toFixed(1), n.val, '#f1f5f9', (14 * k).toFixed(1), 700, 0)}
    </g>`;
}

function labelSvg(m, key) {
  const n = m.nodes[key];
  if (!n) return '';
  const R = m.g.R;
  if (m.g.layout === 'horizontal') {
    const left = key === 'pv' || key === 'bat', x = left ? n.x - R - 14 : n.x + R + 14, a = left ? 'end' : 'start';
    return T(x, n.sub ? n.y - 3 : n.y + 4, n.name, '#94a3b8', 9, 600, 2, a) + (n.sub ? T(x, n.y + 11, n.sub, n.subCol, 8, 700, 1.2, a) : '');
  }
  if (key === 'pv') return T(n.x, n.y - R - 40, n.name, '#94a3b8', 9, 600, 2) + T(n.x, n.y - R - 27, n.sub, n.subCol, 8, 700, 1.2);
  return T(n.x, n.y + R + 18, n.name, '#94a3b8', 9, 600, 2) + (n.sub ? T(n.x, n.y + R + 31, n.sub, n.subCol, 8, 700, 1.2) : '');
}

function flowSvg(f, max) {
  if (f.w <= 10) return '';
  const dur = Math.round(Math.max(1.3, 4 - 2.7 * clamp(f.w / max)) * 2) / 2;
  let o = `<path d="${f.d}" fill="none" stroke="${f.color}" stroke-width="2" stroke-linecap="round" stroke-dasharray="5 7" opacity=".55" style="animation:dashmove ${(dur / 4).toFixed(2)}s linear infinite;"/>`;
  for (let i = 0; i < 3; i++) {
    o += `<circle r="3.4" fill="${f.color}" filter="url(#sf-glow)"><animateMotion dur="${dur.toFixed(2)}s" begin="-${(i * dur / 3).toFixed(2)}s" repeatCount="indefinite" path="${f.d}"/></circle>`;
  }
  return o;
}

function svgFromModel(m) {
  const { g, hub } = m, k = g.hubR / 24;
  return `
    <svg viewBox="0 0 ${g.w} ${g.h}" width="100%" style="display:block;overflow:visible;">
      <defs><filter id="sf-glow" x="-200%" y="-200%" width="500%" height="500%">
        <feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      ${m.tracks.map(d => `<path d="${d}" fill="none" stroke="rgba(148,163,184,.16)" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round"/>`).join('')}
      ${m.flows.map(f => flowSvg(f, m.max)).join('')}
      ${m.anyFlow ? `<circle class="pulse" cx="${hub.x}" cy="${hub.y}" r="${g.hubR}" fill="none" stroke="#fbbf24" stroke-width="1.5"/>` : ''}
      <circle cx="${hub.x}" cy="${hub.y}" r="${g.hubR}" fill="rgba(15,23,42,.95)" stroke="${m.active ? '#fbbf24' : SLATE}" stroke-width="2" style="filter:drop-shadow(0 0 8px ${m.active ? '#fbbf2488' : 'transparent'});"/>
      ${T(hub.x, (hub.y + 4.5 * k).toFixed(1), m.autonomie === null ? '–' : m.autonomie + '%', '#f1f5f9', (12.5 * k).toFixed(1), 800, 0)}
      ${['pv', 'bat', 'grid', 'house'].map(key => nodeSvg(m, key)).join('')}
      ${['pv', 'bat', 'grid', 'house'].map(key => labelSvg(m, key)).join('')}
    </svg>`;
}

const CSS = `
  :host{display:block}
  @keyframes riseIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes dashmove{to{stroke-dashoffset:-12}}
  @keyframes pulse{0%{transform:scale(1);opacity:.65}100%{transform:scale(1.7);opacity:0}}
  .spin{transform-box:fill-box;transform-origin:center;animation:spin 16s linear infinite}
  .pulse{transform-box:fill-box;transform-origin:center;animation:pulse 2.4s ease-out infinite}
  .lowbat{animation:blink 1.2s ease-in-out infinite}
  .card{padding:16px 14px 18px;border-radius:22px;overflow:hidden;color:#e2e8f0;animation:riseIn .7s ease-out;
    background:radial-gradient(120% 70% at 50% 0%,rgba(251,191,36,.13),transparent 60%),linear-gradient(180deg,#0b1220 0%,#060a14 100%);
    box-shadow:0 0 26px rgba(251,191,36,.10),inset 0 0 50px rgba(2,6,23,.7)}
  .card.compact{padding:10px 12px 12px;border-radius:18px}
  .card.compact .t2{display:none}
  .head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px}
  .t1{font-size:15px;font-weight:800;letter-spacing:2.5px;color:#fde68a;text-shadow:0 0 10px #fbbf2488}
  .t2{font-size:9px;letter-spacing:2px;color:#64748b;margin-top:2px}
  .badge{font-size:7.5px;font-weight:700;letter-spacing:1px;padding:5px 9px;border-radius:999px;white-space:nowrap;display:flex;align-items:center;gap:6px}
  .dot{width:6px;height:6px;border-radius:50%;animation:blink 1.6s ease-in-out infinite}
  .legend{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px 16px;margin-top:10px;padding-top:10px;border-top:1px solid rgba(148,163,184,.12)}
  .legend:empty{display:none}
  .lg{display:flex;align-items:center;gap:6px;font-size:10px;min-width:0}
  .ld{width:8px;height:8px;border-radius:50%;flex:none}
  .ln{color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}
  .lv{color:#f1f5f9;font-weight:700;flex:none}
  .lo{grid-column:1/-1;font-size:9px;color:#f97316}
`;

// Met à jour le DOM existant sans le recréer : les animations ne sont pas relancées.
function morph(cur, next) {
  for (const a of Array.from(cur.attributes)) {
    if (!next.hasAttribute(a.name)) cur.removeAttribute(a.name);
  }
  for (const a of Array.from(next.attributes)) {
    if (cur.getAttribute(a.name) !== a.value) cur.setAttribute(a.name, a.value);
  }
  const cc = Array.from(cur.childNodes), nc = Array.from(next.childNodes);
  const n = Math.max(cc.length, nc.length);
  for (let i = 0; i < n; i++) {
    const c = cc[i], x = nc[i];
    if (!x) { cur.removeChild(c); continue; }
    if (!c) { cur.appendChild(x.cloneNode(true)); continue; }
    if (c.nodeType !== x.nodeType || c.nodeName !== x.nodeName) { cur.replaceChild(x.cloneNode(true), c); continue; }
    if (c.nodeType === 3 || c.nodeType === 8) { if (c.nodeValue !== x.nodeValue) c.nodeValue = x.nodeValue; continue; }
    morph(c, x);
  }
}

class SolarPowerflowCard extends HTMLElement {
  static getConfigElement() { return document.createElement('solar-powerflow-card-editor'); }
  static getStubConfig() { return { ...STUB }; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.addEventListener('click', ev => {
      const t = ev.target.closest && ev.target.closest('[data-entity]');
      if (t && t.dataset.entity) {
        this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: t.dataset.entity }, bubbles: true, composed: true }));
      }
    });
  }

  setConfig(config) {
    if (!config) throw new Error('Configuration invalide');
    this._config = { ...DEFAULTS, ...config };
    this._sig = null;
    this._update();
  }

  set hass(hass) { this._hass = hass; this._update(); }
  getCardSize() {
    const l = this._config && this._config.layout, base = l === 'compact' ? 5 : (l === 'horizontal' ? 4 : 8);
    return base + (this._config && this._config.consumption_breakdown === 'ring' ? 2 : 0);
  }

  _num(id) {
    const st = id && this._hass && this._hass.states[id];
    if (!st) return null;
    let n = parseFloat(st.state);
    if (isNaN(n)) return 0;
    const unit = (st.attributes && st.attributes.unit_of_measurement || '').toLowerCase();
    if (unit === 'kw') n *= 1000;
    return n;
  }
  _read(key) { return this._num(this._config[key]); }

  _update() {
    if (!this._config || !this._hass) return;
    const raw = {
      pv: this._read('pv_entity'), load: this._read('load_entity'), soc: this._read('soc_entity'),
      ch: this._read('battery_charge_entity'), dis: this._read('battery_discharge_entity'),
      exp: this._read('grid_export_entity'), imp: this._read('grid_import_entity'),
    };
    const demo = Object.values(raw).every(v => v === null);
    const d = demo ? DEMO : Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v === null ? 0 : v]));
    const sun = this._hass.states[this._config.sun_entity || 'sun.sun'];
    const sunUp = !!(sun && sun.state === 'above_horizon' && Number(sun.attributes && sun.attributes.elevation) > 10);
    const list = Array.isArray(this._config.devices) ? this._config.devices : [];
    let devs = list.map((x, i) => ({ x, i })).filter(o => o.x && o.x.entity).map(({ x, i }) => {
      const st = this._hass.states[x.entity], v = this._num(x.entity);
      const off = !st || st.state === 'unavailable' || st.state === 'unknown';
      return { i, name: x.name || (st && st.attributes && st.attributes.friendly_name) || x.entity, color: x.color || '', group: x.group || '', w: off || v === null ? 0 : Math.max(0, v), off };
    });
    if (demo && this._config.consumption_breakdown === 'ring' && !devs.length) devs = DEMO_DEVS;
    const sig = JSON.stringify([d, demo, sunUp, devs, this._config]);
    if (sig === this._sig) return;
    this._sig = sig;
    this._render(d, demo, sunUp, devs);
  }

  _render(d, demo, sunUp, devs) {
    const c = this._config;
    const m = buildModel(d, c, sunUp, devs);
    const { txt, col } = m.status;
    const html = `
      <div class="card ${m.g.layout}" style="border:1px solid ${m.active ? 'rgba(251,191,36,.45)' : 'rgba(100,116,139,.35)'}">
        <div class="head">
          <div><div class="t1">${esc(c.title || '')}</div><div class="t2">FLUX D'ÉNERGIE · ${demo ? 'DÉMO' : 'TEMPS RÉEL'}</div></div>
          <div class="badge" style="color:${col};border:1px solid ${col}66;background:${col}14"><span class="dot" style="background:${col};box-shadow:0 0 8px ${col}"></span>${txt}</div>
        </div>
        ${svgFromModel(m)}
        ${legendHtml(m)}
      </div>`;
    const root = this.shadowRoot;
    if (!this._built || !root.querySelector('.card')) {
      root.innerHTML = `<style>${CSS}</style>${html}`;
      this._built = true;
    } else {
      const tpl = document.createElement('template');
      tpl.innerHTML = html;
      morph(root.querySelector('.card'), tpl.content.firstElementChild);
    }
  }
}

/* ---------- Éditeur visuel ---------- */
const LABELS = {
  title: 'Titre de la carte',
  pv_entity: 'Production solaire (W)',
  load_entity: 'Consommation maison (W)',
  soc_entity: 'Batterie : niveau de charge (%)',
  battery_charge_entity: 'Batterie : puissance de charge (W)',
  battery_discharge_entity: 'Batterie : puissance de décharge (W)',
  grid_export_entity: 'Réseau : injection (W)',
  grid_import_entity: 'Réseau : soutirage (W)',
  max_power: "Puissance max de l'installation (W)",
  battery_capacity: 'Capacité de la batterie (kWh)',
  layout: 'Disposition de la carte',
  show_battery: 'Afficher la batterie',
  show_grid: 'Afficher le réseau',
  direct_flows: 'Flux directs (production → batterie / réseau)',
  alert_battery_full: 'Alerte : batterie pleine',
  battery_full_threshold: 'Batterie pleine à partir de (%)',
  alert_battery_low: 'Alerte : batterie faible',
  battery_low_threshold: 'Batterie faible en dessous de (%)',
  alert_no_production: 'Alerte : aucune production en plein jour',
  sun_entity: 'Entité soleil (pour l\'alerte de production)',
  consumption_breakdown: 'Détail de la consommation de la maison',
  breakdown_max: 'Nombre d\'appareils détaillés (les autres sont regroupés)',
  breakdown_legend: 'Afficher la légende sous la carte',
  group_devices: 'Regrouper les appareils ayant le même groupe',
  other_label: 'Nom de la part non détaillée',
  entity: 'Capteur de puissance',
  name: 'Nom (facultatif)',
  group: 'Groupe (facultatif)',
  color: 'Couleur (facultatif, ex. #38bdf8)',
};
const sel = name => ({ name, selector: { entity: { domain: 'sensor' } } });
const bool = name => ({ name, selector: { boolean: {} } });
const pct = name => ({ name, selector: { number: { min: 1, max: 100, step: 1, mode: 'box' } } });
const SCHEMA = [
  { name: 'title', selector: { text: {} } },
  ...ENTITY_KEYS.map(sel),
  { type: 'grid', name: '', schema: [
    { name: 'max_power', selector: { number: { min: 500, max: 100000, step: 100, mode: 'box' } } },
    { name: 'battery_capacity', selector: { number: { min: 0, max: 200, step: 0.1, mode: 'box' } } },
  ] },
  { name: 'layout', selector: { select: { mode: 'dropdown', options: [
    { value: 'standard', label: 'Standard (vertical)' },
    { value: 'compact', label: 'Compact (plus bas)' },
    { value: 'horizontal', label: 'Horizontal (large)' },
  ] } } },
  { type: 'grid', name: '', schema: [bool('show_battery'), bool('show_grid')] },
  bool('direct_flows'),
  { type: 'grid', name: '', schema: [bool('alert_battery_full'), pct('battery_full_threshold')] },
  { type: 'grid', name: '', schema: [bool('alert_battery_low'), pct('battery_low_threshold')] },
  bool('alert_no_production'),
  { name: 'sun_entity', selector: { entity: { domain: 'sun' } } },
  { name: 'consumption_breakdown', selector: { select: { mode: 'dropdown', options: [
    { value: 'off', label: 'Désactivé' },
    { value: 'ring', label: 'Anneau coloré du cercle Maison' },
  ] } } },
  { type: 'grid', name: '', schema: [
    { name: 'breakdown_max', selector: { number: { min: 1, max: 12, step: 1, mode: 'box' } } },
    bool('breakdown_legend'),
  ] },
  { type: 'grid', name: '', schema: [bool('group_devices'), { name: 'other_label', selector: { text: {} } }] },
];
const ROW_SCHEMA = [
  { name: 'entity', selector: { entity: { domain: 'sensor' } } },
  { type: 'grid', name: '', schema: [{ name: 'name', selector: { text: {} } }, { name: 'group', selector: { text: {} } }] },
  { name: 'color', selector: { text: {} } },
];

class SolarPowerflowCardEditor extends HTMLElement {
  setConfig(config) { this._config = config; this._draw(); }
  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
    (this._rows || []).forEach(r => { r.form.hass = hass; });
  }

  _emit(config) {
    const out = { ...config };
    if (!Array.isArray(out.devices) || !out.devices.length) delete out.devices;
    this._config = out;
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: out }, bubbles: true, composed: true }));
  }

  _devices() { return Array.isArray(this._config.devices) ? this._config.devices.slice() : []; }

  _draw() {
    if (!this._form) {
      const st = document.createElement('style');
      st.textContent = '.sp-h{margin:20px 0 4px;font-weight:600;color:var(--primary-text-color)}'
        + '.sp-hint{font-size:12px;color:var(--secondary-text-color);margin:0 0 10px}'
        + '.sp-row{border:1px solid var(--divider-color);border-radius:12px;padding:6px 12px 12px;margin:0 0 10px}'
        + '.sp-bar{display:flex;gap:6px;justify-content:flex-end;margin:4px 0}'
        + '.sp-b{cursor:pointer;border:1px solid var(--divider-color);background:transparent;color:var(--primary-text-color);border-radius:8px;padding:4px 10px;font:inherit}'
        + '.sp-b:disabled{opacity:.35;cursor:default}'
        + '.sp-add{width:100%;padding:8px;border-style:dashed;color:var(--primary-color)}';
      this.appendChild(st);
      this._form = document.createElement('ha-form');
      this._form.computeLabel = s => LABELS[s.name] || s.name;
      this._form.addEventListener('value-changed', ev => {
        ev.stopPropagation();
        this._emit({ ...ev.detail.value, type: this._config.type, devices: this._config.devices });
      });
      this.appendChild(this._form);
      this._box = document.createElement('div');
      this.appendChild(this._box);
    }
    this._form.hass = this._hass;
    this._form.schema = SCHEMA;
    this._form.data = { ...DEFAULTS, ...this._config };
    this._drawDevices();
  }

  _drawDevices() {
    const devs = this._devices();
    if (this._rows && this._rows.length === devs.length) {
      this._rows.forEach((r, i) => { r.form.data = devs[i]; });
      return;
    }
    this._box.textContent = '';
    this._rows = [];
    const h = document.createElement('div'); h.className = 'sp-h'; h.textContent = 'Appareils à détailler';
    const hint = document.createElement('div'); hint.className = 'sp-hint';
    hint.textContent = 'Ajoutez les capteurs de puissance (W) des appareils. L\'écart avec la consommation de la maison apparaît dans la part non détaillée. Évitez les doubles comptages (une multiprise et les appareils branchés dessus).';
    this._box.append(h, hint);
    const btn = (label, title, fn, disabled) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'sp-b'; b.textContent = label; b.title = title; b.disabled = !!disabled;
      b.addEventListener('click', fn);
      return b;
    };
    devs.forEach((dev, i) => {
      const row = document.createElement('div'); row.className = 'sp-row';
      const bar = document.createElement('div'); bar.className = 'sp-bar';
      bar.append(
        btn('↑', 'Monter', () => this._move(i, -1), i === 0),
        btn('↓', 'Descendre', () => this._move(i, 1), i === devs.length - 1),
        btn('Supprimer', 'Supprimer cet appareil', () => this._remove(i)),
      );
      const form = document.createElement('ha-form');
      form.hass = this._hass;
      form.schema = ROW_SCHEMA;
      form.computeLabel = s => LABELS[s.name] || s.name;
      form.data = dev;
      form.addEventListener('value-changed', ev => {
        ev.stopPropagation();
        const cur = this._devices(), r = {};
        Object.entries(ev.detail.value || {}).forEach(([k, v]) => { if (v !== '' && v != null) r[k] = v; });
        if (!('entity' in r)) r.entity = '';
        cur[i] = r;
        this._emit({ ...this._config, devices: cur });
      });
      row.append(bar, form);
      this._box.appendChild(row);
      this._rows.push({ form });
    });
    this._box.appendChild(btn('+ Ajouter un appareil', 'Ajouter un appareil', () => {
      this._emit({ ...this._config, devices: [...this._devices(), { entity: '' }] });
      this._drawDevices();
    })).classList.add('sp-add');
  }

  _move(i, dir) {
    const cur = this._devices(), j = i + dir;
    if (j < 0 || j >= cur.length) return;
    [cur[i], cur[j]] = [cur[j], cur[i]];
    this._emit({ ...this._config, devices: cur });
    this._drawDevices();
  }

  _remove(i) {
    const cur = this._devices();
    cur.splice(i, 1);
    this._emit({ ...this._config, devices: cur });
    this._drawDevices();
  }
}

customElements.define('solar-powerflow-card', SolarPowerflowCard);
customElements.define('solar-powerflow-card-editor', SolarPowerflowCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'solar-powerflow-card',
  name: 'Solar Powerflow Card',
  description: "Flux d'énergie solaire animé : production, batterie, réseau et maison.",
  preview: true,
});
console.info('%c SOLAR-POWERFLOW-CARD %c v1.3.0 ', 'background:#fbbf24;color:#000;font-weight:700', 'background:#0b1220;color:#fbbf24');

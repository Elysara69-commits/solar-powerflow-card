/* Solar Powerflow Card v1.5.0 - carte Lovelace de flux d'énergie solaire (sans dépendance) */
const STUB = {
  title: 'INSTALLATION PV', layout: 'standard', max_power: 5000, battery_capacity: 0,
  show_battery: true, show_grid: true, direct_flows: false,
  alert_battery_full: false, battery_full_threshold: 99,
  alert_battery_low: false, battery_low_threshold: 15,
  alert_no_production: false, grid_import_threshold: 50, grid_power_invert: false, battery_power_invert: false,
  background: 'sombre', background_opacity: 100, text_theme: 'auto', card_border: true,
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
const gridMode = c => c.grid_mode || (c.grid_power_entity ? 'signed' : 'separate');
const batteryMode = c => c.battery_mode || (c.battery_power_entity ? 'signed' : 'separate');

/* Couleurs choisies par leur nom (l'hexadécimal reste accepté en YAML) */
const COLORS = { bleu: '#38bdf8', rouge: '#ef4444', orange: '#f97316', jaune: '#facc15', vert: '#34d399', violet: '#a78bfa', rose: '#f472b6', turquoise: '#22d3ee', marron: '#b45309', blanc: '#e2e8f0' };
const COLOR_ALIASES = { blue: 'bleu', red: 'rouge', yellow: 'jaune', green: 'vert', purple: 'violet', pink: 'rose', cyan: 'turquoise', brown: 'marron', white: 'blanc' };
function resolveColor(v) {
  if (!v) return '';
  const k = String(v).trim().toLowerCase();
  if (COLORS[k]) return COLORS[k];
  if (COLOR_ALIASES[k]) return COLORS[COLOR_ALIASES[k]];
  if (/^#[0-9a-f]{3,8}$/.test(k)) return k;
  if (/^(rgb|hsl)a?\([0-9.,%\s/]+\)$/.test(k)) return k;
  return '';
}
/* Fond de la carte : préréglages, transparence, couleur du texte */
const BACKGROUNDS = { sombre: ['#0b1220', '#060a14'], noir: ['#0b0d12', '#000000'], bleu: ['#0f2347', '#070f22'], vert: ['#0c2b22', '#05150f'], violet: ['#241447', '#0f0a24'], rouge: ['#3a1218', '#1a0609'], gris: ['#272c36', '#14171d'], clair: ['#f8fafc', '#e2e8f0'] };
const BG_ALIASES = { dark: 'sombre', black: 'noir', blue: 'bleu', green: 'vert', purple: 'violet', red: 'rouge', gray: 'gris', grey: 'gris', light: 'clair', custom: 'perso' };
function rgbOf(v) {
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/.exec(v);
  if (m) { let h = m[1]; if (h.length === 3) h = h.split('').map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); }
  m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(v);
  return m ? [+m[1], +m[2], +m[3]] : null;
}
const luminance = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

function cardTheme(c, darkMode) {
  const k0 = String(c.background || 'sombre').trim().toLowerCase(), key = BG_ALIASES[k0] || k0;
  const o = Number(c.background_opacity);
  const op = Math.max(0, Math.min(100, c.background_opacity != null && c.background_opacity !== '' && Number.isFinite(o) ? o : 100)) / 100;
  const rgba = (h, a) => { const [r, g, b] = rgbOf(h); return `rgba(${r},${g},${b},${a})`; };
  let bg = '', shadow = '', rgb = null;
  if (key === 'transparent') { bg = 'transparent'; shadow = 'none'; }
  else if (key === 'perso') {
    const col = resolveColor(c.background_color);
    if (col) { rgb = rgbOf(col); bg = rgb ? `rgba(${rgb.join(',')},${op})` : col; shadow = '0 0 18px rgba(0,0,0,.35)'; }
  } else if (BACKGROUNDS[key]) {
    const [t, b2] = BACKGROUNDS[key];
    rgb = rgbOf(t);
    if (key !== 'sombre' || op < 1) {
      const glow = key === 'sombre' ? `radial-gradient(120% 70% at 50% 0%,rgba(251,191,36,${(0.13 * op).toFixed(3)}),transparent 60%),` : '';
      bg = `${glow}linear-gradient(180deg,${rgba(t, op)} 0%,${rgba(b2, op)} 100%)`;
      shadow = key === 'sombre' ? `0 0 26px rgba(251,191,36,${(0.10 * op).toFixed(3)})` : (key === 'clair' ? '0 1px 10px rgba(15,23,42,.18)' : '0 0 18px rgba(0,0,0,.35)');
    }
  }
  let theme = c.text_theme;
  if (theme !== 'light' && theme !== 'dark') {
    if (key === 'transparent') theme = darkMode === false ? 'dark' : 'light';
    else if (key === 'clair') theme = 'dark';
    else if (key === 'perso' && rgb) theme = luminance(rgb) > 0.6 ? 'dark' : 'light';
    else theme = 'light';
  }
  let st = '';
  if (bg) st += `background:${bg};`;
  if (shadow) st += `box-shadow:${shadow};`;
  if (theme === 'dark') st += '--tx:#0f172a;--tx2:#475569;--ttl:#b45309;--tsh:none;--disc:rgba(255,255,255,.93);--disc2:rgba(255,255,255,.97);--vtx:#0f172a;';
  return st;
}

const fmt = w => w >= 1000 ? (w / 1000).toFixed(2).replace('.', ',') + ' kW' : Math.round(w) + ' W';

/* ---------- Géométrie des trois dispositions ---------- */
const LAYOUTS = {
  standard:   { R: 40, hubR: 24, dx: 140, pvY: 92, hubY: 220, houseY: 348, h: 412 },
  compact:    { R: 30, hubR: 18, dx: 120, pvY: 80, hubY: 170, houseY: 260, h: 318 },
  horizontal: { R: 34, hubR: 22 },
};

function geometry(layout, showBat, showGrid) {
  if (layout === 'mini') {
    const z = { x: 0, y: 0 };
    return { layout: 'mini', R: 0, hubR: 0, w: 0, h: 0, pos: { pv: z, hub: z, house: z, bat: showBat ? z : null, grid: showGrid ? z : null } };
  }
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
  let items = devs.map(v => ({ i: v.i, name: v.name, color: resolveColor(v.color) || PALETTE[v.i % PALETTE.length], group: v.group, w: v.w }));
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
  if (!b || !b.legend || m.g.layout === 'mini') return '<div class="legend"></div>';
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
  const exp = showGrid ? d.exp : 0, impRaw = showGrid ? d.imp : 0;
  // le soutirage n'est signalé (flux, badge, autonomie) qu'au-dessus d'un seuil (50 W par défaut)
  const tImp = Number(c.grid_import_threshold);
  const impT = Math.max(10, c.grid_import_threshold != null && c.grid_import_threshold !== '' && Number.isFinite(tImp) ? tImp : 50);
  const imp = impRaw > impT ? impRaw : 0;
  const gridSigned = gridMode(c) === 'signed';
  const E = k => c[k] || '';

  let txt = 'VEILLE', col = '#64748b';
  if (pv > 10) {
    if (exp > 10) { txt = 'SURPLUS INJECTÉ'; col = '#c084fc'; }
    else if (ch > 10) { txt = 'CHARGE BATTERIE'; col = '#22c55e'; }
    else { txt = 'AUTOCONSOMMATION'; col = '#fbbf24'; }
  } else if (dis > 10) { txt = 'SUR BATTERIE'; col = '#2dd4bf'; }
  else if (imp > 10) { txt = 'SOUTIRAGE RÉSEAU'; col = '#f87171'; }

  const cHouse = (conso > 10 && pv >= conso) ? '#22c55e' : '#38bdf8';
  const gridP = exp > 10 ? exp : impRaw;
  const cGrid = exp > 10 ? '#c084fc' : (imp > 10 ? '#f87171' : SLATE);
  const gridSub = exp > 10 ? '→ INJECTION' : (imp > 10 ? '← SOUTIRAGE' : 'INACTIF');
  const autonomie = (conso > 10 && showGrid) ? Math.round(clamp((conso - imp) / conso) * 100) : null;
  const anyFlow = [pv, conso, ch, dis, exp, imp].some(v => v > 10);

  // production (+ alerte « aucune production en plein jour »)
  let pvCol = pv > 10 ? '#fbbf24' : SLATE, pvSub = pv > 10 ? 'EN PRODUCTION' : 'AU REPOS', pvCls = '';
  let pvMini = pv > 10 ? 'EN PROD.' : 'AU REPOS';
  if (c.alert_no_production && sunUp && pv <= 10) { pvCol = '#f87171'; pvSub = '⚠ AUCUNE PRODUCTION'; pvMini = '⚠ AUCUNE PROD.'; pvCls = 'lowbat'; }

  // batterie (+ alertes pleine / niveau bas)
  const batPow = ch > 10 ? '▲ ' + fmt(ch) : (dis > 10 ? '▼ ' + fmt(dis) : '');
  let batCol = ch > 10 ? '#22c55e' : (dis > 10 ? '#2dd4bf' : (soc < 30 ? '#ef4444' : (soc < 70 ? '#f97316' : '#22c55e')));
  let batSub = batPow || 'REPOS', batSubCol = batCol, batCls = '', batGlow = false;
  let batMini = batPow || 'REPOS';
  if (showBat) {
    const full = Number(c.battery_full_threshold) || 99, low = Number(c.battery_low_threshold) || 15;
    if (c.alert_battery_low && soc <= low) {
      batCol = batSubCol = '#ef4444'; batCls = 'lowbat';
      batSub = '⚠ FAIBLE' + (batPow ? ' · ' + batPow : ''); batMini = '⚠ FAIBLE';
    } else if (c.alert_battery_full && soc >= full) {
      batSubCol = '#22c55e'; batGlow = true;
      batSub = 'PLEINE' + (batPow ? ' · ' + batPow : ''); batMini = 'PLEINE';
    }
  }

  const bd = c.consumption_breakdown === 'ring' ? breakdown(conso, devs || [], c) : null;
  const nodes = {
    pv: { ...P.pv, color: pvCol, icon: 'mdi:solar-power-variant', val: fmt(pv), frac: clamp(pv / max), ent: E('pv_entity'), cls: pvCls, name: 'PRODUCTION', sub: pvSub, subCol: pvCol, spin: pv > 10, mini: { t: pvMini, c: pvCol } },
    house: { ...P.house, color: cHouse, icon: 'mdi:home-lightning-bolt', val: fmt(conso), frac: clamp(conso / max), ent: E('load_entity'), cls: '', name: 'MAISON', sub: '', subCol: '', segs: bd ? bd.segs : null, mini: { t: autonomie !== null ? 'AUTONOMIE ' + autonomie + '%' : '', c: 'var(--tx2)' } },
    bat: showBat ? { ...P.bat, color: batCol, icon: 'mdi:home-battery', val: Math.round(soc) + '%', frac: clamp(soc / 100), ent: E('soc_entity'), cls: batCls, glow: batGlow,
      name: 'BATTERIE' + (cap > 0 ? ' · ' + (soc * cap / 100).toFixed(1).replace('.', ',') + ' kWh' : ''), sub: batSub, subCol: batSubCol, mini: { t: batMini, c: batSubCol } } : null,
    grid: showGrid ? { ...P.grid, color: cGrid, icon: 'mdi:transmission-tower', val: fmt(gridP), frac: clamp(gridP / max), ent: E(gridSigned ? 'grid_power_entity' : (exp > 10 ? 'grid_export_entity' : 'grid_import_entity')), cls: '', name: 'RÉSEAU', sub: gridSub, subCol: cGrid, mini: { t: gridSub, c: cGrid } } : null,
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
  if (g.layout === 'mini') {
    // pas de flux animés dans la disposition mini
  } else if (c.direct_flows) {
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
  `<text x="${x}" y="${y}" text-anchor="${anchor || 'middle'}" style="fill:${fill}" font-size="${size}" font-weight="${wt}" letter-spacing="${ls}">${t}</text>`;

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
      <circle cx="${n.x}" cy="${n.y}" r="${R}" style="fill:var(--disc)" stroke="rgba(148,163,184,.14)" stroke-width="${(5 * k).toFixed(1)}"/>
      ${arc}
      <foreignObject x="${(n.x - fo / 2).toFixed(1)}" y="${(n.y - 28 * k).toFixed(1)}" width="${fo}" height="${fo}">
        <div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;justify-content:center;width:${fo}px;height:${fo}px;color:${n.color};">
          <ha-icon icon="${n.icon}" style="--mdc-icon-size:${ico}px;"></ha-icon>
        </div>
      </foreignObject>
      ${T(n.x, (n.y + 17 * k).toFixed(1), n.val, 'var(--vtx)', (14 * k).toFixed(1), 700, 0)}
    </g>`;
}

function miniHtml(m) {
  const tile = key => {
    const n = m.nodes[key];
    if (!n) return '';
    const style = (n.ent ? 'cursor:pointer;' : '') + (n.glow ? `filter:drop-shadow(0 0 6px ${n.color});` : '');
    return `<div class="tile ${n.cls || ''}" ${n.ent ? `data-entity="${esc(n.ent)}"` : ''} style="${style}"><ha-icon icon="${n.icon}" style="color:${n.color};--mdc-icon-size:18px;"></ha-icon><div class="tv">${n.val}</div><div class="ts" style="color:${n.mini.c}">${n.mini.t}</div></div>`;
  };
  return `<div class="minirow">${['pv', 'house', 'bat', 'grid'].map(tile).join('')}</div>`;
}

function labelSvg(m, key) {
  const n = m.nodes[key];
  if (!n) return '';
  const R = m.g.R;
  if (m.g.layout === 'horizontal') {
    const left = key === 'pv' || key === 'bat', x = left ? n.x - R - 14 : n.x + R + 14, a = left ? 'end' : 'start';
    return T(x, n.sub ? n.y - 3 : n.y + 4, n.name, 'var(--tx2)', 9, 600, 2, a) + (n.sub ? T(x, n.y + 11, n.sub, n.subCol, 8, 700, 1.2, a) : '');
  }
  if (key === 'pv') return T(n.x, n.y - R - 40, n.name, 'var(--tx2)', 9, 600, 2) + T(n.x, n.y - R - 27, n.sub, n.subCol, 8, 700, 1.2);
  return T(n.x, n.y + R + 18, n.name, 'var(--tx2)', 9, 600, 2) + (n.sub ? T(n.x, n.y + R + 31, n.sub, n.subCol, 8, 700, 1.2) : '');
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
      <circle cx="${hub.x}" cy="${hub.y}" r="${g.hubR}" stroke="${m.active ? '#fbbf24' : SLATE}" stroke-width="2" style="fill:var(--disc2);filter:drop-shadow(0 0 8px ${m.active ? '#fbbf2488' : 'transparent'});"/>
      ${T(hub.x, (hub.y + 4.5 * k).toFixed(1), m.autonomie === null ? '–' : m.autonomie + '%', 'var(--vtx)', (12.5 * k).toFixed(1), 800, 0)}
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
  .card{padding:16px 14px 18px;border-radius:22px;overflow:hidden;color:var(--tx);--tx:#f1f5f9;--tx2:#94a3b8;--ttl:#fde68a;--disc:rgba(15,23,42,.88);--disc2:rgba(15,23,42,.95);--vtx:#f1f5f9;animation:riseIn .7s ease-out;
    background:radial-gradient(120% 70% at 50% 0%,rgba(251,191,36,.13),transparent 60%),linear-gradient(180deg,#0b1220 0%,#060a14 100%);
    box-shadow:0 0 26px rgba(251,191,36,.10),inset 0 0 50px rgba(2,6,23,.7)}
  .card.compact{padding:10px 12px 12px;border-radius:18px}
  .card.compact .t2{display:none}
  .card.mini{padding:10px 6px;border-radius:16px}
  .card.mini .head{display:none}
  .minirow{display:flex;align-items:stretch}
  .tile{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;gap:2px;padding:2px 4px}
  .tile+.tile{border-left:1px solid rgba(148,163,184,.12)}
  .tv{font-size:15px;font-weight:700;color:var(--tx);white-space:nowrap}
  .ts{font-size:7.5px;font-weight:700;letter-spacing:.8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;min-height:9px}
  .head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px}
  .t1{font-size:15px;font-weight:800;letter-spacing:2.5px;color:var(--ttl);text-shadow:var(--tsh,0 0 10px #fbbf2488)}
  .t2{font-size:9px;letter-spacing:2px;color:#64748b;margin-top:2px}
  .badge{font-size:7.5px;font-weight:700;letter-spacing:1px;padding:5px 9px;border-radius:999px;white-space:nowrap;display:flex;align-items:center;gap:6px}
  .dot{width:6px;height:6px;border-radius:50%;animation:blink 1.6s ease-in-out infinite}
  .legend{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px 16px;margin-top:10px;padding-top:10px;border-top:1px solid rgba(148,163,184,.12)}
  .legend:empty{display:none}
  .lg{display:flex;align-items:center;gap:6px;font-size:10px;min-width:0}
  .ld{width:8px;height:8px;border-radius:50%;flex:none}
  .ln{color:var(--tx2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}
  .lv{color:var(--tx);font-weight:700;flex:none}
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
    const l = this._config && this._config.layout, base = l === 'mini' ? 2 : (l === 'compact' ? 5 : (l === 'horizontal' ? 4 : 8));
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
      gp: this._read('grid_power_entity'), bp: this._read('battery_power_entity'),
    };
    const demo = Object.values(raw).every(v => v === null);
    const cfg = this._config;
    const d = demo ? { ...DEMO } : Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v === null ? 0 : v]));
    if (!demo) {
      // un seul capteur signé : batterie (positif = charge) et réseau (positif = soutirage), sens inversable
      if (batteryMode(cfg) === 'signed') { const v = d.bp * (cfg.battery_power_invert ? -1 : 1); d.ch = Math.max(0, v); d.dis = Math.max(0, -v); }
      if (gridMode(cfg) === 'signed') { const v = d.gp * (cfg.grid_power_invert ? -1 : 1); d.imp = Math.max(0, v); d.exp = Math.max(0, -v); }
    }
    const sun = this._hass.states[this._config.sun_entity || 'sun.sun'];
    const sunUp = !!(sun && sun.state === 'above_horizon' && Number(sun.attributes && sun.attributes.elevation) > 10);
    const list = Array.isArray(this._config.devices) ? this._config.devices : [];
    let devs = list.map((x, i) => ({ x, i })).filter(o => o.x && o.x.entity).map(({ x, i }) => {
      const st = this._hass.states[x.entity], v = this._num(x.entity);
      const off = !st || st.state === 'unavailable' || st.state === 'unknown';
      return { i, name: x.name || (st && st.attributes && st.attributes.friendly_name) || x.entity, color: x.color || '', group: x.group || '', w: off || v === null ? 0 : Math.max(0, v), off };
    });
    if (demo && this._config.consumption_breakdown === 'ring' && !devs.length) devs = DEMO_DEVS;
    const dm = this._hass.themes ? this._hass.themes.darkMode : undefined;
    const sig = JSON.stringify([d, demo, sunUp, devs, dm, this._config]);
    if (sig === this._sig) return;
    this._sig = sig;
    this._render(d, demo, sunUp, devs, dm);
  }

  _render(d, demo, sunUp, devs, dm) {
    const c = this._config;
    const m = buildModel(d, c, sunUp, devs);
    const { txt, col } = m.status;
    const html = `
      <div class="card ${m.g.layout}" style="border:1px solid ${c.card_border === false ? 'transparent' : (m.active ? 'rgba(251,191,36,.45)' : 'rgba(100,116,139,.35)')};${cardTheme(c, dm)}">
        <div class="head">
          <div><div class="t1">${esc(c.title || '')}</div><div class="t2">FLUX D'ÉNERGIE · ${demo ? 'DÉMO' : 'TEMPS RÉEL'}</div></div>
          <div class="badge" style="color:${col};border:1px solid ${col}66;background:${col}14"><span class="dot" style="background:${col};box-shadow:0 0 8px ${col}"></span>${txt}</div>
        </div>
        ${m.g.layout === 'mini' ? miniHtml(m) : svgFromModel(m)}
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

/* ---------- Éditeur visuel (sections repliables, champs affichés selon les besoins) ---------- */
const LABELS = {
  title: 'Titre de la carte',
  layout: 'Disposition de la carte',
  max_power: "Puissance max de l'installation (W)",
  pv_entity: 'Production solaire (W)',
  load_entity: 'Consommation maison (W)',
  show_battery: 'Afficher la batterie',
  battery_mode: 'Capteurs de la batterie',
  soc_entity: 'Niveau de charge (%)',
  battery_charge_entity: 'Puissance de charge (W)',
  battery_discharge_entity: 'Puissance de décharge (W)',
  battery_power_entity: 'Puissance de la batterie (W, positive ou négative)',
  battery_power_invert: 'Inverser le sens (positif = décharge)',
  battery_capacity: 'Capacité de la batterie (kWh)',
  show_grid: 'Afficher le réseau',
  grid_mode: 'Capteurs du réseau',
  grid_export_entity: 'Injection (W)',
  grid_import_entity: 'Soutirage (W)',
  grid_power_entity: 'Puissance du réseau (W, positive ou négative)',
  grid_power_invert: 'Inverser le sens (positif = injection)',
  grid_import_threshold: 'Soutirage signalé au-dessus de (W)',
  direct_flows: 'Flux directs (production → batterie / réseau)',
  background: 'Fond de la carte',
  background_color: 'Couleur personnalisée (ex. #1e293b)',
  background_opacity: 'Opacité du fond (%)',
  text_theme: 'Couleur du texte',
  card_border: 'Afficher le contour de la carte',
  alert_battery_full: 'Alerte : batterie pleine',
  battery_full_threshold: 'Batterie pleine à partir de (%)',
  alert_battery_low: 'Alerte : batterie faible',
  battery_low_threshold: 'Batterie faible en dessous de (%)',
  alert_no_production: 'Alerte : aucune production en plein jour',
  sun_entity: "Entité soleil (pour l'alerte de production)",
  consumption_breakdown: 'Détail de la consommation de la maison',
  breakdown_max: "Nombre d'appareils détaillés (les autres sont regroupés)",
  breakdown_legend: 'Afficher la légende sous la carte',
  group_devices: 'Regrouper les appareils ayant le même groupe',
  other_label: 'Nom de la part non détaillée',
  entity: 'Capteur de puissance',
  name: 'Nom (facultatif)',
  group: 'Groupe (facultatif)',
  color: 'Couleur',
};
const HELPERS = {
  battery_power_entity: 'Valeur positive = charge, valeur négative = décharge.',
  grid_power_entity: 'Valeur positive = soutirage, valeur négative = injection.',
  grid_import_threshold: "En dessous, le soutirage est ignoré : pas de flux, pas de badge, autonomie non réduite.",
};
const ent = (name, domain = 'sensor') => ({ name, selector: { entity: { domain } } });
const bool = name => ({ name, selector: { boolean: {} } });
const pct = name => ({ name, selector: { number: { min: 1, max: 100, step: 1, mode: 'box' } } });
const num = (name, min, max, step) => ({ name, selector: { number: { min, max, step, mode: 'box' } } });
const choice = (name, options) => ({ name, selector: { select: { mode: 'dropdown', options } } });
const SIGNED = 'Un seul capteur : valeur positive ou négative';
const COLOR_OPTIONS = [
  { value: 'auto', label: 'Automatique' }, { value: 'bleu', label: '🔵 Bleu' }, { value: 'rouge', label: '🔴 Rouge' },
  { value: 'orange', label: '🟠 Orange' }, { value: 'jaune', label: '🟡 Jaune' }, { value: 'vert', label: '🟢 Vert' },
  { value: 'violet', label: '🟣 Violet' }, { value: 'rose', label: '🌸 Rose' }, { value: 'turquoise', label: '💠 Turquoise' },
  { value: 'marron', label: '🟤 Marron' }, { value: 'blanc', label: '⚪ Blanc' },
];

const SECTIONS = [
  { id: 'general', open: true, title: () => 'Général', schema: () => [
    { name: 'title', selector: { text: {} } },
    choice('layout', [
      { value: 'standard', label: 'Standard (vertical)' },
      { value: 'compact', label: 'Compact (plus bas)' },
      { value: 'horizontal', label: 'Horizontal (large)' },
      { value: 'mini', label: 'Mini (une seule ligne)' },
    ]),
    num('max_power', 500, 100000, 100),
  ] },
  { id: 'prod', open: true, title: () => 'Production et consommation', schema: () => [ent('pv_entity'), ent('load_entity')] },
  { id: 'bat', open: true, title: c => 'Batterie' + (c.show_battery === false ? ' · masquée' : ''), schema: c => {
    const s = [bool('show_battery')];
    if (c.show_battery === false) return s;
    s.push(choice('battery_mode', [{ value: 'separate', label: 'Deux capteurs : charge et décharge' }, { value: 'signed', label: SIGNED }]), ent('soc_entity'));
    if (c.battery_mode === 'signed') s.push(ent('battery_power_entity'), bool('battery_power_invert'));
    else s.push(ent('battery_charge_entity'), ent('battery_discharge_entity'));
    s.push(num('battery_capacity', 0, 200, 0.1));
    return s;
  } },
  { id: 'grid', open: true, title: c => 'Réseau' + (c.show_grid === false ? ' · masqué' : ''), schema: c => {
    const s = [bool('show_grid')];
    if (c.show_grid === false) return s;
    s.push(choice('grid_mode', [{ value: 'separate', label: 'Deux capteurs : injection et soutirage' }, { value: 'signed', label: SIGNED }]));
    if (c.grid_mode === 'signed') s.push(ent('grid_power_entity'), bool('grid_power_invert'));
    else s.push(ent('grid_export_entity'), ent('grid_import_entity'));
    s.push(num('grid_import_threshold', 10, 5000, 10));
    return s;
  } },
  { id: 'display', open: false, title: () => 'Affichage', schema: () => [bool('direct_flows')] },
  { id: 'bg', open: false, title: c => {
    const k = String(c.background || 'sombre').toLowerCase();
    return 'Fond de la carte' + (k === 'transparent' ? ' · transparent' : (k !== 'sombre' ? ' · ' + (BG_ALIASES[k] || k) : ''));
  }, schema: c => {
    const s = [choice('background', [
      { value: 'sombre', label: 'Sombre (par défaut)' }, { value: 'noir', label: '⬛ Noir' }, { value: 'bleu', label: '🟦 Bleu nuit' },
      { value: 'vert', label: '🟩 Vert foncé' }, { value: 'violet', label: '🟪 Violet' }, { value: 'rouge', label: '🟥 Rouge sombre' },
      { value: 'gris', label: 'Gris' }, { value: 'clair', label: '⬜ Clair' }, { value: 'transparent', label: 'Transparent' },
      { value: 'perso', label: 'Couleur personnalisée' },
    ])];
    if (c.background === 'perso' || c.background === 'custom') s.push({ name: 'background_color', selector: { text: {} } });
    if (c.background !== 'transparent') s.push(num('background_opacity', 0, 100, 5));
    s.push(choice('text_theme', [
      { value: 'auto', label: 'Automatique' }, { value: 'light', label: 'Texte clair (fond sombre)' }, { value: 'dark', label: 'Texte foncé (fond clair)' },
    ]), bool('card_border'));
    return s;
  } },
  { id: 'alerts', open: false, title: c => {
    const n = [c.alert_battery_full, c.alert_battery_low, c.alert_no_production].filter(Boolean).length;
    return 'Alertes' + (n ? ' · ' + n + (n > 1 ? ' actives' : ' active') : '');
  }, schema: c => {
    const s = [];
    if (c.show_battery !== false) {
      s.push(bool('alert_battery_full')); if (c.alert_battery_full) s.push(pct('battery_full_threshold'));
      s.push(bool('alert_battery_low')); if (c.alert_battery_low) s.push(pct('battery_low_threshold'));
    }
    s.push(bool('alert_no_production')); if (c.alert_no_production) s.push(ent('sun_entity', 'sun'));
    return s;
  } },
  { id: 'breakdown', open: false, devices: true, title: c => 'Détail de la consommation' + (c.consumption_breakdown === 'ring' ? ' · activé' : ''), schema: c => {
    const s = [choice('consumption_breakdown', [{ value: 'off', label: 'Désactivé' }, { value: 'ring', label: 'Anneau coloré du cercle Maison' }])];
    if (c.consumption_breakdown === 'ring') {
      s.push({ type: 'grid', name: '', schema: [num('breakdown_max', 1, 12, 1), bool('breakdown_legend')] },
        { type: 'grid', name: '', schema: [bool('group_devices'), { name: 'other_label', selector: { text: {} } }] });
    }
    return s;
  } },
];
const ROW_SCHEMA = [
  ent('entity'),
  { type: 'grid', name: '', schema: [{ name: 'name', selector: { text: {} } }, { name: 'group', selector: { text: {} } }] },
  choice('color', COLOR_OPTIONS),
];

class SolarPowerflowCardEditor extends HTMLElement {
  setConfig(config) { this._config = config; this._draw(); }
  set hass(hass) {
    this._hass = hass;
    (this._secs || []).forEach(x => { x.form.hass = hass; });
    (this._rows || []).forEach(r => { r.form.hass = hass; });
  }

  _view() { return { ...DEFAULTS, grid_mode: gridMode(this._config), battery_mode: batteryMode(this._config), ...this._config }; }

  _emit(config) {
    const out = { ...config };
    if (!Array.isArray(out.devices) || !out.devices.length) delete out.devices;
    this._config = out;
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: out }, bubbles: true, composed: true }));
  }

  _devices() { return Array.isArray(this._config.devices) ? this._config.devices.slice() : []; }

  _draw() {
    if (!this._secs) {
      const st = document.createElement('style');
      st.textContent = '.sp-sec{border:1px solid var(--divider-color);border-radius:12px;margin:0 0 10px;padding:0 12px}'
        + '.sp-sec>summary{cursor:pointer;font-weight:600;padding:12px 0;color:var(--primary-text-color)}'
        + '.sp-body{padding:0 0 12px}'
        + '.sp-h{margin:16px 0 4px;font-weight:600;color:var(--primary-text-color)}'
        + '.sp-hint{font-size:12px;color:var(--secondary-text-color);margin:0 0 10px}'
        + '.sp-row{border:1px solid var(--divider-color);border-radius:12px;padding:6px 12px 12px;margin:0 0 10px}'
        + '.sp-bar{display:flex;gap:6px;justify-content:flex-end;margin:4px 0}'
        + '.sp-b{cursor:pointer;border:1px solid var(--divider-color);background:transparent;color:var(--primary-text-color);border-radius:8px;padding:4px 10px;font:inherit}'
        + '.sp-b:disabled{opacity:.35;cursor:default}'
        + '.sp-add{width:100%;padding:8px;border-style:dashed;color:var(--primary-color)}';
      this.appendChild(st);
      this._secs = SECTIONS.map(sec => {
        const det = document.createElement('details'); det.className = 'sp-sec'; det.open = !!sec.open;
        const sm = document.createElement('summary');
        const body = document.createElement('div'); body.className = 'sp-body';
        const form = document.createElement('ha-form');
        form.computeLabel = f => LABELS[f.name] || f.name;
        form.computeHelper = f => HELPERS[f.name] || '';
        form.addEventListener('value-changed', ev => {
          ev.stopPropagation();
          this._emit({ ...ev.detail.value, type: this._config.type, devices: this._config.devices });
        });
        body.appendChild(form);
        det.append(sm, body);
        this.appendChild(det);
        if (sec.devices) { this._box = document.createElement('div'); body.appendChild(this._box); }
        return { sec, det, sm, form };
      });
    }
    const view = this._view();
    this._secs.forEach(({ sec, sm, form }) => {
      sm.textContent = sec.title(view);
      form.hass = this._hass;
      form.schema = sec.schema(view);
      form.data = view;
    });
    this._box.style.display = view.consumption_breakdown === 'ring' ? '' : 'none';
    this._drawDevices();
  }

  _drawDevices() {
    const devs = this._devices();
    const rowData = d => ({ color: 'auto', ...d });
    if (this._rows && this._rows.length === devs.length) {
      this._rows.forEach((r, i) => { r.form.data = rowData(devs[i]); });
      return;
    }
    this._box.textContent = '';
    this._rows = [];
    const h = document.createElement('div'); h.className = 'sp-h'; h.textContent = 'Appareils à détailler';
    const hint = document.createElement('div'); hint.className = 'sp-hint';
    hint.textContent = "Ajoutez les capteurs de puissance (W) des appareils. L'écart avec la consommation de la maison apparaît dans la part non détaillée. Évitez les doubles comptages (une multiprise et les appareils branchés dessus).";
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
      form.computeLabel = f => LABELS[f.name] || f.name;
      form.data = rowData(dev);
      form.addEventListener('value-changed', ev => {
        ev.stopPropagation();
        const cur = this._devices(), r = {};
        Object.entries(ev.detail.value || {}).forEach(([k, v]) => { if (v !== '' && v != null) r[k] = v; });
        if (r.color === 'auto') delete r.color;
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
console.info('%c SOLAR-POWERFLOW-CARD %c v1.5.0 ', 'background:#fbbf24;color:#000;font-weight:700', 'background:#0b1220;color:#fbbf24');

/* Solar Powerflow Card v1.1.1 - carte Lovelace de flux d'énergie solaire (sans dépendance) */
const ENTITY_KEYS = ['pv_entity','load_entity','soc_entity','battery_charge_entity','battery_discharge_entity','grid_export_entity','grid_import_entity'];
const STUB = { title: 'INSTALLATION PV', max_power: 5000, battery_capacity: 0 };
const DEMO = { pv: 3480, load: 2100, soc: 64, ch: 900, dis: 0, exp: 480, imp: 0 };
const SLATE = '#64748b';
const clamp = x => Math.max(0, Math.min(1, x));
const fmt = w => w >= 1000 ? (w / 1000).toFixed(2).replace('.', ',') + ' kW' : Math.round(w) + ' W';

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
  .head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px}
  .t1{font-size:15px;font-weight:800;letter-spacing:2.5px;color:#fde68a;text-shadow:0 0 10px #fbbf2488}
  .t2{font-size:9px;letter-spacing:2px;color:#64748b;margin-top:2px}
  .badge{font-size:7.5px;font-weight:700;letter-spacing:1px;padding:5px 9px;border-radius:999px;white-space:nowrap;display:flex;align-items:center;gap:6px}
  .dot{width:6px;height:6px;border-radius:50%;animation:blink 1.6s ease-in-out infinite}
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
    this._config = { max_power: 5000, battery_capacity: 0, title: 'INSTALLATION PV', ...config };
    this._sig = null;
    this._update();
  }

  set hass(hass) { this._hass = hass; this._update(); }
  getCardSize() { return 8; }

  _read(key) {
    const id = this._config[key];
    const st = id && this._hass && this._hass.states[id];
    if (!st) return null;
    let n = parseFloat(st.state);
    if (isNaN(n)) return 0;
    const unit = (st.attributes && st.attributes.unit_of_measurement || '').toLowerCase();
    if (unit === 'kw') n *= 1000;
    return n;
  }

  _update() {
    if (!this._config || !this._hass) return;
    const raw = {
      pv: this._read('pv_entity'), load: this._read('load_entity'), soc: this._read('soc_entity'),
      ch: this._read('battery_charge_entity'), dis: this._read('battery_discharge_entity'),
      exp: this._read('grid_export_entity'), imp: this._read('grid_import_entity'),
    };
    const demo = Object.values(raw).every(v => v === null);
    const d = demo ? DEMO : Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v === null ? 0 : v]));
    const sig = JSON.stringify([d, demo, this._config]);
    if (sig === this._sig) return;
    this._sig = sig;
    this._render(d, demo);
  }

  _render(d, demo) {
    const c = this._config;
    const max = Number(c.max_power) || 5000;
    const cap = Number(c.battery_capacity) || 0;
    const { pv, load: conso, soc, ch, dis, exp, imp } = d;
    const E = k => c[k] || '';

    // Statut (badge en haut à droite)
    let txt = 'VEILLE', col = '#64748b';
    if (pv > 10) {
      if (exp > 10) { txt = 'SURPLUS INJECTÉ'; col = '#c084fc'; }
      else if (ch > 10) { txt = 'CHARGE BATTERIE'; col = '#22c55e'; }
      else { txt = 'AUTOCONSOMMATION'; col = '#fbbf24'; }
    } else if (dis > 10) { txt = 'SUR BATTERIE'; col = '#2dd4bf'; }
    else if (imp > 10) { txt = 'SOUTIRAGE RÉSEAU'; col = '#f87171'; }

    const cPV = pv > 10 ? '#fbbf24' : SLATE;
    const cHouse = (conso > 10 && pv >= conso) ? '#22c55e' : '#38bdf8';
    const cBat = soc < 30 ? '#ef4444' : (soc < 70 ? '#f97316' : '#22c55e');
    const gridP = exp > 10 ? exp : imp;
    const cGrid = exp > 10 ? '#c084fc' : (imp > 10 ? '#f87171' : SLATE);
    const autonomie = conso > 10 ? Math.round(clamp((conso - imp) / conso) * 100) : null;
    const anyFlow = [pv, conso, ch, dis, exp, imp].some(v => v > 10);

    const node = (cx, cy, color, icon, val, frac, extra, ent) => {
      const C = 2 * Math.PI * 40;
      const arc = frac > 0.005
        ? `<circle cx="${cx}" cy="${cy}" r="40" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(C * frac).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})" style="filter:drop-shadow(0 0 5px ${color});"/>` : '';
      return `
        <g ${extra || ''} ${ent ? `data-entity="${ent}" style="cursor:pointer"` : ''}>
          <circle cx="${cx}" cy="${cy}" r="40" fill="rgba(15,23,42,.88)" stroke="rgba(148,163,184,.14)" stroke-width="5"/>
          ${arc}
          <foreignObject x="${cx - 14}" y="${cy - 28}" width="28" height="28">
            <div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;color:${color};">
              <ha-icon icon="${icon}" style="--mdc-icon-size:24px;"></ha-icon>
            </div>
          </foreignObject>
          <text x="${cx}" y="${cy + 17}" text-anchor="middle" fill="#f1f5f9" font-size="14" font-weight="700">${val}</text>
        </g>`;
    };
    const sub = (x, y, t, k) => `<text x="${x}" y="${y}" text-anchor="middle" fill="${k}" font-size="8" font-weight="700" letter-spacing="1.2">${t}</text>`;
    const label = (x, y, t) => `<text x="${x}" y="${y}" text-anchor="middle" fill="#94a3b8" font-size="9" font-weight="600" letter-spacing="2">${t}</text>`;
    const flow = (p, color, w) => {
      if (w <= 10) return '';
      const dur = Math.round(Math.max(1.3, 4 - 2.7 * clamp(w / max)) * 2) / 2;
      let o = `<path d="${p}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-dasharray="5 7" opacity=".55" style="animation:dashmove ${(dur / 4).toFixed(2)}s linear infinite;"/>`;
      for (let i = 0; i < 3; i++) {
        o += `<circle r="3.4" fill="${color}" filter="url(#sf-glow)"><animateMotion dur="${dur.toFixed(2)}s" begin="-${(i * dur / 3).toFixed(2)}s" repeatCount="indefinite" path="${p}"/></circle>`;
      }
      return o;
    };
    const track = p => `<path d="${p}" fill="none" stroke="rgba(148,163,184,.16)" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round"/>`;

    const pPV = 'M200 114 L200 176', pHouse = 'M200 224 L200 286';
    const pBatToHub = 'M100 200 L176 200', pHubToBat = 'M176 200 L100 200';
    const pGridToHub = 'M300 200 L224 200', pHubToGrid = 'M224 200 L300 200';
    const batSub = ch > 10 ? '▲ ' + fmt(ch) : (dis > 10 ? '▼ ' + fmt(dis) : 'REPOS');
    const batCol = ch > 10 ? '#22c55e' : (dis > 10 ? '#2dd4bf' : cBat);
    const gridSub = exp > 10 ? '→ INJECTION' : (imp > 10 ? '← SOUTIRAGE' : 'INACTIF');
    const batLabel = 'BATTERIE' + (cap > 0 ? ' · ' + (soc * cap / 100).toFixed(1).replace('.', ',') + ' kWh' : '');

    const flowSvg = `
      <svg viewBox="0 0 400 412" width="100%" style="display:block;overflow:visible;">
        <defs><filter id="sf-glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        ${label(200, 12, 'PRODUCTION')}
        ${sub(200, 25, pv > 10 ? 'EN PRODUCTION' : 'AU REPOS', cPV)}
        <g transform="translate(0,20)">
          ${track(pPV)}${track(pHouse)}${track(pBatToHub)}${track(pGridToHub)}
          ${flow(pPV, '#fbbf24', pv)}${flow(pHouse, '#38bdf8', conso)}
          ${ch > 10 ? flow(pHubToBat, '#22c55e', ch) : flow(pBatToHub, '#2dd4bf', dis)}
          ${exp > 10 ? flow(pHubToGrid, '#c084fc', exp) : flow(pGridToHub, '#f87171', imp)}
          ${anyFlow ? `<circle class="pulse" cx="200" cy="200" r="24" fill="none" stroke="#fbbf24" stroke-width="1.5"/>` : ''}
          <circle cx="200" cy="200" r="24" fill="rgba(15,23,42,.95)" stroke="${pv > 10 ? '#fbbf24' : SLATE}" stroke-width="2" style="filter:drop-shadow(0 0 8px ${pv > 10 ? '#fbbf2488' : 'transparent'});"/>
          <text x="200" y="205" text-anchor="middle" fill="#f1f5f9" font-size="15" font-weight="800">${autonomie === null ? '–' : autonomie + '%'}</text>
          ${pv > 10 ? `<circle class="spin" cx="200" cy="72" r="49" fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="2 9" stroke-linecap="round" opacity=".75"/>` : ''}
          ${node(200, 72, cPV, 'mdi:solar-power-variant', fmt(pv), clamp(pv / max), '', E('pv_entity'))}
          ${node(60, 200, batCol, 'mdi:home-battery', Math.round(soc) + '%', clamp(soc / 100), soc < 15 ? 'class="lowbat"' : '', E('soc_entity'))}
          ${label(60, 258, batLabel)}
          ${sub(60, 271, batSub, batCol)}
          ${node(340, 200, cGrid, 'mdi:transmission-tower', fmt(gridP), clamp(gridP / max), '', E(exp > 10 ? 'grid_export_entity' : 'grid_import_entity'))}
          ${label(340, 258, 'RÉSEAU')}
          ${sub(340, 271, gridSub, cGrid)}
          ${node(200, 328, cHouse, 'mdi:home-lightning-bolt', fmt(conso), clamp(conso / max), '', E('load_entity'))}
          ${label(200, 386, 'MAISON')}
        </g>
      </svg>`;

    const html = `
      <div class="card" style="border:1px solid ${pv > 10 ? 'rgba(251,191,36,.45)' : 'rgba(100,116,139,.35)'}">
        <div class="head">
          <div><div class="t1">${c.title || ''}</div><div class="t2">FLUX D'ÉNERGIE · ${demo ? 'DÉMO' : 'TEMPS RÉEL'}</div></div>
          <div class="badge" style="color:${col};border:1px solid ${col}66;background:${col}14"><span class="dot" style="background:${col};box-shadow:0 0 8px ${col}"></span>${txt}</div>
        </div>
        ${flowSvg}
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

const LABELS = {
  title: 'Titre de la carte',
  pv_entity: 'Production solaire (W)',
  load_entity: 'Consommation maison (W)',
  soc_entity: 'Batterie : niveau de charge (%)',
  battery_charge_entity: 'Batterie : puissance de charge (W)',
  battery_discharge_entity: 'Batterie : puissance de décharge (W)',
  grid_export_entity: 'Réseau : injection (W)',
  grid_import_entity: 'Réseau : soutirage (W)',
  max_power: 'Puissance max de l\'installation (W)',
  battery_capacity: 'Capacité de la batterie (kWh)',
};
const sel = name => ({ name, selector: { entity: { domain: 'sensor' } } });
const SCHEMA = [
  { name: 'title', selector: { text: {} } },
  ...ENTITY_KEYS.map(sel),
  { type: 'grid', name: '', schema: [
    { name: 'max_power', selector: { number: { min: 500, max: 100000, step: 100, mode: 'box' } } },
    { name: 'battery_capacity', selector: { number: { min: 0, max: 200, step: 0.1, mode: 'box' } } },
  ] },
];

class SolarPowerflowCardEditor extends HTMLElement {
  setConfig(config) { this._config = config; this._draw(); }
  set hass(hass) { this._hass = hass; if (this._form) this._form.hass = hass; }
  _draw() {
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.computeLabel = s => LABELS[s.name] || s.name;
      this._form.addEventListener('value-changed', ev => {
        ev.stopPropagation();
        const config = { ...ev.detail.value, type: this._config.type };
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.schema = SCHEMA;
    this._form.data = this._config;
  }
}

customElements.define('solar-powerflow-card', SolarPowerflowCard);
customElements.define('solar-powerflow-card-editor', SolarPowerflowCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'solar-powerflow-card',
  name: 'Solar Powerflow Card',
  description: 'Flux d\'énergie solaire animé : production, batterie, réseau et maison.',
  preview: true,
});
console.info('%c SOLAR-POWERFLOW-CARD %c v1.1.1 ', 'background:#fbbf24;color:#000;font-weight:700', 'background:#0b1220;color:#fbbf24');

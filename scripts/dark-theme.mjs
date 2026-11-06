// Builds src/workspace/dark.generated.css: a night counterpart for every hard-coded color in the workspace stylesheets.
// Tokens are handled by hand in dark.css; this covers the literals components still carry.
// Run `npm run theme:dark` after changing colors in a stylesheet. tests/dark-theme.test.mjs fails when the output is stale.
import { readFileSync, writeFileSync } from 'node:fs';
import postcss from 'postcss';

const dir = new URL('../src/workspace/', import.meta.url);
// Same order the app loads them in, so a later rule overrides an earlier one here too.
export const SOURCES = ['planning.css', 'presentations.css', 'games.css', 'packs.css', 'workspace.css', 'theme.css', 'admin.css', 'refinement.css'];
export const OUTPUT = new URL('dark.generated.css', dir);
// Learner-facing rooms and paper stay in daylight colors.
const ISLANDS = ['.theme-preview', '.play-room', '.sheet-page', '.slide-preview', '.sample-slide', '.deck-presenter', '.print-questions'];
// Also skipped: the wordmark, whose background is the logo's ink (drawn through a mask).
const ISLAND_RE = /brand-wordmark|play-room|learning-room|sheet-|flash-card|slide-preview|sample-slide|deck-presenter|print-questions|high-contrast|highlight-|sensory-quiet|focus-one/;
const COLOR_RE = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|\bwhite\b/gi;

function parse(c) {
  c = c.toLowerCase();
  if (c === 'white') return [255, 255, 255, 1];
  if (c.startsWith('#')) {
    let h = c.slice(1); if (h.length <= 4) h = [...h].map(x => x + x).join('');
    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).concat(h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1);
  }
  const p = c.slice(c.indexOf('(') + 1, -1).split(/[\s,/]+/).filter(Boolean).map(parseFloat);
  return [p[0], p[1], p[2], p[3] ?? 1];
}
function toHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255; const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1)); const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}
function fromHsl([h, s, l], a) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const hex = [r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
  return '#' + hex + (a < 1 ? Math.round(a * 255).toString(16).padStart(2, '0') : '');
}
// Dark text becomes light text, light surfaces become low surfaces, light borders become quiet lines. Mid tones (brand fills) stay.
const roles = {
  text: ([h, s, l]) => l < .6 ? [h, Math.min(s, .55), .92 - l * .35] : null,
  surface: ([h, s, l]) => l > .6 ? [h, Math.min(s, .3), .1 + (1 - l) * .5] : null,
  line: ([h, s, l]) => l > .6 ? [h, Math.min(s, .2), .22 + (1 - l) * .3] : null,
};
function roleOf(prop) {
  if (/^(color|fill|stroke|caret-color|text-decoration-color|-webkit-text-fill-color)$/.test(prop)) return 'text';
  if (/^background/.test(prop)) return 'surface';
  if (/^(border|outline)/.test(prop)) return 'line';
  return null;
}
export function night(value, role) {
  if (/var\(/.test(value) && !/url\(/.test(value) && value.replace(/var\([^)]*\)/g, '').match(COLOR_RE) === null) return null;
  let changed = false;
  // Leave image paths alone: only the parts outside url(...) carry colors.
  const out = value.split(/(url\([^)]*\))/).map(part => part.startsWith('url(') ? part : part.replace(COLOR_RE, c => { const rgba = parse(c); const next = roles[role](toHsl(rgba)); if (!next) return c; changed = true; return fromHsl(next, rgba[3]); })).join('');
  return changed ? out : null;
}
// Brand-colored text turns to the light brand tint; page-colored text on a brand fill stays light.
function textAt(value, onFill) {
  const v = value.trim();
  if (onFill) return /^var\(--(paper|canvas|cream)\)$/.test(v) ? '#fff7ea' : null;
  if (/^var\(--(wine(-dark|-deep|-night)?|brand-color)\b/.test(v)) return 'var(--wine-text)';
  return night(value, 'text');
}
const scoped = sel => sel.split(',').map(s => {
  s = s.trim(); const pseudo = s.match(/::?(before|after|placeholder|selection|marker|-webkit-[a-z-]+)$/);
  const base = pseudo ? s.slice(0, pseudo.index) : s;
  return `html:where([data-theme='dark']) ${base}:where(:not(${ISLANDS.map(c => `${c}, ${c} *`).join(', ')}))${pseudo ? pseudo[0] : ''}`;
}).join(',\n');

export function build() {
  // Later declarations of the same selector and property win in the page, so only the last one gets a night twin.
  const entries = [], latest = new Map();
  for (const file of SOURCES) {
    postcss.parse(readFileSync(new URL(file, dir), 'utf8')).walkRules(rule => {
      if (rule.parent.type === 'atrule' && rule.parent.name !== 'media') return;
      const media = rule.parent.type === 'atrule' ? rule.parent.params : '';
      if (/print/.test(media)) return;
      const sels = rule.selectors.filter(s => !ISLAND_RE.test(s) && !/^(:root|html|body)\b/.test(s) && s !== '.studio');
      // Text sitting on a fill that stays (brand buttons, brass badges) keeps its color.
      const keepsFill = rule.nodes.some(d => d.type === 'decl' && /^background/.test(d.prop) && (/var\(--(wine|brass|olive|green)/.test(d.value) || (d.value.replace(/url\([^)]*\)/g, '').match(COLOR_RE) && !night(d.value, 'surface'))));
      rule.walkDecls(d => {
        const role = !d.prop.startsWith('--') && roleOf(d.prop); if (!role) return;
        const value = role === 'text' ? textAt(d.value, keepsFill) : night(d.value, role);
        const family = role === 'surface' ? 'background' : /^border(-color)?$/.test(d.prop) ? 'border' : d.prop;
        for (const sel of sels) { const key = `${media}|${sel}|${family}`; latest.set(key, entries.length); entries.push({ key, media, sel, prop: d.prop, value, important: d.important }); }
      });
    });
  }
  const groups = new Map();
  entries.forEach((e, i) => { if (e.value && latest.get(e.key) === i) { const g = `${e.media}|${e.sel}`; if (!groups.has(g)) groups.set(g, { media: e.media, sel: e.sel, decls: [] }); groups.get(g).decls.push(e); } });
  const out = postcss.root();
  for (const { media, sel, decls } of groups.values()) {
    const rule = postcss.rule({ selector: scoped(sel) }); decls.forEach(d => rule.append(postcss.decl({ prop: d.prop, value: d.value, important: d.important })));
    if (media) out.append(postcss.atRule({ name: 'media', params: media }).append(rule)); else out.append(rule);
  }
  return `/* Generated by scripts/dark-theme.mjs from the workspace stylesheets. Do not edit by hand. */\n/* ds-allow-hardcode:start */\n@media screen {\n${out.toString()}\n}\n/* ds-allow-hardcode:end */\n`;
}

if (process.argv[1]?.endsWith('dark-theme.mjs')) {
  writeFileSync(OUTPUT, build());
  console.log('wrote', OUTPUT.pathname);
}

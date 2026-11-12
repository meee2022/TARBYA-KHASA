// Drives the local site (npm run dev on port 5173) in a fresh headless Chrome profile and runs a scenario: node scripts/e2e/run.mjs scripts/e2e/today.mjs [width height]. ONLY=text runs matching steps; DARK=1 uses night mode.
// A scenario exports `steps`: [name, async (t) => result]. `t` offers go, js, click, fill, text, wait, shot. A step fails by throwing.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const width = Number(process.argv[3] ?? 1440), height = Number(process.argv[4] ?? 900), mobile = width < 700;
const profile = join(process.env.TEMP, 'chrome-e2e-' + Date.now()), port = 9400 + Math.floor(Math.random() * 400);
const proc = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--window-size=${width},${height}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let target; for (let i = 0; i < 50 && !target; i++) { await sleep(300); try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x => x.type === 'page'); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waits = new Map(); const errors = [];
ws.onmessage = e => { const m = JSON.parse(e.data);
  if (m.id && waits.has(m.id)) { waits.get(m.id)(m); waits.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push('EXCEPTION ' + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, 300));
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('console.error ' + m.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 300)); };
const send = (method, params = {}) => new Promise(r => { waits.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
await send('Runtime.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
if (process.env.DARK) await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });

const helpers = `window.__t = {
  q: (sel, text) => [...document.querySelectorAll(sel)].find(el => !text || el.textContent.includes(text)),
  set(el, v) { const p = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(p, 'value').set.call(el, v); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); },
};`;
const t = {
  sleep,
  async js(expr) { const m = await send('Runtime.evaluate', { expression: `(async () => { ${helpers} ${expr} })()`, awaitPromise: true, returnByValue: true }); if (m.result.exceptionDetails) throw new Error(m.result.exceptionDetails.exception?.description ?? m.result.exceptionDetails.text); return m.result.result.value; },
  async go(route) { await send('Page.navigate', { url: 'http://localhost:5173' + route }); await sleep(1800); },
  async reload() { await send('Page.reload'); await sleep(1800); },
  /** Clicks the first element matching the selector whose text includes `text`. */
  async click(sel, text = '') { const ok = await t.js(`const el = __t.q(${JSON.stringify(sel)}, ${JSON.stringify(text)}); if (!el) return false; el.scrollIntoView({ block: 'center' }); el.click(); return true;`); if (!ok) throw new Error(`nothing to click: ${sel} «${text}»`); await sleep(350); },
  /** Sets the value of the nth element matching the selector. */
  async fill(sel, value, n = 0) { const ok = await t.js(`const el = document.querySelectorAll(${JSON.stringify(sel)})[${n}]; if (!el) return false; __t.set(el, ${JSON.stringify(value)}); return true;`); if (!ok) throw new Error(`nothing to fill: ${sel} [${n}]`); await sleep(120); },
  text: (sel = 'main') => t.js(`return document.querySelector(${JSON.stringify(sel)})?.innerText ?? ''`),
  count: sel => t.js(`return document.querySelectorAll(${JSON.stringify(sel)}).length`),
  overflow: () => t.js('return document.documentElement.scrollWidth - innerWidth'),
  async expect(cond, message) { if (!cond) throw new Error(message); },
  async shot(file) { const h = await t.js(`return Math.min(${mobile ? 2600 : 1800}, document.documentElement.scrollHeight)`); const m = await send('Page.captureScreenshot', { format: 'jpeg', quality: 72, captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: h, scale: mobile ? 1 : 0.62 } }); mkdirSync(resolve(file, '..'), { recursive: true }); writeFileSync(file, Buffer.from(m.result.data, 'base64')); },
};

let { steps } = await import(pathToFileURL(resolve(process.argv[2])).href);
if (process.env.ONLY) steps = steps.filter(([name]) => name.includes(process.env.ONLY));
let failed = 0;
for (const [name, run] of steps) {
  const before = errors.length;
  try { const out = await run(t); const errs = errors.slice(before).filter(e => !/ERR_CONNECTION|favicon|Download the React DevTools/.test(e)); if (errs.length) { failed++; console.log(`FAIL ${name}\n     ${errs.join('\n     ')}`); } else console.log(`ok   ${name}${out ? '  →  ' + String(out).slice(0, 160) : ''}`); }
  catch (e) { failed++; console.log(`FAIL ${name}\n     ${String(e.message).slice(0, 400)}`); }
}
console.log(failed ? `\n${failed} of ${steps.length} steps FAILED` : `\nall ${steps.length} steps passed`);
ws.close(); proc.kill(); await sleep(400); try { rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(failed ? 1 : 0);

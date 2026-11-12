// The accessibility menu in the top bar: text size, contrast and reading the page aloud.
const shots = 'artifacts/sweep-access/';
const pages = ['/', '/timetable', '/tasks', '/learners', '/attendance', '/performance', '/iep', '/behaviour', '/portfolio', '/team', '/reporting', '/distribution', '/plans', '/lessons', '/games', '/tools', '/guide', '/settings'];
const attrs = t => t.js(`const r = document.documentElement; return (r.dataset.textSize ?? 'normal') + ',' + (r.dataset.contrast ?? 'off') + ',' + getComputedStyle(document.getElementById('workspace-main')).zoom;`);

export const steps = [
  ['the menu opens from the top bar and closes with Escape', async t => {
    await t.go('/'); await t.click('.access-toggle'); await t.expect((await t.count('.access-panel')) === 1, 'panel did not open');
    const text = await t.text('.access-panel'); await t.expect(text.includes('حجم النص') && text.includes('تباين أعلى') && text.includes('اقرأ الصفحة بصوت'), 'panel: ' + text);
    await t.js(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`); await t.sleep(200); await t.expect((await t.count('.access-panel')) === 0, 'Escape did not close it'); return text.replace(/\s+/g, ' ');
  }],
  ['larger text scales the page content and is kept after a reload', async t => {
    await t.click('.access-toggle'); await t.click('.access-sizes button', 'أكبر'); let a = await attrs(t); await t.expect(a === 'larger,off,1.25', 'after choosing larger: ' + a);
    await t.reload(); a = await attrs(t); await t.expect(a === 'larger,off,1.25', 'after reload: ' + a); await t.shot(shots + 'larger.jpg'); return a;
  }],
  ...pages.map(p => [`with the largest text, ${p} does not scroll sideways`, async t => { await t.go(p); const o = await t.overflow(); await t.expect(o <= 1, `scrolls sideways by ${o}px`); return 'fits'; }]),
  ['stronger contrast darkens secondary text and is kept after a reload', async t => {
    await t.go('/learners'); const before = await t.js(`return getComputedStyle(document.querySelector('.studio')).getPropertyValue('--muted').trim()`);
    await t.click('.access-toggle'); await t.click('.access-switch'); const after = await t.js(`return getComputedStyle(document.querySelector('.studio')).getPropertyValue('--muted').trim()`);
    await t.expect(before !== after && after === '#3d2f24', `muted ${before} -> ${after}`); await t.reload(); const a = await attrs(t); await t.expect(a.startsWith('larger,high'), 'after reload: ' + a); await t.shot(shots + 'contrast.jpg'); return `${before} -> ${after}`;
  }],
  ['reading aloud speaks the page in short pieces and stops on request', async t => {
    await t.js(`window.__said = []; window.speechSynthesis.cancel = () => { window.__cancelled = (window.__cancelled ?? 0) + 1; }; window.speechSynthesis.speak = u => { window.__said.push(u.text); if (window.__said.length < 4) setTimeout(() => u.onend?.(), 30); };`);
    await t.click('.access-toggle'); await t.click('.access-read'); await t.sleep(400);
    const said = await t.js('return window.__said'); await t.expect(said.length === 4, `${said.length} pieces spoken`); await t.expect(said.every(x => x.length <= 180), 'a piece is too long'); await t.expect(said.join(' ').includes('قائمة الطلاب') || said.join(' ').includes('الطلاب'), 'did not read the page: ' + said.join(' | ').slice(0, 200));
    const label = await t.text('.access-read'); await t.expect(label.includes('أوقف القراءة'), 'button did not switch to stop: ' + label);
    await t.click('.access-read'); await t.sleep(200); await t.expect((await t.text('.access-read')).includes('اقرأ الصفحة'), 'reading did not stop'); return said[0].slice(0, 60);
  }],
  ['back to normal text and contrast clears both and the indicator', async t => {
    await t.click('.access-sizes button', 'عادي'); await t.click('.access-switch'); const a = await attrs(t); await t.expect(a === 'normal,off,1', 'after reset: ' + a);
    await t.expect((await t.count('.access-toggle.is-on')) === 0, 'indicator still on'); await t.reload(); await t.expect((await attrs(t)) === 'normal,off,1', 'reset lost on reload'); return a;
  }],
];

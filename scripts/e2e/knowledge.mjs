// The strategy encyclopedia and the prompt lab, tried end to end in a fresh profile.
const shots = 'artifacts/sweep-knowledge/';
const fem = /طالبة|طالبات|معلمة|معلمات|اختاري|أضيفي|سجّلي|اضغطي|ابدئي/;
const clean = async (t, where = 'main') => { const text = await t.text(where); await t.expect(!fem.test(text), 'feminine wording'); await t.expect(!text.includes('@@') && !text.includes('undefined') && !text.includes('[object') && !text.includes('NaN'), 'stray text on the page'); await t.expect((await t.overflow()) <= 1, 'sideways scroll'); return text; };

export const steps = [
  ['the encyclopedia lists sixteen strategies with the first one open', async t => {
    await t.go('/strategies'); await clean(t); const n = await t.count('.strategy-card'); await t.expect(n === 16, `${n} strategies`);
    const open = await t.count('.strategy-card.is-open'); await t.expect(open === 1, `${open} open cards`);
    const body = await t.text('.strategy-card.is-open .strategy-body'); for (const part of ['متى تناسب؟', 'الخطوات', 'كيف تُكيَّف؟', 'أخطاء شائعة', 'كيف نعرف أنها نجحت؟']) await t.expect(body.includes(part), 'missing part: ' + part);
    await t.shot(shots + 'strategies.jpg'); return (await t.text('.strategy-card.is-open .strategy-title strong'));
  }],
  ['every strategy opens and shows steps, and only one is open at a time', async t => {
    const n = await t.count('.strategy-card'); let checked = 0;
    for (let i = 0; i < n; i++) { await t.js(`document.querySelectorAll('.strategy-head')[${i}].click()`); await t.sleep(80); const info = await t.js(`const c = document.querySelectorAll('.strategy-card')[${i}]; return c.classList.contains('is-open') + '|' + c.querySelectorAll('.strategy-body ol li').length + '|' + document.querySelectorAll('.strategy-card.is-open').length;`); const [on, steps, open] = info.split('|'); if (i === 0) continue; await t.expect(on === 'true' && Number(steps) >= 3 && open === '1', `card ${i + 1}: ${info}`); checked++; }
    return `${checked} cards opened in turn`;
  }],
  ['search narrows the list, and a word with no match shows an empty state', async t => {
    await t.fill('.knowledge-search input', 'التلقين'); await t.sleep(250); const some = await t.count('.strategy-card'); await t.expect(some >= 1 && some < 16, `${some} results for a real word`);
    await t.fill('.knowledge-search input', 'ققققق'); await t.sleep(250); await t.expect((await t.text()).includes('لا استراتيجية بهذه الكلمة'), 'no empty state for no match');
    await t.fill('.knowledge-search input', ''); await t.sleep(250); await t.expect((await t.count('.strategy-card')) === 16, 'clearing the search did not restore the list'); return `${some} results, then none, then all`;
  }],
  ['the prompt lab fills a request from a lesson and leaves no gaps', async t => {
    await t.go('/prompts'); await clean(t); const n = await t.count('.prompt-list button'); await t.expect(n >= 6, `${n} prompts`);
    const text = await t.js(`return document.querySelector('.prompt-text textarea').value`); const title = await t.js(`const s = document.querySelector('.prompt-work select'); return s.options[s.selectedIndex].textContent`);
    await t.expect(text.includes(title) && !/\{[^}]+\}/.test(text) && !/\[[^\]]+\]/.test(text), 'filled text: ' + text.slice(0, 200)); await t.expect((await t.count('.prompt-work .check-notes')) === 0, 'gap note shown although nothing is missing'); await t.shot(shots + 'prompts.jpg'); return text.slice(0, 90);
  }],
  ['without a lesson the gaps stay visible and are counted; a typed blank fills in', async t => {
    await t.js(`__t.set(document.querySelector('.prompt-work select'), '')`); await t.sleep(200); const text = await t.js(`return document.querySelector('.prompt-text textarea').value`);
    await t.expect(text.includes('[الدرس]') && text.includes('[الهدف]'), 'gaps not shown: ' + text.slice(0, 160)); await t.expect((await t.text('.prompt-work .check-notes')).includes('خانات فارغة'), 'gap note missing');
    await t.click('.prompt-list button', 'قصة اجتماعية قصيرة'); await t.fill('.prompt-work .form-grid input', 'زيارة مكتبة المدرسة لأول مرة'); const story = await t.js(`return document.querySelector('.prompt-text textarea').value`);
    await t.expect(story.includes('زيارة مكتبة المدرسة لأول مرة') && !story.includes('[الموقف]'), 'typed blank not used: ' + story.slice(0, 200)); return 'gaps shown, blank filled';
  }],
  ['copying puts the exact text on the clipboard, and no tool or company is named anywhere', async t => {
    await t.js(`window.__clip = ''; Object.defineProperty(navigator, 'clipboard', { value: { writeText: async s => { window.__clip = s; } }, configurable: true });`);
    await t.click('.prompt-work button', 'انسخ النص'); await t.sleep(300); const same = await t.js(`return window.__clip === document.querySelector('.prompt-text textarea').value && window.__clip.length > 50`); await t.expect(same, 'clipboard differs from the shown text');
    const all = await t.js(`const out = []; for (const b of document.querySelectorAll('.prompt-list button')) { b.click(); await new Promise(r => setTimeout(r, 60)); out.push(document.querySelector('.prompt-text textarea').value); } return out.join(' ') + ' ' + document.querySelector('main').innerText;`);
    await t.expect(!/chatgpt|gpt|claude|gemini|copilot|openai|anthropic|google|microsoft|gamma|canva/i.test(all), 'a vendor name appears in the prompt lab'); return 'copied; no vendor names';
  }],
  ['both pages sit in their own sidebar section', async t => { const nav = await t.js(`return [...document.querySelectorAll('.sidebar nav summary')].map(s => s.textContent.trim()).join(' | ')`); await t.expect(nav.includes('المعرفة المهنية'), 'nav: ' + nav); return nav; }],
];

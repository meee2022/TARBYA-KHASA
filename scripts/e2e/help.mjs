// The how-to guide: every card leads to a page that opens.
const fem = /طالبة|طالبات|معلمة|معلمات|اختاري|أضيفي|سجّلي|اضغطي|ابدئي/;
export const steps = [
  ['the guide shows eight numbered cards with steps', async t => { await t.go('/help'); const text = await t.text(); await t.expect(!fem.test(text) && !text.includes('undefined'), 'wording'); const n = await t.count('.help-card'); await t.expect(n === 8, `${n} cards`); await t.expect((await t.count('.help-card ol li')) >= 24, 'steps missing'); await t.expect((await t.overflow()) <= 1, 'sideways scroll'); await t.shot('artifacts/sweep-knowledge/help.jpg'); return `${n} cards`; }],
  ['every card button opens its page with a heading', async t => {
    const links = await t.js(`return [...document.querySelectorAll('.help-card a.button')].map(a => a.getAttribute('href'))`); await t.expect(links.length === 8, `${links.length} links`);
    for (const to of links) { await t.go(to); await t.expect((await t.count('h1')) > 0, 'no heading on ' + to); await t.expect(!(await t.text()).includes('غير موجود'), 'not found: ' + to); }
    return links.join(' ');
  }],
];

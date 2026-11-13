// The lesson page: its plan with the differentiated section, and the way into the universal-design check.
const fem = /طالبة|طالبات|معلمة|معلمات|اختاري|أضيفي|سجّلي|اضغطي|ابدئي/;
export const steps = [
  ['the sample lesson shows one differentiated row per pupil, with how each understands and answers', async t => {
    await t.go('/lessons/animals'); await t.until(`document.querySelector('.differentiated')`, 'the differentiated section');
    const rows = await t.count('.differentiated-list li'); await t.expect(rows >= 2, `${rows} pupil rows`); const text = await t.text('.differentiated');
    await t.expect(text.includes('يفهم عبر') && text.includes('يجيب عبر') && !fem.test(text) && !text.includes('undefined'), text.slice(0, 200)); await t.expect((await t.overflow()) <= 1, 'sideways scroll'); await t.shot('artifacts/sweep-udl/differentiated.jpg'); return `${rows} pupils`;
  }],
  ['its link opens the universal-design check on the same lesson', async t => {
    const title = await t.js(`return document.querySelector('h1').textContent.trim()`); await t.click('.differentiated a'); await t.until(`document.querySelector('.udl-card')`, 'the check');
    const picked = await t.js(`const s = document.querySelector('.udl-pick select'); return s.options[s.selectedIndex].textContent.trim()`); await t.expect(picked === title, `check opened on «${picked}», lesson was «${title}»`); return picked;
  }],
  ['every door of the lesson page still opens', async t => {
    await t.go('/lessons/animals'); const n = await t.count('.lesson-doors button, .lesson-doors a'); let opened = 0;
    for (let i = 0; i < n; i++) { await t.js(`document.querySelectorAll('.lesson-doors button, .lesson-doors a')[${i}].click()`); await t.sleep(250); await t.expect((await t.text()).length > 100, `door ${i + 1} is empty`); opened++; }
    return `${opened} doors`;
  }],
];

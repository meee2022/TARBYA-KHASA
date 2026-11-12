// Measuring tools and the achievement table, tried end to end in a fresh profile.
const shots = 'artifacts/sweep-tools/';
const fem = /طالبة|طالبات|معلمة|معلمات|اختاري|أضيفي|سجّلي|اضغطي|ابدئي/;
const clean = async (t, where = 'main') => { const text = await t.text(where); await t.expect(!fem.test(text), 'feminine wording'); await t.expect(!text.includes('@@') && !text.includes('undefined') && !text.includes('[object') && !text.includes('NaN'), 'stray text on the page'); return text; };
const tab = (t, name) => t.click('.desk-tabs button', name);

export const steps = [
  ['the assessment page has three tabs and the log still works as before', async t => {
    await t.go('/performance'); await t.expect((await t.count('.desk-tabs button')) === 3, 'tabs missing'); await clean(t);
    await t.click('button', 'تسجيل تقييم'); await t.fill('form.desk-form input[maxlength="160"]', 'عدّ خمسة عناصر');
    await t.js(`const s = [...document.querySelectorAll('form.desk-form select')]; __t.set(s.find(x => [...x.options].some(o => o.textContent === 'الرياضيات')), 'الرياضيات'); __t.set(document.querySelector('form.desk-form input[type=number]'), '50');`);
    await t.click('form.desk-form button.primary'); await t.expect((await t.count('.data-table tbody tr')) === 1, 'reading not listed'); return 'a manual reading with a subject and a score';
  }],
  ['tools tab: empty state, then a new tool with five items and a pass mark of four', async t => {
    await tab(t, 'أدوات القياس'); await t.expect((await t.text()).includes('لا أدوات قياس بعد'), 'no empty state');
    await t.click('button', 'أداة قياس جديدة'); await t.fill('form.desk-form input[maxlength="120"]', 'قائمة رصد أصوات الحروف'); await t.fill('form.desk-form input[maxlength="160"]', 'تمييز صوت الحرف في أول الكلمة');
    await t.js(`const s = [...document.querySelectorAll('form.desk-form select')]; __t.set(s.find(x => [...x.options].some(o => o.textContent === 'اللغة العربية')), 'اللغة العربية'); __t.set(document.querySelector('form.desk-form input[type=number]'), '4');`);
    await t.fill('form.desk-form textarea', 'يشير إلى صورة تبدأ بصوت الباء\nينطق صوت الباء منفردًا\nيميّز الباء بين حرفين\nيذكر كلمة تبدأ بالباء\nيكتب حرف الباء');
    await t.click('form.desk-form button.primary'); const card = await t.text('.instrument-card'); await t.expect(card.includes('المعيار: 4 من 5') && card.includes('لم تُستخدم بعد'), 'card: ' + card.replace(/\s+/g, ' ')); await clean(t); return card.replace(/\s+/g, ' ').slice(0, 130);
  }],
  ['using the tool: three right is below the pass mark, four meets it', async t => {
    await t.click('.instrument-card button', 'استخدمها مع طالب');
    for (const n of [0, 1, 2]) { await t.js(`document.querySelectorAll('.instrument-items input')[${n}].click()`); await t.sleep(120); }
    let chip = await t.text('.instrument-use .plan-state'); await t.expect(chip.includes('3 من 5') && chip.includes('60%') && chip.includes('لم يتحقق'), 'chip: ' + chip);
    await t.js(`document.querySelectorAll('.instrument-items input')[3].click()`); await t.sleep(150); chip = await t.text('.instrument-use .plan-state'); await t.expect(chip.includes('4 من 5') && chip.includes('80%') && chip.includes('تحقق المعيار') && !chip.includes('لم يتحقق'), 'chip: ' + chip);
    await t.shot(shots + 'use.jpg'); await t.click('.instrument-use button.primary'); const card = await t.text('.instrument-card'); await t.expect(card.includes('استُخدمت'), 'use not counted: ' + card.replace(/\s+/g, ' ')); return chip;
  }],
  ['a second pupil scores two of five, and the tool counts two uses', async t => {
    await t.click('.instrument-card button', 'استخدمها مع طالب'); await t.js(`const s = document.querySelector('.instrument-use select'); __t.set(s, s.options[1].value);`); await t.sleep(200);
    for (const n of [0, 4]) { await t.js(`document.querySelectorAll('.instrument-items input')[${n}].click()`); await t.sleep(120); }
    await t.click('.instrument-use button.primary'); const card = await t.text('.instrument-card'); await t.expect(card.includes('مرتين'), 'card: ' + card.replace(/\s+/g, ' ')); return card.match(/استُخدمت[^\n]*/)?.[0];
  }],
  ['the results are in the log with their kind, score and tool name', async t => {
    await tab(t, 'السجل والمستويات'); const rows = await t.count('.data-table tbody tr'); await t.expect(rows === 2, `${rows} skills for the first pupil`);
    const text = await t.text('.data-table'); await t.expect(text.includes('قائمة رصد أصوات الحروف') && text.includes('80%'), 'log: ' + text.replace(/\s+/g, ' ')); return text.replace(/\s+/g, ' ').slice(40, 200);
  }],
  ['achievement tab: averages per subject for each pupil, no ranking', async t => {
    await tab(t, 'التحصيل حسب المادة'); const text = await clean(t); const rows = await t.count('.data-table tbody tr'); await t.expect(rows === 6, `${rows} pupil rows`);
    const head = await t.text('.data-table thead'); await t.expect(head.includes('اللغة العربية') && head.includes('الرياضيات'), 'subjects: ' + head);
    const first = (await t.text('.data-table tbody tr')).replace(/\s+/g, ' '); await t.expect(first.includes('80%') && first.includes('50%'), 'first pupil: ' + first);
    const second = (await t.js(`return document.querySelectorAll('.data-table tbody tr')[1].innerText`)).replace(/\s+/g, ' '); await t.expect(second.includes('40%') && second.includes('لا تقييم بعد'), 'second pupil: ' + second);
    const order = await t.js(`return [...document.querySelectorAll('.data-table tbody th')].map(x => x.innerText.trim()).join('،')`); await t.expect(order.startsWith('سارة،عمر'), 'pupils reordered: ' + order);
    await t.shot(shots + 'achievement.jpg'); return first;
  }],
  ['everything survives a reload; editing and deleting the tool keeps the recorded results', async t => {
    await t.reload(); await tab(t, 'أدوات القياس'); await t.expect((await t.count('.instrument-card')) === 1, 'tool lost on reload');
    await t.click('.instrument-card button', 'تعديل'); await t.fill('form.desk-form input[maxlength="120"]', 'قائمة رصد الحروف'); await t.click('form.desk-form button.primary'); await t.expect((await t.text('.instrument-card h2')) === 'قائمة رصد الحروف', 'rename not saved');
    await t.shot(shots + 'tools.jpg'); await t.click('.instrument-card button', 'حذف'); await t.click('.confirm-dialog button', 'حذف الأداة'); await t.expect((await t.count('.instrument-card')) === 0, 'tool not deleted');
    await tab(t, 'التحصيل حسب المادة'); await t.expect((await t.text('.data-table tbody tr')).includes('80%'), 'results vanished with the tool'); await t.expect((await t.overflow()) <= 1, 'sideways scroll'); return 'results kept after deleting the tool';
  }],
];

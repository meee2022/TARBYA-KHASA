// The pupil report and the archive of exported documents, tried end to end in a fresh profile.
const shots = 'artifacts/sweep-reports/';
const fem = /طالبة|طالبات|معلمة|معلمات|اختاري|أضيفي|سجّلي|اضغطي|ابدئي/;
const clean = async (t, where = 'main') => { const text = await t.text(where); await t.expect(!fem.test(text), 'feminine wording'); await t.expect(!text.includes('@@') && !text.includes('undefined') && !text.includes('[object') && !text.includes('NaN'), 'stray text on the page'); await t.expect((await t.overflow()) <= 1, 'sideways scroll'); return text; };
const tab = (t, name) => t.click('.desk-tabs button', name);
const downloads = t => t.js(`window.__dl = []; const orig = URL.createObjectURL; URL.createObjectURL = b => { window.__dl.push(b.size); return orig.call(URL, b); };`);

export const steps = [
  ['the report opens for the first pupil with every section, even with nothing recorded', async t => {
    await t.go('/reporting'); const text = await clean(t);
    for (const part of ['الحضور هذا الشهر', 'الأهداف الفردية', 'مستويات الأداء', 'التحصيل حسب المادة', 'خطط تعديل السلوك', 'الإحالات', 'أدلة من ملف الإنجاز']) await t.expect(text.includes(part), 'missing section: ' + part);
    await t.expect(text.includes('سارة') && text.includes('لم يُسجَّل حضور هذا الشهر'), 'pupil or empty attendance missing'); return 'seven sections';
  }],
  ['records made elsewhere show up in the report', async t => {
    await t.go('/attendance'); await t.click('button', 'الكل حاضرون');
    await t.go('/performance'); await t.click('button', 'تسجيل تقييم'); await t.fill('form.desk-form input[maxlength="160"]', 'عدّ خمسة عناصر');
    await t.js(`const s = [...document.querySelectorAll('form.desk-form select')]; __t.set(s.find(x => [...x.options].some(o => o.textContent === 'الرياضيات')), 'الرياضيات'); __t.set(document.querySelector('form.desk-form input[type=number]'), '70');`); await t.click('form.desk-form button.primary');
    await t.go('/team'); await tab(t, 'الإحالات'); await t.click('button', 'إحالة جديدة'); await t.fill('form.desk-form input[list="referral-to"]', 'أخصائي النطق'); await t.fill('form.desk-form textarea', 'لا ينطق صوت الراء.', 0); await t.click('form.desk-form button.primary');
    await t.go('/reporting'); const text = (await clean(t)).replace(/\s+/g, ' ');
    await t.expect(text.includes('النسبة 100%') && text.includes('عدّ خمسة عناصر') && text.includes('الرياضيات 70%') && text.includes('أخصائي النطق'), 'report: ' + text.slice(0, 700)); await t.shot(shots + 'report.jpg'); return 'attendance, level, achievement and referral present';
  }],
  ['choosing another pupil changes the report', async t => {
    await t.js(`const s = document.querySelector('.record-bar select'); __t.set(s, s.options[1].value);`); await t.sleep(300); const text = (await clean(t)).replace(/\s+/g, ' ');
    await t.expect(text.includes('عمر') && !text.includes('عدّ خمسة عناصر') && text.includes('لا إحالات'), 'second pupil shows the first pupil data: ' + text.slice(0, 300)); return 'second pupil has only their own data';
  }],
  ['exporting the report builds a Word file and files a copy in the archive', async t => {
    await downloads(t); await t.click('.record-bar button', 'تصدير Word'); await t.sleep(3000); const sizes = await t.js('return window.__dl'); await t.expect(sizes.length === 1 && sizes[0] > 3000, 'no Word file: ' + JSON.stringify(sizes));
    await tab(t, 'أرشيف المستندات'); const row = (await t.text('.data-table tbody tr')).replace(/\s+/g, ' '); await t.expect(row.includes('تقرير عمر') && row.includes('تقرير طالب'), 'archive row: ' + row); await clean(t); return row;
  }],
  ['exports from the plan and the preparation are archived too, newest first', async t => {
    await t.go('/iep/demo-1'); await downloads(t); await t.click('.page-heading button, .page-banner button', 'تصدير Word'); await t.sleep(3000);
    await t.go('/plans'); await t.click('a.lesson-row, .plan-summary a'); await downloads(t); await t.click('.page-heading button, .page-banner button', 'تصدير Word'); await t.sleep(3000);
    await t.go('/reporting'); await tab(t, 'أرشيف المستندات'); const n = await t.count('.data-table tbody tr'); await t.expect(n === 3, `${n} archived documents`);
    const first = await t.text('.data-table tbody tr'); await t.expect(first.includes('تحضير'), 'newest is not first: ' + first.replace(/\s+/g, ' ')); await t.shot(shots + 'archive.jpg'); return `${n} documents`;
  }],
  ['an archived document downloads again after a reload, and deleting removes it', async t => {
    await t.reload(); await tab(t, 'أرشيف المستندات'); await t.expect((await t.count('.data-table tbody tr')) === 3, 'archive lost on reload');
    await downloads(t); await t.click('.data-table tbody tr .icon-button'); await t.sleep(1200); const sizes = await t.js('return window.__dl'); await t.expect(sizes.length === 1 && sizes[0] > 3000, 'archived file did not download: ' + JSON.stringify(sizes));
    await t.js(`document.querySelectorAll('.data-table tbody tr')[0].querySelectorAll('.icon-button')[1].click()`); await t.sleep(300); await t.click('.confirm-dialog button', 'حذف'); await t.sleep(500);
    await t.expect((await t.count('.data-table tbody tr')) === 2, 'document not removed'); return `re-downloaded ${sizes[0]} bytes, then deleted`;
  }],
];

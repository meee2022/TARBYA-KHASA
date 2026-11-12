// The term distribution, tried end to end in a fresh profile.
const shots = 'artifacts/sweep-dist/';
const fem = /طالبة|طالبات|معلمة|معلمات|اختاري|أضيفي|سجّلي|اضغطي|ابدئي/;
const clean = async (t, where = 'main') => { const text = await t.text(where); await t.expect(!fem.test(text), 'feminine wording'); await t.expect(!text.includes('@@') && !text.includes('undefined') && !text.includes('[object') && !text.includes('NaN'), 'stray text on the page'); return text; };

export const steps = [
  ['the page opens empty with an invitation', async t => { await t.go('/distribution'); const text = await clean(t); await t.expect(text.includes('لا توزيع فصلي بعد'), 'no empty state'); await t.expect((await t.overflow()) <= 1, 'sideways scroll'); return 'empty state shown'; }],
  ['a new distribution for first-grade Arabic starts on the Sunday of the chosen week', async t => {
    await t.click('button', 'توزيع جديد');
    await t.js(`const s = [...document.querySelectorAll('form.desk-form select')]; __t.set(s[0], 'الأول'); __t.set(s[1], 'اللغة العربية'); __t.set(document.querySelector('form.desk-form input[type=date]'), '2026-09-01');`);
    await t.click('form.desk-form button.primary'); const start = await t.js(`return document.querySelector('.dist-settings input[type=date]').value`);
    await t.expect(start === '2026-08-30', 'term starts ' + start); await t.expect((await t.count('.dist-term tbody tr')) === 18, 'expected 18 weeks'); return 'starts ' + start + ', 18 weeks';
  }],
  ['units of the curriculum spread over the weeks, with their lessons and objectives', async t => {
    await t.click('.desk-panel button', 'وزّع وحدات المنهج'); const rows = await t.count('.dist-rows tbody tr'); await t.expect(rows > 0, 'no unit rows');
    const lessons = await t.count('.dist-lessons li'); await t.expect(lessons > 0, 'no lessons in the term table'); await clean(t); await t.shot(shots + 'spread.jpg'); return `${rows} units, ${lessons} lesson lines`;
  }],
  ['a hand-written unit can be added, edited and removed, and gaps are reported', async t => {
    await t.js(`const w = document.querySelector('.dist-settings input[type=number]'); __t.set(w, '10');`); await t.sleep(300);
    await t.expect((await t.count('.dist-term tbody tr')) === 10, 'weeks did not follow the setting');
    const note = await t.text('.desk-panel .check-notes').catch(() => ''); await t.expect(note.includes('تمتد بعد آخر أسبوع') || note.length === 0 || note.includes('بلا وحدة'), 'unexpected note: ' + note);
    await t.click('.desk-panel button', 'أضف وحدة'); const n = await t.count('.dist-rows tbody tr');
    await t.fill('.dist-rows tbody tr:last-child input[maxlength="160"]', 'مراجعة عامة'); await t.fill('.dist-rows tbody tr:last-child input[type=number]', '9', 0); await t.fill('.dist-rows tbody tr:last-child input[type=number]', '10', 1);
    const term = await t.text('.dist-term'); await t.expect(term.includes('مراجعة عامة'), 'new unit missing from the term table');
    await t.click('.dist-rows tbody tr:last-child .icon-button'); await t.expect((await t.count('.dist-rows tbody tr')) === n - 1, 'row not removed'); return note.replace(/\n/g, ' ').slice(0, 120) || 'no notes';
  }],
  ['a week leads to its weekly preparation, and the table then links back to it', async t => {
    await t.click('.dist-term button', 'حضّر هذا الأسبوع'); await t.sleep(900); const path = await t.js('return location.pathname'); await t.expect(/^\/plans\/.+/.test(path), 'went to ' + path);
    const title = await t.js(`return document.querySelector('.editor-panel input[maxlength="160"]').value`); await t.expect(title.length > 0, 'the preparation has no topic');
    const subject = await t.js(`return document.querySelector('.editor-panel select').value`); await t.expect(subject === 'اللغة العربية', 'subject is ' + subject);
    await t.go('/distribution'); const link = await t.count('.dist-term a[href^="/plans/"]'); await t.expect(link === 1, `${link} links to preparations`); return `${path} · «${title}»`;
  }],
  ['the distribution survives a reload, exports to Word, and a second one can be chosen', async t => {
    await t.reload(); await t.expect((await t.count('.dist-term tbody tr')) === 10, 'weeks lost on reload');
    await t.js(`window.__dl = []; const orig = URL.createObjectURL; URL.createObjectURL = b => { window.__dl.push(b.size); return orig.call(URL, b); };`);
    await t.click('button', 'تصدير Word'); await t.sleep(2500); const sizes = await t.js('return window.__dl'); await t.expect(sizes.length === 1 && sizes[0] > 3000, 'no Word file: ' + JSON.stringify(sizes));
    await t.click('button', 'توزيع جديد'); await t.js(`const s = [...document.querySelectorAll('form.desk-form select')]; __t.set(s[1], 'الرياضيات');`); await t.click('form.desk-form button.primary');
    const options = await t.count('.dist-settings select option'); await t.expect(options === 2, `${options} distributions to choose from`); await t.shot(shots + 'second.jpg'); return `${sizes[0]} bytes · ${options} distributions`;
  }],
  ['deleting a distribution leaves the weekly preparation in place', async t => {
    await t.click('.desk-panel button', 'حذف التوزيع'); await t.click('.confirm-dialog button', 'حذف التوزيع'); await t.sleep(300);
    await t.go('/plans'); const text = await t.text(); await t.expect((await t.count('.plan-summary')) >= 2, 'the preparation made from the term table is gone'); return 'preparations kept';
  }],
];

// Portfolios and the team pages, tried end to end in a fresh profile.
const shots = 'artifacts/sweep-records/';
const fem = /طالبة|طالبات|معلمة|معلمات|اختاري|أضيفي|سجّلي|اضغطي|ابدئي/;
const clean = async (t, where = 'main') => { const text = await t.text(where); await t.expect(!fem.test(text), 'feminine wording'); await t.expect(!text.includes('@@') && !text.includes('undefined') && !text.includes('[object') && !text.includes('NaN'), 'stray text on the page'); await t.expect((await t.overflow()) <= 1, 'sideways scroll'); return text; };
const tab = (t, name) => t.click('.desk-tabs button', name);
const past = n => new Date(Date.now() - n * 86400000).toLocaleDateString('en-CA');

export const steps = [
  ['portfolio: empty state, then a piece of evidence tied to a goal', async t => {
    await t.go('/portfolio'); await t.expect((await clean(t)).includes('لا أدلة بعد'), 'no empty state');
    await t.click('button', 'دليل جديد'); await t.fill('form.desk-form input[maxlength="160"]', 'ورقة عمل مطابقة الحيوانات');
    await t.js(`const s = [...document.querySelectorAll('form.desk-form select')][1]; __t.set(s, s.options[1].value);`); await t.fill('form.desk-form textarea', 'طابق أربع صور من خمس بتلميح واحد.'); await t.fill('form.desk-form input[type=url]', 'https://example.org/work.jpg');
    await t.click('form.desk-form button.primary'); const card = (await t.text('.record-card')).replace(/\s+/g, ' ');
    await t.expect(card.includes('ورقة عمل مطابقة الحيوانات') && card.includes('الهدف:') && card.includes('ينتظر المراجعة') && card.includes('فتح الرابط'), 'card: ' + card); return card.slice(0, 130);
  }],
  ['portfolio: review, filter by pupil, edit, reload, delete', async t => {
    await t.click('.record-card button', 'راجعته'); await t.expect((await t.text('.record-card .plan-state')) === 'مراجَع', 'not marked reviewed');
    await t.js(`const s = document.querySelector('.record-bar select'); __t.set(s, s.options[2].value);`); await t.sleep(250); await t.expect((await t.count('.record-card')) === 0, 'the filter shows evidence of another pupil');
    await t.js(`const s = document.querySelector('.record-bar select'); __t.set(s, s.options[1].value);`); await t.sleep(250); await t.expect((await t.count('.record-card')) === 1, 'the filter hides the evidence of the chosen pupil');
    await t.click('.record-card button', 'تعديل'); await t.fill('form.desk-form input[maxlength="160"]', 'ورقة عمل المطابقة'); await t.click('form.desk-form button.primary'); await t.reload();
    await t.expect((await t.text('.record-card h2')) === 'ورقة عمل المطابقة', 'edit lost on reload'); await t.shot(shots + 'evidence.jpg');
    await t.click('.record-card button', 'حذف'); await t.click('.confirm-dialog button', 'حذف الدليل'); await t.expect((await t.count('.record-card')) === 0, 'evidence not deleted'); return 'reviewed, filtered, edited, kept, deleted';
  }],
  ['teacher portfolio: a course with hours, an award, totals for the year', async t => {
    await tab(t, 'إنجاز المعلم'); await t.expect((await clean(t)).includes('ملف إنجازك فارغ'), 'no empty state');
    await t.click('button', 'إضافة إنجاز'); await t.fill('form.desk-form input[maxlength="160"]', 'دورة التواصل البديل'); await t.fill('form.desk-form input[type=number]', '12'); await t.click('form.desk-form button.primary');
    await t.click('button', 'إضافة إنجاز'); await t.js(`__t.set(document.querySelector('form.desk-form select'), 'awards');`); await t.sleep(200); await t.expect((await t.count('form.desk-form input[type=number]')) === 0, 'hours offered for an award');
    await t.fill('form.desk-form input[maxlength="160"]', 'شهادة شكر من إدارة المدرسة'); await t.click('form.desk-form button.primary');
    const text = await clean(t); await t.expect(text.includes('12 ساعة تدريبية') && text.includes('دورات وتدريب') && text.includes('تكريم وشهادات'), 'summary: ' + text.replace(/\s+/g, ' ').slice(0, 200));
    await t.reload(); await tab(t, 'إنجاز المعلم'); await t.expect((await t.count('.record-section')) === 2, 'sections lost on reload'); await t.shot(shots + 'teacher.jpg'); return '12 hours, two sections';
  }],
  ['team: a member, then a referral to that member with an overdue follow-up', async t => {
    await t.go('/team'); await t.expect((await clean(t)).includes('لا أعضاء في الفريق بعد'), 'no empty state');
    await t.click('button', 'عضو جديد'); await t.fill('form.desk-form input[maxlength="120"]', 'أ. منى', 0); await t.fill('form.desk-form input[maxlength="120"]', 'أخصائي النطق', 1); await t.click('form.desk-form button.primary');
    await t.expect((await t.text('.group-card')).includes('أ. منى'), 'member missing');
    await tab(t, 'الإحالات'); await t.click('button', 'إحالة جديدة'); const to = await t.js(`return document.querySelector('form.desk-form input[list="referral-to"]').value`); await t.expect(to.includes('أ. منى'), 'referral not pre-filled with the member: ' + to);
    await t.js(`const d = document.querySelectorAll('form.desk-form input[type=date]'); __t.set(d[0], '${past(10)}'); __t.set(d[1], '${past(2)}');`); await t.fill('form.desk-form textarea', 'لا ينطق صوت الراء في أول الكلمة.', 0); await t.click('form.desk-form button.primary');
    const row = (await t.text('.data-table tbody tr')).replace(/\s+/g, ' '); await t.expect(row.includes('مفتوحة') && row.includes('حان موعدها') && row.includes('أ. منى'), 'row: ' + row); await clean(t); await t.shot(shots + 'referrals.jpg'); return row.slice(0, 140);
  }],
  ['team: the overdue referral shows in the notices, and closing it clears the reminder', async t => {
    await t.go('/notifications'); const text = await t.text(); await t.expect(text.includes('حان موعد متابعة الإحالة'), 'no notice for the referral');
    await t.go('/team'); await tab(t, 'الإحالات'); await t.click('.data-table .icon-button'); await t.js(`const s = [...document.querySelectorAll('form.desk-form select')].find(x => [...x.options].some(o => o.value === 'closed')); __t.set(s, 'closed');`); await t.fill('form.desk-form textarea', 'بدأت جلسات النطق مرتين أسبوعيًا.', 1); await t.click('form.desk-form button.primary');
    const row = (await t.text('.data-table tbody tr')).replace(/\s+/g, ' '); await t.expect(row.includes('مغلقة') && !row.includes('حان موعدها'), 'row: ' + row);
    await t.go('/notifications'); await t.expect(!(await t.text()).includes('حان موعد متابعة الإحالة'), 'notice still shown after closing'); return 'notice shown, then cleared';
  }],
  ['team: a meeting record and a guardian consent with its answer', async t => {
    await t.go('/team'); await tab(t, 'الاجتماعات والموافقات'); await t.expect((await clean(t)).includes('لا اجتماعات ولا موافقات بعد'), 'no empty state');
    await t.click('button', 'اجتماع أو موافقة'); await t.fill('form.desk-form input[maxlength="200"]', 'مراجعة الخطة الفردية'); await t.fill('form.desk-form input[maxlength="400"]', 'المعلم، ولي الأمر، المنسق'); await t.fill('form.desk-form textarea', 'الاتفاق على هدفين جديدين في القراءة.'); await t.click('form.desk-form button.primary');
    await t.click('button', 'اجتماع أو موافقة'); await t.js(`__t.set(document.querySelector('form.desk-form select'), 'consent');`); await t.sleep(200);
    await t.fill('form.desk-form input[maxlength="200"]', 'تصوير أعمال الطالب لملف الإنجاز'); await t.js(`const s = [...document.querySelectorAll('form.desk-form select')].find(x => [...x.options].some(o => o.value === 'yes')); __t.set(s, 'yes');`); await t.click('form.desk-form button.primary');
    await t.expect((await t.count('.record-card')) === 2, 'expected two records'); const chips = await t.js(`return [...document.querySelectorAll('.record-card .plan-state')].map(x => x.textContent).join('،')`); await t.expect(chips === 'موافقة', 'chips: ' + chips);
    await t.reload(); await tab(t, 'الاجتماعات والموافقات'); await t.expect((await t.count('.record-card')) === 2, 'records lost on reload'); await clean(t); await t.shot(shots + 'meetings.jpg'); return chips;
  }],
  ['the sidebar lists both pages under plans, and the backup keeps the new records', async t => {
    const nav = await t.js(`return [...document.querySelectorAll('.sidebar nav a')].map(a => a.textContent.trim()).join(' | ')`); await t.expect(nav.includes('ملفات الإنجاز') && nav.includes('الفريق والإحالات'), 'nav: ' + nav);
    const w = await t.js(`return JSON.parse(localStorage.getItem('tarbya.workspace.v1')).desk`); await t.expect(w.team.length === 1 && w.referrals.length === 1 && w.meetings.length === 2 && w.portfolio.length === 2 && w.evidence.length === 0, 'desk: ' + JSON.stringify(Object.fromEntries(Object.entries(w).map(([k, v]) => [k, v.length])))); return 'team 1, referrals 1, meetings 2, portfolio 2';
  }],
];

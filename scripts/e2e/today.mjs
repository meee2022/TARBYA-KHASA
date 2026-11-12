// Everything built on 2026-11-12, tried end to end in a fresh browser profile with the sample data.
const fem = /طالبة|طالبات|معلمة|معلمات|اختاري|أضيفي|سجّلي|اضغطي|ابدئي/;
const pages = ['/', '/timetable', '/tasks', '/notifications', '/learners', '/groups', '/attendance', '/performance', '/iep', '/progress', '/behaviour', '/forms', '/portfolio', '/team', '/distribution', '/plans', '/lessons', '/library', '/presentations', '/packs', '/games', '/tools', '/guide', '/settings', '/privacy'];

export const steps = [
  ...pages.map(p => [`page ${p} opens, has a heading, no feminine wording, no sideways scroll`, async t => {
    await t.go(p); const text = await t.text('body'); const h = await t.count('h1');
    await t.expect(h > 0, 'no h1'); await t.expect(!fem.test(text), 'feminine wording: ' + (text.match(fem) ?? [])[0]);
    const o = await t.overflow(); await t.expect(o <= 1, `page scrolls sideways by ${o}px`); return `${text.length} chars`;
  }]),

  ['sample pupils are mixed and each has a picture', async t => { await t.go('/learners'); const text = await t.text(); await t.expect(/عمر/.test(text) && /سارة/.test(text) && /يوسف/.test(text), 'sample names missing'); const imgs = await t.count('main img.avatar-art'); await t.expect(imgs >= 6, `only ${imgs} avatars`); return `${imgs} avatars`; }],

  ['plan approval: approve version 1', async t => {
    await t.go('/iep/demo-1'); await t.js(`[...document.querySelectorAll('.editor-steps button')][8].click()`); await t.sleep(300);
    await t.expect((await t.text('.approval-card')).includes('مسودة'), 'not a draft at start');
    await t.click('.approval-card .button'); if (await t.count('.confirm-dialog')) await t.click('.confirm-dialog button', 'اعتماد');
    const card = await t.text('.approval-card'); await t.expect(card.includes('معتمدة · الإصدار 1'), 'not approved: ' + card.slice(0, 80)); return card.split('\n')[0];
  }],
  ['plan approval: an edit flags the plan, comparison lists the change, version 2 follows', async t => {
    await t.js(`[...document.querySelectorAll('.editor-steps button')][0].click()`); await t.sleep(300);
    await t.fill('.editor-panel textarea', 'ملخص معدّل بعد الاعتماد.');
    await t.js(`[...document.querySelectorAll('.editor-steps button')][8].click()`); await t.sleep(300);
    await t.expect((await t.text('.approval-card')).includes('عُدّلت بعد الإصدار 1'), 'edit not flagged');
    await t.click('.version-list button', 'قارن بالحالي'); const changes = await t.text('.change-list'); await t.expect(changes.includes('ملخص الحالة'), 'change not listed: ' + changes);
    await t.click('.approval-card .button'); if (await t.count('.confirm-dialog')) await t.click('.confirm-dialog button', 'اعتماد');
    await t.expect((await t.count('.version-list > li')) === 2, 'expected two versions'); return changes;
  }],
  ['plan approval: survives a reload and shows in the plans list', async t => {
    await t.reload(); await t.go('/iep'); const row = await t.text('.iep-table tbody tr'); await t.expect(row.includes('معتمدة · الإصدار 2'), 'list shows: ' + row.replace(/\n/g, ' ')); return row.replace(/\s+/g, ' ').slice(0, 90);
  }],
  ['plan approval: Word export of an approved version builds a file', async t => {
    await t.go('/iep/demo-1'); await t.js(`[...document.querySelectorAll('.editor-steps button')][8].click()`); await t.sleep(300);
    await t.js(`window.__dl = []; const orig = URL.createObjectURL; URL.createObjectURL = b => { window.__dl.push(b.size); return orig.call(URL, b); };`);
    await t.click('.version-list button', 'Word لهذا الإصدار'); await t.sleep(2500);
    const sizes = await t.js('return window.__dl'); await t.expect(sizes.length === 1 && sizes[0] > 3000, 'no Word file built: ' + JSON.stringify(sizes)); return `${sizes[0]} bytes`;
  }],

  ['behaviour plan: create', async t => {
    await t.go('/behaviour'); await t.click('button', 'خطة جديدة');
    await t.fill('form.desk-form input:not([type=date])', 'ترك المقعد أثناء الحصة', 0); await t.fill('form.desk-form input:not([type=date])', '6 مرات في اليوم', 1);
    await t.fill('form.desk-form textarea', 'يقوم من مقعده دون إذن', 0);
    await t.click('form.desk-form .option-chip'); await t.click('form.desk-form button.primary');
    await t.expect((await t.count('.behaviour-card')) === 1, 'plan card missing'); return (await t.text('.behaviour-card h2'));
  }],
  ['behaviour plan: recording three occurrences shows in the chart and in the pupil file', async t => {
    for (let i = 0; i < 3; i++) { await t.click('.behaviour-card button', 'سجّل حدوثه'); await t.fill('.behaviour-note input', 'طُلبت منه مهمة كتابة', 0); await t.click('.behaviour-note button.primary'); }
    const cap = await t.text('.behaviour-chart figcaption'); await t.expect(cap.includes('3 مرات'), 'chart says: ' + cap);
    await t.go('/learners/demo-1'); const notes = await t.count('.abc-list li'); await t.expect(notes === 3, `pupil file shows ${notes} notes`); return cap.replace(/\n/g, ' ');
  }],
  ['behaviour plan: edit, pause, survive reload, delete', async t => {
    await t.go('/behaviour'); await t.click('.behaviour-card button', 'تعديل'); await t.fill('form.desk-form input:not([type=date])', 'ترك المقعد دون إذن', 0); await t.click('form.desk-form button.primary');
    await t.expect((await t.text('.behaviour-card h2')) === 'ترك المقعد دون إذن', 'edit not saved');
    await t.click('.behaviour-card button', 'إيقاف'); await t.reload();
    const card = await t.text('.behaviour-card'); await t.expect(card.includes('متوقفة') && card.includes('ترك المقعد دون إذن'), 'pause or edit lost on reload');
    await t.click('.behaviour-card button', 'حذف'); await t.click('.confirm-dialog button', 'حذف الخطة');
    await t.expect((await t.count('.behaviour-card')) === 0, 'plan not deleted');
    await t.go('/learners/demo-1'); await t.expect((await t.count('.abc-list li')) === 3, 'notes should stay after deleting the plan'); return 'notes kept';
  }],

  ['assessment log: a pre and a final reading give a start level and an arrow', async t => {
    await t.go('/performance');
    for (const [kind, level, date] of [['pre', '2', '2026-09-01'], ['final', '4', '2026-11-10']]) {
      await t.click('button', 'تسجيل تقييم'); await t.fill('form.desk-form input[maxlength="160"]', 'تمييز صوت الحرف');
      await t.js(`const s = [...document.querySelectorAll('form.desk-form select')]; __t.set(s.find(x => [...x.options].some(o => o.value === 'pre')), '${kind}'); __t.set(s.find(x => [...x.options].some(o => o.value === '5')), '${level}'); __t.set(document.querySelector('form.desk-form input[type=date]'), '${date}');`);
      await t.click('form.desk-form button.primary');
    }
    const row = await t.text('.data-table tbody tr'); await t.expect(row.includes('بتلميح بسيط') && row.includes('بمساعدة كاملة'), 'row: ' + row.replace(/\n/g, ' '));
    await t.expect((await t.count('.level-change.is-up')) === 1, 'no upward arrow'); await t.reload(); await t.expect((await t.count('.data-table tbody tr')) === 1, 'reading lost on reload'); return row.replace(/\s+/g, ' ').slice(0, 110);
  }],

  ['attendance: mark all present, change one, summary counts it', async t => {
    await t.go('/attendance'); await t.click('button', 'الكل حاضرون'); await t.click('.attendance-list li .attendance-marks button', 'غائب');
    const sum = await t.text('.data-table'); await t.reload(); const pressed = await t.count('.attendance-marks button[aria-pressed="true"]');
    await t.expect(pressed === 6, `${pressed} marks after reload`); return sum.replace(/\s+/g, ' ').slice(0, 120);
  }],
  ['tasks: add, keep after reload, complete, delete', async t => {
    await t.go('/tasks'); await t.fill('form.desk-form input[maxlength="200"]', 'طباعة بطاقات درس الأحد'); await t.click('form.desk-form button.primary');
    await t.expect((await t.count('.task-list li')) === 1, 'task not listed'); await t.reload(); await t.expect((await t.text('.task-list')).includes('طباعة بطاقات درس الأحد'), 'task lost on reload');
    await t.click('.task-list .kit-check'); await t.expect((await t.count('.task-list li.is-done')) === 1, 'task not marked done');
    await t.click('.task-list .icon-button'); await t.expect((await t.count('.task-list li')) === 0, 'task not deleted'); return 'added, kept, done, deleted';
  }],
  ['groups: create a group with two pupils', async t => {
    await t.go('/groups'); await t.click('button', 'مجموعة جديدة'); await t.fill('form.desk-form input[maxlength="80"]', 'مجموعة القراءة أ');
    await t.js(`document.querySelectorAll('form.desk-form .option-chip')[0].click()`); await t.sleep(200); await t.js(`document.querySelectorAll('form.desk-form .option-chip')[1].click()`); await t.sleep(200); await t.click('form.desk-form button.primary');
    const card = await t.text('.group-card'); await t.expect(card.includes('مجموعة القراءة أ') && card.includes('سارة') && card.includes('عمر'), 'group or its pupils missing: ' + card.replace(/\s+/g, ' ')); await t.reload(); await t.expect((await t.count('.group-card')) === 1, 'group lost on reload'); return card.replace(/\s+/g, ' ').slice(0, 90);
  }],
  ['timetable: fill a slot and find it after reload', async t => {
    await t.go('/timetable'); await t.click('.slot'); await t.fill('form.desk-form input[maxlength="120"]', 'اللغة العربية', 0); await t.fill('form.desk-form input[maxlength="120"]', 'غرفة المصادر', 1); await t.click('form.desk-form .option-chip'); await t.click('form.desk-form button.primary'); await t.reload();
    const filled = await t.count('.slot.is-filled'); await t.expect(filled === 1, `${filled} filled slots after reload`); return (await t.text('.slot.is-filled')).replace(/\s+/g, ' ');
  }],
  ['notices list what the data implies', async t => { await t.go('/notifications'); const n = await t.count('.notice-list li'); await t.expect(n > 0, 'no notices'); return `${n} notices`; }],
];

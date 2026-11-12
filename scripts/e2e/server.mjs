// Everything that needs the server, tried against a LOCAL anonymous Convex only (never the live deployment):
//   BASE=http://localhost:5199 node scripts/e2e/run.mjs scripts/e2e/server.mjs
// Covers: a teacher account, syncing every new kind of record and reading it back on a clean device, the specialist portal, and the live room on two pupil devices.
const shots = 'artifacts/sweep-server/';
const user = 'e2e' + Date.now().toString(36); const secret = Array.from(crypto.getRandomValues(new Uint8Array(9)), b => b.toString(36)).join('');
const saved = t => t.until(`document.querySelector('.local-indicator')?.textContent.includes('محفوظ في حسابك')`, 'the account to finish saving', 15000);
const deskCounts = t => t.js(`const w = JSON.parse(localStorage.getItem('tarbya.workspace.v1')); const d = w.desk ?? {}; return JSON.stringify({ behaviour: (d.behaviourPlans ?? []).length, dist: (d.distributions ?? []).length, tools: (d.instruments ?? []).length, perf: (d.performance ?? []).length, team: (d.team ?? []).length, referrals: (d.referrals ?? []).length, meetings: (d.meetings ?? []).length, videos: (d.videos ?? []).length, evidence: (d.evidence ?? []).length, portfolio: (d.portfolio ?? []).length, tasks: (d.tasks ?? []).length, versions: (w.ieps?.[0]?.versions ?? []).length, udl: (w.lessons[0].udl ?? []).length });`);
const tab = (t, name) => t.click('.desk-tabs button', name);
let before = ''; let link = ''; let code = ''; let p1, p2;

export const steps = [
  ['this run talks to a local server, not the live one', async t => { const base = process.env.BASE ?? ''; await t.expect(/localhost:5199|127\.0\.0\.1:5199/.test(base), 'run with BASE=http://localhost:5199 so no account is ever created on the live site'); return base; }],
  ['a teacher creates an account and is signed in', async t => {
    await t.go('/settings'); await t.click('.account-mode button', 'حساب جديد');
    await t.fill('form.account-form input[name="name"]', 'معلم التجربة'); await t.fill('form.account-form input[name="username"]', user); await t.fill('form.account-form input[name="password"]', secret); await t.click('form.account-form button.primary');
    await t.until(`document.querySelector('.teacher-account b')?.textContent.includes('معلم التجربة')`, 'the account name in the top bar', 15000); await saved(t); return 'signed in and saved';
  }],
  ['records of every new kind are created and reach the account', async t => {
    await t.go('/behaviour'); await t.click('button', 'خطة جديدة'); await t.fill('form.desk-form input:not([type=date])', 'ترك المقعد', 0); await t.click('form.desk-form button.primary');
    await t.go('/distribution'); await t.click('button', 'توزيع جديد'); await t.click('form.desk-form button.primary'); await t.click('.desk-panel button', 'أضف وحدة'); await t.fill('.dist-rows input[maxlength="160"]', 'وحدة الحروف');
    await t.go('/performance'); await tab(t, 'أدوات القياس'); await t.click('button', 'أداة قياس جديدة'); await t.fill('form.desk-form input[maxlength="120"]', 'قائمة رصد'); await t.fill('form.desk-form textarea', 'بند أول\nبند ثان'); await t.click('form.desk-form button.primary');
    await t.click('.instrument-card button', 'استخدمها مع طالب'); await t.js(`document.querySelector('.instrument-items input').click()`); await t.sleep(150); await t.click('.instrument-use button.primary');
    await t.go('/team'); await t.click('button', 'عضو جديد'); await t.fill('form.desk-form input[maxlength="120"]', 'أ. منى', 0); await t.click('form.desk-form button.primary');
    await tab(t, 'الإحالات'); await t.click('button', 'إحالة جديدة'); await t.fill('form.desk-form textarea', 'نطق الراء', 0); await t.click('form.desk-form button.primary');
    await tab(t, 'الاجتماعات والموافقات'); await t.click('button', 'اجتماع أو موافقة'); await t.fill('form.desk-form input[maxlength="200"]', 'مراجعة الخطة'); await t.click('form.desk-form button.primary');
    await t.go('/videos'); await t.click('button', 'فيديو جديد'); await t.fill('form.desk-form input[maxlength="160"]', 'أنشودة'); await t.fill('form.desk-form input[type=url]', 'https://youtu.be/abc123DEF45'); await t.click('form.desk-form button.primary');
    await t.go('/portfolio'); await t.click('button', 'دليل جديد'); await t.fill('form.desk-form input[maxlength="160"]', 'ورقة عمل'); await t.click('form.desk-form button.primary');
    await tab(t, 'إنجاز المعلم'); await t.click('button', 'إضافة إنجاز'); await t.fill('form.desk-form input[maxlength="160"]', 'دورة'); await t.click('form.desk-form button.primary');
    await t.go('/tasks'); await t.fill('form.desk-form input[maxlength="200"]', 'مهمة للتجربة'); await t.click('form.desk-form button.primary');
    await t.go('/iep/demo-1'); await t.js(`[...document.querySelectorAll('.editor-steps button')][8].click()`); await t.sleep(300); await t.click('.approval-card .button'); if (await t.count('.confirm-dialog')) await t.click('.confirm-dialog button', 'اعتماد');
    await t.go('/udl'); await t.js(`[...document.querySelectorAll('.udl-card li input')].find(i => !i.disabled && !i.checked).click()`); await t.sleep(400);
    await saved(t); before = await deskCounts(t); const c = JSON.parse(before); await t.expect(Object.values(c).every(n => n >= 1), 'a record is missing before the check: ' + before); return before;
  }],
  ['a clean device signed in to the same account gets every record back from the server', async t => {
    await t.js(`localStorage.removeItem('tarbya.workspace.v1'); localStorage.removeItem('tarbya.sync.mark');`); await t.reload();
    await t.until(`(() => { const w = JSON.parse(localStorage.getItem('tarbya.workspace.v1') ?? 'null'); return w && (w.desk?.behaviourPlans ?? []).length > 0; })()`, 'the account copy to load on the clean device', 15000);
    const after = await deskCounts(t); await t.expect(after === before, `server copy differs: ${after} vs ${before}`); return 'identical counts after a round trip through the server';
  }],

  ['specialist link: issued for the first pupil from the team page', async t => {
    await t.go('/team'); await tab(t, 'روابط الأخصائيين'); await t.until(`document.querySelectorAll('.specialist-links li').length > 0`, 'the pupils list'); await t.click('.specialist-links button', 'أنشئ الرابط');
    await t.until(`document.querySelector('.specialist-links input')`, 'the link field'); link = await t.js(`return document.querySelector('.specialist-links input').value`); await t.expect(/\/specialist\/[a-f0-9]{48}$/.test(link), 'link: ' + link); await t.shot(shots + 'links.jpg'); return link.replace(/[a-f0-9]{40}$/, '…');
  }],
  ['specialist page: shows the report, hides the pupil file, and takes a recommendation', async t => {
    p1 = await t.tab(); await p1.go(new URL(link).pathname); await p1.until(`document.querySelector('.report-page')`, 'the report'); const text = await p1.text('body');
    await p1.expect(text.includes('سارة') && text.includes('الأهداف الفردية') && text.includes('معلم التجربة') && text.includes('نطق الراء'), 'report content missing: ' + text.slice(0, 300));
    await p1.expect(!/طالبة|معلمة/.test(text) && !text.includes('undefined'), 'wording on the specialist page'); await p1.expect((await p1.overflow()) <= 1, 'sideways scroll');
    const hidden = await p1.js(`return !document.querySelector('.sidebar') && !document.querySelector('a[href^="/learners"]')`); await p1.expect(hidden, 'the specialist page links into the teacher workspace');
    await p1.click('.specialist-note button.primary'); await p1.expect((await p1.text('.specialist-note .alert')).includes('اكتب اسمك'), 'an empty recommendation was not refused');
    await p1.fill('.specialist-note input', 'أخصائي النطق'); await p1.fill('.specialist-note textarea', 'أقترح جلستين أسبوعيًا مع تدريب على صوت الراء في أول الكلمة.'); await p1.click('.specialist-note button.primary');
    await p1.until(`document.querySelector('.parent-sent')`, 'the sent confirmation'); await p1.shot(shots + 'specialist.jpg'); return 'report read; recommendation sent';
  }],
  ['the recommendation reaches the teacher, who reads and clears it; a stopped link no longer opens', async t => {
    await t.reload(); await tab(t, 'روابط الأخصائيين'); await t.until(`document.querySelector('.specialist-notes .record-card')`, 'the recommendation'); const note = (await t.text('.specialist-notes')).replace(/\s+/g, ' ');
    await t.expect(note.includes('أخصائي النطق') && note.includes('جلستين أسبوعيًا') && note.includes('سارة'), 'note: ' + note); await t.click('.specialist-notes button', 'قرأتها'); await t.until(`!document.querySelector('.specialist-notes .record-card')`, 'the note to clear');
    await t.click('.specialist-links button', 'إيقاف'); await t.click('.confirm-dialog button', 'إيقاف الرابط'); await t.until(`!document.querySelector('.specialist-links input')`, 'the link to stop');
    await p1.reload(); await p1.until(`document.querySelector('.parent-invalid')`, 'the invalid-link page'); return 'read, cleared, revoked';
  }],
  ['a made-up specialist link shows nothing', async t => { await p1.go('/specialist/' + 'a'.repeat(48)); await p1.until(`document.querySelector('.parent-invalid')`, 'the invalid-link page'); return 'invalid'; }],

  ['live room: the teacher opens a room from the sample lesson', async t => {
    await t.go('/live'); await t.until(`document.querySelector('.room-setup, .room-board, .empty-state')`, 'the live room page'); await t.click('.room-setup button', 'افتح الغرفة');
    await t.until(`document.querySelector('.room-code strong')`, 'the room code'); code = await t.js(`return document.querySelector('.room-code strong').textContent.trim()`); await t.expect(/^[A-HJ-NP-Z2-9]{6}$/.test(code), 'code: ' + code);
    const seats = await t.count('.room-seats-board li'); await t.expect(seats >= 2, `${seats} seats`); await t.shot(shots + 'board-lobby.jpg'); return `code issued, ${seats} seats`;
  }],
  ['two pupil devices join with the code and each taps their own picture', async t => {
    await p1.go('/room'); await p1.fill('.room-enter input', 'zzzzzz'); await p1.click('.room-enter button'); await p1.until(`document.querySelector('.parent-invalid, .room-enter .alert')`, 'a wrong code to be refused');
    await p1.go('/room'); await p1.fill('.room-enter input', code.toLowerCase()); await p1.click('.room-enter button'); await p1.until(`document.querySelectorAll('.room-seat-grid button').length >= 2`, 'the seats on device one');
    await p1.expect(!(await p1.text('body')).includes('تجريبي'), 'a seat shows more than the first name'); await p1.js(`document.querySelectorAll('.room-seat-grid button')[0].click()`); await p1.until(`document.querySelector('.room-wait')`, 'the waiting screen on device one');
    p2 = await t.tab(); await p2.go('/room/' + code); await p2.until(`document.querySelectorAll('.room-seat-grid button').length >= 2`, 'the seats on device two'); await p2.js(`document.querySelectorAll('.room-seat-grid button')[1].click()`); await p2.until(`document.querySelector('.room-wait')`, 'the waiting screen on device two');
    await p1.shot(shots + 'pupil-wait.jpg'); return (await p1.text('.room-wait')).replace(/\s+/g, ' ');
  }],
  ['the first question appears on both devices without the right answer; answers arrive on the board at once', async t => {
    await t.click('.room-board button', 'ابدأ السؤال الأول'); await p1.until(`document.querySelector('.room-question')`, 'the question on device one'); await p2.until(`document.querySelector('.room-question')`, 'the question on device two');
    await p1.expect((await p1.count('.room-options .is-right')) === 0, 'the right answer is marked before it is revealed');
    const right = await t.js(`const w = JSON.parse(localStorage.getItem('tarbya.workspace.v1')); return w.lessons.find(l => l.questions.length).questions[0].answer`);
    await p1.js(`document.querySelectorAll('.room-options button')[${right}].click()`); await p2.js(`document.querySelectorAll('.room-options button')[${right === 0 ? 1 : 0}].click()`);
    await t.until(`document.querySelector('.room-tally')?.textContent.includes('أجاب 2 من')`, 'both answers on the teacher board'); await t.expect((await t.count('.room-seats-board li.is-in')) === 2, 'two seats should show an answer arrived');
    await t.expect((await t.count('.room-seats-board li.is-right')) === 0, 'the board shows right or wrong before the reveal'); await p1.until(`document.querySelector('.room-status')?.textContent.includes('وصلت إجابتك')`, 'the pupil confirmation'); await p1.shot(shots + 'pupil-question.jpg'); await t.shot(shots + 'board-question.jpg'); return 'two answers, nothing revealed';
  }],
  ['revealing shows the right answer on every device and marks the board; answers are then closed', async t => {
    await t.click('.room-board button', 'أظهر الإجابة'); await p1.until(`document.querySelector('.room-options .is-right')`, 'the right answer on device one'); await p2.until(`document.querySelector('.room-options .is-right')`, 'the right answer on device two');
    await t.until(`document.querySelectorAll('.room-seats-board li.is-right').length === 1 && document.querySelectorAll('.room-seats-board li.is-other').length === 1`, 'one right and one other on the board');
    const closed = await p2.js(`return [...document.querySelectorAll('.room-options button')].every(b => b.disabled)`); await p2.expect(closed, 'a pupil can still answer after the reveal'); await p2.shot(shots + 'pupil-revealed.jpg'); return 'revealed everywhere';
  }],
  ['the room runs to its end; the summary counts each pupil alone; closing it turns pupils away', async t => {
    for (let i = 0; i < 40; i++) { const label = await t.js(`return [...document.querySelectorAll('.room-board .heading-actions button')].map(b => b.textContent.trim()).join('|')`); if (!label) break; if (label.includes('السؤال التالي')) { await t.click('.room-board button', 'السؤال التالي'); await t.sleep(400); } else if (label.includes('أظهر الإجابة')) { await t.click('.room-board button', 'أظهر الإجابة'); await t.sleep(400); } else if (label.includes('أنهِ الأسئلة')) { await t.click('.room-board button', 'أنهِ الأسئلة'); break; } else break; }
    await t.until(`document.querySelector('.room-board .data-table')`, 'the summary table'); const rows = (await t.text('.room-board .data-table tbody')).replace(/\s+/g, ' ');
    const firstRow = (await t.js(`return document.querySelector('.room-board .data-table tbody tr').innerText`)).replace(/\s+/g, ' '); await t.expect(/1 من \d+ 1$/.test(firstRow.trim()), 'first pupil should have one answer, one correct: ' + firstRow);
    await p1.until(`document.querySelector('.room-wait h1')?.textContent.includes('انتهت الحصة')`, 'the end screen on the pupil device'); await t.shot(shots + 'board-summary.jpg');
    await t.click('.room-board button', 'أغلق الغرفة'); await t.until(`document.querySelector('.room-setup')`, 'the setup form after closing'); await p2.until(`document.querySelector('.parent-invalid')`, 'the closed room to turn the pupil away'); return rows.slice(0, 120);
  }],
];

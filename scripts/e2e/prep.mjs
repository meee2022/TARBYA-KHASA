// The seven-stage weekly preparation, tried end to end in a fresh profile.
const step = n => `[...document.querySelectorAll('.editor-steps button')][${n}].click()`;
const states = t => t.js(`return [...document.querySelectorAll('.editor-steps button')].map(b => (b.className.match(/stage-(\\w+)/) ?? [])[1]).join(',')`);
const shots = 'artifacts/sweep-prep/';

export const steps = [
  ['the sample preparation opens with seven stages', async t => {
    await t.go('/plans'); await t.click('a.lesson-row, .plan-summary a'); const n = await t.count('.editor-steps button'); await t.expect(n === 7, `${n} stages`);
    const names = await t.js(`return [...document.querySelectorAll('.editor-steps button strong')].map(x => x.textContent).join(' | ')`); await t.shot(shots + 'sample-stage1.jpg'); return names;
  }],
  ['every stage of the sample preparation renders its content without errors', async t => {
    const seen = [];
    for (let i = 0; i < 7; i++) { await t.js(step(i)); await t.sleep(350); const text = await t.text('.editor-panel'); await t.expect(text.length > 40, `stage ${i + 1} is empty`); await t.expect(!text.includes('@@') && !text.includes('undefined') && !text.includes('[object'), `stage ${i + 1} shows stray text`); seen.push(text.length); await t.shot(shots + `sample-stage${i + 1}.jpg`); }
    return seen.join(', ') + ' chars · states: ' + await states(t);
  }],
  ['a new week starts with all stages not begun', async t => {
    await t.go('/plans'); await t.click('button', 'أسبوع جديد'); await t.sleep(600);
    const s = await states(t); await t.expect(/^none,none,none,none/.test(s), 'states: ' + s); return s;
  }],
  ['stage 1: a topic completes the basics', async t => {
    await t.fill('.editor-panel input[maxlength="160"]', 'حرف الباء'); const s = (await states(t)).split(','); await t.expect(s[0] === 'done', 'stage 1 is ' + s[0]); return s.join(',');
  }],
  ['stage 2: choosing pupils shows where each stands', async t => {
    await t.js(step(1)); await t.sleep(300); await t.js(`document.querySelectorAll('.learner-selection input')[0].click()`); await t.sleep(250); await t.js(`document.querySelectorAll('.learner-selection input')[1].click()`); await t.sleep(300);
    const cards = await t.count('.level-card'); await t.expect(cards === 2, `${cards} level cards`); const s = (await states(t)).split(','); await t.expect(s[1] === 'done', 'stage 2 is ' + s[1] + ' · ' + (await t.text('.editor-panel .check-notes').catch(() => '')));
    await t.shot(shots + 'new-stage2.jpg'); return (await t.text('.level-card')).replace(/\s+/g, ' ').slice(0, 140);
  }],
  ['stage 3: a linked goal and short goals complete the goals stage', async t => {
    await t.js(step(2)); await t.sleep(300); const choices = await t.count('.goal-choice input');
    await t.js(`const s = document.querySelector('.editor-steps button'); s.click();`); await t.sleep(250);
    // the pupils' goals are per subject: pick the subject of the first pupil's first goal
    const subject = await t.js(`const w = JSON.parse(localStorage.getItem('tarbya.workspace.v1')); return w.learners[0].goals[0].subject;`);
    await t.js(`const subj = JSON.parse(localStorage.getItem('tarbya.workspace.v1')).learners[0].goals[0].subject; const sel = [...document.querySelectorAll('.editor-panel select')].find(x => [...x.options].some(o => o.textContent === subj)); __t.set(sel, subj);`);
    await t.js(step(2)); await t.sleep(300); const n = await t.count('.goal-choice input'); await t.expect(n > 0, `no goals offered for ${subject} (before: ${choices})`);
    await t.js(`document.querySelector('.goal-choice input').click()`); await t.sleep(200); await t.fill('.editor-panel textarea', 'يميّز صوت الباء في أول الكلمة، في 4 من 5 محاولات');
    const s = (await states(t)).split(','); await t.expect(s[2] === 'done', 'stage 3 is ' + s[2] + ' · ' + (await t.text('.editor-panel .check-notes').catch(() => ''))); return `${n} goals offered · ` + s.join(',');
  }],
  ['stage 4: sessions with roles, and what differs per pupil', async t => {
    await t.js(step(3)); await t.sleep(300); const tabs = await t.count('.session-tabs button'); await t.expect(tabs === 5, `${tabs} session tabs`);
    for (let n = 0; n < 5; n++) { await t.js(`document.querySelectorAll('.session-tabs button')[${n}].click()`); await t.sleep(200); await t.fill('.editor-panel textarea', 'يميّز الحرف في بداية الكلمة', 0); await t.fill('.stage-card textarea', 'أعرض البطاقة وأنطق الصوت', 0); await t.fill('.stage-card textarea', 'يشير إلى الصورة', 1); await t.fill('.stage-meta input[list="plan-tools"]', 'ملاحظة المعلم', 0); }
    const paths = await t.count('.path-row'); await t.expect(paths === 2, `${paths} pupil paths`);
    const s = (await states(t)).split(','); await t.expect(s[3] === 'done' || s[3] === 'review', 'stage 4 is ' + s[3]); await t.expect(s[5] === 'done', 'stage 6 (tools) is ' + s[5]); await t.shot(shots + 'new-stage4.jpg'); return s.join(',');
  }],
  ['stage 5: a bag item completes the bag', async t => {
    await t.js(step(4)); await t.sleep(300); const before = await t.count('.bag-list .bag-row'); if (!before) await t.click('.editor-panel button', 'إضافة عنصر');
    await t.fill('.bag-list .bag-row input[aria-label="العنصر"]', 'بطاقات الحروف', 0); const s = (await states(t)).split(','); await t.expect(s[4] === 'done', 'stage 5 is ' + s[4]); return s.join(',');
  }],
  ['stage 6: tools per session and the goal table', async t => {
    await t.js(step(5)); await t.sleep(300); const rows = await t.count('.assess-sessions li'); await t.expect(rows === 5, `${rows} sessions listed`);
    const goals = await t.count('.editor-panel .data-table tbody tr'); await t.expect(goals === 1, `${goals} goal rows`); await t.shot(shots + 'new-stage6.jpg'); return (await t.text('.editor-panel .data-table tbody tr')).replace(/\s+/g, ' ').slice(0, 120);
  }],
  ['stage 7: the missing list shrinks to nothing when the week is closed', async t => {
    await t.js(step(6)); await t.sleep(300); const before = (await t.text('.editor-panel .check-notes')).split('\n').length;
    for (let n = 0; n < 5; n++) await t.js(`document.querySelectorAll('.editor-panel .option-chip')[${n}].click(); await new Promise(r => setTimeout(r, 150));`);
    await t.js(`document.querySelector('.editor-panel input[name="achieved"]').click()`); await t.fill('.editor-panel textarea', 'نجح التلميح البصري، وسأقلّل عدد الخيارات الأسبوع القادم.');
    const s = await states(t); const notes = await t.count('.editor-panel .check-notes'); await t.shot(shots + 'new-stage7.jpg');
    await t.expect(!s.includes('none') && !s.includes('progress'), 'states: ' + s); await t.expect(s === 'done,done,done,done,done,done,done', 'not all done: ' + s); await t.expect(notes === 0, 'missing list still shown'); return `missing lines before: ${before} · states: ${s}`;
  }],
  ['the preparation survives a reload and exports to Word', async t => {
    const url = await t.js('return location.pathname'); await t.reload(); const s = await states(t); await t.expect(!s.includes('none'), 'after reload: ' + s);
    await t.js(`window.__dl = []; const orig = URL.createObjectURL; URL.createObjectURL = b => { window.__dl.push(b.size); return orig.call(URL, b); };`);
    await t.click('.page-heading button, .page-banner button', 'تصدير Word'); await t.sleep(2500); const sizes = await t.js('return window.__dl'); await t.expect(sizes.length === 1 && sizes[0] > 3000, 'no Word file: ' + JSON.stringify(sizes)); return `${url} · ${sizes[0]} bytes`;
  }],
  ['a session still turns into a lesson', async t => {
    await t.js(step(3)); await t.sleep(300); await t.click('.session-actions button', 'حوّلها إلى حصة'); await t.sleep(900); const path = await t.js('return location.pathname'); await t.expect(/^\/lessons\/.+\/edit$/.test(path), 'went to ' + path); return path;
  }],
];

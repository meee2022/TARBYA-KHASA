// The universal-design check and the video library, tried end to end in a fresh profile.
const shots = 'artifacts/sweep-udl/';
const fem = /طالبة|طالبات|معلمة|معلمات|اختاري|أضيفي|سجّلي|اضغطي|ابدئي/;
const clean = async (t, where = 'main') => { const text = await t.text(where); await t.expect(!fem.test(text), 'feminine wording'); await t.expect(!text.includes('@@') && !text.includes('undefined') && !text.includes('[object') && !text.includes('NaN'), 'stray text on the page'); await t.expect((await t.overflow()) <= 1, 'sideways scroll'); return text; };
const score = t => t.js(`return document.querySelector('.udl-score strong').textContent.trim()`);

export const steps = [
  ['the check opens on the first lesson with nine lines in three principles', async t => {
    await t.go('/udl'); await clean(t); await t.expect((await t.count('.udl-card')) === 3, 'expected three principles'); await t.expect((await t.count('.udl-card li')) === 9, 'expected nine lines');
    const s = await score(t); await t.expect(/^\d من 9$/.test(s), 'score: ' + s); const seen = await t.count('.udl-seen'); await t.expect(seen >= 2, `${seen} lines seen in the sample lesson`); await t.shot(shots + 'udl.jpg'); return `${s}, ${seen} seen by the platform`;
  }],
  ['a line the platform sees cannot be unticked; a manual line toggles and moves the score', async t => {
    const locked = await t.js(`const seen = document.querySelector('.udl-seen').closest('li').querySelector('input'); return seen.checked && seen.disabled;`); await t.expect(locked, 'a seen line is not locked on');
    const before = Number((await score(t)).split(' ')[0]);
    await t.js(`const box = [...document.querySelectorAll('.udl-card li input')].find(i => !i.disabled && !i.checked); box.click();`); await t.sleep(300); const after = Number((await score(t)).split(' ')[0]); await t.expect(after === before + 1, `score ${before} -> ${after}`);
    await t.reload(); await t.expect(Number((await score(t)).split(' ')[0]) === after, 'tick lost on reload'); return `${before} -> ${after}, kept after reload`;
  }],
  ['an unmet line shows what to add, and another lesson has its own result', async t => {
    const tips = await t.count('.udl-tip'); const first = await score(t);
    await t.js(`const s = document.querySelector('.udl-pick select'); __t.set(s, s.options[1].value);`); await t.sleep(400); const second = await score(t); const url = await t.js('return location.search');
    await t.expect(url.includes('lesson='), 'the chosen lesson is not in the address'); await clean(t); return `first ${first} (${tips} tips), second ${second}`;
  }],
  ['video library: empty state, a bad link is refused, a YouTube link is saved unapproved', async t => {
    await t.go('/videos'); await t.expect((await clean(t)).includes('المكتبة فارغة'), 'no empty state');
    await t.click('button', 'فيديو جديد'); await t.fill('form.desk-form input[maxlength="160"]', 'أنشودة الحروف'); await t.fill('form.desk-form input[type=url]', 'http://example.org/video');
    await t.js(`document.querySelector('form.desk-form').noValidate = true`); await t.click('form.desk-form button.primary'); await t.expect((await t.text('form.desk-form .alert')).includes('https'), 'an http link was not refused');
    await t.fill('form.desk-form input[type=url]', 'https://www.youtube.com/watch?v=abc123DEF45'); await t.click('form.desk-form button.primary');
    const card = (await t.text('.video-card')).replace(/\s+/g, ' '); await t.expect(card.includes('أنشودة الحروف') && card.includes('ينتظر اعتمادك') && card.includes('يُضاف إلى حقيبة الدرس بعد اعتماده'), 'card: ' + card);
    await t.expect((await t.count('.video-card iframe')) === 0, 'the player loaded before the teacher pressed play'); return card.slice(0, 110);
  }],
  ['pressing play loads the privacy-friendly player; approving unlocks adding to a lesson bag', async t => {
    await t.click('.video-poster'); const src = await t.js(`return document.querySelector('.video-card iframe')?.src ?? ''`); await t.expect(src.startsWith('https://www.youtube-nocookie.com/embed/abc123DEF45'), 'player src: ' + src);
    await t.click('.video-card button', 'شاهدته وأعتمده'); await t.expect((await t.text('.video-card .plan-state')) === 'معتمد', 'not approved');
    await t.js(`const s = document.querySelector('.video-kit select'); __t.set(s, s.options[1].value);`); await t.sleep(400);
    const kit = await t.js(`const w = JSON.parse(localStorage.getItem('tarbya.workspace.v1')); return w.lessons[0].kit.filter(k => k.url === 'https://www.youtube.com/watch?v=abc123DEF45').length`); await t.expect(kit === 1, `${kit} kit items with the video`);
    await t.js(`const s = document.querySelector('.video-kit select'); __t.set(s, s.options[1].value);`); await t.sleep(300); const again = await t.js(`const w = JSON.parse(localStorage.getItem('tarbya.workspace.v1')); return w.lessons[0].kit.filter(k => k.url === 'https://www.youtube.com/watch?v=abc123DEF45').length`); await t.expect(again === 1, 'the video was added twice');
    await t.shot(shots + 'videos.jpg'); return 'played, approved, added once';
  }],
  ['the video shows in the lesson bag and now counts in the universal-design check; reload, edit and delete work', async t => {
    await t.go('/udl'); const line = await t.js(`const li = [...document.querySelectorAll('.udl-card li')].find(x => x.textContent.includes('بأكثر من طريقة')); return li.classList.contains('is-met')`); await t.expect(line, 'the many-ways line is not met after adding a video');
    await t.go('/videos'); await t.expect((await t.count('.video-card')) === 1, 'video lost on reload');
    await t.click('.video-card .icon-button'); await t.fill('form.desk-form input[maxlength="160"]', 'أنشودة الحروف الهجائية'); await t.click('form.desk-form button.primary'); await t.expect((await t.text('.video-card h2')) === 'أنشودة الحروف الهجائية', 'rename not saved');
    await t.js(`document.querySelectorAll('.video-card .icon-button')[1].click()`); await t.sleep(300); await t.click('.confirm-dialog button', 'حذف الفيديو'); await t.expect((await t.count('.video-card')) === 0, 'video not deleted'); return 'bag link counted; renamed; deleted';
  }],
];

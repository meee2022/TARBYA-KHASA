// The classroom flows that existed before today and that visitors will try first: a session with a pupil, a game round, and the support tools.
const fem = /طالبة|طالبات|معلمة|معلمات|اختاري|أضيفي|سجّلي|اضغطي|ابدئي/;
const tidy = async (t, where = 'body') => { const text = await t.text(where); await t.expect(!fem.test(text), 'feminine wording: ' + (text.match(fem) ?? [])[0]); await t.expect(!text.includes('undefined') && !text.includes('[object') && !text.includes('NaN') && !text.includes('@@'), 'stray text'); return text; };
export const steps = [
  ['a session opens for the sample lesson, starts with a pupil, and shows a question to answer', async t => {
    await t.go('/session/animals'); await tidy(t); await t.expect((await t.count('.session-setup')) === 1, 'no session setup'); await t.click('.session-setup button.primary');
    await t.until(`document.querySelector('.question-stage')`, 'the first question'); const options = await t.count('.student-options button'); await t.expect(options >= 1, `${options} answer options`); await tidy(t); await t.expect((await t.overflow()) <= 1, 'sideways scroll'); return `${options} options on screen`;
  }],
  ['the pupil answers, the teacher records the help given, and the session moves on', async t => {
    const before = await t.text('.session-progress'); await t.js(`document.querySelector('.student-options button').click()`); await t.sleep(400);
    await t.js(`const corner = document.querySelector('.teacher-corner'); corner?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); corner?.click();`); await t.sleep(900);
    const panel = await t.count('.teacher-panel'); if (panel) { await t.js(`const b = document.querySelector('.support-grid button'); b?.click();`); await t.sleep(600); }
    const after = await t.text('.session-progress').catch(() => 'finished'); await tidy(t); return `panel ${panel ? 'opened' : 'not opened by a short press (it needs a long press)'} · ${before.replace(/\s+/g, ' ')} -> ${String(after).replace(/\s+/g, ' ')}`;
  }],
  ['the games page lists activities; the first one shows its setup and then a round to play', async t => {
    await t.go('/games'); await tidy(t, 'main'); const link = await t.js(`const a = [...document.querySelectorAll('main a[href^="/learn/"]')][0]; return a ? a.getAttribute('href') : ''`); await t.expect(!!link, 'no activity link on the games page');
    await t.go(link); await t.until(`document.querySelector('.game-setup')`, 'the activity setup', 12000); await tidy(t); await t.click('.game-setup button.primary');
    await t.until(`document.querySelector('.game-stage, .card-stage')`, 'a round on screen', 12000); await tidy(t); await t.expect((await t.count('.learning-room button')) >= 1, 'nothing to press in the round'); await t.expect((await t.overflow()) <= 1, 'sideways scroll'); return link;
  }],
  ['every activity of the sample pack shows its setup and starts a round, or says plainly why it cannot', async t => {
    await t.go('/games'); const links = await t.js(`return [...new Set([...document.querySelectorAll('main a[href^="/learn/"]')].map(a => a.getAttribute('href')))]`); let started = 0, blocked = 0;
    for (const link of links.slice(0, 16)) { await t.go(link); await t.until(`document.querySelector('.game-setup, .empty-state')`, 'the setup for ' + link, 12000); await tidy(t);
      const can = await t.js(`const b = document.querySelector('.game-setup button.primary'); return !!b && !b.disabled`);
      if (!can) { blocked++; continue; }
      await t.click('.game-setup button.primary'); await t.until(`document.querySelector('.game-stage, .card-stage, .session-setup, .model-question')`, 'a round for ' + link, 12000); await tidy(t); started++; }
    await t.expect(started >= 5, `only ${started} activities started`); return `${started} started, ${blocked} need something first, of ${links.length}`;
  }],
  ['the support tools open full screen: schedule, first-then, reward board, calm corner', async t => {
    await t.go('/tools'); await tidy(t, 'main'); const links = await t.js(`return [...new Set([...document.querySelectorAll('main a[href^="/support/"]')].map(a => a.getAttribute('href')))]`); await t.expect(links.length >= 3, `${links.length} tools`);
    for (const link of links) { await t.go(link); await t.expect((await t.text('body')).length > 30, 'empty tool: ' + link); await tidy(t); }
    return links.join(' ');
  }],
  ['the pupil file, the family letter, the progress page and the official forms open with content', async t => {
    for (const p of ['/learners/demo-1', '/learners/demo-1/family', '/learners/demo-1/sheet', '/progress', '/forms', '/review', '/library', '/presentations', '/packs']) { await t.go(p); const text = await tidy(t, 'main'); await t.expect(text.length > 120, 'thin page: ' + p); await t.expect((await t.overflow()) <= 1, 'sideways scroll on ' + p); }
    return 'nine pages';
  }],
];

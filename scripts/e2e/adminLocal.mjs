// The admin console's new content editors, tried against a LOCAL anonymous Convex only:
//   ADMIN_CODE=<the ADMIN_SETUP_CODE set on the local backend> BASE=http://localhost:5199 node scripts/e2e/run.mjs scripts/e2e/adminLocal.mjs
const user = 'admin' + Date.now().toString(36); const secret = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(36)).join('') + 'Aa1';
const edited = 'أمر معدَّل من الإدارة';

export const steps = [
  ['this run talks to a local server, not the live one', async t => { const base = process.env.BASE ?? ''; await t.expect(/localhost:5199/.test(base) && !!process.env.ADMIN_CODE, 'run with BASE=http://localhost:5199 and ADMIN_CODE set'); return base; }],
  ['the first admin account is created with the setup code and the console opens', async t => {
    await t.go('/admin'); await t.until(`document.querySelector('.admin-auth-box form, .admin-console')`, 'the admin page', 15000);
    if (await t.count('.admin-auth-box form')) { const setup = await t.count('input[name="code"]');
      if (setup) { await t.fill('input[name="code"]', process.env.ADMIN_CODE); await t.fill('input[name="name"]', 'مدير التجربة'); await t.fill('input[name="confirm"]', secret); }
      await t.fill('input[name="username"]', setup ? user : process.env.ADMIN_USER ?? user); await t.fill('input[name="password"]', secret); await t.click('.admin-auth-box button.primary'); }
    await t.until(`document.querySelector('.admin-console')`, 'the console after sign-in', 20000); return 'console open';
  }],
  ['the catalog shows editors for the strategies, the prompt lab, the universal-design lines and the how-to guide', async t => {
    const tabs = await t.js(`return [...document.querySelectorAll('.admin-console nav button, .admin-tabs button, [role=tab]')].map(b => b.textContent.trim()).join(' | ')`);
    await t.js(`const b = [...document.querySelectorAll('.admin-console button')].find(x => /القوائم|المحتوى|الكتالوج/.test(x.textContent)); b?.click();`); await t.sleep(500);
    await t.js(`const b = [...document.querySelectorAll('.catalog-sections button')].find(x => x.textContent.includes('التحضير')); b?.click();`); await t.sleep(500);
    const heads = await t.js(`return [...document.querySelectorAll('.admin-details summary h2')].map(h => h.textContent.trim()).join(' | ')`);
    for (const name of ['موسوعة الاستراتيجيات', 'مختبر الأوامر', 'بنود التصميم الشامل للتعلّم', 'دليل استخدام المنصة']) await t.expect(heads.includes(name), `editor missing: ${name}. tabs: ${tabs} · sections: ${heads}`);
    for (const name of ['وظائف السلوك المفترضة', 'أنواع أدوات القياس']) await t.expect((await t.text('.admin-console')).includes(name), 'list editor missing: ' + name);
    return heads;
  }],
  ['every new editor opens without an error, and a strategy shows its fields', async t => {
    await t.js(`for (const d of document.querySelectorAll('.admin-details')) d.open = true;`); await t.sleep(600);
    await t.js(`const s = [...document.querySelectorAll('.admin-details')].find(d => d.querySelector('h2').textContent.includes('موسوعة')); s.querySelector('.admin-unit').open = true;`); await t.sleep(300);
    const fields = await t.js(`const s = [...document.querySelectorAll('.admin-details')].find(d => d.querySelector('h2').textContent.includes('موسوعة')); return s.querySelectorAll('.admin-unit[open] textarea, .admin-unit[open] input').length`); await t.expect(fields >= 7, `${fields} fields in a strategy`);
    await t.shot('artifacts/sweep-server/admin-editors.jpg'); return `${fields} fields`;
  }],
  ['editing a prompt title and saving publishes it to the teacher pages', async t => {
    await t.js(`const s = [...document.querySelectorAll('.admin-details')].find(d => d.querySelector('h2').textContent.includes('مختبر الأوامر')); const input = s.querySelector('input'); __t.set(input, ${JSON.stringify(edited)});`); await t.sleep(400);
    await t.until(`document.querySelector('.admin-savebar')`, 'the save bar'); await t.js(`[...document.querySelectorAll('.admin-savebar button')].find(b => b.classList.contains('primary')).click()`);
    await t.until(`!document.querySelector('.admin-savebar')`, 'the save to finish', 15000); await t.expect((await t.count('.admin-console .alert')) === 0, 'the console shows an error after saving: ' + (await t.text('.admin-console .alert').catch(() => '')));
    await t.go('/prompts'); await t.until(`document.querySelector('.prompt-list button')`, 'the prompt lab'); const first = await t.text('.prompt-list button strong'); await t.expect(first === edited, 'teacher page shows: ' + first); return first;
  }],
  ['the other teacher pages still read the saved catalog: strategies, guide and the universal-design check', async t => {
    await t.go('/strategies'); await t.expect((await t.count('.strategy-card')) === 16, 'strategies after an admin save'); await t.go('/help'); await t.expect((await t.count('.help-card')) === 8, 'guide after an admin save');
    await t.go('/udl'); await t.expect((await t.count('.udl-card li')) === 9, 'universal-design lines after an admin save'); return '16 strategies, 8 guide cards, 9 lines';
  }],
];

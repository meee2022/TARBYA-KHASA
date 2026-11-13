// What a stranger sees: the public pages with a wrong link or code, and the account-only pages when nobody is signed in. Read-only, safe on the live site.
export const steps = [
  ['a made-up specialist link shows the invalid-link page', async t => { await t.go('/specialist/' + 'b'.repeat(48)); await t.until(`document.querySelector('.parent-invalid')`, 'the invalid-link page', 12000); const text = await t.text('body'); await t.expect(text.includes('لم يعد صالحًا') && !text.includes('undefined'), text.slice(0, 120)); return 'invalid'; }],
  ['a made-up family link shows the invalid-link page', async t => { await t.go('/parent/' + 'c'.repeat(48)); await t.until(`document.querySelector('.parent-invalid')`, 'the invalid-link page', 12000); return 'invalid'; }],
  ['the room page asks for a code, refuses a malformed one, and turns away an unknown one', async t => {
    await t.go('/room'); await t.expect((await t.count('.room-enter input')) === 1, 'no code field'); await t.fill('.room-enter input', 'ab'); await t.click('.room-enter button'); await t.expect((await t.text('.room-enter .alert')).includes('ستة'), 'a short code was not refused');
    await t.fill('.room-enter input', 'ZZZZZZ'); await t.click('.room-enter button'); await t.until(`document.querySelector('.parent-invalid')`, 'the unknown-room page', 12000); await t.expect((await t.overflow()) <= 1, 'sideways scroll'); return 'asked, refused, turned away';
  }],
  ['the live room page asks a signed-out teacher to sign in, without an error', async t => { await t.go('/live'); const text = await t.text(); await t.expect(text.includes('سجّل الدخول لتفتح غرفة') || text.includes('غير مفعّل'), 'live page: ' + text.slice(0, 160)); return text.includes('سجّل الدخول') ? 'asks to sign in' : 'server not enabled'; }],
  ['the specialist links tab asks a signed-out teacher to sign in, without an error', async t => { await t.go('/team'); await t.click('.desk-tabs button', 'روابط الأخصائيين'); const text = await t.text(); await t.expect(text.includes('سجّل الدخول لتنشئ روابط الأخصائيين') || text.includes('غير مفعّل'), 'links tab: ' + text.slice(0, 160)); return 'asks to sign in'; }],
];

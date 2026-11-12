// The confidential file: papers kept on the device only, tried end to end in a fresh profile.
const shots = 'artifacts/sweep-confidential/';
const fem = /طالبة|طالبات|معلمة|معلمات|اختاري|أضيفي|سجّلي|اضغطي|ابدئي/;
const clean = async (t, where = 'main') => { const text = await t.text(where); await t.expect(!fem.test(text), 'feminine wording'); await t.expect(!text.includes('@@') && !text.includes('undefined') && !text.includes('[object') && !text.includes('NaN'), 'stray text on the page'); await t.expect((await t.overflow()) <= 1, 'sideways scroll'); return text; };
const attach = (t, name, type, bytes) => t.js(`const input = document.querySelector('form.desk-form input[type=file]'); const dt = new DataTransfer(); dt.items.add(new File([new Uint8Array(${bytes}).fill(37)], ${JSON.stringify(name)}, { type: ${JSON.stringify(type)} })); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));`);

export const steps = [
  ['the page says plainly that papers stay on this device, and starts empty', async t => {
    await t.go('/confidential'); const text = await clean(t); await t.expect(text.includes('لا تُرفع إلى أي خادم') && text.includes('لا مستندات لهذا الطالب على هذا الجهاز'), 'notice or empty state missing'); return 'notice and empty state';
  }],
  ['a file of the wrong kind or too large is refused before anything is stored', async t => {
    await t.click('button', 'مستند جديد'); await t.fill('form.desk-form input[maxlength="160"]', 'تقرير تقييم النطق');
    await attach(t, 'notes.exe', 'application/x-msdownload', 100); let err = await t.text('form.desk-form .alert'); await t.expect(err.includes('PDF أو صورة'), 'wrong type not refused: ' + err);
    await attach(t, 'big.pdf', 'application/pdf', 11 * 1024 * 1024); err = await t.text('form.desk-form .alert'); await t.expect(err.includes('10 ميغابايت'), 'oversize not refused: ' + err);
    await t.click('form.desk-form button.primary'); await t.sleep(300); await t.expect((await t.count('.desk-list li')) === 0, 'something was saved without a valid file'); return 'both refused';
  }],
  ['a PDF is saved under its category and listed with its size', async t => {
    await attach(t, 'speech-report.pdf', 'application/pdf', 20480); await t.sleep(200); await t.expect((await t.count('form.desk-form .alert')) === 0, 'a valid file shows an error');
    await t.js(`const s = document.querySelector('form.desk-form select'); __t.set(s, 'طبي');`); await t.fill('form.desk-form textarea', 'من مركز التأهيل. يوصي بجلستين أسبوعيًا.'); await t.click('form.desk-form button.primary'); await t.sleep(800);
    const text = (await clean(t)).replace(/\s+/g, ' '); await t.expect(text.includes('طبي') && text.includes('تقرير تقييم النطق') && text.includes('20 ك.ب'), 'list: ' + text.slice(0, 400)); await t.shot(shots + 'list.jpg'); return 'listed under طبي, 20 ك.ب';
  }],
  ['the paper is not in the workspace that syncs and backs up', async t => {
    const leak = await t.js(`const w = localStorage.getItem('tarbya.workspace.v1') ?? ''; return w.includes('تقرير تقييم النطق') || w.includes('speech-report');`); await t.expect(!leak, 'the confidential record is inside the synced workspace');
    const own = await t.js(`return JSON.parse(localStorage.getItem('tarbya.confidential.v1')).length`); await t.expect(own === 1, `${own} records in the device-only list`); return 'kept apart from the workspace';
  }],
  ['after a reload the file downloads again with its own name, and each pupil sees only their own papers', async t => {
    await t.reload(); await t.expect((await t.count('.desk-list li')) === 1, 'record lost on reload');
    await t.js(`window.__dl = []; const orig = URL.createObjectURL; URL.createObjectURL = b => { window.__dl.push(b.size + ':' + b.type); return orig.call(URL, b); }; window.__names = []; const click = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { window.__names.push(this.download); return click.call(this); };`);
    await t.click('.desk-list .icon-button'); await t.sleep(700); const got = await t.js(`return window.__dl.join(',') + ' / ' + window.__names.join(',')`); await t.expect(got === '20480:application/pdf / speech-report.pdf', 'download: ' + got);
    await t.js(`const s = document.querySelector('.record-bar select'); __t.set(s, s.options[1].value);`); await t.sleep(300); await t.expect((await t.count('.desk-list li')) === 0, 'another pupil sees the paper'); return got;
  }],
  ['deleting removes the record and the stored file', async t => {
    await t.js(`const s = document.querySelector('.record-bar select'); __t.set(s, s.options[0].value);`); await t.sleep(300); await t.js(`document.querySelectorAll('.desk-list .icon-button')[1].click()`); await t.sleep(300); await t.click('.confirm-dialog button', 'حذف المستند'); await t.sleep(600);
    await t.expect((await t.count('.desk-list li')) === 0, 'record not removed');
    const left = await t.js(`return await new Promise(r => { const q = indexedDB.open('tarbya-media', 1); q.onsuccess = () => { const c = q.result.transaction('files').objectStore('files').count(); c.onsuccess = () => r(c.result); }; q.onerror = () => r(-1); })`); await t.expect(left === 0, `${left} files left in the device store`); return 'record and file gone';
  }],
];

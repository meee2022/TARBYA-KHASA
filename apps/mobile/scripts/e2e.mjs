// Browser check of the exported web build at phone size: node scripts/e2e.mjs  (run `npx expo export --platform web --output-dir dist-web` first).
// Starts its own static server and headless Chrome, uses every desk screen through the real UI, reloads to prove the data stays, and saves JPEG screenshots under artifacts/.
// ONLY=text runs the steps whose name includes the text.
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { openChrome, sleep } from './cdp.mjs';

const here = resolve(fileURLToPath(import.meta.url), '..');
const port = 4319, base = `http://127.0.0.1:${port}`, KEY = 'tarbya.native.v1';
const shots = resolve(here, '../artifacts');
// The shared domain is read straight from its TypeScript source: what the screens must show comes from the same catalog they import.
const { defaultCatalog: catalog } = await import(pathToFileURL(resolve(here, '../../../packages/domain/catalog.ts')).href);
const server = spawn(process.execPath, [resolve(here, 'serve.mjs'), String(port)], { stdio: 'ignore' });
const chrome = await openChrome({ width: 390, height: 844 });
const { send, errors } = chrome;

const helpers = `window.__t = {
  seen: el => el.getClientRects().length > 0,
  find: (label, sel = '[aria-label]') => [...document.querySelectorAll(sel)].filter(el => el.getAttribute('aria-label') === label && __t.seen(el)).pop(),
  set(el, v) { const p = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(p, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); },
};`;
const js = expr => chrome.js(`${helpers} ${expr}`);
const t = {
  js,
  async go(route) { await send('Page.navigate', { url: base + route }); await sleep(2200); },
  async reload() { await send('Page.reload'); await sleep(2200); },
  /** Presses the visible control whose accessibility label is exactly `label`. */
  async tap(label) {
    const ok = await js(`const el = __t.find(${JSON.stringify(label)}); if (!el) return false; el.scrollIntoView({ block: 'center' }); el.click(); return true;`);
    if (!ok) throw new Error(`nothing to tap: «${label}»`);
    await sleep(450);
  },
  /** Types into the visible field whose label is exactly `label`. */
  async fill(label, value) {
    const ok = await js(`const el = __t.find(${JSON.stringify(label)}, 'input, textarea'); if (!el) return false; el.focus(); __t.set(el, ${JSON.stringify(value)}); return true;`);
    if (!ok) throw new Error(`nothing to fill: «${label}»`);
    await sleep(150);
  },
  sleep,
  text: () => js('return document.body.innerText'),
  path: () => js('return location.pathname'),
  stored: () => js(`return JSON.parse(localStorage.getItem(${JSON.stringify(KEY)}) ?? 'null')`),
  async expect(needle, message) { const text = await t.text(); if (!text.includes(needle)) throw new Error(message ?? `expected to see «${needle}»`); },
  async refuse(needle) { const text = await t.text(); if (text.includes(needle)) throw new Error(`should not see «${needle}»`); },
  /** Saves the screen as JPEG, with the viewport stretched (up to two screens) so content below the fold is in the picture. */
  async shot(name) {
    const more = await js(`const boxes = [...document.querySelectorAll('div')].filter(e => __t.seen(e) && e.scrollHeight > e.clientHeight + 4 && ['auto', 'scroll'].includes(getComputedStyle(e).overflowY)); boxes.forEach(e => e.scrollTop = 0); return Math.max(0, ...boxes.map(e => e.scrollHeight - e.clientHeight));`);
    const height = Math.min(1700, 844 + more);
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height, deviceScaleFactor: 1, mobile: true });
    await sleep(500);
    await chrome.shot(resolve(shots, `${name}.jpg`));
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await sleep(200);
  },
};

const steps = [
  ['home shows the Watad identity', async () => {
    await t.go('/');
    await t.expect('منصة وتد للتربية الخاصة'); await t.expect('لكلّ طالب، طريقٌ للتعلّم'); await t.expect('تُنجَز على موقع وتد'); await t.refuse('تربية خاصة');
    await t.shot('00-home');
    await chrome.shot(resolve(shots, '00-home-phone.jpg'));
  }],
  ['existing screens take the new colours', async () => {
    await t.go('/lessons'); await t.expect('التحضير والدروس'); await t.shot('01-lessons');
    await t.go('/learner/demo-1'); await t.shot('02-learner-file');
    const track = await t.js(`const on = [...document.querySelectorAll('[role=switch]')].find(el => el.checked || el.getAttribute('aria-checked') === 'true'); return on ? [...on.parentElement.querySelectorAll('div')].map(d => getComputedStyle(d).backgroundColor).join(' | ') : 'no switch is on'`);
    if (!track.includes('rgb(93, 107, 60)')) throw new Error(`an on switch is not olive: ${track}`);
    await t.go('/learners'); await t.expect('لكل طالب مساره'); await t.shot('03-learners');
  }],
  ['desk tab lists the ten tools', async () => {
    await t.go('/desk');
    for (const name of ['التنبيهات', 'الجدول الأسبوعي', 'المهام', 'الحضور والغياب', 'سجل التقييم', 'خطط السلوك', 'الخطط الفردية', 'ملف الإنجاز', 'التوزيع الفصلي', 'الفريق والإحالات', 'نقل البيانات']) await t.expect(name);
    await t.shot('04-desk');
  }],
  ['1 timetable: set a period, reload, still there', async () => {
    await t.go('/timetable'); await t.expect('لا حصص يوم'); await t.shot('10-timetable-empty');
    await t.tap('أضف الحصة الأولى'); await t.fill('المادة', 'اللغة العربية'); await t.fill('المكان', 'غرفة المصادر'); await t.shot('11-timetable-form'); await t.tap('حفظ');
    await t.tap('الحصة 3: فارغة، اضغط للإضافة'); await t.tap('الرياضيات'); await t.fill('المكان', 'الصف 3 ب'); await t.tap('حفظ');
    await t.reload(); await t.expect('غرفة المصادر'); await t.expect('الرياضيات');
    await t.tap('الثلاثاء'); await t.expect('لا حصص يوم الثلاثاء');
    await t.go('/timetable'); await t.shot('12-timetable');
    const slots = (await t.stored()).desk.timetable.slots;
    return `slots saved: ${slots.map(s => `day ${s.day} period ${s.period} ${s.subject}`).join(' | ')}`;
  }],
  ['2 tasks: add, overdue, done, delete, reload', async () => {
    await t.go('/tasks'); await t.expect('لا مهام بعد'); await t.shot('20-tasks-empty');
    await t.tap('أضف مهمة'); await t.fill('المهمة', 'تجهيز بطاقات الحروف'); await t.tap('عالية'); await t.tap('أسبوعية'); await t.tap('الموعد: غدًا'); await t.shot('21-tasks-form'); await t.tap('أضف المهمة');
    await t.tap('مهمة جديدة'); await t.fill('المهمة', 'إرسال تقرير الأسبوع'); await t.tap('الموعد: اليوم السابق'); await t.tap('الموعد: اليوم السابق'); await t.tap('أضف المهمة');
    await t.tap('مهمة جديدة'); await t.fill('المهمة', 'مهمة للحذف'); await t.tap('أضف المهمة');
    await t.tap('مهمة جديدة'); await t.fill('المهمة', 'طباعة جدول الحصة المصوّر'); await t.tap('منخفضة'); await t.tap('أضف المهمة');
    await t.tap('حذف: مهمة للحذف'); await t.tap('تأكيد الحذف'); await t.refuse('مهمة للحذف');
    await t.tap('إنجاز المهمة: طباعة جدول الحصة المصوّر');
    await t.reload();
    await t.expect('تجهيز بطاقات الحروف'); await t.expect('تجاوزت موعدها'); await t.expect('منجزة (1)'); await t.refuse('مهمة للحذف');
    await t.shot('22-tasks');
    return (await t.stored()).desk.tasks.map(x => `${x.title} [${x.priority}/${x.scope}/${x.due}/${x.done ? 'done' : 'open'}]`).join(' | ');
  }],
  ['3 attendance: all present, one absent, reload, month summary', async () => {
    await t.go('/attendance'); await t.expect('لم يُسجَّل حضور اليوم بعد'); await t.shot('30-attendance-empty');
    await t.tap('الكل حاضرون'); await t.expect('سُجّل 6 من 6');
    await t.tap('عمر · تجريبي: غائب'); await t.tap('مريم · تجريبي: متأخر');
    await t.reload(); await t.expect('سُجّل 6 من 6'); await t.expect('نسبة الحضور 100%'); await t.expect('نسبة الحضور 0%');
    await t.shot('31-attendance');
    const day = (await t.stored()).desk.attendance[0];
    return `${day.date}: ${Object.values(day.marks).map(m => m.mark).join(', ')}`;
  }],
  ['4 notices: listed from the workspace, a row opens its screen', async () => {
    await t.go('/notices'); await t.expect('مهمة تجاوزت موعدها: إرسال تقرير الأسبوع'); await t.expect('تحضير واحد ينتظر المراجعة');
    await t.shot('40-notices');
    await t.tap('مهمة تجاوزت موعدها: إرسال تقرير الأسبوع');
    const path = await t.path(); if (path !== '/tasks') throw new Error(`notice opened ${path}, not /tasks`);
    await t.go('/notices'); await t.tap('تحضير واحد ينتظر المراجعة.');
    const second = await t.path(); if (second !== '/review') throw new Error(`notice opened ${second}, not /review`);
    return 'task notice → /tasks, review notice → /review';
  }],
  ['5 assessment: two readings of one skill, reload, started-from shown', async () => {
    await t.go('/assessment'); await t.expect('لا قراءات في ملف سارة بعد'); await t.shot('50-assessment-empty');
    await t.tap('أضف قراءة'); await t.tap('المهارات اللغوية والتواصلية'); await t.fill('المهارة', 'يسمّي خمسة حيوانات مألوفة'); await t.tap('بمساعدة جزئية'); await t.fill('النسبة المئوية (اختياري)', '40'); await t.tap('قبلي');
    for (let i = 0; i < 10; i++) await t.tap('التاريخ: اليوم السابق');
    await t.shot('51-assessment-form'); await t.tap('أضف القراءة');
    await t.tap('قراءة جديدة'); await t.tap('المهارات اللغوية والتواصلية'); await t.fill('المهارة', 'يسمّي خمسة حيوانات مألوفة'); await t.tap('بتلميح بسيط'); await t.fill('النسبة المئوية (اختياري)', '80'); await t.tap('أضف القراءة');
    await t.reload();
    await t.expect('يسمّي خمسة حيوانات مألوفة'); await t.expect('بتلميح بسيط'); await t.expect('بدأت المهارة من: بمساعدة جزئية'); await t.expect('80%');
    await t.shot('52-assessment');
    await t.tap('عمر'); await t.expect('لا قراءات في ملف عمر بعد');
    return (await t.stored()).desk.performance.map(p => `${p.skill} L${p.level} ${p.percent}% ${p.kind} ${p.date}`).join(' | ');
  }],
  ['6 behaviour: create a plan, record an occurrence, reload', async () => {
    await t.go('/behaviour'); await t.expect('لا خطط سلوك بعد'); await t.shot('60-behaviour-empty');
    await t.tap('أضف خطة'); await t.tap('يوسف');
    await t.fill('السلوك المستهدف', 'مغادرة المقعد أثناء الشرح'); await t.fill('تعريفه: ما الذي نراه ونعدّه؟', 'يقف ويبتعد عن مقعده أكثر من خطوتين دون إذن.'); await t.fill('السلوك البديل', 'رفع بطاقة «أحتاج استراحة»');
    await t.tap('موعد المراجعة: بعد أسبوع'); await t.shot('61-behaviour-form'); await t.tap('احفظ الخطة');
    await t.expect('لم يُسجَّل في آخر 14 يومًا');
    await t.tap('سجّل حدوثه'); await t.fill('ما الذي سبقه؟ (اختياري)', 'طُلب منه الانتقال إلى نشاط جديد'); await t.tap('احفظ الملاحظة');
    await t.tap('سجّل حدوثه'); await t.tap('احفظ الملاحظة');
    await t.reload(); await t.expect('مغادرة المقعد أثناء الشرح'); await t.expect('مرتان في آخر 14 يومًا');
    await t.shot('62-behaviour');
    const w = await t.stored(); const plan = w.desk.behaviourPlans[0]; const notes = w.learners.find(l => l.id === plan.learnerId).behaviour;
    if (notes.length !== 2 || notes.some(n => n.planId !== plan.id || n.behaviour !== plan.target)) throw new Error('behaviour notes not linked to the plan');
    return `plan for ${plan.learnerId}, review ${plan.review}, ${notes.length} notes with planId`;
  }],
  ['9 team and referrals: add a member and a due referral, change its state, reload', async () => {
    await t.go('/team'); await t.expect('لا إحالات بعد'); await t.expect('لا أعضاء في الفريق بعد'); await t.shot('90-team-empty');
    await t.tap('أضف عضوًا'); await t.fill('الاسم', 'خالد المري'); await t.fill('الدور', 'اختصاصي النطق'); await t.tap('أضف العضو');
    await t.tap('أضف إحالة'); await t.tap('مريم'); await t.tap('اختصاصي النطق'); await t.fill('سبب الإحالة', 'صعوبة في نطق بعض الأصوات تظهر في القراءة الجهرية.'); await t.tap('موعد المتابعة: اليوم'); await t.shot('91-team-form'); await t.tap('أضف الإحالة');
    await t.expect('حان موعد المتابعة');
    await t.go('/notices'); await t.expect('حان موعد متابعة الإحالة إلى اختصاصي النطق');
    await t.go('/team'); await t.tap('قيد المتابعة');
    await t.reload(); await t.expect('خالد المري'); await t.expect('إلى: اختصاصي النطق');
    await t.shot('92-team');
    const r = (await t.stored()).desk.referrals[0]; if (r.state !== 'following') throw new Error(`referral state is ${r.state}`);
    await t.tap('مغلقة'); await t.refuse('حان موعد المتابعة');
    const closed = (await t.stored()).desk.referrals[0].state; if (closed !== 'closed') throw new Error(`referral state is ${closed}`);
    await t.tap('قيد المتابعة');
    return `referral to ${r.to}, follow-up ${r.followUp}: following → closed → following`;
  }],
  ['10 evidence: add with a goal, mark reviewed, reload', async () => {
    await t.go('/evidence'); await t.expect('لا شواهد في ملف سارة بعد'); await t.shot('100-evidence-empty');
    await t.tap('أضف شاهدًا'); await t.fill('العنوان', 'ورقة عمل مطابقة الحيوانات'); await t.fill('ملاحظة', 'طابق أربع صور بأسمائها دون تلميح.'); await t.tap('تميّز مفردات الحيوانات من بين بديلين'); await t.shot('101-evidence-form'); await t.tap('أضف الشاهد');
    await t.tap('تمت المراجعة: ورقة عمل مطابقة الحيوانات');
    await t.reload(); await t.expect('ورقة عمل مطابقة الحيوانات'); await t.expect('رُوجع'); await t.expect('الهدف: تميّز مفردات الحيوانات من بين بديلين');
    await t.shot('102-evidence');
    const e = (await t.stored()).desk.evidence[0];
    return `${e.title} goal ${e.goalId} reviewed ${e.reviewed}`;
  }],
  ['7 and 8 read-only screens: empty, then with plans and a term laid out as the site saves them', async () => {
    await t.go('/ieps'); await t.expect('لا خطط فردية على هذا الجهاز'); await t.shot('70-ieps-empty');
    await t.go('/distribution'); await t.expect('لا توزيع فصلي على هذا الجهاز'); await t.shot('80-distribution-empty');
    await t.js(`
      const w = JSON.parse(localStorage.getItem(${JSON.stringify(KEY)}));
      const iso = d => d.toISOString().slice(0, 10); const now = new Date(); const sunday = new Date(now); sunday.setUTCDate(now.getUTCDate() - now.getUTCDay() - 14);
      const plan = { learnerId: 'demo-1', year: '2026-2027', school: 'مدرسة تجريبية', schoolType: '', birthDate: '', age: '', curriculum: '', disability: '', supportLevel: '', summary: '',
        services: { periods: '', scientific: false, literary: false, skills: false, sessions: '', speech: false, physical: false, occupational: false }, performance: {},
        goals: [{ id: 'lg1', kind: 'academic', subject: 'اللغة الإنجليزية', unit: '', text: 'أن يسمّي الطالب عشر مفردات من بيئته بنهاية الفصل.', start: '', end: '', result: '', shorts: [
          { id: 'sg1', text: 'يميّز مفردات الحيوانات من بين بديلين.', strategy: '', arrangements: '', assessment: '', start: '', end: '', result: 'done', trackedGoalId: 'g1' },
          { id: 'sg2', text: 'يسمّي ثلاث مفردات عند عرض الصورة.', strategy: '', arrangements: '', assessment: '', start: '', end: '', result: '' }] },
          { id: 'lg2', kind: 'life', subject: '', unit: '', text: 'أن يتبع الطالب جدول الحصة المصوّر باستقلالية.', start: '', end: '', result: 'not', shorts: [] }],
        classroom: [], assessmentAcc: [], curriculumAcc: [], tech: [], team: [], reviews: [], nextReview: iso(new Date(now.getTime() + 9 * 86400000)) };
      w.ieps = [{ ...plan, updatedAt: now.toISOString(), versions: [{ v: 1, at: now.toISOString(), plan: JSON.parse(JSON.stringify(plan)) }] }, { ...plan, learnerId: 'demo-2', goals: [], nextReview: '', updatedAt: now.toISOString() }];
      w.desk.distributions = [{ id: 'dist1', grade: 'الأول', subject: 'اللغة العربية', termStart: iso(sunday), weeks: 8, rows: [{ id: 'r1', title: 'الحروف وأصواتها', from: 1, to: 4, unitId: 'unit-ar1-letters' }, { id: 'r2', title: 'مراجعة وتقويم', from: 6, to: 8 }] }];
      localStorage.setItem(${JSON.stringify(KEY)}, JSON.stringify(w));`);
    await t.go('/ieps'); await t.expect('معتمدة · الإصدار 1'); await t.expect('مسودة'); await t.expect('أن يسمّي الطالب عشر مفردات'); await t.expect('يميّز مفردات الحيوانات من بين بديلين.'); await t.expect('القياس: لم يُقيَّم');
    await t.shot('71-ieps');
    await t.go('/distribution'); await t.expect('الأسبوع 1'); await t.expect('الحروف وأصواتها'); await t.expect('حرف الباء'); await t.expect('هذا الأسبوع'); await t.expect('لا وحدة في هذا الأسبوع');
    await t.shot('81-distribution');
    await t.go('/notices'); await t.expect('مراجعة الخطة الفردية خلال أسبوعين'); await t.tap('سارة: مراجعة الخطة الفردية خلال أسبوعين.');
    const path = await t.path(); if (path !== '/ieps') throw new Error(`plan notice opened ${path}`);
    await t.go('/desk'); await t.shot('05-desk-filled');
    await t.go('/'); await t.shot('06-home-filled');
    return 'IEP approval, goals, tracked status and term weeks render; plan notice → /ieps';
  }],
  ['12 strategy guide: search, open one', async () => {
    const cards = () => t.js(`return [...document.querySelectorAll('[aria-label^="استراتيجية: "]')].filter(__t.seen).length`);
    await t.go('/desk'); await t.expect('المعرفة والتقارير'); await t.tap(`موسوعة الاستراتيجيات: ${catalog.strategyGuide.length} استراتيجيات`);
    const all = await cards(); if (all !== catalog.strategyGuide.length) throw new Error(`${all} cards for ${catalog.strategyGuide.length} strategies`);
    await t.shot('120-strategies');
    await t.fill('ابحث في الاستراتيجيات', 'المصوّر'); const some = await cards(); if (!some || some >= all) throw new Error(`search left ${some} of ${all}`); await t.expect('الجدول المصوّر');
    await t.fill('ابحث في الاستراتيجيات', 'ققققق'); await t.expect('لا استراتيجية بهذه الكلمة'); await t.tap('امسح البحث');
    await t.tap('استراتيجية: الجدول المصوّر'); if (await t.path() !== '/strategy/visual-schedule') throw new Error(`opened ${await t.path()}`);
    for (const part of ['متى تُستخدم؟', 'الخطوات', 'التكييف حسب الحاجة', 'لمن يعتمد على الصور', 'أخطاء شائعة', 'كيف أعرف أنها نجحت؟', catalog.strategyGuide[0].steps[5]]) await t.expect(part);
    await t.shot('121-strategy-detail');
    return `${all} strategies listed, search narrowed to ${some}, detail shows all six parts`;
  }],
  ['13 usage guide: every card with its steps', async () => {
    await t.go('/help');
    for (const card of catalog.help) { await t.expect(card.title); await t.expect(card.steps[card.steps.length - 1]); }
    await t.shot('130-help');
    return `${catalog.help.length} cards`;
  }],
  ['14 prompt lab: fill from a lesson and typed blanks, hand over', async () => {
    const filled = () => t.js(`return __t.find('النص الجاهز', 'textarea').value`);
    await t.go('/prompts');
    let text = await filled();
    for (const part of ['عالم الحيوانات', 'اللغة الإنجليزية', 'الثالث', 'أن يميّز الطالب مفردات الحيوانات']) if (!text.includes(part)) throw new Error(`the filled text lacks «${part}»`);
    if (/\[[^\]]+\]/.test(text)) throw new Error('gaps left although a lesson is chosen');
    await t.tap('الأمر: قصة اجتماعية قصيرة'); text = await filled(); if (!text.includes('[الموقف]')) throw new Error('the typed blank is not shown as a gap'); await t.expect('بقي في النص فراغ واحد');
    await t.fill('الموقف', 'رحلة مدرسية إلى الحديقة'); text = await filled(); if (!text.includes('رحلة مدرسية إلى الحديقة') || text.includes('[')) throw new Error('the typed blank was not filled');
    await t.shot('140-prompts');
    await t.tap('بلا درس'); text = await filled(); if (!text.includes('[الصف]')) throw new Error('without a lesson the grade should stay a visible gap');
    await t.tap('نسخ'); const page = await t.text(); const copied = page.includes('نُسخ النص') ? 'copied' : page.includes('تعذّر النسخ تلقائيًا') ? 'copy refused by the browser, manual hint shown' : ''; if (!copied) throw new Error('no answer after pressing copy');
    const named = (page + catalog.prompts.map(p => p.template).join(' ')).match(/chatgpt|openai|gpt|claude|anthropic|gemini|copilot|bard|deepseek|شات ?جي|جيميناي|كلود|كوبايلوت/i);
    if (named) throw new Error(`a tool or company is named: ${named[0]}`);
    return `${copied}; lesson fields and the typed blank filled; no tool or company named`;
  }],
  ['15 universal design check: locked lines, tick one, reload', async () => {
    const score = async () => Number((await t.text()).match(/(\d+) من 9/)?.[1] ?? NaN);
    const line = 'التعليمات قصيرة ومصوّرة، وتُعاد عند الطلب', seen = 'الدرس مربوط بهدف فردي يعرف الطالب أنه يتقدم نحوه';
    await t.go('/udl'); const before = await score(); if (!(before >= 1)) throw new Error(`no score shown: ${before}`);
    const locked = await t.js(`const el = __t.find(${JSON.stringify('متحقق تلقائيًا: ' + seen)}); if (!el) return 'missing'; el.click(); return __t.find(${JSON.stringify(seen)}) ? 'tappable' : 'locked'`);
    if (locked !== 'locked') throw new Error(`the line the platform sees is ${locked}`);
    await t.sleep(400); if (await score() !== before) throw new Error('pressing a locked line changed the score');
    await t.tap(line); if (await score() !== before + 1) throw new Error('ticking a line did not add one');
    await t.reload(); if (await score() !== before + 1) throw new Error('the tick was lost on reload');
    await t.shot('150-udl');
    const saved = (await t.stored()).lessons.find(l => l.id === 'animals').udl;
    if (saved.join() !== 'udl-short-instructions') throw new Error(`lesson.udl is ${saved}`);
    await t.tap('نعدّ ونكتشف'); const other = await score();
    return `animals lesson ${before} → ${before + 1} من 9 and kept after reload, lesson.udl = ${saved}; another lesson shows ${other} من 9`;
  }],
  ['16 video library: refuse http, add https, approve, reload, open', async () => {
    const url = 'https://www.youtube.com/watch?v=abcdefghijk';
    await t.go('/videos'); await t.expect('لا مقاطع بعد'); await t.shot('160-videos-empty');
    await t.tap('أضف مقطعًا'); await t.fill('عنوان المقطع', 'أغنية الحروف'); await t.fill('الرابط', 'http://example.com/video'); await t.tap('أضف المقطع');
    await t.expect('الرابط يجب أن يبدأ بـ https://'); await t.shot('161-videos-refused');
    if ((await t.stored()).desk.videos?.length) throw new Error('the http link was saved');
    await t.fill('الرابط', 'javascript:alert(1)'); await t.tap('أضف المقطع'); await t.expect('الرابط يجب أن يبدأ بـ https://');
    await t.fill('الرابط', url); await t.tap('اللغة العربية'); await t.fill('ملاحظة (اختياري)', 'من الدقيقة 1 إلى 3 فقط'); await t.tap('أضف المقطع');
    await t.expect('أغنية الحروف'); await t.expect('يوتيوب'); await t.expect('ينتظر المشاهدة');
    await t.tap('اعتماد: أغنية الحروف');
    await t.reload(); await t.expect('أغنية الحروف'); await t.expect('معتمد'); await t.shot('162-videos');
    await t.js('window.open = (...args) => { window.__opened = args; return null; }'); await t.tap('افتح المقطع');
    const opened = await t.js('return window.__opened?.[0]'); if (opened !== url) throw new Error(`opened ${opened}`);
    const v = (await t.stored()).desk.videos[0];
    return `${v.title} ${v.url} ${v.subject} approved ${v.approved}; open asked for the same https link`;
  }],
  ['17 pupil report: sections from the workspace, one pupil at a time', async () => {
    await t.go('/report');
    for (const part of ['يصف هذا التقرير ما سُجِّل عن الطالب وحده', 'الخطة الفردية: معتمدة · الإصدار 1', 'حضور هذا الشهر', 'نسبة الحضور 100% من يوم مسجل واحد', 'الأهداف الفردية', 'لم يُقيَّم', 'مستويات الأداء', 'بدأ من: بمساعدة جزئية', 'لا تقييمات بنسبة ومادة بعد', 'لا خطط سلوك لهذا الطالب', 'لا إحالات لهذا الطالب', 'ورقة عمل مطابقة الحيوانات', 'رُوجع']) await t.expect(part);
    await t.shot('170-report');
    await t.tap('يوسف'); await t.expect('مغادرة المقعد أثناء الشرح'); await t.expect('مرتان في آخر 14 يومًا'); await t.expect('الخطة الفردية: لا خطة فردية بعد'); await t.shot('171-report-behaviour');
    await t.tap('مريم'); await t.expect('إلى: اختصاصي النطق'); await t.expect('قيد المتابعة'); await t.expect('نسبة الحضور 100%');
    await t.tap('عمر'); await t.expect('نسبة الحضور 0%');
    return 'attendance, goals, levels with started-from, behaviour plan, referral and evidence each shown for the pupil they belong to';
  }],
  ['11 data transfer: export, refuse bad input, clear the device, import, reload', async () => {
    const raw = () => t.js(`return localStorage.getItem(${JSON.stringify(KEY)})`);
    const paste = text => t.fill('نص النسخة الاحتياطية', text);
    await t.go('/desk'); await t.tap('نقل البيانات: استيراد نسخة من الموقع، أو تصدير نسخة من هذا الجهاز');
    if (await t.path() !== '/transfer') throw new Error('the desk row did not open the transfer screen');
    await t.expect('لا يُرسَل شيء إلى أي خادم'); await t.shot('110-transfer');
    await t.tap('تصدير النسخة');
    const exported = await t.js(`return __t.find('نسخة هذا الجهاز', 'textarea').value`);
    const before = await raw();
    if (exported !== before) throw new Error('the exported text is not the stored workspace');
    const had = JSON.parse(exported); if (!had.desk.tasks.length || !had.desk.behaviourPlans.length || !had.ieps.length || !had.desk.distributions.length) throw new Error('the export lacks the task, the plan, the IEPs or the distribution');
    await t.tap('نسخ'); const copied = (await t.text()).includes('نُسخ النص') ? 'copied' : (await t.text()).includes('تعذّر النسخ تلقائيًا') ? 'copy refused by the browser, manual hint shown' : ''; if (!copied) throw new Error('no answer after pressing copy');
    await t.shot('111-transfer-export');

    const broken = JSON.parse(exported); broken.desk.tasks[0].priority = 'urgent';
    for (const [why, text] of [['garbage', 'هذا ليس JSON {{{'], ['array', '[1, 2, 3]'], ['wrong shape', '{"version":1,"learners":"x","lessons":[],"observations":[]}'], ['bad desk', JSON.stringify(broken)]]) {
      await paste(text); await t.tap('استيراد'); await t.expect('لم تتغيّر بياناتك', `${why} was not refused`); await t.refuse('النسخة سليمة');
      if (await raw() !== before) throw new Error(`${why} changed the stored data`);
    }
    await t.shot('112-transfer-refused');
    await t.js(`__t.set(__t.find('نص النسخة الاحتياطية', 'textarea'), '{"a":"' + 'x'.repeat(4300000) + '"}')`); await t.tap('استيراد'); await t.expect('أكبر من 4 ميغابايت');
    if (await raw() !== before) throw new Error('the oversized text changed the stored data');
    await paste(exported); await t.tap('استيراد'); await t.expect('النسخة سليمة'); await t.tap('إلغاء');
    if (await raw() !== before) throw new Error('cancel changed the stored data');

    await t.js('localStorage.clear()');
    await t.go('/tasks'); await t.expect('لا مهام بعد'); await t.go('/behaviour'); await t.expect('لا خطط سلوك بعد');
    await t.go('/transfer'); await paste(exported); await t.tap('استيراد');
    await t.expect('النسخة سليمة: 6 طلاب، 4 دروس'); await t.expect('يستبدل كل ما على هذا الجهاز'); await t.shot('113-transfer-confirm');
    await t.tap('نعم، استبدل البيانات'); await t.expect('تم الاستيراد: 6 طلاب، 4 دروس، 0 تحاضير أسبوعية، خطتان فرديتان.'); await t.shot('114-transfer-done');
    if (await raw() !== exported) throw new Error('the stored workspace differs from the imported text');
    await t.go('/tasks'); await t.expect('تجهيز بطاقات الحروف');
    await t.go('/behaviour'); await t.expect('مغادرة المقعد أثناء الشرح'); await t.expect('مرتان في آخر 14 يومًا');
    await t.go('/ieps'); await t.expect('معتمدة · الإصدار 1');
    await t.go('/distribution'); await t.expect('الأسبوع 1'); await t.expect('هذا الأسبوع');

    // A backup as the site makes it: the seed with its demo plan and IEP, and a term laid out from the catalog.
    const domain = name => import(pathToFileURL(resolve(here, '../../../packages/domain', name)).href);
    const [{ seedWorkspace }, { withPlanning }, { createDistribution, spreadUnits }, { defaultCatalog }] = await Promise.all(['index.ts', 'planning.ts', 'distribution.ts', 'catalog.ts'].map(domain));
    const term = createDistribution('الأول', 'اللغة العربية', new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10));
    term.rows = spreadUnits(defaultCatalog.units.filter(u => u.subject === 'اللغة العربية'), term.weeks);
    const site = JSON.stringify({ ...withPlanning(seedWorkspace()), desk: { distributions: [term] } });
    await t.js('localStorage.clear()');
    await t.go('/distribution'); await t.expect('لا توزيع فصلي على هذا الجهاز');
    await t.go('/ieps'); await t.expect('لا خطط فردية على هذا الجهاز'); await t.tap('استيراد نسخة من الموقع');
    if (await t.path() !== '/transfer') throw new Error('the empty state did not open the transfer screen');
    await paste(site); await t.tap('استيراد'); await t.tap('نعم، استبدل البيانات'); await t.expect('تحضير أسبوعي واحد، خطة فردية واحدة');
    await t.reload();
    await t.go('/ieps'); await t.refuse('لا خطط فردية على هذا الجهاز'); await t.expect('سارة · تجريبي'); await t.expect('هدف بعيد المدى'); await t.shot('115-ieps-from-site-backup');
    await t.go('/distribution'); await t.expect('الأسبوع 18'); await t.expect('هذا الأسبوع'); await t.expect(term.rows[0].title); await t.shot('116-distribution-from-site-backup');
    await t.js(`localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(before)});`);
    return `${copied}; garbage, array, wrong shape, bad desk and 4.3 MB refused with data untouched; own export and a site-built backup (${site.length} chars) imported and kept after reload`;
  }],
  ['a workspace saved before the desk existed still loads and takes desk data', async () => {
    const full = await t.js(`const raw = localStorage.getItem(${JSON.stringify(KEY)}); const w = JSON.parse(raw); const old = { version: 1, learners: w.learners.slice(0, 2).map(({ behaviour, ...l }) => l), lessons: w.lessons, observations: [] }; localStorage.setItem(${JSON.stringify(KEY)}, JSON.stringify(old)); return raw;`);
    await t.go('/desk'); await t.expect('لا مهام مفتوحة');
    for (const route of ['/timetable', '/attendance', '/notices', '/assessment', '/behaviour', '/ieps', '/distribution', '/team', '/evidence', '/transfer', '/strategies', '/help', '/prompts', '/udl', '/videos', '/report']) { await t.go(route); await t.refuse('تعذّر'); }
    await t.go('/tasks'); await t.tap('أضف مهمة'); await t.fill('المهمة', 'مهمة على مساحة قديمة'); await t.tap('أضف المهمة');
    await t.reload(); await t.expect('مهمة على مساحة قديمة');
    const w = await t.stored(); if (w.desk.tasks.length !== 1 || w.learners.length !== 2) throw new Error('old workspace was not kept');
    await t.js(`localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(full)});`);
    return 'old workspace opened on all ten screens, desk created on first save; full data restored';
  }],
];

let failed = 0;
const only = process.env.ONLY;
for (const [name, run] of steps.filter(([name]) => !only || name.includes(only))) {
  const before = errors.length;
  try {
    const out = await run();
    const errs = errors.slice(before).filter(e => !/favicon|useNativeDriver|ERR_CONNECTION/.test(e));
    if (errs.length) { failed++; console.log(`FAIL ${name}\n     ${errs.join('\n     ')}`); }
    else console.log(`ok   ${name}${out ? '\n     → ' + String(out).slice(0, 400) : ''}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${name}\n     ${String(e.message).slice(0, 400)}`);
    try { await t.shot(`fail-${name.split(' ')[0]}`); } catch {}
  }
}
console.log(failed ? `\n${failed} step(s) FAILED` : '\nall steps passed');
await chrome.close();
server.kill();
process.exit(failed ? 1 : 0);

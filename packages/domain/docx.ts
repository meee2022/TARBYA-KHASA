import { supportLabels, type Goal, type Learner, type Observation } from './index.ts';
import { goalProgress, goalStatusLabels, stageKeys, stageLabels, type Achieved, type Iep, type IepLongGoal, type WeeklyPlan } from './planning.ts';
import type { Catalog } from './catalog.ts';

// Minimal WordprocessingML writer. Colours and font follow the school's own forms.
const HEAD = '8E0000'; const SUB = 'EEECE1'; const FONT = 'Sakkal Majalla'; const WIDTH = 15399;
interface Cell { t?: string; w?: number; fill?: string; color?: string; bold?: boolean; span?: number; merge?: 'start' | 'continue'; size?: number; center?: boolean; }
type Row = (Cell | string)[];

export const escapeXml = (s: string) => s.replace(/[^\t\n\r\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function runs(text: string, c: Cell) {
  const props = (rtl: boolean) => `<w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:cs="${FONT}"/>${c.bold ? '<w:b/><w:bCs/>' : ''}${c.color ? `<w:color w:val="${c.color}"/>` : ''}<w:sz w:val="${c.size ?? 24}"/><w:szCs w:val="${c.size ?? 24}"/>${rtl ? '<w:rtl/>' : ''}</w:rPr>`;
  // Latin stretches must not carry w:rtl, or Word reorders their punctuation.
  return text.split(/([A-Za-z][A-Za-z0-9 '’.,?!-]*[A-Za-z0-9?!.]|[A-Za-z]|\d+(?:[-/]\d+)+)/).filter(Boolean).map(part => `<w:r>${props(!/^([A-Za-z]|\d+[-/]\d)/.test(part))}<w:t xml:space="preserve">${escapeXml(part)}</w:t></w:r>`).join('');
}
export const para = (text: string, c: Cell = {}) => `<w:p><w:pPr><w:bidi/><w:spacing w:before="40" w:after="40"/>${c.center ? '<w:jc w:val="center"/>' : ''}</w:pPr>${runs(text, c)}</w:p>`;
function cell(raw: Cell | string, width: number) {
  const c: Cell = typeof raw === 'string' ? { t: raw } : raw;
  const lines = (c.t ?? '').split('\n');
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${c.span ? `<w:gridSpan w:val="${c.span}"/>` : ''}${c.merge ? `<w:vMerge${c.merge === 'start' ? ' w:val="restart"' : ''}/>` : ''}${c.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${c.fill}"/>` : ''}<w:vAlign w:val="center"/></w:tcPr>${lines.map(l => para(l, c)).join('')}</w:tc>`;
}
/** widths are relative weights, scaled to the landscape page. */
export function table(weights: number[], rows: Row[]) {
  const sum = weights.reduce((a, b) => a + b, 0); const grid = weights.map(w => Math.round(w / sum * WIDTH));
  const border = (n: string) => `<w:${n} w:val="single" w:sz="4" w:space="0" w:color="7F7F7F"/>`;
  const row = (r: Row) => { let col = 0; return `<w:tr><w:trPr><w:cantSplit/></w:trPr>${r.map(raw => { const span = typeof raw === 'string' ? 1 : raw.span ?? 1; const width = grid.slice(col, col + span).reduce((a, b) => a + b, 0); col += span; return cell(raw, width); }).join('')}</w:tr>`; };
  return `<w:tbl><w:tblPr><w:bidiVisual/><w:tblW w:w="${WIDTH}" w:type="dxa"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(border).join('')}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${grid.map(g => `<w:gridCol w:w="${g}"/>`).join('')}</w:tblGrid>${rows.map(row).join('')}</w:tbl>${para('', { size: 12 })}`;
}
export const bar = (t: string, span: number): Row => [{ t, span, fill: HEAD, color: 'FFFFFF', bold: true, center: true, size: 26 }];
export const label = (t: string, span?: number): Cell => ({ t, fill: SUB, bold: true, span });
export const check = (on: boolean, text: string) => `${on ? '☒' : '☐'} ${text}`;
const result = (r: Achieved) => `${check(r === 'done', 'أنجز')}   ${check(r === 'not', 'لم ينجز')}`;
export const title = (t: string) => para(t, { bold: true, size: 32, center: true });

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
/** The files of a .docx package. Zipping is left to the caller so this stays pure and testable. */
export function packageParts(body: string): Record<string, string> {
  const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  return {
    '[Content_Types].xml': `${xml}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
    '_rels/.rels': `${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    'word/_rels/document.xml.rels': `${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'word/styles.xml': `${xml}<w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:cs="${FONT}"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:bidi="ar-SA"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>`,
    'word/document.xml': `${xml}<w:document ${NS}><w:body>${body}<w:sectPr><w:pgSz w:w="16839" w:h="11907" w:orient="landscape"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/><w:bidi/></w:sectPr></w:body></w:document>`,
  };
}
const sessionNames = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة'];
const nameOf = (learners: Learner[], id: string) => learners.find(l => l.id === id)?.name ?? '';

export function planBody(plan: WeeklyPlan, learners: Learner[]) {
  const names = plan.learnerIds.map(id => learners.find(l => l.id === id)).filter(Boolean) as Learner[];
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  const used = new Set(plan.sessions.map(s => s.date ? new Date(`${s.date}T12:00:00Z`).getUTCDay() : -1));
  let out = title(`استمارة تحضير جلسة تعليمية - العام الأكاديمي ${plan.year}`);
  out += table([1, 1, 1, 1, 1, 1, 1, 1], [
    [label('الأسبوع'), label('من'), { t: plan.weekStart, span: 2 }, label('إلى'), { t: plan.weekEnd, span: 1 }, label('عدد الجلسات'), String(plan.sessions.length)],
    [label('اليوم'), { t: days.map((d, n) => check(used.has(n), d)).join('   '), span: 5 }, label('مستوى الدعم'), plan.supportLevel],
    [label('المجال'), plan.field, label('المادة'), { t: plan.subject, span: 2 }, label('موضوع الدرس'), { t: plan.title, span: 2 }],
  ]);
  out += table([3, 1, 3, 1], [bar('أسماء الطلبة', 4), [label('اسم الطالب'), label('الصف / المجموعة'), label('اسم الطالب'), label('الصف / المجموعة')], ...Array.from({ length: Math.max(1, Math.ceil(names.length / 2)) }, (_, n) => [names[n * 2]?.name ?? '', names[n * 2]?.grade ?? '', names[n * 2 + 1]?.name ?? '', names[n * 2 + 1]?.grade ?? ''])]);
  out += table([1, 5], [[label('الأهداف قصيرة المدى'), plan.shortGoals]]);
  plan.sessions.forEach((s, n) => {
    out += table([3, 1, 4, 4, 1, 3, 2], [bar('أنشطة التعليم والتعلم', 7),
      [label(`هدف الجلسة ${n + 1}`, 2), label('طرائق وأساليب تدريس المعلم'), label('أنشطة الطالب التعلمية والوسائل'), label('الزمن'), label('الترتيبات والتسهيلات'), label('التقويم')],
      ...stageKeys.map((k, i): Row => [{ t: i === 0 ? `الجلسة ${sessionNames[n] ?? n + 1}\n${s.date}\n${s.objective}` : '', merge: i === 0 ? 'start' : 'continue' }, label(stageLabels[k]), s[k].teacher, s[k].student, { t: `${s[k].minutes} دقيقة`, center: true }, s[k].arrangements, s[k].assessment]),
    ]);
  });
  const paths = plan.paths.filter(p => plan.learnerIds.includes(p.learnerId));
  if (paths.length) out += table([1, 4], [bar('المسارات الفردية: الهدف واحد، والطريق يناسب كل طالب', 2), ...paths.map((p): Row => [label(nameOf(learners, p.learnerId)), p.text])]);
  out += table([1, 4], [[label('الأنشطة الفردية'), plan.individual], [label('الهدف المهاري'), plan.skillGoal], [label('تحقق الأهداف'), result(plan.achieved)], [label('التأمل الذاتي'), plan.reflection]]);
  if (plan.bagItems.length || plan.bagLinks.length) out += table([1, 4], [[label('حقيبة الحصة'), [...plan.bagItems.map(i => check(i.done, i.text)), ...plan.bagLinks.map(l => `${l.title}: ${l.url}`)].join('\n')]]);
  out += para(`معلم التربية الخاصة: ${'_'.repeat(30)}          التوقيع: ${'_'.repeat(20)}`);
  return out;
}

function goalsTable(g: IepLongGoal, subjects: string[]) {
  const header = g.kind === 'life' ? 'مهارة حياتية' : 'هدف أكاديمي';
  return table([3, 3, 2, 2, 1, 1, 2], [bar(`${header}: ${g.subject}${g.unit ? ` / ${g.unit}` : ''}`, 7),
    [label('المادة الدراسية'), { t: subjects.map(s => check(s === g.subject, s)).join('   '), span: 6 }],
    [label('الهدف بعيد المدى'), { t: g.text, span: 3 }, g.start, g.end, result(g.result)],
    [label('الهدف قصير المدى'), label('الإستراتيجية المستخدمة'), label('الترتيبات والتسهيلات'), label('أدوات التقييم'), label('تاريخ البدء'), label('تاريخ الانتهاء'), label('تقرير إنجاز الهدف')],
    ...g.shorts.map((s): Row => [s.text, s.strategy, s.arrangements, s.assessment, s.start, s.end, result(s.result)]),
  ]);
}
export function iepBody(iep: Iep, learner: Learner, catalog: Catalog) {
  const s = iep.services;
  let out = title(`نموذج الخطة التربوية الفردية - العام الأكاديمي ${iep.year}`);
  out += table([1, 2, 1, 2], [bar('أولًا: بيانات الطالب / الطالبة', 4), [label('اسم الطالب/ة'), learner.name, label('الصف الدراسي'), learner.grade], [label('المدرسة'), iep.school, label('نوع المدرسة'), iep.schoolType], [label('تاريخ الميلاد'), iep.birthDate, label('العمر'), iep.age], [label('نوع المنهاج'), iep.curriculum, label('مستوى الدعم'), iep.supportLevel], [label('نوع الإعاقة'), { t: iep.disability, span: 3 }], [label('ملخص الحالة'), { t: iep.summary, span: 3 }]]);
  const mark = (on: boolean) => ({ t: on ? '√' : '', center: true });
  out += table([1, 1, 1, 1, 1, 1, 1, 1], [bar('ثانيًا: جدول الطالب', 8), ['عدد الحصص في الأسبوع', 'المجال العلمي', 'المجال الأدبي', 'المجال المهاري', 'عدد الجلسات بالأسبوع', 'علاج نطق ولغة', 'علاج طبيعي', 'علاج وظائفي'].map(t => label(t)), [{ t: s.periods, center: true }, mark(s.scientific), mark(s.literary), mark(s.skills), { t: s.sessions, center: true }, mark(s.speech), mark(s.physical), mark(s.occupational)]]);
  const domains = [...new Set([...catalog.performanceDomains, ...Object.keys(iep.performance)])].filter(d => iep.performance[d]?.length);
  out += table([2, 1, 4, 4], [bar('ثالثًا: مستوى أداء الطالب الحالي', 4), [label('مجال الأداء'), label('م'), label('نقاط القوة'), label('نقاط الاحتياج')], ...domains.flatMap(d => iep.performance[d].map((r, n): Row => [{ t: n === 0 ? d : '', merge: n === 0 ? 'start' : 'continue', fill: SUB, bold: true }, { t: String(n + 1), center: true }, r.strength, r.need]))]);
  out += table([1], [bar('رابعًا: الخدمات الأكاديمية وتنمية المهارات الحياتية', 1), ...(iep.goals.length ? [] : [['لا توجد أهداف بعد.'] as Row])]);
  for (const g of iep.goals) out += goalsTable(g, catalog.subjects);
  out += table([1, 1, 1], [bar('خامسًا: الترتيبات والتسهيلات', 3), [label('على مستوى البيئة الصفية'), label('على مستوى التقييم'), label('على مستوى المنهاج')], [iep.classroom, iep.assessmentAcc, iep.curriculumAcc].map(list => list.map(x => check(true, x)).join('\n'))]);
  out += table([1, 2], [bar('سادسًا: التكنولوجيا المساندة', 2), [label('اسم الأداة'), label('الغرض منها')], ...(iep.tech.length ? iep.tech : [{ tool: '', purpose: '' }]).map((t): Row => [t.tool, t.purpose])]);
  // Signatures and approval dates stay blank: they are written by hand, never generated.
  out += table([1, 4, 3, 2, 2], [bar('سابعًا: بيانات فريق العمل', 5), [label('م'), label('الاسم'), label('الدور / المسمى الوظيفي'), label('التوقيع'), label('التاريخ')], ...(iep.team.length ? iep.team : [{ name: '', role: '' }]).map((t, n): Row => [{ t: String(n + 1), center: true }, t.name, t.role, '', ''])]);
  out += table([1, 1, 1, 1], [bar('المصادقة والاعتماد', 4), ['توقيع ولي الأمر', 'منسق التربية الخاصة', 'النائب الأكاديمي', 'مدير المدرسة'].map(t => label(t)), [{ t: '\n' }, '', '', '']]);
  const reviews = iep.reviews.length ? iep.reviews : [{ id: '', date: '', reasons: [], parties: [], notes: '' }];
  out += table([1, 2, 2, 3], [bar('ثامنًا: مراجعة الخطة التربوية الفردية', 4), [label('تاريخ المراجعة'), label('سبب المراجعة'), label('الأطراف المشاركة'), label('ملاحظات وتعديلات')], ...reviews.map((r): Row => [r.date, r.reasons.join('\n'), r.parties.join('\n'), r.notes]), [label('موعد المراجعة القادمة'), { t: iep.nextReview, span: 3 }]]);
  return out;
}
export function goalReportBody(learner: Learner, observations: Observation[], supportName: (id: string) => string = id => supportLabels[id as keyof typeof supportLabels] ?? id) {
  let out = title(`تقرير الأهداف الفردية: ${learner.name}`) + para(`الصف ${learner.grade}. يصف هذا التقرير ما سُجِّل، ولا يقارن الطالب بغيره. اعتماد تحقق الهدف قرار المعلم.`, { center: true });
  learner.goals.forEach((g: Goal) => {
    const p = goalProgress(g, observations);
    out += table([2, 1, 1, 2, 4], [bar(g.text, 5), [label('الحالة'), { t: goalStatusLabels[p.status], span: 1 }, label('خط الأساس'), { t: g.baseline, span: 2 }], [label('التاريخ'), label('الصحيح'), label('المستقل'), label('أكثر مساعدة'), label('ملاحظة')], ...(p.rows.length ? p.rows.map((o): Row => [o.date.slice(0, 10), `${o.correct} / ${o.total}`, `${o.independent} / ${o.total}`, supportName(o.support), o.note]) : [[{ t: 'لا توجد ملاحظات مسجلة بعد.', span: 5 }] as Row])]);
  });
  return out;
}

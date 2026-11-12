import { countOf } from '../../packages/domain';
import { useEffect, useRef, useState } from 'react';
import { Check, RefreshCw, Sparkles, X } from 'lucide-react';
import { useSiteConfig } from './site';
import { useWorkspace } from './store';
import { accountsAvailable, aiReady, generateDraft } from './teacherApi';
import type { Lesson } from '../../packages/domain';
import { AuthorRequest, Deck, deckFromAI, parsePlan, PlanDraft } from '../../packages/domain/presentations';

export function AiAuthor({ lesson, task, onApply }: { lesson: Lesson; task: AuthorRequest['task']; onApply: (value: Deck | PlanDraft) => void }) {
  const {site}=useSiteConfig(); const { account } = useWorkspace();
  const [source, setSource] = useState(lesson.sourceText || ''); const [instructions, setInstructions] = useState('تعليمات قصيرة، خطوة واحدة في كل مرة، وبدائل واضحة للطالبة.');
  const [count, setCount] = useState(8); const [choices, setChoices] = useState<2 | 3>(2); const [ready, setReady] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [reviewedSource, setReviewedSource] = useState(false);
  const [result, setResult] = useState<Deck | PlanDraft | null>(null); const controller = useRef<AbortController | null>(null);
  // On the live site the helper is a Convex action for signed-in teachers; locally it is the project server.
  const refresh = async () => { try { if (accountsAvailable) { setReady(!!account && await aiReady()); return; } const r = await fetch('/api/author/status'); if (!r.ok) throw new Error(); setReady((await r.json()).ready); } catch { setReady(false); } };
  useEffect(() => { void refresh(); return () => controller.current?.abort(); }, [account]); // eslint-disable-line react-hooks/exhaustive-deps
  async function generate() {
    setError('');
    if (!lesson.title.trim() || source.trim().length < 30 || !reviewedSource) { setError('أضيفي عنوان الدرس ومصدرًا من 30 حرفًا على الأقل، ثم راجعي النص المرسل.'); return; }
    const request: AuthorRequest = { task, title: lesson.title, subject: lesson.subject, grade: lesson.grade, language: lesson.language, objective: lesson.objective.slice(0, 500), sourceText: source, instructions, slideCount: count, choices };
    setBusy(true); setResult(null); controller.current = new AbortController();
    try {
      let draft: unknown;
      if (accountsAvailable) draft = await generateDraft(request);
      else { const response = await fetch('/api/author/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: controller.current.signal }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'تعذّر إنشاء المسودة.'); draft = payload.result; }
      setResult(task === 'presentation' ? deckFromAI(draft, request) : parsePlan(draft));
    } catch (e) { setError(e instanceof Error && e.name === 'AbortError' ? 'أُلغي الطلب. محتواك الحالي محفوظ.' : e instanceof Error ? e.message : 'تعذّر الاتصال. حاولي مرة أخرى.'); }
    finally { setBusy(false); }
  }
  return <section className="ai-author" aria-label="مساعد إنشاء المحتوى"><div className="author-section-heading"><Sparkles size={23} aria-hidden="true" /><div><h2>{task === 'presentation' ? 'من المصدر إلى شرائح' : 'مساعد التحضير'}</h2><p>مسودة تقترحها الخدمة، والقرار والمراجعة لك.</p></div></div>
    <div className="ai-status"><span role="status">{!site.aiEnabled ? 'أوقفت الإدارة التوليد الذكي مؤقتًا' : ready === null ? 'جارٍ التحقق من الخدمة…' : ready ? 'المساعد الذكي جاهز لإنشاء مسودة' : 'يلزم تفعيل مفتاح الخدمة في إعدادات الخادم'}</span><button className="text-link" onClick={refresh} type="button"><RefreshCw size={15} />تحقّقي مجددًا</button></div>
    {!ready && ready !== null && <p className="info-note">{accountsAvailable && !account ? 'سجّلي الدخول بحساب المعلمة من «إعدادات المساحة» لاستخدام المساعد. القالب الجاهز يعمل الآن.' : 'يمكنك إنشاء القالب الجاهز وتعديله الآن. التوليد الذكي يصبح متاحًا بعد إعداد الخدمة.'}</p>}
    <label>المحتوى الذي سيُرسل إلى المساعد الذكي<textarea rows={7} maxLength={12000} value={source} disabled={busy} onChange={e => { setSource(e.target.value); setReviewedSource(false); }} placeholder="الصقي نص الدرس التعليمي بعد إزالة أي بيانات شخصية…" /><small>{source.length.toLocaleString('ar-QA-u-nu-latn')} / 12٬000 حرف. لا تُرسل ملفات الطالبات أو ملاحظاتهم تلقائيًا.</small></label>
    <label>كيف تريد تكييف المحتوى؟<textarea rows={2} maxLength={1200} value={instructions} disabled={busy} onChange={e => setInstructions(e.target.value)} /></label>
    <div className="form-grid">{task === 'presentation' && <label>عدد الشرائح<select value={count} disabled={busy} onChange={e => setCount(Number(e.target.value))}>{[6,8,10,12].map(n => <option key={n} value={n}>{n}</option>)}</select></label>}<label>عدد بدائل السؤال<select value={choices} disabled={busy} onChange={e => setChoices(Number(e.target.value) as 2 | 3)}><option value="2">بديلان</option><option value="3">ثلاثة بدائل</option></select></label></div>
    <p className="muted">يُرسل أيضًا: عنوان الدرس، المادة، الصف، اللغة، الهدف وتعليمات التكييف الظاهرة. راجعي خلوّها من بيانات الطالبات.</p>
    <label className="author-check"><input type="checkbox" checked={reviewedSource} disabled={busy} onChange={e => setReviewedSource(e.target.checked)} /><span>راجعت المحتوى المرسل وهو مادة تعليمية مناسبة للمشاركة مع الخدمة.</span></label>
    <div className="author-actions"><button className="button primary" disabled={busy || !ready || !site.aiEnabled} onClick={generate}><Sparkles size={18} />{busy ? 'جارٍ إنشاء المسودة…' : 'إنشاء مسودة بالذكاء الاصطناعي'}</button>{busy && <button className="button secondary" onClick={() => controller.current?.abort()}><X size={17} />إلغاء</button>}</div>
    {error && <p role="alert" className="alert">{error}</p>}
    {result && <div className="ai-result"><h3>المسودة جاهزة للمراجعة</h3>{'slides' in result ? <ol>{result.slides.map(s => <li key={s.id}>{s.title}</li>)}</ol> : <>{(['objective','warmup','teaching','practice','closing','adaptations'] as const).map((k,i) => <details key={k}><summary>{['الهدف','التهيئة','الشرح','التدريب','الغلق','التكييفات'][i]}</summary><p>{result[k]}</p></details>)}<p>{countOf(result.questions.length, 'سؤال', 'سؤالان', 'أسئلة')} مقترحة، ستراجع بدائلها وإجاباتها في محرر الدرس.</p></>}<p>تطبيق المسودة يستبدل محتوى {task === 'presentation' ? 'العرض' : 'التحضير والأسئلة'} الحالي. يمكنك مواصلة التعديل قبل الاعتماد.</p><button className="button primary" onClick={() => { onApply(result); setResult(null); }}><Check size={18} />{task === 'presentation' ? 'فتح الشرائح في المحرر' : 'تطبيق المسودة على التحضير'}</button></div>}
  </section>;
}

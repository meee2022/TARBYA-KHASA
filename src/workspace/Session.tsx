import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpenText, Check, ChevronLeft, Lock, Play, Save, Volume2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { describeAdaptation, questionOptions, responseLabels, Support, uid, Trial, summarizeTrials, understandingLabels } from '../../packages/domain';
import { accessFromPreferences } from '../../packages/domain/games';
import { findItem } from '../../packages/domain/packs';
import { art } from '../../packages/domain/catalog';
import { useAllPacks, useWorkspace } from './store';
import { useSiteConfig } from './site';
import { accessClass, CommunicationBoard, HoldButton, ReadingRuler, ReadingText, SignVideo, steadyTap, TilePicture, useDwell, useSpeech, useSwitchScan } from './accessibility';
import './games.css';
import './packs.css';
import { Brand, Empty } from './Workspace';

export default function Session() {
  const { id } = useParams(); const { data, record } = useWorkspace(); const { site } = useSiteConfig(); const { all } = useAllPacks();
  const lesson = data.lessons.find(l => l.id === id); const learners = data.learners.filter(s => lesson?.learnerIds.includes(s.id)); const pack = all.find(p => p.id === lesson?.packId);
  const [learnerId, setLearnerId] = useState(learners[0]?.id ?? ''); const learner = learners.find(s => s.id === learnerId);
  const [started, setStarted] = useState(false); const [index, setIndex] = useState(0); const [selected, setSelected] = useState<number | null>(null); const [results, setResults] = useState<Trial[]>([]); const [finished, setFinished] = useState(false); const [revealed, setRevealed] = useState(false); const [saved, setSaved] = useState(false); const [note, setNote] = useState(''); const [scale, setScale] = useState(1); const [goalId, setGoalId] = useState(''); const [paused, setPaused] = useState(false); const [request, setRequest] = useState('');
  const panel = useRef<HTMLDialogElement>(null); const root = useRef<HTMLDivElement>(null); const { speak, sayTile, readAlong, stop, error } = useSpeech(); const [word, setWord] = useState(-1);
  const access = useMemo(() => learner ? accessFromPreferences(learner.preferences) : undefined, [learner]);
  const tap = useMemo(() => steadyTap(access?.steady), [access?.steady]);
  const live = started && !finished && !paused;
  // Stays on during a break: returning from it must be reachable the same way the student answers.
  useSwitchScan(root, started && !finished && !!access?.scan, access?.scanSeconds ?? 4, `${index}-${selected}-${paused}`, () => undefined, access?.scanSpeak ? speak : undefined);
  useDwell(root, started && !finished && !!access?.dwell);
  useEffect(() => stop, [stop]);
  if (!lesson || lesson.status !== 'approved' || !lesson.questions.length || !learner || !access) return <div className="session-shell"><Empty title="الجلسة غير جاهزة" description="اختر درسًا معتمدًا يحتوي أسئلة وملف طالب." /><Link to="/lessons">العودة للدروس</Link></div>;
  const prefs = learner.preferences; const goals = learner.goals.filter(g => lesson.goalIds.includes(g.id));
  const q = lesson.questions[index]; const summary = summarizeTrials(results); const { correct, independent, total } = summary;
  const options = questionOptions(q, prefs.choices); const errorless = options.length === 1; const target = findItem(pack, q.target);
  const tiles = (learner.supports?.communication ? site.catalog.communication.filter(t => learner.supports!.communication!.includes(t.id)) : site.catalog.communication.slice(0, 6));
  const scaleList = site.catalog.support.filter(s => s.enabled && s.id !== 'not-observed');
  const notObserved = site.catalog.support.find(s => s.id === 'not-observed')!;
  const listen = () => { if (target?.audioId) sayTile({ label: target.text, audioId: target.audioId, lang: lesson.language }); else speak(prefs.shortInstructions && q.target ? q.target : q.prompt, lesson.language); };
  const save = (support: Support) => {
    stop(); panel.current?.close();
    const result: Trial = { questionId: q.id, selected, correct: selected === q.answer && support !== 'not-observed', support };
    setResults(r => [...r, result]); setRequest('');
    if (index + 1 === lesson.questions.length) setFinished(true); else setIndex(i => i + 1);
    setSelected(null);
  };
  const teacherButton = <HoldButton onOpen={() => panel.current?.showModal()} className={`teacher-corner ${selected !== null || request ? 'is-waiting' : ''}`}><Lock size={15} aria-hidden="true" />المعلم{request && <span className="teacher-alert">طلب جديد</span>}</HoldButton>;
  return <div ref={root} onClickCapture={tap} className={`session-shell ${started ? 'play-room' : ''} ${prefs.highContrast ? 'high-contrast' : ''} ${accessClass(access)}`} dir="rtl">{live && access.ruler && <ReadingRuler />}
    <header className="session-header"><Brand />{live ? teacherButton : !started && <Link className="button secondary" to={`/lessons/${id}`}><X size={18} />إنهاء العرض</Link>}</header>
    {!started ? <section className="session-setup panel"><h1>حصة تناسب طريقة تعلّمه</h1><p>{lesson.title}</p><label>اختر ملف الطالب<select value={learnerId} onChange={e => { setLearnerId(e.target.value); setGoalId(''); }}>{learners.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>الهدف الذي تقيسه الجلسة<select value={goalId || goals[0]?.id || ''} onChange={e => setGoalId(e.target.value)}>{goals.map(g => <option value={g.id} key={g.id}>{g.text}</option>)}</select></label><div className="chips">{describeAdaptation(prefs).map(x => <span key={x}>{x}</span>)}</div>
      {(prefs.understands?.length || prefs.responds?.length) ? <p className="info-note">يفهم عبر: {prefs.understands?.map(k => understandingLabels[k]).join('، ') || 'غير محدد'}. ويجيب عبر: {prefs.responds?.map(k => responseLabels[k]).join('، ') || 'غير محدد'}.</p> : null}
      <p className="info-note">شاشة الطالب نظيفة. لفتح لوحة المعلم أثناء الجلسة، اضغط مطولًا على زر «المعلم» في أعلى الشاشة.</p><button disabled={!goals.length} className="button primary" onClick={() => { setGoalId(goalId || goals[0].id); setScale(prefs.largeText ? 1.2 : 1); setStarted(true); }}><Play size={18} />نبدأ التعلّم</button></section>
    : finished ? (!revealed ? <section className="session-setup panel rise-in session-thanks"><img className="complete-art" src={art('ui-rosette')} alt="" /><h1>انتهينا. شكرًا لك</h1><p>لكل خطوة قيمتها.</p><HoldButton onOpen={() => setRevealed(true)} className="teacher-corner"><Lock size={15} aria-hidden="true" />لوحة المعلم</HoldButton></section>
      : <section className="session-setup panel rise-in"><h1>نتيجة الجلسة للمعلم</h1><div className="result-summary"><div><strong>{correct} / {total}</strong><span>استجابات صحيحة</span></div><div><strong>{independent} / {total}</strong><span>صحيحة باستقلالية</span></div></div><label>ملاحظة المعلم<textarea rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="ما الذي ساعد الطالب؟ وما الخطوة التالية؟" /></label><button className="button primary" disabled={saved} onClick={() => { record({ id: uid(), lessonId: lesson.id, learnerId, goalId, date: new Date().toISOString(), ...summary, responses: results, note }); setSaved(true); }}><Save size={17} />{saved ? 'حُفظت الملاحظة على الجهاز' : 'حفظ الملاحظة'}</button><Link className="text-link" to="/progress">الانتقال إلى المتابعة<ChevronLeft size={16} /></Link><Link className="text-link" to={`/lessons/${id}`}>العودة إلى الدرس<ChevronLeft size={16} /></Link><small>المحاولات غير الملحوظة: {summary.unobserved}. تُستبعد من النتيجة. هذه جلسة واحدة وليست حكمًا على تحقق الهدف.</small></section>)
    : paused ? <section className="break-space"><h1>نأخذ استراحة</h1><p>عد عندما تكون مستعدًا. المحاولات محفوظة في هذه الجلسة.</p><button data-scan className="button primary" onClick={() => setPaused(false)}>أنا مستعد للعودة</button></section>
    : <><div className="session-progress" aria-hidden="true"><div><span style={{ width: `${(index + 1) / lesson.questions.length * 100}%` }} /></div></div>
      <section key={q.id} className="question-stage rise-in" style={{ fontSize: `${scale}em` }}><h1 className="reading-text" dir={lesson.language === 'en' ? 'ltr' : 'rtl'} lang={lesson.language}><ReadingText text={q.prompt} word={word} /></h1>
        {access.speech && <button data-scan className="listen-task" onClick={listen}><Volume2 size={21} />استمع</button>}{access.speech && access.readAlong && <button data-scan className="listen-task" onClick={() => readAlong(q.prompt, setWord)}><BookOpenText size={21} />اقرأ معي</button>}
        {error && <p role="status" className="info-note">{error}</p>}
        {target && <div className="target-tile"><TilePicture tile={target} /><span className="visually-hidden">{target.description ?? 'صورة السؤال'}</span></div>}{target?.signId && <SignVideo id={target.signId} auto={access.sign} />}
        <div className="student-options" dir={lesson.language === 'en' ? 'ltr' : 'rtl'}>{options.map(o => { const item = q.target ? undefined : findItem(pack, o.text); return <button data-scan key={o.index} aria-pressed={selected === o.index} className={selected === o.index ? 'selected' : ''} onClick={() => setSelected(o.index)}>{item && <TilePicture tile={item} />}<span lang={lesson.language}>{o.text}</span>{selected === o.index && <Check size={24} aria-hidden="true" />}</button>; })}</div></section>
      <CommunicationBoard collapsible startOpen={!!learner.supports?.communication || !!prefs.responds?.includes('point')} tiles={tiles} sound={access.speech} onBreak={() => { stop(); setPaused(true); }} onRepeat={() => { if (access.speech) listen(); }} onRequest={setRequest} />
      <dialog ref={panel} className="teacher-panel" dir="rtl" aria-labelledby="teacher-title"><div className="teacher-panel-head"><h2 id="teacher-title">لوحة المعلم</h2><button className="icon-button" aria-label="إغلاق اللوحة" onClick={() => panel.current?.close()}><X size={20} /></button></div>
        <p className="muted">المحاولة {index + 1} من {lesson.questions.length} · الهدف: {goals.find(g => g.id === goalId)?.text}</p>
        {request && <p className="info-note" role="status">طلب الطالب: {request}</p>}
        <p className="teacher-selected">{selected === null ? 'لم يُختر جواب بعد. إذا أشار الطالب، أغلق اللوحة واضغط إجابته على الشاشة.' : `الإجابة المحددة: ${q.options[selected]}${selected === q.answer ? ' (صحيحة)' : ' (غير صحيحة)'}`}</p>
        <h3>كيف أجاب؟ الضغط يسجّل وينتقل للمحاولة التالية</h3>
        <div className="support-grid">{scaleList.map(s => <button key={s.id} disabled={selected === null || (errorless && s.id === 'independent')} className={s.id === 'independent' ? 'button primary' : 'button secondary'} onClick={() => save(s.id)}>{s.label}</button>)}</div>
        {errorless && <small>خيار واحد: تعلّم بلا خطأ، فلا يُسجَّل باستقلالية.</small>}
        <button className="button secondary" onClick={() => save('not-observed')}>{notObserved.label}</button>
        <small>وسيلة الوصول لا تعني تلقين الإجابة. سجّل التلميح التعليمي فقط.</small>
        <div className="teacher-panel-tools"><button className="icon-button" aria-label="تكبير" disabled={scale >= 1.6} onClick={() => setScale(s => Math.min(1.6, s + .1))}><ZoomIn size={20} /></button><button className="icon-button" aria-label="تصغير" disabled={scale <= .9} onClick={() => setScale(s => Math.max(.9, s - .1))}><ZoomOut size={20} /></button><button className="button secondary" onClick={() => { panel.current?.close(); stop(); setPaused(true); }}>استراحة</button><Link className="button secondary" to={`/lessons/${id}`}>إنهاء الجلسة دون حفظ</Link></div>
      </dialog></>}
  </div>;
}

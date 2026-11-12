import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronLeft, Copy, Eye, Play, Square, Users } from 'lucide-react';
import { countOf } from '../../packages/domain';
import { roomCode, roomFromLesson, roomSummary, roomUrl } from '../../packages/domain/room';
import { confirmDialog } from './confirm';
import { accountsAvailable, closeRoom, currentRoom, openRoom, stepRoom, SyncError, watchBoard } from './teacherApi';
import { useWorkspace } from './store';
import { Avatar, Empty, PageHeading } from './Workspace';
import './room.css';
import './desk.css';

type Board = NonNullable<Parameters<Parameters<typeof watchBoard>[1]>[0]>;

/** The teacher's side of the live room: open a lesson's questions on the pupils' devices, move through them, and watch each answer arrive. */
export function LiveRoomPage() {
  const { data, account, notify } = useWorkspace(); const ready = data.lessons.filter(l => roomFromLesson(l, data.learners).questions.length > 0);
  const [lessonId, setLessonId] = useState(ready[0]?.id ?? ''); const [code, setCode] = useState(''); const [board, setBoard] = useState<Board | null>(null); const [busy, setBusy] = useState(false); const [copied, setCopied] = useState(false);
  useEffect(() => { if (!account) return; currentRoom().then(c => { if (c) setCode(c); }).catch(() => undefined); }, [account]);
  useEffect(() => { if (!code) { setBoard(null); return; } return watchBoard(code, setBoard); }, [code]);
  const run = useCallback(async (work: () => Promise<unknown>) => { setBusy(true); try { await work(); } catch (e) { notify(e instanceof SyncError ? e.message : 'تعذّر الاتصال بالخادم.'); } finally { setBusy(false); } }, [notify]);
  const lesson = data.lessons.find(l => l.id === lessonId) ?? ready[0]; const setup = lesson && roomFromLesson(lesson, data.learners);
  const start = () => run(async () => { if (!setup) return; if (!setup.seats.length) { notify('اختر طلاب الدرس من محرر الدرس أولًا.'); return; } const c = roomCode(crypto.getRandomValues(new Uint8Array(6))); await openRoom(c, setup.title, setup.questions, setup.seats); setCode(c); });
  const copy = async (url: string) => { try { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { notify('انسخ الرابط من الحقل يدويًا'); } };
  const head = <PageHeading title="غرفة الحصة المباشرة" description="افتح أسئلة الدرس على أجهزة الطلاب: يدخلون برمز قصير ويضغطون صورهم، وتصلك إجاباتهم لحظة بلحظة." />;
  if (!accountsAvailable) return <>{head}<section className="panel desk-panel"><p className="info-note desk-note">تعمل الغرفة المباشرة مع خادم المنصة، وهو غير مفعّل في هذه النسخة.</p></section></>;
  if (!account) return <>{head}<section className="panel desk-panel"><Empty title="سجّل الدخول لتفتح غرفة" description="الغرفة تربط جهازك بأجهزة الطلاب عبر خادم المنصة، فتحتاج حسابك. الدخول من «إعدادات المساحة»." /></section></>;
  if (!board) return <>{head}{ready.length ? <section className="panel desk-panel room-setup"><div className="section-heading"><h2>افتح غرفة من درس</h2></div>
    <div className="form-grid"><label>الدرس<select value={lesson?.id ?? ''} onChange={e => setLessonId(e.target.value)}>{ready.map(l => <option key={l.id} value={l.id}>{l.title || 'درس بلا عنوان'}</option>)}</select></label></div>
    {setup && <p className="muted desk-note">{countOf(setup.questions.length, 'سؤال', 'سؤالان', 'أسئلة')} · {setup.seats.length ? countOf(setup.seats.length, 'طالب', 'طالبان', 'طلاب') : 'لا طلاب في هذا الدرس بعد'}. يرى الطلاب أسماءهم الأولى وصورهم فقط.</p>}
    <div className="heading-actions"><button className="button primary" disabled={busy || !setup?.seats.length} onClick={start}><Play size={17} />افتح الغرفة</button></div></section>
    : <section className="panel desk-panel"><Empty title="لا درس فيه أسئلة بعد" description="أضف أسئلة اختيار إلى درس من محرر الدرس، ثم افتح له غرفة هنا." /></section>}</>;
  const q = board.questions[board.index]; const now = board.answers.filter(a => a.q === board.index); const url = roomUrl(window.location.origin, board.code); const last = board.index + 1 >= board.questions.length;
  const summary = roomSummary(board.questions, board.seats, board.answers);
  return <>{head}
    <section className="panel room-board">
      <header className="room-code"><div><span>رمز الغرفة</span><strong dir="ltr">{board.code}</strong></div><div className="room-link"><input readOnly dir="ltr" aria-label="رابط الغرفة" value={url} onFocus={e => e.currentTarget.select()} /><button type="button" className="button secondary" onClick={() => copy(url)}><Copy size={16} />{copied ? 'نُسخ' : 'نسخ الرابط'}</button></div></header>
      <p className="muted room-how">يفتح الطلاب <bdi dir="ltr">{window.location.host}/room</bdi> ويكتبون الرمز، ثم يضغط كل طالب صورته.</p>
      {board.ended ? <><h2>انتهت الغرفة: ما أجاب عنه كل طالب</h2>
        <div className="desk-scroll"><table className="data-table"><thead><tr><th scope="col">الطالب</th><th scope="col">أجاب عن</th><th scope="col">إجابات صحيحة</th></tr></thead><tbody>{summary.map(r => <tr key={r.seat.id}><th scope="row"><span className="achievement-who"><Avatar learner={r.seat} size="small" />{r.seat.label}</span></th><td>{r.answered} من {board.questions.length}</td><td>{r.correct}</td></tr>)}</tbody></table></div>
        <p className="muted desk-note">النتيجة تدريب داخل الحصة، ولا تثبت وحدها تحقق هدف فردي. الجدول بترتيب طلابك ولا يقارن بينهم.</p>
        <div className="heading-actions"><button className="button primary" disabled={busy} onClick={() => run(async () => { await closeRoom(board.code); setCode(''); })}><Check size={17} />أغلق الغرفة</button></div></>
        : <>
          <div className="room-now"><span className="plan-state">{board.index < 0 ? 'لم تبدأ الأسئلة' : `السؤال ${board.index + 1} من ${board.questions.length}`}</span>{q && <h2 dir="auto">{q.prompt}</h2>}{q && board.revealed && <p className="room-answer"><Check size={18} aria-hidden="true" />الإجابة الصحيحة: <bdi>{q.options[q.answer]}</bdi></p>}</div>
          <ul className="room-seats-board" aria-label="الطلاب في الغرفة">{board.seats.map(s => { const a = now.find(x => x.seat === s.id); const state = !q ? 'wait' : !a ? 'none' : board.revealed ? (a.selected === q.answer ? 'right' : 'other') : 'in'; return <li key={s.id} className={`is-${state}`}><Avatar learner={s} /><strong>{s.label}</strong><small>{!q ? 'في الانتظار' : !a ? 'لم يجب بعد' : board.revealed ? <bdi>{q.options[a.selected]}</bdi> : 'وصلت إجابته'}</small></li>; })}</ul>
          <p className="room-tally" role="status"><Users size={17} aria-hidden="true" />{q ? `أجاب ${now.length} من ${board.seats.length}` : 'ينتظر الطلاب أن تبدأ'}</p>
          <div className="heading-actions">{board.index < 0 ? <button className="button primary" disabled={busy} onClick={() => run(() => stepRoom(board.code, 'next'))}><Play size={17} />ابدأ السؤال الأول</button>
            : !board.revealed ? <button className="button primary" disabled={busy} onClick={() => run(() => stepRoom(board.code, 'reveal'))}><Eye size={17} />أظهر الإجابة</button>
            : <button className="button primary" disabled={busy} onClick={() => run(() => stepRoom(board.code, last ? 'end' : 'next'))}>{last ? 'أنهِ الأسئلة واعرض النتيجة' : 'السؤال التالي'}<ChevronLeft size={17} /></button>}
            <button className="button secondary" disabled={busy} onClick={async () => { if (await confirmDialog('إنهاء الغرفة الآن؟ يتوقف استقبال الإجابات وتظهر النتيجة.', { ok: 'إنهاء الغرفة', danger: false })) void run(() => stepRoom(board.code, 'end')); }}><Square size={16} />إنهاء</button></div>
        </>}
    </section>
  </>;
}

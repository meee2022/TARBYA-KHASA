import { useEffect, useState } from 'react';
import { Activity, Check, Flag, MessageSquareText, Play, Square, Star, Trash2 } from 'lucide-react';
import type { Learner, Lesson } from '../../packages/domain';
import { addClassEvent, classEventLabels, currentSession, groupTargets, removeClassEvent, sessionMinutes, sessionOpen, starsByLearner, timeLabel, totalStars } from '../../packages/domain/classroom';
import { art } from '../../packages/domain/catalog';
import { useSiteConfig } from './site';
import { Avatar } from './Workspace';
import { SymbolArt } from './accessibility';
import { Seg } from './fields';
import './planning.css';

const targetOptions = groupTargets.map(n => [n, `${n} نجوم`] as const);
/** The board the teacher keeps open during the class: stars for the group, a movement break, and a line for anything that happened. */
export function ClassBoard({ lesson, learners, onChange }: { lesson: Lesson; learners: Learner[]; onChange: (lesson: Lesson) => void }) {
  const { site } = useSiteConfig(); const [target, setTarget] = useState<number>(() => { try { return Number(sessionStorage.getItem(`tarbya.class.target.${lesson.id}`)) || 10; } catch { return 10; } });
  const [note, setNote] = useState(''); const [moving, setMoving] = useState(-1);
  useEffect(() => { try { sessionStorage.setItem(`tarbya.class.target.${lesson.id}`, String(target)); } catch { /* the default is fine */ } }, [target, lesson.id]);
  const events = currentSession(lesson.classLog); const open = sessionOpen(events); const stars = totalStars(events); const each = starsByLearner(events); const reached = stars >= target && stars > 0;
  const add = (kind: Parameters<typeof addClassEvent>[1]['kind'], extra: { learnerId?: string; text?: string } = {}) => onChange(addClassEvent(lesson, { kind, ...extra }));
  const moves = site.catalog.movement; const move = moving >= 0 && moves.length ? moves[moving % moves.length] : undefined;
  const startBreak = () => { setMoving(m => m + 1 + Math.floor(Math.random() * Math.max(1, moves.length))); add('break'); };
  const minutes = sessionMinutes(events);
  return <section className="panel door-panel class-board">
    <div className="section-heading"><h2>لوحة الصف الحي</h2><div className="heading-actions">{open ? <button className="button secondary" onClick={() => add('end')}><Square size={15} />انتهت الحصة</button> : <button className="button primary" onClick={() => add('start')}><Play size={16} />بدأت الحصة</button>}</div></div>
    <p className="muted">تعزيز للمجموعة كلها أثناء الحصة، واستراحة حركة عند الحاجة، وسطر لكل ما «صار». يُحفظ مع الدرس، ولا يقارن بين الطلاب.</p>
    {move && <div className="class-move" role="status"><div className="move-break"><SymbolArt entry={move} /><strong>{move.label}</strong></div><button className="button primary" onClick={() => setMoving(-1)}><Check size={16} />عدنا إلى الدرس</button></div>}
    <div className="class-target"><Seg label="هدف المجموعة" value={target} options={targetOptions} onChange={setTarget} /><div className="class-meter-row"><div className="class-meter" role="progressbar" aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.min(stars, target)} aria-label="نجوم المجموعة"><i style={{ width: `${Math.min(100, Math.round(stars / target * 100))}%` }} /></div><span>{stars} من {target}</span></div>{reached && <div className="class-celebrate rise-in" role="status"><img src={art('ui-rosette')} alt="" /><strong>وصلنا الهدف معًا</strong><small>اختاروا تعزيزكم من لوحة التعزيز، ثم ابدؤوا جولة جديدة.</small></div>}</div>
    <div className="class-learners">{learners.map(l => <article key={l.id}><Avatar learner={l} size="small" /><strong>{l.name.split(' ·')[0]}</strong><span className="class-stars" aria-label={`${each[l.id] ?? 0} نجوم`}>{Array.from({ length: Math.min(each[l.id] ?? 0, 8) }, (_, i) => <Star key={i} size={16} fill="currentColor" aria-hidden="true" />)}{(each[l.id] ?? 0) > 8 && <b>+{(each[l.id] ?? 0) - 8}</b>}</span><button type="button" className="button secondary" onClick={() => add('star', { learnerId: l.id })} aria-label={`نجمة لـ${l.name.split(' ·')[0]}`}><Star size={16} />نجمة</button></article>)}{!learners.length && <p className="muted">اختر طلاب الدرس من محرر الدرس لتظهر بطاقاتهم هنا.</p>}</div>
    <div className="class-actions"><button type="button" className="button secondary" disabled={!learners.length} onClick={() => onChange(learners.reduce((acc, l) => addClassEvent(acc, { kind: 'star', learnerId: l.id }), lesson))}><Star size={16} />نجمة للجميع</button><button type="button" className="button secondary" onClick={startBreak}><Activity size={16} />استراحة حركة</button></div>
    <form className="class-note" onSubmit={e => { e.preventDefault(); if (!note.trim()) return; add('note', { text: note }); setNote(''); }}><label>صار كذا…<input value={note} maxLength={300} onChange={e => setNote(e.target.value)} placeholder="مثال: أنهى الجميع التهيئة قبل الوقت" /></label><button type="submit" className="button primary" disabled={!note.trim()}><MessageSquareText size={16} />سجّل</button></form>
    <div className="section-heading"><h3>سجل الحصة الحي</h3><span className="muted">{minutes !== null ? `${minutes} دقيقة` : ''}{events.length ? ` · ${events.length} حدثًا` : ''}</span></div>
    {events.length ? <ol className="class-timeline">{[...events].reverse().map(e => { const who = learners.find(l => l.id === e.learnerId); const Icon = e.kind === 'star' ? Star : e.kind === 'break' ? Activity : e.kind === 'note' ? MessageSquareText : Flag; return <li key={e.id} className={`event-${e.kind}`}><time dateTime={e.at}>{timeLabel(e.at)}</time><Icon size={16} aria-hidden="true" /><span>{e.kind === 'star' && who ? `نجمة لـ${who.name.split(' ·')[0]}` : e.kind === 'note' ? e.text : classEventLabels[e.kind]}</span><button type="button" className="icon-button" aria-label="حذف هذا الحدث" onClick={() => onChange(removeClassEvent(lesson, e.id))}><Trash2 size={15} /></button></li>; })}</ol> : <p className="muted">اضغط «بدأت الحصة» وسجّل ما يحدث: نجمة، استراحة، أو سطر.</p>}
  </section>;
}

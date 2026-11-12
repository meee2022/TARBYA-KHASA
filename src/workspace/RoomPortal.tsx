import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, Hourglass, LogIn } from 'lucide-react';
import { art } from '../../packages/domain/catalog';
import { ROOM_CODE_RE } from '../../packages/domain/room';
import { accountsAvailable, answerRoom, watchRoom } from './teacherApi';
import { useSiteConfig } from './site';
import { Avatar } from './Workspace';
import './parent.css';
import './room.css';

type Room = Parameters<Parameters<typeof watchRoom>[1]>[0];
const seatKey = (code: string) => `tarbya.room.${code}`;

/** The pupil's side of the live room: type the code, tap your own picture, then answer the question on screen. No account, no typing of names. */
export default function RoomPortal() {
  const code = (useLocation().pathname.split('/')[2] ?? '').toUpperCase(); const navigate = useNavigate(); const { site } = useSiteConfig();
  const [room, setRoom] = useState<Room>(undefined); const [typed, setTyped] = useState('');
  const [seat, setSeat] = useState(() => { try { return sessionStorage.getItem(seatKey(code)) ?? ''; } catch { return ''; } });
  const [picked, setPicked] = useState<{ q: number; selected: number } | null>(null); const [error, setError] = useState('');
  const valid = ROOM_CODE_RE.test(code);
  useEffect(() => { if (!accountsAvailable || !valid) { setRoom(null); return; } setRoom(undefined); return watchRoom(code, setRoom); }, [code, valid]);
  useEffect(() => { document.title = `غرفة الحصة · ${site.brandName}`; }, [site.brandName]);
  const sit = (id: string) => { setSeat(id); try { sessionStorage.setItem(seatKey(code), id); } catch { /* the seat then lasts for this page only */ } };
  const enter = (e: FormEvent) => { e.preventDefault(); const c = typed.trim().toUpperCase(); if (ROOM_CODE_RE.test(c)) navigate(`/room/${c}`); else setError('الرمز ستة أحرف وأرقام. اطلبه من معلمك.'); };
  const choose = async (selected: number) => { if (!room || room.index < 0 || room.revealed) return; setPicked({ q: room.index, selected }); setError(''); try { await answerRoom(code, seat, room.index, selected); } catch { setPicked(null); setError('لم تصل إجابتك. حاول مرة أخرى.'); } };
  const me = room?.seats.find(s => s.id === seat); const mine = room && picked?.q === room.index ? picked.selected : null; const sent = !!room && (mine !== null || room.answered.includes(seat));
  return <div className="studio parent-portal room-portal" dir="rtl">
    <header className="parent-top"><span className="brand-wordmark" role="img" aria-label={site.brandName} /><span className="eyebrow">غرفة الحصة</span></header>
    <main className="parent-main room-main">
      {!code ? <form className="panel room-enter rise-in" onSubmit={enter}><img src={art('ui-sprout')} alt="" /><h1>ادخل غرفة الحصة</h1><label>رمز الغرفة<input dir="ltr" autoFocus inputMode="text" autoCapitalize="characters" maxLength={6} value={typed} onChange={e => { setTyped(e.target.value); setError(''); }} placeholder="ABC234" aria-invalid={!!error} /></label>{error && <p className="alert" role="alert">{error}</p>}<button className="button primary"><LogIn size={18} />ادخل</button></form>
        : room === undefined ? <div className="parent-skeleton" aria-busy="true" aria-label="جارٍ التحميل"><i /><i /><i /></div>
        : room === null ? <section className="panel parent-invalid rise-in"><img src={art('ui-sprout')} alt="" /><h1>لم نجد هذه الغرفة</h1><p>{accountsAvailable ? 'ربما انتهت الحصة أو كُتب الرمز خطأ. اطلب الرمز من معلمك.' : 'غرفة الحصة غير متاحة في هذه النسخة من المنصة.'}</p><button className="button secondary" onClick={() => navigate('/room')}>اكتب رمزًا آخر</button></section>
        : !me ? <section className="panel room-seats rise-in"><h1>{room.title}</h1><p>اضغط صورتك</p><div className="room-seat-grid">{room.seats.map(s => <button type="button" key={s.id} onClick={() => sit(s.id)}><Avatar learner={s} /><strong>{s.label}</strong></button>)}</div></section>
        : room.ended ? <section className="panel room-wait rise-in"><Check size={44} aria-hidden="true" /><h1>انتهت الحصة</h1><p>شكرًا لك يا {me.label}.</p></section>
        : room.index < 0 || !room.question ? <section className="panel room-wait rise-in"><Hourglass size={44} aria-hidden="true" /><h1>أهلًا {me.label}</h1><p>ننتظر أن يبدأ المعلم.</p><button type="button" className="text-link" onClick={() => sit('')}>لست {me.label}؟</button></section>
        : <section className="panel room-question rise-in" key={room.index}><p className="room-count">السؤال {room.index + 1} من {room.total}</p><h1>{room.question.prompt}</h1>
          <div className={`room-options count-${room.question.options.length}`}>{room.question.options.map((o, n) => { const right = room.revealed && room.question!.answer === n; return <button type="button" key={n} disabled={room.revealed} aria-pressed={mine === n} className={`${mine === n ? 'is-mine' : ''} ${right ? 'is-right' : ''}`} onClick={() => choose(n)}>{o}{right && <Check size={22} aria-label="الإجابة الصحيحة" />}</button>; })}</div>
          <p className="room-status" role="status">{room.revealed ? 'هذه هي الإجابة الصحيحة. ننتظر السؤال التالي.' : sent ? 'وصلت إجابتك. يمكنك تغييرها قبل أن يُظهر المعلم الإجابة.' : 'اضغط إجابتك.'}</p>
          {error && <p className="alert" role="alert">{error}</p>}</section>}
    </main>
  </div>;
}

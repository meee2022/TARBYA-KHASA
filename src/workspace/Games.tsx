import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronLeft, Ear, Hand, Lightbulb, Lock, Pause, Play, RotateCcw, Save, Volume2, X } from 'lucide-react';
import { art } from '../../packages/domain/catalog';
import { uid } from '../../packages/domain';
import { accessFromPreferences, AccessSettings, brailleCharacter, brailleLetters, brailleReadingOrder, defaultAccess, GameRound, gameOptions, matchesBraille, PracticeAttempt, practiceSummary, Tile } from '../../packages/domain/games';
import { ContentPack, PlayableGame, playablePack, templateBlocker, TemplateInfo } from '../../packages/domain/packs';
import { useAllPacks, useWorkspace } from './store';
import { Brand, Empty, PageHeading } from './Workspace';
import { accessClass, CommunicationBoard, HoldButton, SignVideo, steadyTap, TileFace, TilePicture, useDwell, useSpeech, useSwitchScan } from './accessibility';
import { BuildBoard, DoorReveal, MatchBoard, MemoryBoard, PuzzleBoard, RobotBoard } from './boards';
import './games.css';
import './packs.css';
import { useSiteConfig } from './site';

export function GamesLibrary() {
  const { site } = useSiteConfig(); const { all } = useAllPacks(); const { state } = useLocation();
  const [packId, setPackId] = useState((state as { packId?: string } | null)?.packId ?? all[0]?.id ?? ''); const pack = all.find(p => p.id === packId) ?? all[0];
  const templates = site.catalog.templates.filter(t => t.enabled);
  const braille = templates.find(t => t.id === 'braille');
  return <><PageHeading banner="banner-games" title="مساحة التعلّم" description="اختر محتوى الدرس، ثم النشاط. كل نشاط يتكيّف مع ملف الطالب تلقائيًا."><Link className="button secondary" to="/packs">إدارة المحتوى<ArrowLeft size={17} /></Link></PageHeading>
    <div className="access-promises"><span><Hand size={18} />لا تشترط السحب</span><span><Ear size={18} />الصوت اختياري</span><span><Check size={18} />بلا مؤقّت ولا خسارة</span></div>
    {all.length ? <section className="pack-chooser" aria-label="اختر المحتوى"><h2>محتوى النشاط</h2><div className="pack-chips">{all.map(p => <button key={p.id} className={p.id === pack?.id ? 'active' : ''} aria-pressed={p.id === pack?.id} onClick={() => setPackId(p.id)}>{p.title}<small>{p.subject}</small></button>)}</div></section> : <Empty title="لا يوجد محتوى بعد" description="أنشئ حزمة محتوى من صفحة المحتوى والأوراق." />}
    {pack && <div className="game-library template-grid">{templates.filter(t => t.id !== 'braille').map((t, n) => { const blocked = templateBlocker(t.id, pack); return <TemplateCard key={t.id} info={t} index={n} to={blocked ? undefined : `/learn/${pack.id}/${t.id}`} blocked={blocked} />; })}{braille && <TemplateCard info={braille} index={templates.length} to="/learn/braille" blocked={null} />}</div>}
    {!templates.length && <Empty title="لا توجد ألعاب متاحة الآن" description="يمكن للإدارة تفعيل الألعاب من لوحة التحكم." />}
  </>;
}
function TemplateCard({ info, to, blocked, index }: { info: TemplateInfo; to?: string; blocked: string | null; index: number }) {
  const body = <><div className="game-card-visual" aria-hidden="true"><img src={info.imageId ?? art(`tpl-${info.id}`)} alt="" /></div><div className="game-card-body"><span className="game-skill">{info.skill}</span><h2>{info.title}</h2><p>{info.description}</p>{blocked ? <small className="blocked-note">{blocked}</small> : <span className="tile-go" aria-hidden="true"><ArrowLeft size={18} /></span>}</div></>;
  const style = { animationDelay: `${Math.min(index, 12) * 35}ms` };
  return to ? <Link to={to} style={style} className={`game-library-card rise-in game-${info.color}`}>{body}</Link> : <article style={style} className={`game-library-card rise-in is-blocked game-${info.color}`}>{body}</article>;
}
export function GameRoute() {
  const { site } = useSiteConfig(); const { all } = useAllPacks(); const { packId, template, kind } = useParams();
  // Settings refresh every 30 seconds. A game in progress keeps what it started with, so an admin edit cannot discard unsaved attempts.
  const playing = useRef<{ pack?: ContentPack; info: TemplateInfo } | null>(null); const setPlaying = useCallback((on: boolean, value?: { pack?: ContentPack; info: TemplateInfo }) => { playing.current = on ? value! : null; }, []);
  const unavailable = <div dir="rtl" className="learning-room"><Empty title="النشاط غير متاح" description="اختر نشاطًا آخر من مساحة التعلّم." /><Link className="button secondary" to="/games">العودة إلى الألعاب</Link></div>;
  if (kind === 'braille') { const info = playing.current?.info ?? site.catalog.templates.find(t => t.id === 'braille' && t.enabled); return info ? <GameSetup key="braille" build={() => brailleGame(info)} onPlaying={on => setPlaying(on, { info })} /> : unavailable; }
  const held = playing.current; const info = held?.info ?? site.catalog.templates.find(t => t.id === template && t.enabled); const pack = held?.pack ?? all.find(p => p.id === packId);
  if (!info || !pack || (!held && templateBlocker(info.id, pack))) return unavailable;
  return <GameSetup key={`${pack.id}-${info.id}`} build={choices => playablePack(pack, info, choices)} pack={pack} onPlaying={on => setPlaying(on, { pack, info })} />;
}
const brailleGame = (info: TemplateInfo): PlayableGame => ({ id: 'braille', template: 'braille', title: info.title, description: info.description, skill: info.skill, color: info.color, language: 'ar', rounds: brailleLetters.map((l, i) => ({ id: `braille-${i}`, prompt: `كوّن حرف ${l.name}: ${l.letter}`, options: [], answerId: l.letter, hint: `النقاط المطلوبة لحرف ${l.name}: ${l.dots.join('، ')}.` })) });
const toggles = [['large', 'نص ورموز أكبر'], ['contrast', 'تباين مرتفع'], ['textAlternative', 'وصف نصي بدل الصورة'], ['speech', 'قراءة صوتية'], ['steady', 'منع الضغط المكرر'], ['instant', 'اختيار مباشر دون زر تحقّق'], ['calm', 'بلا حركة'], ['scan', 'التنقّل بمفتاح واحد'], ['dwell', 'الاختيار بتثبيت المؤشر']] as const;

function GameSetup({ build, pack, onPlaying }: { build: (choices: number) => PlayableGame; pack?: ContentPack; onPlaying: (on: boolean) => void }) {
  const { data, saveLearner, error: storageError } = useWorkspace();
  const [learnerId, setLearnerId] = useState(''); const [access, setAccess] = useState<AccessSettings>({ ...defaultAccess, target: 'normal', hand: 'any' }); const [started, setStarted] = useState(0); const [message, setMessage] = useState('');
  const update = <K extends keyof AccessSettings>(key: K, value: AccessSettings[K]) => setAccess(a => ({ ...a, [key]: value }));
  const game = useMemo(() => build(access.choices), [build, access.choices]);
  const needsHearing = game.template === 'listen' && !access.speech;
  if (started) return <GamePlayer key={started} game={game} access={access} learnerId={learnerId} onRestart={() => { onPlaying(false); setStarted(0); }} />;
  return <div dir="rtl" className={`learning-room ${accessClass(access)}`}><header className="learning-topbar"><Brand /><Link className="button secondary" to="/games">العودة إلى الألعاب<ArrowLeft size={17} /></Link></header>
    <main className="game-setup"><div className="setup-heading"><h1>{game.title}</h1><p>{game.description}</p></div><div className="game-setup-layout"><section className="panel setup-preferences"><h2>نجهّز النشاط للطالب</h2>
      <label>ملف الطالب<select value={learnerId} onChange={e => { setLearnerId(e.target.value); const s = data.learners.find(l => l.id === e.target.value); setAccess(s ? accessFromPreferences(s.preferences) : { ...defaultAccess, target: 'normal', hand: 'any' }); }}><option value="">تجربة دون ملف طالب</option>{data.learners.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      {toggles.map(([key, label]) => <label className="access-toggle" key={key}><span>{label}</span><input type="checkbox" checked={!!access[key]} onChange={e => update(key, e.target.checked)} /></label>)}
      <div className="form-grid"><label>عدد الاختيارات<select value={access.choices} onChange={e => update('choices', Number(e.target.value) as AccessSettings['choices'])}><option value="1">خيار واحد (تعلّم بلا خطأ)</option><option value="2">خياران</option><option value="3">ثلاثة خيارات</option><option value="4">أربعة خيارات</option></select></label>
        <label>حجم الأزرار<select value={access.target} onChange={e => update('target', e.target.value as AccessSettings['target'])}><option value="normal">عادي</option><option value="large">كبير</option><option value="xl">كبير جدًا</option></select></label>
        <label>جهة الأزرار<select value={access.hand} onChange={e => update('hand', e.target.value as AccessSettings['hand'])}><option value="any">كامل الشاشة</option><option value="right">جهة اليد اليمنى</option><option value="left">جهة اليد اليسرى</option></select></label>
        {access.scan && <label>مدة التوقّف على الزر<select value={access.scanSeconds} onChange={e => update('scanSeconds', Number(e.target.value))}>{[2, 4, 6, 8, 12].map(n => <option key={n} value={n}>{n} ثوانٍ</option>)}</select></label>}</div>
      {access.scan && <><label className="access-toggle"><span>قراءة اسم كل زر أثناء التنقّل</span><input type="checkbox" checked={!!access.scanSpeak} onChange={e => update('scanSpeak', e.target.checked)} /></label><p className="info-note">يتنقّل التحديد تلقائيًا. المسافة أو Enter للاختيار، وEscape للإيقاف. مفتاح مساعد مهيّأ لإرسال هذه المفاتيح يعمل بالطريقة نفسها.</p></>}
      {access.choices === 1 && <p className="info-note">خيار واحد للتعلّم بلا خطأ. يُسجَّل كتدريب بمساعدة، ولا يُحسب استقلالية.</p>}
      {needsHearing && <p className="alert" role="alert">هذا النشاط يقيس الفهم السمعي ويحتاج الصوت. لطالب لا يعتمد على السمع، اختر «أين الصورة؟».</p>}
      {learnerId && <button className="button secondary" onClick={() => { const s = data.learners.find(l => l.id === learnerId)!; saveLearner({ ...s, preferences: { ...s.preferences, access, responds: [...(s.preferences.responds ?? []).filter(r => r !== 'dwell'), ...(access.dwell ? ['dwell' as const] : [])], largeText: access.large, highContrast: access.contrast, sound: access.speech, choices: access.choices, reducedMotion: !!access.calm, targetSize: access.target, hand: access.hand, steady: access.steady, instant: access.instant, scan: access.scan, scanSpeak: access.scanSpeak, scanSeconds: access.scanSeconds } }); setMessage('حُفظت الإعدادات في ملف الطالب.'); }}><Save size={17} />حفظ الإعدادات لهذا الطالب</button>}
      <button className="button primary" disabled={needsHearing || !game.rounds.length} onClick={() => { onPlaying(true); setStarted(Date.now()); }}><Play size={19} />نبدأ النشاط</button><p role="status">{message}</p>{storageError && <p role="alert" className="alert">{storageError}</p>}</section>
      <aside className="setup-guide"><h2>المعلم يعرف</h2><ol><li>{game.rounds.length} مهام قصيرة. لا يوجد مؤقّت.</li><li>{pack ? `المحتوى: ${pack.title} (${pack.subject}).` : 'تدريب تعريفي مستقل.'}</li><li>الاستراحة واللوحة متاحتان دائمًا ولا تؤثران في النتيجة.</li></ol><p>النتيجة للتدريب، ولا تثبت وحدها تحقق هدف فردي.</p>{access.textAlternative && <p>الوصف النصي يغيّر المهارة المقاسة من تمييز بصري إلى فهم وصف.</p>}{game.template === 'braille' && <><div className="braille-mini" aria-hidden="true">⠁ ⠃ ⠙</div><p>النقاط 1–2–3 يسار الخلية و4–5–6 يمينها، ولا تنعكس مع العربية. هذا تدريب بصري ولفظي، ولا يُنشئ نقاطًا بارزة.</p><a href="https://www.perkins.org/wp-content/uploads/2021/07/world-braille-usage-third-edition.pdf#page=182" target="_blank" rel="noreferrer">مرجع الحروف: World Braille Usage، صفحة 166</a></>}</aside></div></main></div>;
}
function GamePlayer({ game, access, learnerId, onRestart }: { game: PlayableGame; access: AccessSettings; learnerId: string; onRestart: () => void }) {
  const { data, savePractice, error: storageError } = useWorkspace(); const { site } = useSiteConfig();
  const [index, setIndex] = useState(0); const [choice, setChoice] = useState(''); const [dots, setDots] = useState<number[]>([]); const [opened, setOpened] = useState(false);
  const [hint, setHint] = useState(false); const [checked, setChecked] = useState(false); const [attempts, setAttempts] = useState<PracticeAttempt[]>([]); const [done, setDone] = useState(false); const [seen, setSeen] = useState(1);
  const [paused, setPaused] = useState(false); const [scan, setScan] = useState(access.scan); const [saved, setSaved] = useState(false); const [message, setMessage] = useState(''); const [feedback, setFeedback] = useState<'yes' | 'no' | ''>('');
  const root = useRef<HTMLDivElement>(null); const panel = useRef<HTMLDialogElement>(null); const prompt = useRef<HTMLHeadingElement>(null); const { speak, sayTile, say, stop: stopSpeech, error } = useSpeech(); const queuedWord = useRef(0);
  const stop = useCallback(() => { clearTimeout(queuedWord.current); stopSpeech(); }, [stopSpeech]);
  useEffect(() => () => clearTimeout(queuedWord.current), []);
  const round: GameRound | undefined = game.rounds[index]; const summary = practiceSummary(attempts); const stopScan = useCallback(() => setScan(false), []);
  const tiles = useMemo(() => { const learner = data.learners.find(l => l.id === learnerId); const chosen = learner?.supports?.communication; return chosen ? site.catalog.communication.filter(t => chosen.includes(t.id)) : site.catalog.communication.slice(0, 6); }, [data.learners, learnerId, site.catalog.communication]);
  const options = useMemo(() => round ? gameOptions(round, access.choices) : [], [round, access.choices]);
  const learnerProfile = data.learners.find(l => l.id === learnerId);
  const tap = useMemo(() => steadyTap(access.steady), [access.steady]);
  useSwitchScan(root, scan && !done, access.scanSeconds, `${index}-${checked}-${paused}-${opened}-${choice}`, stopScan, access.scanSpeak ? speak : undefined);
  useDwell(root, !!access.dwell && !done);
  useEffect(() => { if (!scan) prompt.current?.focus(); }, [index, paused, done, scan]);
  const finish = () => { stop(); setDone(true); setScan(false); };
  if (!round) return <div className="learning-room" dir="rtl"><Empty title="لا توجد مهام" description="أضف عناصر إلى الحزمة." /></div>;
  const announce = (text: string) => { setMessage(text); if (access.speech) speak(text); };
  const repeat = () => {
    const instruction = access.shortInstructions ? '' : round.prompt; const word = round.listen ?? (round.target && !round.target.hideLabel ? round.target : undefined);
    setMessage(round.listen ? round.prompt : round.prompt + (access.textAlternative && round.target?.description ? ` ${round.target.description}` : ''));
    if (!access.speech) return;
    if (word?.audioId && !instruction) { sayTile(word); return; }
    if (word?.audioId) { clearTimeout(queuedWord.current); speak(instruction); queuedWord.current = window.setTimeout(() => sayTile(word), 1800); return; }
    say(...[instruction ? { text: instruction, lang: 'ar' as const } : null, word ? { text: word.label, lang: word.lang } : null].filter((x): x is { text: string; lang: 'ar' | 'en' } => !!x));
  };
  const pause = () => { stop(); setPaused(true); setMessage('نأخذ استراحة. عد عندما تكون مستعدًا.'); };
  const settle = (correct: boolean) => { setChecked(true); setFeedback(correct ? 'yes' : 'no'); };
  const answer = (id: string) => {
    if (checked) return;
    const correct = id === round.answerId;
    // One option is errorless learning: it stays practice and never counts as independent.
    setAttempts(a => [...a, { roundId: round.id, selected: id, correct, hintUsed: hint || options.length === 1 }]); settle(correct);
    announce(correct ? 'أحسنت.' : `لنتعلّمها معًا. ${round.hint}`);
  };
  const check = () => {
    if (checked) return;
    if (game.template !== 'braille') { answer(choice); return; }
    const correct = matchesBraille(dots, brailleLetters[index].dots);
    setAttempts(a => [...a, { roundId: round.id, selected: [...dots].sort().join(','), correct, hintUsed: hint }]); settle(correct);
    announce(correct ? 'أحسنت.' : `لنتعلّمها معًا. ${round.hint}`);
  };
  const pick = (tile: Tile) => { setChoice(tile.id); if (access.speech && !tile.hideLabel) sayTile(tile); if (access.instant) answer(tile.id); };
  const next = () => { stop(); if (index + 1 === game.rounds.length) finish(); else setIndex(i => i + 1); setChoice(''); setDots([]); setHint(false); setChecked(false); setOpened(false); setMessage(''); setFeedback(''); };
  const usesBoard = !!round.board; const isCards = game.template === 'cards';
  const boardProps = { round, hinted: hint, speakTile: (t: Tile) => { if (access.speech) sayTile(t); }, say: announce, onDone: (result: PracticeAttempt[], text: string) => { setAttempts(a => [...a, ...result]); settle(true); setMessage(text); } };
  return <div ref={root} dir="rtl" onClickCapture={tap} className={`learning-room play-room ${accessClass(access)}`}>
    {done && <header className="learning-topbar"><Brand /><Link className="button secondary" to="/games">العودة إلى الألعاب<ArrowLeft size={17} /></Link></header>}
    {done ? <main className="game-complete panel rise-in"><img className="complete-art" src={art('ui-rosette')} alt="" /><h1 ref={prompt} tabIndex={-1}>لكل محاولة قيمة</h1>{isCards ? <p>شاهدت {seen} بطاقات في «{game.title}».</p> : <><p>أنهيت {game.rounds.length} مهام في «{game.title}».</p><dl><div><dt>المحاولة الأولى الصحيحة</dt><dd>{summary.correct} من {summary.total}</dd></div><div><dt>صحيحة دون تلميح</dt><dd>{summary.independent} من {summary.total}</dd></div></dl></>}<p>تُحفظ المحاولة الأولى فقط، والاستراحة لا تُخصم من النتيجة.</p>{!isCards && <button className="button primary" disabled={saved} onClick={() => setSaved(savePractice({ id: uid(), gameId: game.id, title: game.title, learnerId, date: new Date().toISOString(), attempts, access }))}>{saved ? 'أُضيفت إلى سجل التدريب' : 'حفظ سجل التدريب'}<Save size={17} /></button>}{storageError && <p role="alert" className="alert">{storageError}</p>}<Link className="button secondary" to="/progress">عرض المتابعة</Link><button className="button secondary" onClick={onRestart}><RotateCcw size={17} />تجربة جديدة</button></main>
    : <main className="game-stage"><div className="play-bar"><div className="play-dots" role="img" aria-label={`الخطوة ${index + 1} من ${game.rounds.length}`}>{game.rounds.map((r, n) => <i key={r.id} className={n < index ? 'done' : n === index ? 'now' : ''} />)}</div><HoldButton className="teacher-corner" onOpen={() => panel.current?.showModal()}><Lock size={15} aria-hidden="true" />المعلم</HoldButton></div>
      <dialog ref={panel} className="teacher-panel" dir="rtl" aria-label="لوحة المعلم"><div className="teacher-panel-head"><h2>لوحة المعلم</h2><button className="icon-button" aria-label="إغلاق اللوحة" onClick={() => panel.current?.close()}><X size={20} /></button></div><p className="muted">{game.title} · الخطوة {index + 1} من {game.rounds.length}</p><button className="button secondary" onClick={() => { setScan(s => !s); panel.current?.close(); }}>{scan ? 'إيقاف المسح بمفتاح واحد' : 'تشغيل المسح بمفتاح واحد'}</button><Link className="button secondary" to="/games">إنهاء النشاط دون حفظ</Link></dialog>
      {paused && <section className="break-space"><Pause size={68} strokeWidth={1.4} aria-hidden="true" /><h1 ref={prompt} tabIndex={-1}>نأخذ استراحة</h1><p>لا يوجد مؤقّت. عد عندما تكون مستعدًا.</p><button data-scan className="button primary" onClick={() => { setPaused(false); setMessage(''); }}>أنا مستعد للعودة<Play size={18} /></button></section>}
      <div hidden={paused}><section key={round.id} className="game-task rise-in" aria-labelledby="game-question">
        <h1 id="game-question" ref={paused ? undefined : prompt} tabIndex={-1}>{round.prompt}</h1>
        {round.listen && !access.speech && <p className="alert">يحتاج هذا النشاط إلى الصوت.</p>}
        {isCards ? <button data-scan className="card-stage" aria-label={`${round.target!.label}. اضغط للتالية`} onClick={() => { if (access.speech) sayTile(round.target!); if (index + 1 === game.rounds.length) finish(); else { setIndex(i => i + 1); setSeen(s => s + 1); } }}><TilePicture tile={round.target!} /><span className="tile-label" dir="auto" lang={round.target!.lang}>{round.target!.label}</span></button>
        : round.reveal ? <DoorReveal tile={round.target!} opened={opened} onOpen={() => setOpened(true)} />
        : round.target && !usesBoard && <div className="target-tile"><TileFace tile={round.target} textAlternative={access.textAlternative} /></div>}
        {round.target?.signId && <SignVideo id={round.target.signId} />}{round.listen?.signId && <SignVideo id={round.listen.signId} />}
        {game.template === 'match' && <MatchBoard {...boardProps} />}{game.template === 'memory' && <MemoryBoard {...boardProps} />}{game.template === 'puzzle' && <PuzzleBoard {...boardProps} />}{game.template === 'build' && <BuildBoard {...boardProps} />}
        {game.template === 'robot' && <RobotBoard key={round.id} options={options} disabled={checked} onSelect={tile => { setChoice(tile.id); answer(tile.id); }} />}
        {game.template === 'braille' && <div className="braille-task"><div className="braille-cell" dir="ltr" role="group" aria-label="خلية برايل باتجاه القراءة: العمود الأيسر 1، 2، 3؛ الأيمن 4، 5، 6">{brailleReadingOrder.map(n => <button data-scan key={n} disabled={checked} aria-label={`النقطة ${n}، ${n <= 3 ? 'العمود الأيسر' : 'العمود الأيمن'}`} aria-pressed={dots.includes(n)} className={dots.includes(n) ? 'raised' : ''} onClick={() => setDots(d => d.includes(n) ? d.filter(x => x !== n) : [...d, n])}>{n}<span className="visually-hidden">{dots.includes(n) ? 'محددة' : 'غير محددة'}</span></button>)}</div><p aria-live="polite">النقاط المحددة: {dots.length ? [...dots].sort().join('، ') : 'لا توجد'}</p><span className="unicode-braille" aria-hidden="true">{brailleCharacter(dots)}</span><small>تمثيل بصري فقط؛ لا تظهر نقاط بارزة على شاشة الجهاز.</small></div>}
        {options.length > 0 && game.template !== 'robot' && (!round.reveal || opened) && <div className="game-options" dir={options[0]?.lang === 'en' ? 'ltr' : 'rtl'}>{options.map(tile => <button data-scan key={tile.id} disabled={checked} aria-pressed={choice === tile.id} onClick={() => pick(tile)} className={`${choice === tile.id ? 'selected' : ''} ${checked && tile.id === round.answerId ? 'is-answer' : ''}`}><TileFace tile={tile} textAlternative={access.textAlternative} />{choice === tile.id && <Check size={23} aria-hidden="true" />}</button>)}</div>}
        <div className="game-task-actions">{access.speech && !isCards && <button data-scan className="button secondary" onClick={repeat}><Volume2 size={20} />{round.listen ? 'استمع إلى الكلمة' : 'استمع'}</button>}{!isCards && <button data-scan className="button secondary" disabled={checked} onClick={() => { setHint(true); announce(round.hint); }}><Lightbulb size={20} />تلميح</button>}{!isCards && (checked ? <button data-scan className="button primary" onClick={next}>{index + 1 === game.rounds.length ? 'أنهيت النشاط' : 'الخطوة التالية'}<ChevronLeft size={20} /></button> : !usesBoard && game.template !== 'robot' && (!access.instant || game.template === 'braille') && <button data-scan className="button primary" onClick={check} disabled={game.template === 'braille' ? !dots.length : !choice}>تحقّق<Check size={20} /></button>)}<button data-scan className="button secondary" onClick={pause}><Pause size={20} />استراحة</button></div>
        {feedback && <div className={`visual-feedback ${feedback}`} aria-hidden="true">{feedback === 'yes' ? <Check size={46} /> : <RotateCcw size={42} />}</div>}
        <p className="game-feedback" role="status" aria-live="polite" aria-atomic="true">{message}</p>{error && <p role="status" className="info-note">{error}</p>}</section>
      <CommunicationBoard collapsible startOpen={!!learnerProfile?.supports?.communication || !!learnerProfile?.preferences.responds?.includes('point')} tiles={tiles} sound={access.speech} onBreak={pause} onRepeat={repeat} /></div>
      {scan && <p className="scan-instructions" role="status">المسح يعمل · المسافة أو Enter للاختيار · Escape للإيقاف</p>}
    </main>}
  </div>;
}

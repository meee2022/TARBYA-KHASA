import { useEffect, useMemo, useRef, useState } from 'react';
import { confirmDialog } from './confirm';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Camera, Copy, Gamepad2, Mic, Play, Plus, Printer, Save, Square, Trash2, Video, X } from 'lucide-react';
import { uid } from '../../packages/domain';
import { ContentPack, itemsFromText, missingPictures, PackItem } from '../../packages/domain/packs';
import { useAllPacks, useWorkspace } from './store';
import { useSiteConfig } from './site';
import { Empty, PageHeading } from './Workspace';
import { TilePicture } from './accessibility';
import { checkVideo, deleteMedia, playMedia, prepareImage, startRecording, storeMedia } from './media';
import './packs.css';

const blankPack = (subject: string): ContentPack => ({ id: `pack-${uid()}`, title: '', subject, language: subject === 'اللغة الإنجليزية' ? 'en' : 'ar', ordered: false, items: [], updatedAt: new Date().toISOString() });
const coverOf = (p: ContentPack) => p.items.filter(i => i.emoji || i.imageId).slice(0, 3);

export function Packs() {
  const { own, shared } = useAllPacks(); const { site } = useSiteConfig(); const navigate = useNavigate(); const { savePack, notify } = useWorkspace();
  const copy = (p: ContentPack) => { const next = { ...p, id: `pack-${uid()}`, title: `${p.title} (نسختي)`, updatedAt: new Date().toISOString() }; savePack(next); notify('أُضيفت نسخة إلى حزمك'); navigate(`/packs/${next.id}`); };
  const row = (p: ContentPack, mine: boolean, n: number) => <article key={p.id} className="pack-card rise-in" style={{ animationDelay: `${Math.min(n, 10) * 35}ms` }}>
    <div className="pack-cover" aria-hidden="true">{coverOf(p).map(i => <TilePicture key={i.id} tile={i} />)}</div>
    <div className="pack-card-body"><span className="game-skill">{p.subject}{p.ordered ? ' · خطوات مرتبة' : ''}</span><h2>{p.title || 'حزمة بلا عنوان'}</h2><p>{p.items.length} عنصر{missingPictures(p) ? ` · ${missingPictures(p)} بلا صورة` : ''}</p>
      <div className="pack-actions"><Link className="button primary" to={`/games`} state={{ packId: p.id }}><Gamepad2 size={16} />ألعاب</Link><Link className="button secondary" to={`/packs/${p.id}/print`}><Printer size={16} />أوراق وبطاقات</Link>{mine ? <Link className="button secondary" to={`/packs/${p.id}`}>تعديل</Link> : <button className="button secondary" onClick={() => copy(p)}><Copy size={16} />نسخ وتعديل</button>}</div></div></article>;
  return <><PageHeading banner="banner-packs" title="المحتوى والأوراق" description="اكتب كلمات الدرس مرة، فتخرج منها البطاقات والألعاب وأوراق العمل وأسئلة الحصة."><button className="button primary" onClick={() => { const p = blankPack(site.catalog.subjects[0] ?? ''); savePack(p); navigate(`/packs/${p.id}`); }}><Plus size={18} />حزمة جديدة</button></PageHeading>
    <section className="spaced-section own-packs"><h2 className="section-title">حزمي</h2>{own.length ? <div className="pack-grid">{own.map((p, n) => row(p, true, n))}</div> : <div className="panel"><Empty title="لم تنشئ حزمة بعد" description="ابدأ بكلمات درسك القادم، أو انسخ حزمة من المكتبة وعدّلها." /></div>}</section>
    <section className="spaced-section"><h2 className="section-title">مكتبة المدرسة</h2><p className="muted">تديرها لوحة الإدارة، ويراها كل المعلمين. بلا أي بيانات طلاب.</p>{shared.length ? <div className="pack-grid">{shared.map((p, n) => row(p, false, n))}</div> : <div className="panel"><Empty title="المكتبة فارغة" description="تضيف الإدارة الحزم من لوحة التحكم." /></div>}</section></>;
}
export function PackEditorPage() {
  const { id } = useParams(); const { own } = useAllPacks(); const { savePack, removePack, notify } = useWorkspace(); const navigate = useNavigate(); const stored = own.find(p => p.id === id);
  const [pack, setPack] = useState(stored); const removed = useRef(false);
  if (!pack) return <Empty title="الحزمة غير موجودة" description="افتح حزمة من صفحة المحتوى." />;
  return <><Link className="back-link" to="/packs"><ArrowRight size={16} />كل الحزم</Link><PageHeading title={pack.title || 'حزمة جديدة'} description="كل عنصر: كلمة أو خطوة، وصورة، وصوت، وإشارة اختيارية."><button className="button secondary" onClick={async () => { if (!await confirmDialog(`حذف «${pack.title || 'هذه الحزمة'}» وكل وسائطها من هذا الجهاز؟`, { ok: 'حذف الحزمة' })) return; removed.current = true; pack.items.forEach(forgetMedia); removePack(pack.id); notify('حُذفت الحزمة'); navigate('/packs'); }}><Trash2 size={16} />حذف</button><Link className="button secondary" to={`/packs/${pack.id}/print`}><Printer size={16} />أوراق وبطاقات</Link><span className="local-indicator"><Save size={15} />يُحفظ تلقائيًا</span></PageHeading>
    {/* Saved on every change: an uploaded picture or recording must never be lost by leaving the page. */}
    <PackEditor pack={pack} onChange={next => { if (removed.current) return; const stamped = { ...next, updatedAt: new Date().toISOString() }; setPack(stamped); savePack(stamped); }} shared={false} /></>;
}
const forgetMedia = (i: PackItem) => { deleteMedia(i.imageId); deleteMedia(i.audioId); deleteMedia(i.signId); };
/** Also used by the admin console: `shared` sends media to the server instead of this browser. */
export function PackEditor({ pack, onChange, shared, onError }: { pack: ContentPack; onChange: (p: ContentPack) => void; shared: boolean; onError?: (m: string) => void }) {
  const { site } = useSiteConfig(); const [bulk, setBulk] = useState(''); const [error, setError] = useState(''); const report = (m: string) => { setError(m); onError?.(m); };
  // A recording or upload can finish long after it started: always apply it to the current pack.
  const latest = useRef({ pack, onChange }); latest.current = { pack, onChange };
  const set = <K extends keyof ContentPack>(key: K, value: ContentPack[K]) => latest.current.onChange({ ...latest.current.pack, [key]: value });
  const setItem = (id: string, patch: Partial<PackItem>) => { const { pack: now, onChange: apply } = latest.current; latest.current.pack = { ...now, items: now.items.map(i => i.id === id ? { ...i, ...patch } : i) }; apply(latest.current.pack); };
  const move = (n: number, by: number) => { const items = [...pack.items]; [items[n], items[n + by]] = [items[n + by], items[n]]; set('items', items); };
  return <div className="pack-editor"><section className="panel profile-section"><div className="form-grid"><label>عنوان الحزمة<input value={pack.title} maxLength={120} onChange={e => set('title', e.target.value)} placeholder="مثلًا: الحيوانات البرية" /></label><label>المادة<select value={pack.subject} onChange={e => set('subject', e.target.value)}>{[...new Set([pack.subject, ...site.catalog.subjects])].map(s => <option key={s}>{s}</option>)}</select></label><label>لغة المحتوى والنطق<select value={pack.language} onChange={e => set('language', e.target.value as 'ar' | 'en')}><option value="ar">العربية</option><option value="en">English</option></select></label><label className="check-inline"><input type="checkbox" checked={pack.ordered} onChange={e => set('ordered', e.target.checked)} />عناصر مرتبة (خطوات مهارة)</label></div>
    <label className="bulk-entry">أضف بسرعة: عنصر في كل سطر<textarea rows={4} dir="auto" value={bulk} onChange={e => setBulk(e.target.value)} placeholder={'whale\ngiraffe\nhippo'} /></label><button type="button" className="button secondary" disabled={!bulk.trim()} onClick={() => { set('items', [...pack.items, ...itemsFromText(bulk, uid)]); setBulk(''); }}><Plus size={16} />أضف إلى الحزمة</button></section>
    {error && <p className="alert" role="alert">{error}</p>}
    <section className="panel item-list" aria-label="عناصر الحزمة">{pack.items.length ? pack.items.map((item, n) => <ItemRow key={item.id} item={item} index={n} count={pack.items.length} shared={shared} ordered={pack.ordered} language={pack.language} onChange={patch => setItem(item.id, patch)} onMove={by => move(n, by)} onError={report} onRemove={async () => { if (await confirmDialog(`حذف «${item.text}»؟`, { ok: 'حذف' })) { if (!shared) forgetMedia(item); set('items', pack.items.filter(i => i.id !== item.id)); } }} />) : <Empty title="الحزمة فارغة" description="اكتب كلمات الدرس في المربع أعلاه، ثم أضف لكل كلمة صورتها." />}</section></div>;
}
function ItemRow({ item, index, count, shared, ordered, language, onChange, onMove, onRemove, onError }: { item: PackItem; index: number; count: number; shared: boolean; ordered: boolean; language: 'ar' | 'en'; onChange: (patch: Partial<PackItem>) => void; onMove: (by: number) => void; onRemove: () => void; onError: (m: string) => void }) {
  const [busy, setBusy] = useState(''); const stopper = useRef<() => void>();
  useEffect(() => () => stopper.current?.(), []); // Never leave the microphone on after leaving the row.
  const upload = async (kind: 'imageId' | 'signId', file?: File) => {
    if (!file) return;
    setBusy(kind); onError('');
    try { const blob = kind === 'imageId' ? await prepareImage(file) : checkVideo(file); const old = item[kind]; const id = await storeMedia(blob, shared); onChange({ [kind]: id }); if (!shared) deleteMedia(old); }
    catch (e) { onError((e as Error).message); } finally { setBusy(''); }
  };
  const record = async () => {
    if (stopper.current) { stopper.current(); stopper.current = undefined; return; }
    try {
      onError(''); setBusy('audio');
      stopper.current = await startRecording(async blob => { stopper.current = undefined; try { const old = item.audioId; const id = await storeMedia(blob, shared); onChange({ audioId: id }); if (!shared) deleteMedia(old); } catch (e) { onError((e as Error).message); } finally { setBusy(''); } });
    } catch { setBusy(''); onError('تعذّر الوصول إلى الميكروفون. اسمح به من إعدادات المتصفح.'); }
  };
  return <div className="item-row"><div className="item-thumb">{item.imageId || item.emoji ? <TilePicture tile={item} /> : <Camera size={26} aria-hidden="true" />}</div>
    <div className="item-fields"><label>{ordered ? `الخطوة ${index + 1}` : 'النص'}<input dir="auto" lang={language} maxLength={120} value={item.text} onChange={e => onChange({ text: e.target.value })} /></label><label>رمز تعبيري بدل الصورة<input className="emoji-input" maxLength={24} value={item.emoji ?? ''} onChange={e => onChange({ emoji: e.target.value })} /></label><label>وصف بديل وتلميح<input maxLength={200} value={item.description ?? ''} onChange={e => onChange({ description: e.target.value })} placeholder="لا يذكر اسم الإجابة" /></label><label>المجموعة (للتصنيف)<input maxLength={60} value={item.group ?? ''} onChange={e => onChange({ group: e.target.value })} /></label></div>
    <div className="item-media"><label className="button secondary"><Camera size={15} />{busy === 'imageId' ? 'جارٍ التجهيز…' : item.imageId ? 'تغيير الصورة' : 'صورة'}<input className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp,image/heic" onChange={e => { upload('imageId', e.target.files?.[0]); e.target.value = ''; }} /></label>{item.imageId && <button type="button" className="icon-button" aria-label="حذف الصورة" onClick={() => { if (!shared) deleteMedia(item.imageId); onChange({ imageId: undefined }); }}><X size={15} /></button>}
      <button type="button" className={`button secondary ${busy === 'audio' ? 'is-recording' : ''}`} onClick={record}>{busy === 'audio' ? <><Square size={15} />إيقاف التسجيل</> : <><Mic size={15} />{item.audioId ? 'إعادة التسجيل' : 'سجّل صوتك'}</>}</button>{item.audioId && <><button type="button" className="icon-button" aria-label="استمع إلى التسجيل" onClick={() => playMedia(item.audioId!).catch(() => onError('تعذّر تشغيل التسجيل.'))}><Play size={15} /></button><button type="button" className="icon-button" aria-label="حذف التسجيل" onClick={() => { if (!shared) deleteMedia(item.audioId); onChange({ audioId: undefined }); }}><X size={15} /></button></>}
      <label className="button secondary"><Video size={15} />{busy === 'signId' ? 'جارٍ الرفع…' : item.signId ? 'تغيير فيديو الإشارة' : 'فيديو إشارة'}<input className="visually-hidden" type="file" accept="video/mp4,video/webm" onChange={e => { upload('signId', e.target.files?.[0]); e.target.value = ''; }} /></label>{item.signId && <button type="button" className="icon-button" aria-label="حذف فيديو الإشارة" onClick={() => { if (!shared) deleteMedia(item.signId); onChange({ signId: undefined }); }}><X size={15} /></button>}</div>
    <div className="item-order"><button type="button" className="icon-button" aria-label={`نقل ${item.text} إلى أعلى`} disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp size={16} /></button><button type="button" className="icon-button" aria-label={`نقل ${item.text} إلى أسفل`} disabled={index === count - 1} onClick={() => onMove(1)}><ArrowDown size={16} /></button><button type="button" className="icon-button danger" aria-label={`حذف ${item.text}`} onClick={onRemove}><Trash2 size={16} /></button></div></div>;
}
const sheets = [['cards', 'بطاقات A4 كبيرة'], ['match', 'مطابقة كلمة بصورة'], ['circle', 'ضع دائرة حول الإجابة'], ['trace', 'ورقة لكل كلمة: أنسخ وأكتب'], ['write', 'أكتب الكلمة تحت صورتها'], ['cut', 'قص ولصق'], ['steps', 'تسلسل الخطوات وقائمة ملاحظة']] as const;
type Sheet = typeof sheets[number][0];
/** Deterministic mix: stable between renders and printing, and never the original order when avoidable. */
const rotated = <T,>(items: T[], by: number) => items.length ? [...items.slice(by % items.length), ...items.slice(0, by % items.length)] : items;
export function PackPrint() {
  const { id } = useParams(); const { all } = useAllPacks(); const pack = all.find(p => p.id === id); const [sheet, setSheet] = useState<Sheet>('match'); const [large, setLarge] = useState(false); const [options, setOptions] = useState(3); const [perPage, setPerPage] = useState(4);
  const items = useMemo(() => (pack?.items ?? []).filter(i => i.text.trim()), [pack]);
  if (!pack) return <Empty title="الحزمة غير موجودة" description="افتح حزمة من صفحة المحتوى." />;
  const dir = pack.language === 'en' ? 'ltr' : 'rtl'; const pages = Array.from({ length: Math.ceil(items.length / perPage) }, (_, n) => items.slice(n * perPage, (n + 1) * perPage));
  // Sheets speak the lesson's language: an English worksheet gets English instructions.
  const say = (ar: string, en: string) => pack.language === 'en' ? en : ar;
  const head = <div className="sheet-head" dir={dir}><span>{say('الاسم', 'Name')}: ...................</span><span>{say('التاريخ', 'Date')}: ................</span></div>;
  const body = <div className={`sheet-preview ${large ? 'sheet-large' : ''}`} lang={pack.language}>
    {sheet === 'cards' && items.map(i => <div className="sheet-page flash-card" key={i.id}><TilePicture tile={i} /><strong dir="auto">{i.text}</strong></div>)}
    {sheet === 'match' && pages.map((page, n) => <div className="sheet-page" key={n}>{head}<h2>{say('صِل الكلمة بصورتها', 'Match the words with their pictures')}</h2><div className="sheet-match" dir={dir}><div>{page.map(i => <p key={i.id}><strong dir="auto">{i.text}</strong><i /></p>)}</div><div>{rotated(page, 1).map(i => <p key={i.id}><i /><TilePicture tile={i} /></p>)}</div></div></div>)}
    {sheet === 'circle' && pages.map((page, n) => <div className="sheet-page" key={n}>{head}<h2>{say('ضع دائرة حول الإجابة المناسبة', 'Look at the picture and circle the correct answer')}</h2>{page.map((i, k) => <div className="sheet-circle" key={i.id} dir={dir}><TilePicture tile={i} /><div>{rotated([i, ...[1, 2, 3].map(x => items[(items.indexOf(i) + x) % items.length])].filter((v, idx, a) => a.indexOf(v) === idx).slice(0, options), k).map(o => <span key={o.id} dir="auto">{o.text}</span>)}</div></div>)}</div>)}
    {sheet === 'trace' && items.map(i => <div className="sheet-page sheet-trace" key={i.id} dir={dir}>{head}<TilePicture tile={i} /><strong dir="auto">{i.text}</strong><span className="trace-word" dir="auto">{i.text}</span><div className="write-line" /><div className="write-line" /></div>)}
    {sheet === 'write' && pages.map((page, n) => <div className="sheet-page" key={n}>{head}<h2>{say('أكتب الكلمة تحت صورتها', 'Write the correct word under each picture')}</h2><p className="word-bank" dir={dir}>{page.map(i => <span key={i.id}>{i.text}</span>)}</p><div className="sheet-grid">{rotated(page, 1).map(i => <div key={i.id}><TilePicture tile={i} /><div className="write-line" /></div>)}</div></div>)}
    {sheet === 'cut' && pages.map((page, n) => <div className="sheet-page" key={n}>{head}<h2>{say('قص الصور والصقها فوق الكلمة', 'Cut the pictures and paste them above the words')}</h2><div className="sheet-grid" dir={dir}>{page.map(i => <div key={i.id}><div className="paste-box" /><strong dir="auto">{i.text}</strong></div>)}</div><h3>{say('قص من هنا', 'Cut here')}</h3><div className="cut-row">{rotated(page, 2).map(i => <div key={i.id}><TilePicture tile={i} /></div>)}</div></div>)}
    {sheet === 'steps' && <div className="sheet-page">{head}<h2>{pack.title}</h2><table className="sheet-steps"><thead><tr><th>#</th><th>الخطوة</th><th>نفّذ؟</th><th>مقدار المساعدة</th></tr></thead><tbody>{items.map((i, n) => <tr key={i.id}><td>{n + 1}</td><td><TilePicture tile={i} /> <span dir="auto">{i.text}</span></td><td /><td /></tr>)}</tbody></table></div>}
  </div>;
  return <><Link className="back-link no-print" to="/packs"><ArrowRight size={16} />كل الحزم</Link><PageHeading title={`أوراق وبطاقات: ${pack.title}`} description="نسخ ورقية من محتوى الحزمة نفسه. راجع المعاينة قبل الطباعة."><Link className="button secondary" to="/games">الألعاب<ArrowLeft size={16} /></Link><button className="button primary" onClick={() => window.print()}><Printer size={17} />طباعة أو حفظ PDF</button></PageHeading>
    <div className="toolbar no-print sheet-toolbar"><label>نوع الورقة<select value={sheet} onChange={e => setSheet(e.target.value as Sheet)}>{sheets.map(([k, label]) => <option key={k} value={k}>{label}</option>)}</select></label>{sheet === 'circle' && <label>عدد الخيارات<select value={options} onChange={e => setOptions(Number(e.target.value))}>{[2, 3, 4].map(n => <option key={n}>{n}</option>)}</select></label>}{['match', 'circle', 'write', 'cut'].includes(sheet) && <label>في كل صفحة<select value={perPage} onChange={e => setPerPage(Number(e.target.value))}>{[2, 3, 4, 6].map(n => <option key={n}>{n}</option>)}</select></label>}<label className="check-inline"><input type="checkbox" checked={large} onChange={e => setLarge(e.target.checked)} />طباعة كبيرة</label></div>
    {items.length ? body : <div className="panel"><Empty title="لا توجد عناصر للطباعة" description="أضف عناصر إلى الحزمة أولًا." /></div>}</>;
}

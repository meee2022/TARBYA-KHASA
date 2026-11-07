import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Share2, Trash2, Users } from 'lucide-react';
import { countOf, dateLabel } from '../../packages/domain';
import { importShared, sharedKindLabels, type SharedKind, type SharedMeta, type SharedPayload } from '../../packages/domain/shared';
import { isDeck } from '../../packages/domain/presentations';
import { confirmDialog } from './confirm';
import { accountsAvailable, getShared, listShared, publishShared, removeShared } from './teacherApi';
import { useWorkspace } from './store';
import { Empty } from './Workspace';
import { Chip } from './fields';
import './planning.css';

const DECKS = 'tarbya.presentations.v1';

/** The colleagues' library, fetched once per visit. Without an account there is nothing to fetch, and the page says why. */
export function useSharedItems(enabled: boolean) {
  const [items, setItems] = useState<SharedMeta[]>([]); const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle'); const [error, setError] = useState('');
  const reload = useCallback(async () => { if (!enabled) return; setState('loading'); try { setItems(await listShared()); setState('ready'); setError(''); } catch (e) { setState('error'); setError((e as Error).message); } }, [enabled]);
  useEffect(() => { void reload(); }, [reload]);
  return { items, state, error, reload };
}

/** Publishes a copy to the shared library. The copy carries no pupil, goal or review data; the teacher's display name travels with it. */
export function ShareButton({ build, label = 'انشر للمعلمات' }: { build: () => SharedPayload; label?: string }) {
  const { account, notify } = useWorkspace(); const [busy, setBusy] = useState(false);
  if (!accountsAvailable) return null;
  const share = async () => {
    const payload = build();
    if (!account) { notify('سجّل الدخول بحسابك من إعدادات المساحة لتنشر في المكتبة المشتركة.'); return; }
    if (!await confirmDialog(`نشر «${payload.title}» في مكتبة المعلمات المشتركة؟ تُنشر نسخة بلا بيانات الطلاب، ويظهر اسمك معها، وتستطيع حذفها لاحقًا.`, { ok: 'نشر' })) return;
    setBusy(true);
    try { await publishShared(payload); notify('نُشر في المكتبة المشتركة. تجده مع زميلاتك في مكتبة الدروس.'); } catch (e) { notify((e as Error).message); } finally { setBusy(false); }
  };
  return <button type="button" className="button secondary" disabled={busy} onClick={share} title={account ? undefined : 'يحتاج تسجيل الدخول بحساب المعلم'}><Share2 size={16} />{busy ? 'جارٍ النشر…' : label}</button>;
}

const kindOptions: [SharedKind | 'all', string][] = [['all', 'كل الأنواع'], ['lesson', sharedKindLabels.lesson], ['deck', sharedKindLabels.deck], ['pack', sharedKindLabels.pack]];
/** The grid of what colleagues published, already narrowed by grade and subject from the library page. */
export function SharedGrid({ items, state, error, onChange }: { items: SharedMeta[]; state: 'idle' | 'loading' | 'ready' | 'error'; error: string; onChange: () => void }) {
  const { account, saveLesson, savePack, notify } = useWorkspace(); const navigate = useNavigate(); const [kind, setKind] = useState<SharedKind | 'all'>('all'); const [busy, setBusy] = useState('');
  if (!accountsAvailable) return <Empty title="المكتبة المشتركة تعمل على الموقع المنشور" description="حين تسجّل المعلمات الدخول بحساباتهن، تظهر هنا تحضيراتهن وعروضهن وحزمهن." />;
  if (!account) return <Empty title="سجّلي الدخول لترى مكتبة المعلمات" description="كل معلمة تنشر ما عندها من تحضير وعروض وحزم، وتستورد ما يناسب طالباتها. الدخول من إعدادات المساحة." />;
  if (state === 'loading' || state === 'idle') return <div className="shared-grid" aria-busy="true">{[0, 1, 2].map(i => <div key={i} className="panel shared-card skeleton" />)}</div>;
  if (state === 'error') return <div role="alert" className="alert">{error} <button className="text-link" onClick={onChange}>أعد المحاولة</button></div>;
  const shown = items.filter(i => kind === 'all' || i.kind === kind);
  const take = async (item: SharedMeta) => {
    setBusy(item.id);
    try {
      const got = await getShared(item.id); const imported = importShared(got.kind, got.json);
      if (!imported) throw new Error('تعذّر قراءة هذا العنصر.');
      if (imported.kind === 'lesson') { saveLesson(imported.lesson); notify('أُضيفت نسخة إلى تحضيراتك'); navigate(`/lessons/${imported.lesson.id}/edit`); }
      else if (imported.kind === 'pack') { savePack(imported.pack); notify('أُضيفت الحزمة إلى محتواك'); navigate(`/packs/${imported.pack.id}`); }
      else { const list: unknown[] = JSON.parse(localStorage.getItem(DECKS) || '[]'); localStorage.setItem(DECKS, JSON.stringify([imported.deck, ...(Array.isArray(list) ? list.filter(isDeck) : [])])); notify('أُضيف العرض إلى عروضك'); navigate(`/presentations?deck=${imported.deck.id}`); }
    } catch (e) { notify((e as Error).message); } finally { setBusy(''); }
  };
  const drop = async (item: SharedMeta) => { if (!await confirmDialog(`حذف «${item.title}» من المكتبة المشتركة؟ لا يؤثر على نسختك.`, { ok: 'حذف' })) return; setBusy(item.id); try { await removeShared(item.id); onChange(); } catch (e) { notify((e as Error).message); } finally { setBusy(''); } };
  return <>
    <div className="shared-toolbar"><div className="option-chips" role="group" aria-label="نوع المحتوى">{kindOptions.map(([k, label]) => <Chip key={k} on={kind === k} label={label} onClick={() => setKind(k)} />)}</div><span className="muted"><Users size={16} />{countOf(shown.length, 'عنصر', 'عنصران', 'عناصر')} من زميلاتك</span></div>
    {shown.length ? <div className="shared-grid">{shown.map((item, n) => <article key={item.id} className="panel shared-card rise-in" style={{ animationDelay: `${Math.min(n, 8) * 40}ms` }}><span className={`shared-kind kind-${item.kind}`}>{sharedKindLabels[item.kind]}</span><h2>{item.title}</h2><span className="eyebrow">{item.subject}{item.grade ? ` · الصف ${item.grade}` : ''}</span><p>{item.summary || 'بلا وصف'}</p><footer><small>{item.mine ? 'أنت' : item.teacherName} · {dateLabel(item.createdAt)}</small><div><button className="button primary" disabled={busy === item.id} onClick={() => take(item)}><Download size={15} />استورد إلى مساحتي</button>{item.mine && <button className="icon-button" aria-label={`حذف ${item.title} من المكتبة`} disabled={busy === item.id} onClick={() => drop(item)}><Trash2 size={17} /></button>}</div></footer></article>)}</div>
      : <Empty title="لا شيء هنا بعد" description="كوني أول من ينشر: من صفحة أي درس أو عرض أو حزمة، اضغطي «انشر للمعلمات»." />}
  </>;
}

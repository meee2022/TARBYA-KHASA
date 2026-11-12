import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Check, Pencil, Plus, Printer, Trash2, UserRound } from 'lucide-react';
import { countOf, dateLabel, uid, type Learner } from '../../packages/domain';
import { consentStates, meetingKinds, referralStates, referralsDue, type ConsentState, type Meeting, type MeetingKind, type Referral, type ReferralState, type TeamMember } from '../../packages/domain/records';
import { localDay, today } from '../../packages/domain/planning';
import { parentToken } from '../../packages/domain/parent';
import { specialistUrl, type SpecialistLink, type SpecialistNote } from '../../packages/domain/specialist';
import { accountsAvailable, dismissSpecialistNote, issueSpecialistLink, revokeSpecialistLink, specialistLinks, specialistNotes, SyncError } from './teacherApi';
import { confirmDialog } from './confirm';
import { useSiteConfig } from './site';
import { useWorkspace } from './store';
import { Empty, PageHeading } from './Workspace';
import './planning.css';
import './desk.css';

const first = (l?: Learner) => l ? l.name.split(/\s·/)[0] : 'طالب محذوف';

/** Who works with the teacher on the pupils' plans. */
function MembersTab() {
  const { data, saveDesk } = useWorkspace(); const { site } = useSiteConfig(); const all = data.desk?.team ?? []; const [draft, setDraft] = useState<TeamMember | null>(null);
  const store = (next: TeamMember[]) => saveDesk({ team: next });
  const save = (e: FormEvent) => { e.preventDefault(); if (!draft?.name.trim()) return; const m = { ...draft, name: draft.name.trim(), role: draft.role.trim(), note: draft.note.trim() }; store(all.some(x => x.id === m.id) ? all.map(x => x.id === m.id ? m : x) : [...all, m]); setDraft(null); };
  return <>
    <div className="heading-actions desk-tab-actions"><button className="button primary" onClick={() => setDraft({ id: uid(), name: '', role: site.catalog.reviewParties[0] ?? '', note: '' })}><Plus size={17} />عضو جديد</button></div>
    {draft && <form className="panel desk-panel desk-form" onSubmit={save} ref={el => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })}><div className="section-heading"><h2>{all.some(x => x.id === draft.id) ? 'تعديل العضو' : 'عضو جديد في الفريق'}</h2></div>
      <div className="form-grid"><label>الاسم<input required autoFocus maxLength={120} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label><label>الدور<input list="team-roles" maxLength={120} value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value })} /><datalist id="team-roles">{site.catalog.reviewParties.map(r => <option key={r} value={r} />)}</datalist></label><label>ملاحظة<small>أيام الحضور أو طريقة التواصل داخل المدرسة</small><input maxLength={300} value={draft.note} onChange={e => setDraft({ ...draft, note: e.target.value })} /></label></div>
      <div className="heading-actions"><button className="button primary"><Check size={17} />حفظ العضو</button><button type="button" className="button secondary" onClick={() => setDraft(null)}>إلغاء</button></div></form>}
    {all.length ? <div className="group-grid">{all.map((m, i) => <article className="panel group-card" key={m.id} style={{ '--i': i } as React.CSSProperties}><header><span className="group-mark" aria-hidden="true"><UserRound size={22} /></span><div><h2>{m.name}</h2><p className="muted">{m.role || 'بلا دور محدد'}</p></div></header>{m.note && <p className="group-meta"><span>{m.note}</span></p>}
      <div className="heading-actions"><button className="button secondary" onClick={() => setDraft(m)}><Pencil size={16} />تعديل</button><button className="button secondary" onClick={async () => { if (await confirmDialog(`حذف «${m.name}» من الفريق؟ الإحالات المسجلة تبقى.`, { ok: 'حذف العضو' })) store(all.filter(x => x.id !== m.id)); }}><Trash2 size={16} />حذف</button></div></article>)}</div>
      : !draft && <section className="panel desk-panel"><Empty title="لا أعضاء في الفريق بعد" description="أضف من يعمل معك على خطط الطلاب: معلم الفصل، الأخصائيون، المنسق، فتختارهم عند الإحالة والاجتماع." /></section>}
  </>;
}

/** Referrals of a pupil to a member of the team, each followed until it is closed. */
function ReferralsTab() {
  const { data, saveDesk, notify } = useWorkspace(); const all = data.desk?.referrals ?? []; const team = data.desk?.team ?? []; const now = today(); const [draft, setDraft] = useState<Referral | null>(null);
  const store = (next: Referral[]) => saveDesk({ referrals: next });
  const save = (e: FormEvent) => { e.preventDefault(); if (!draft?.to.trim() || !draft.reason.trim() || !draft.learnerId) return; const r = { ...draft, to: draft.to.trim(), reason: draft.reason.trim(), reply: draft.reply.trim() }; store(all.some(x => x.id === r.id) ? all.map(x => x.id === r.id ? r : x) : [r, ...all]); setDraft(null); notify('حُفظت الإحالة'); };
  const due = referralsDue(all, now).map(r => r.id); const rows = [...all].sort((a, b) => Number(a.state === 'closed') - Number(b.state === 'closed') || b.date.localeCompare(a.date));
  if (!data.learners.length) return <section className="panel desk-panel"><Empty title="أضف ملف طالب أولًا" description="الإحالة تُكتب لطالب بعينه، فأضفه من «قائمة الطلاب» ثم عُد." /></section>;
  return <>
    <div className="heading-actions desk-tab-actions no-print"><button className="button primary" onClick={() => setDraft({ id: uid(), learnerId: data.learners[0].id, date: now, to: team[0] ? `${team[0].name}${team[0].role ? ` (${team[0].role})` : ''}` : '', reason: '', state: 'open', followUp: '', reply: '' })}><Plus size={17} />إحالة جديدة</button><button className="button secondary" onClick={() => window.print()}><Printer size={17} />طباعة</button></div>
    {draft && <form className="panel desk-panel desk-form no-print" onSubmit={save} ref={el => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })}><div className="section-heading"><h2>{all.some(x => x.id === draft.id) ? 'تعديل الإحالة' : 'إحالة جديدة'}</h2></div>
      <div className="form-grid"><label>الطالب<select value={draft.learnerId} onChange={e => setDraft({ ...draft, learnerId: e.target.value })}>{data.learners.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label><label>إلى<input required list="referral-to" maxLength={160} value={draft.to} onChange={e => setDraft({ ...draft, to: e.target.value })} placeholder="اسم العضو أو دوره" /><datalist id="referral-to">{team.map(m => <option key={m.id} value={`${m.name}${m.role ? ` (${m.role})` : ''}`} />)}</datalist></label><label>تاريخ الإحالة<input type="date" value={draft.date} onChange={e => e.target.value && setDraft({ ...draft, date: e.target.value })} /></label><label>موعد المتابعة<input type="date" value={draft.followUp} onChange={e => setDraft({ ...draft, followUp: e.target.value })} /></label><label>الحالة<select value={draft.state} onChange={e => setDraft({ ...draft, state: e.target.value as ReferralState })}>{(Object.keys(referralStates) as ReferralState[]).map(k => <option key={k} value={k}>{referralStates[k]}</option>)}</select></label></div>
      <label>سبب الإحالة<small>ما لوحظ، لا تشخيص</small><textarea required rows={2} maxLength={800} value={draft.reason} onChange={e => setDraft({ ...draft, reason: e.target.value })} /></label><label>الرد أو ما تم<textarea rows={2} maxLength={800} value={draft.reply} onChange={e => setDraft({ ...draft, reply: e.target.value })} /></label>
      <div className="heading-actions"><button className="button primary"><Check size={17} />حفظ الإحالة</button><button type="button" className="button secondary" onClick={() => setDraft(null)}>إلغاء</button></div></form>}
    {rows.length ? <section className="panel desk-panel"><div className="section-heading"><h2>الإحالات</h2><span className="desk-count">{countOf(all.filter(r => r.state !== 'closed').length, 'إحالة مفتوحة', 'إحالتان مفتوحتان', 'إحالات مفتوحة')}</span></div>
      <div className="desk-scroll"><table className="data-table"><thead><tr><th scope="col">التاريخ</th><th scope="col">الطالب</th><th scope="col">إلى</th><th scope="col">السبب</th><th scope="col">الحالة</th><th scope="col">المتابعة</th><th scope="col">الرد</th><th scope="col" className="no-print"><span className="visually-hidden">إجراءات</span></th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.id}><td>{dateLabel(r.date)}</td><th scope="row">{first(data.learners.find(l => l.id === r.learnerId))}</th><td>{r.to}</td><td>{r.reason}</td><td><span className={`plan-state ${r.state === 'closed' ? 'ok' : r.state === 'following' ? 'warn' : ''}`}>{referralStates[r.state]}</span></td><td>{r.followUp ? <>{dateLabel(r.followUp)}{due.includes(r.id) && <span className="stale-pill">حان موعدها</span>}</> : <span className="muted">لم يُحدد</span>}</td><td>{r.reply || <span className="muted">لا رد بعد</span>}</td><td className="no-print"><button type="button" className="icon-button" aria-label={`تعديل إحالة ${first(data.learners.find(l => l.id === r.learnerId))}`} onClick={() => setDraft(r)}><Pencil size={16} /></button><button type="button" className="icon-button" aria-label={`حذف إحالة ${first(data.learners.find(l => l.id === r.learnerId))}`} onClick={async () => { if (await confirmDialog('حذف هذه الإحالة؟', { ok: 'حذف الإحالة' })) store(all.filter(x => x.id !== r.id)); }}><Trash2 size={16} /></button></td></tr>)}</tbody></table></div></section>
      : !draft && <section className="panel desk-panel"><Empty title="لا إحالات بعد" description="سجّل إحالة الطالب إلى أخصائي أو منسق مع سببها وموعد متابعتها، فتذكّرك المنصة حين يحين الموعد." /></section>}
  </>;
}

/** Meetings and guardian consents: what was agreed and when. The signed paper itself stays on paper. */
function MeetingsTab() {
  const { data, saveDesk, notify } = useWorkspace(); const all = data.desk?.meetings ?? []; const now = today(); const [draft, setDraft] = useState<Meeting | null>(null);
  const store = (next: Meeting[]) => saveDesk({ meetings: next });
  const save = (e: FormEvent) => { e.preventDefault(); if (!draft?.topic.trim()) return; const m = { ...draft, topic: draft.topic.trim(), attendees: draft.attendees.trim(), notes: draft.notes.trim(), learnerId: draft.learnerId || undefined, consent: draft.kind === 'consent' ? draft.consent ?? 'pending' : undefined }; store(all.some(x => x.id === m.id) ? all.map(x => x.id === m.id ? m : x) : [m, ...all]); setDraft(null); notify(m.kind === 'consent' ? 'حُفظت الموافقة' : 'حُفظ محضر الاجتماع'); };
  const rows = [...all].sort((a, b) => b.date.localeCompare(a.date));
  return <>
    <div className="heading-actions desk-tab-actions no-print"><button className="button primary" onClick={() => setDraft({ id: uid(), kind: 'meeting', date: now, topic: '', attendees: '', notes: '' })}><Plus size={17} />اجتماع أو موافقة</button><button className="button secondary" onClick={() => window.print()}><Printer size={17} />طباعة</button></div>
    {draft && <form className="panel desk-panel desk-form no-print" onSubmit={save} ref={el => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })}><div className="section-heading"><h2>{all.some(x => x.id === draft.id) ? 'تعديل السجل' : 'سجل جديد'}</h2></div>
      <div className="form-grid"><label>النوع<select value={draft.kind} onChange={e => setDraft({ ...draft, kind: e.target.value as MeetingKind })}>{(Object.keys(meetingKinds) as MeetingKind[]).map(k => <option key={k} value={k}>{meetingKinds[k]}</option>)}</select></label><label>{draft.kind === 'consent' ? 'على ماذا الموافقة؟' : 'موضوع الاجتماع'}<input required autoFocus maxLength={200} value={draft.topic} onChange={e => setDraft({ ...draft, topic: e.target.value })} placeholder={draft.kind === 'consent' ? 'مثلًا: تصوير أعمال الطالب لملف الإنجاز' : 'مثلًا: مراجعة الخطة الفردية'} /></label><label>التاريخ<input type="date" value={draft.date} onChange={e => e.target.value && setDraft({ ...draft, date: e.target.value })} /></label><label>الطالب (اختياري)<select value={draft.learnerId ?? ''} onChange={e => setDraft({ ...draft, learnerId: e.target.value || undefined })}><option value="">بلا طالب محدد</option>{data.learners.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>{draft.kind === 'consent' && <label>الرد<select value={draft.consent ?? 'pending'} onChange={e => setDraft({ ...draft, consent: e.target.value as ConsentState })}>{(Object.keys(consentStates) as ConsentState[]).map(k => <option key={k} value={k}>{consentStates[k]}</option>)}</select></label>}<label>{draft.kind === 'consent' ? 'من أعطى الرد' : 'الحاضرون'}<input maxLength={400} value={draft.attendees} onChange={e => setDraft({ ...draft, attendees: e.target.value })} /></label></div>
      <label>{draft.kind === 'consent' ? 'ملاحظات' : 'ما تقرر'}<textarea rows={3} maxLength={1500} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} /></label>
      <p className="info-note">الورقة الموقّعة تبقى ورقية في ملف المدرسة. هذا السجل يذكّرك بما تقرر ومتى.</p>
      <div className="heading-actions"><button className="button primary"><Check size={17} />حفظ</button><button type="button" className="button secondary" onClick={() => setDraft(null)}>إلغاء</button></div></form>}
    {rows.length ? <ul className="record-list">{rows.map((m, i) => <li className="panel record-card" key={m.id} style={{ '--i': i } as React.CSSProperties}><header><div><h2>{m.topic}</h2><p className="muted">{meetingKinds[m.kind]} · {dateLabel(m.date)}{m.learnerId ? ` · ${first(data.learners.find(l => l.id === m.learnerId))}` : ''}</p></div>{m.kind === 'consent' && <span className={`plan-state ${m.consent === 'yes' ? 'ok' : m.consent === 'no' ? 'late' : 'warn'}`}>{consentStates[m.consent ?? 'pending']}</span>}</header>
      {m.attendees && <p className="record-goal"><strong>{m.kind === 'consent' ? 'من أعطى الرد:' : 'الحاضرون:'}</strong> {m.attendees}</p>}{m.notes && <p>{m.notes}</p>}
      <div className="heading-actions no-print"><button className="button secondary" onClick={() => setDraft(m)}><Pencil size={16} />تعديل</button><button className="button secondary" onClick={async () => { if (await confirmDialog(`حذف «${m.topic}»؟`, { ok: 'حذف السجل' })) store(all.filter(x => x.id !== m.id)); }}><Trash2 size={16} />حذف</button></div></li>)}</ul>
      : !draft && <section className="panel desk-panel"><Empty title="لا اجتماعات ولا موافقات بعد" description="سجّل محضر الاجتماع وما تقرر فيه، أو موافقة ولي الأمر وردّه وتاريخه." /></section>}
  </>;
}


/** Links that let a specialist read one pupil's report and leave a recommendation, and the recommendations that arrived. Needs the teacher's account, since the link is served by the platform's server. */
function SpecialistsTab() {
  const { data, account, notify } = useWorkspace(); const [links, setLinks] = useState<SpecialistLink[]>([]); const [notes, setNotes] = useState<SpecialistNote[]>([]); const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading'); const [busy, setBusy] = useState(false); const [copied, setCopied] = useState('');
  const reload = useCallback(async () => { if (!account) return; try { const [l, n] = await Promise.all([specialistLinks(), specialistNotes()]); setLinks(l); setNotes(n); setState('ready'); } catch { setState('error'); } }, [account]);
  useEffect(() => { void reload(); }, [reload]);
  const run = async (work: () => Promise<unknown>, done: string) => { setBusy(true); try { await work(); await reload(); notify(done); } catch (e) { notify(e instanceof SyncError ? e.message : 'تعذّر الاتصال بالخادم.'); } finally { setBusy(false); } };
  const copy = async (url: string, id: string) => { try { await navigator.clipboard.writeText(url); setCopied(id); window.setTimeout(() => setCopied(''), 2000); } catch { notify('انسخ الرابط من الحقل يدويًا'); } };
  if (!accountsAvailable) return <section className="panel desk-panel"><p className="info-note desk-note">تعمل روابط الأخصائيين مع خادم المنصة، وهو غير مفعّل في هذه النسخة.</p></section>;
  if (!account) return <section className="panel desk-panel"><Empty title="سجّل الدخول لتنشئ روابط الأخصائيين" description="الرابط يفتح تقرير الطالب من جهاز الأخصائي، فيحتاج أن تكون بياناتك محفوظة في حسابك. الدخول من «إعدادات المساحة»." /></section>;
  if (state === 'error') return <section className="panel desk-panel"><p className="info-note desk-note">تعذّر تحميل روابط الأخصائيين. حاول مرة أخرى بعد قليل.</p></section>;
  if (!data.learners.length) return <section className="panel desk-panel"><Empty title="أضف ملف طالب أولًا" description="الرابط يُنشأ لطالب بعينه، فأضفه من «قائمة الطلاب» ثم عُد." /></section>;
  return <>
    {notes.length > 0 && <section className="panel desk-panel"><div className="section-heading"><h2>توصيات وصلت</h2><span className="desk-count">{countOf(notes.length, 'توصية', 'توصيتان', 'توصيات')}</span></div>
      <ul className="record-list specialist-notes">{notes.map(n => <li className="record-card" key={n.id}><header><div><h2>{n.who}</h2><p className="muted">عن {first(data.learners.find(l => l.id === n.learnerId))} · {dateLabel(localDay(n.at))}</p></div></header><p>{n.text}</p><div className="heading-actions"><button className="button secondary" disabled={busy} onClick={() => run(() => dismissSpecialistNote(n.id), 'أُزيلت التوصية من القائمة')}><Check size={16} />قرأتها</button></div></li>)}</ul></section>}
    <section className="panel desk-panel"><div className="section-heading"><h2>رابط لكل طالب</h2><span className="desk-count">{countOf(links.length, 'رابط فعّال', 'رابطان فعّالان', 'روابط فعّالة')}</span></div>
      <p className="muted desk-note">الرابط يفتح تقرير الطالب للقراءة فقط: أهدافه ومستوياته وحضوره وخطط سلوكه وإحالاته. لا يفتح ملف الطالب ولا ملاحظاتك. من يحمل الرابط يرى التقرير، فأرسله للأخصائي المعني وحده، وأوقفه حين ينتهي عمله.</p>
      <ul className="desk-list specialist-links">{data.learners.map(l => { const link = links.find(x => x.learnerId === l.id); const url = link ? specialistUrl(window.location.origin, link.token) : ''; return <li key={l.id}><div><strong>{l.name}</strong>{link ? <input readOnly dir="ltr" aria-label={`رابط الأخصائي لـ${first(l)}`} value={url} onFocus={e => e.currentTarget.select()} /> : <small>لا رابط بعد</small>}</div>
        {link ? <><button type="button" className="button secondary" onClick={() => copy(url, l.id)}>{copied === l.id ? 'نُسخ' : 'نسخ'}</button><button type="button" className="button secondary" disabled={busy} onClick={async () => { if (await confirmDialog(`إيقاف رابط الأخصائي لـ${first(l)}؟ لن يُفتح التقرير بعد الآن.`, { ok: 'إيقاف الرابط' })) void run(() => revokeSpecialistLink(l.id), 'أُوقف رابط الأخصائي'); }}>إيقاف</button></>
          : <button type="button" className="button primary" disabled={busy || state === 'loading'} onClick={() => run(() => issueSpecialistLink(l.id, parentToken(crypto.getRandomValues(new Uint8Array(24)))), 'أُنشئ رابط الأخصائي')}>أنشئ الرابط</button>}</li>; })}</ul></section>
  </>;
}

/** The support team around the pupils: its members, referrals to them, meetings with consents, and links for specialists. */
export function TeamPage() {
  const [tab, setTab] = useState<'members' | 'referrals' | 'meetings' | 'links'>('members');
  return <>
    <PageHeading title="الفريق والإحالات" description="من يعمل معك على خطط الطلاب، وإحالة كل طالب ومتابعتها، ومحاضر الاجتماعات وموافقات أولياء الأمور." />
    <div className="session-tabs desk-tabs no-print" role="tablist" aria-label="أقسام الفريق">{([['members', 'أعضاء الفريق'], ['referrals', 'الإحالات'], ['meetings', 'الاجتماعات والموافقات'], ['links', 'روابط الأخصائيين']] as const).map(([k, t]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{t}</button>)}</div>
    {tab === 'members' ? <MembersTab /> : tab === 'referrals' ? <ReferralsTab /> : tab === 'meetings' ? <MeetingsTab /> : <SpecialistsTab />}
  </>;
}

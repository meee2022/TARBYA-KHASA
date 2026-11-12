/** Records a teacher keeps beside the plans: evidence of pupils' learning, their own portfolio, the support team, referrals, and meetings with consents. */

/** One piece of evidence of a pupil's learning. Files stay with the teacher: the record holds a description and, at most, a link. */
export interface Evidence { id: string; learnerId: string; title: string; date: string; goalId?: string; note: string; link?: string; reviewed: boolean; }

export const portfolioSections = { courses: 'دورات وتدريب', initiatives: 'مبادرات', awards: 'تكريم وشهادات', samples: 'نماذج عمل' } as const;
export type PortfolioSection = keyof typeof portfolioSections;
export interface PortfolioItem { id: string; section: PortfolioSection; title: string; date: string; hours?: number; note: string; }
/** Training hours recorded in a calendar year. */
export const trainingHours = (items: PortfolioItem[], year: string) => items.filter(i => i.section === 'courses' && i.date.startsWith(year)).reduce((t, i) => t + (i.hours ?? 0), 0);

export interface TeamMember { id: string; name: string; role: string; note: string; }

export const referralStates = { open: 'مفتوحة', following: 'قيد المتابعة', closed: 'مغلقة' } as const;
export type ReferralState = keyof typeof referralStates;
export interface Referral { id: string; learnerId: string; date: string; to: string; reason: string; state: ReferralState; followUp: string; reply: string; }
/** Referrals still open whose follow-up date has come. */
export const referralsDue = (list: Referral[], now: string) => list.filter(r => r.state !== 'closed' && r.followUp && r.followUp <= now);

export const meetingKinds = { meeting: 'اجتماع', consent: 'موافقة ولي الأمر' } as const;
export type MeetingKind = keyof typeof meetingKinds;
export const consentStates = { pending: 'بانتظار الرد', yes: 'موافقة', no: 'عدم موافقة' } as const;
export type ConsentState = keyof typeof consentStates;
/** A meeting, or a consent asked of a guardian. The signed paper stays on paper: the record only says what was agreed and when. */
export interface Meeting { id: string; kind: MeetingKind; date: string; learnerId?: string; topic: string; attendees: string; notes: string; consent?: ConsentState; }

export interface Records { evidence?: Evidence[]; portfolio?: PortfolioItem[]; team?: TeamMember[]; referrals?: Referral[]; meetings?: Meeting[]; }

const str = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;
const opt = (v: unknown, max: number) => v === undefined || str(v, max);
const list = <T>(v: unknown, max: number, ok: (x: T) => boolean) => v === undefined || (Array.isArray(v) && v.length <= max && v.every(x => !!x && typeof x === 'object' && ok(x as T)));
/** Trust boundary for the synced workspace: shapes and sizes only. */
export function validRecords(d: Records): boolean {
  return list<Evidence>(d.evidence, 2000, e => str(e.id, 80) && str(e.learnerId, 80) && str(e.title, 160) && str(e.date, 10) && opt(e.goalId, 80) && str(e.note, 800) && opt(e.link, 500) && typeof e.reviewed === 'boolean')
    && list<PortfolioItem>(d.portfolio, 1000, p => str(p.id, 80) && p.section in portfolioSections && str(p.title, 160) && str(p.date, 10) && (p.hours === undefined || (Number.isFinite(p.hours) && p.hours >= 0 && p.hours <= 1000)) && str(p.note, 800))
    && list<TeamMember>(d.team, 100, m => str(m.id, 80) && str(m.name, 120) && str(m.role, 120) && str(m.note, 300))
    && list<Referral>(d.referrals, 1000, r => str(r.id, 80) && str(r.learnerId, 80) && str(r.date, 10) && str(r.to, 160) && str(r.reason, 800) && r.state in referralStates && str(r.followUp, 10) && str(r.reply, 800))
    && list<Meeting>(d.meetings, 1000, m => str(m.id, 80) && m.kind in meetingKinds && str(m.date, 10) && opt(m.learnerId, 80) && str(m.topic, 200) && str(m.attendees, 400) && str(m.notes, 1500) && (m.consent === undefined || m.consent in consentStates));
}

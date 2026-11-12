import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { assertWorkspace } from "../packages/domain/index.ts";
import { latinizeContent, latinDigits } from "../packages/domain/numbers.ts";
import { MAX_SPECIALIST_LINKS, MAX_SPECIALIST_NOTES, SPECIALIST_TOKEN_RE, specialistView, validSpecialistNote } from "../packages/domain/specialist.ts";
import { requireTeacher } from "./teacher.ts";

const fail = (status: number, message: string) => new ConvexError({ status, message });

// The specialist's link is a capability like the family's: whoever holds it reads one pupil's report and may leave a recommendation.
// It never opens the pupil's file, and the teacher cuts it off with `revoke`.
async function workspaceOf(ctx: QueryCtx, teacherId: Id<"teachers">) {
  const row = await ctx.db.query("teacherWorkspaces").withIndex("by_teacher", (q) => q.eq("teacherId", teacherId)).first();
  if (!row) return null;
  const parsed: unknown = JSON.parse(row.json);
  return assertWorkspace(parsed) ? parsed : null;
}
const linksOf = (ctx: QueryCtx, teacherId: Id<"teachers">) => ctx.db.query("specialistLinks").withIndex("by_teacher", (q) => q.eq("teacherId", teacherId)).collect();
const linkFor = (ctx: QueryCtx, token: string) => ctx.db.query("specialistLinks").withIndex("by_token", (q) => q.eq("token", token)).first();
const publicLink = (l: Doc<"specialistLinks">) => ({ learnerId: l.learnerId, token: l.token, createdAt: l.createdAt });
// Qatar keeps UTC+3 all year: the report's "today" is the school's day, not the server's.
const schoolDay = () => new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);

// Teacher side.
export const links = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => { const t = await requireTeacher(ctx, token); return (await linksOf(ctx, t._id)).map(publicLink); },
});
export const issue = mutation({
  args: { token: v.string(), learnerId: v.string(), linkToken: v.string() },
  handler: async (ctx, { token, learnerId, linkToken }) => {
    const t = await requireTeacher(ctx, token);
    if (!SPECIALIST_TOKEN_RE.test(linkToken) || learnerId.length > 80) throw fail(400, "رابط غير صالح.");
    const w = await workspaceOf(ctx, t._id);
    if (!w?.learners.some((l) => l.id === learnerId)) throw fail(404, "احفظ ملف الطالب في حسابك أولًا، ثم أنشئ الرابط.");
    const mine = await linksOf(ctx, t._id);
    for (const l of mine) if (l.learnerId === learnerId) await ctx.db.delete(l._id);
    if (mine.filter((l) => l.learnerId !== learnerId).length >= MAX_SPECIALIST_LINKS) throw fail(409, "وصل عدد روابط الأخصائيين إلى الحد. أوقف روابط طلاب سابقين.");
    await ctx.db.insert("specialistLinks", { teacherId: t._id, learnerId, token: linkToken, createdAt: new Date().toISOString() });
  },
});
export const revoke = mutation({
  args: { token: v.string(), learnerId: v.string() },
  handler: async (ctx, { token, learnerId }) => {
    const t = await requireTeacher(ctx, token);
    for (const l of await linksOf(ctx, t._id)) if (l.learnerId === learnerId) await ctx.db.delete(l._id);
  },
});
export const notes = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const t = await requireTeacher(ctx, token);
    const rows = await ctx.db.query("specialistNotes").withIndex("by_teacher", (q) => q.eq("teacherId", t._id)).order("desc").take(MAX_SPECIALIST_NOTES * 4);
    return rows.map((r) => ({ id: String(r._id), learnerId: r.learnerId, who: r.who, text: r.text, at: r.at }));
  },
});
export const dismissNote = mutation({
  args: { token: v.string(), id: v.string() },
  handler: async (ctx, { token, id }) => {
    const t = await requireTeacher(ctx, token);
    const rowId = ctx.db.normalizeId("specialistNotes", id); const row = rowId && (await ctx.db.get(rowId));
    if (row && row.teacherId === t._id) await ctx.db.delete(row._id);
  },
});

// Specialist side: no account, only the link. An unknown or revoked link reads as null, never as an error that tells a guesser anything.
export const view = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!SPECIALIST_TOKEN_RE.test(token)) return null;
    const link = await linkFor(ctx, token); if (!link) return null;
    const teacher = await ctx.db.get(link.teacherId); if (!teacher?.active) return null;
    const w = await workspaceOf(ctx, link.teacherId); if (!w) return null;
    return specialistView(w, link.learnerId, latinDigits(teacher.name), schoolDay());
  },
});
export const note = mutation({
  args: { token: v.string(), who: v.string(), text: v.string() },
  handler: async (ctx, { token, who, text }) => {
    if (!SPECIALIST_TOKEN_RE.test(token)) throw fail(404, "هذا الرابط لم يعد صالحًا.");
    const link = await linkFor(ctx, token); if (!link) throw fail(404, "هذا الرابط لم يعد صالحًا.");
    if (!validSpecialistNote(who, text)) throw fail(400, "اكتب اسمك أو دورك، ثم التوصية.");
    // ponytail: the oldest recommendations for this pupil fall off at 50; the teacher clears the ones already read.
    const mine = (await ctx.db.query("specialistNotes").withIndex("by_teacher", (q) => q.eq("teacherId", link.teacherId)).collect()).filter((r) => r.learnerId === link.learnerId).sort((a, b) => a.at.localeCompare(b.at));
    for (const old of mine.slice(0, Math.max(0, mine.length + 1 - MAX_SPECIALIST_NOTES))) await ctx.db.delete(old._id);
    await ctx.db.insert("specialistNotes", { teacherId: link.teacherId, learnerId: link.learnerId, who: latinizeContent(who.trim()), text: latinizeContent(text.trim()), at: new Date().toISOString() });
  },
});

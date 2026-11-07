import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { assertWorkspace } from "../packages/domain/index.ts";
import { latinizeContent, latinDigits } from "../packages/domain/numbers.ts";
import { MAX_PARENT_LINKS, MAX_PARENT_REPLIES, PARENT_TOKEN_RE, parentView, validParentReply, type ParentChoice } from "../packages/domain/parent.ts";
import { requireTeacher } from "./teacher.ts";

const fail = (status: number, message: string) => new ConvexError({ status, message });

// The family's link is a capability: whoever holds it reads one child's page. It stays in plain text so the teacher can copy it again
// and send it anew; anyone able to read this table could read the workspaces themselves. The teacher cuts it off with `revoke`.
async function workspaceOf(ctx: QueryCtx, teacherId: Id<"teachers">) {
  const row = await ctx.db.query("teacherWorkspaces").withIndex("by_teacher", (q) => q.eq("teacherId", teacherId)).first();
  if (!row) return null;
  const parsed: unknown = JSON.parse(row.json);
  return assertWorkspace(parsed) ? parsed : null;
}
const linksOf = (ctx: QueryCtx, teacherId: Id<"teachers">) => ctx.db.query("parentLinks").withIndex("by_teacher", (q) => q.eq("teacherId", teacherId)).collect();
const linkFor = (ctx: QueryCtx, token: string) => ctx.db.query("parentLinks").withIndex("by_token", (q) => q.eq("token", token)).first();
const publicLink = (l: Doc<"parentLinks">) => ({ learnerId: l.learnerId, token: l.token, createdAt: l.createdAt });

// Teacher side.
export const links = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => { const t = await requireTeacher(ctx, token); return (await linksOf(ctx, t._id)).map(publicLink); },
});
export const issue = mutation({
  args: { token: v.string(), learnerId: v.string(), parentToken: v.string() },
  handler: async (ctx, { token, learnerId, parentToken }) => {
    const t = await requireTeacher(ctx, token);
    if (!PARENT_TOKEN_RE.test(parentToken) || learnerId.length > 80) throw fail(400, "رابط غير صالح.");
    const w = await workspaceOf(ctx, t._id);
    if (!w?.learners.some((l) => l.id === learnerId)) throw fail(404, "احفظ ملف الطالب في حسابك أولًا، ثم أنشئ الرابط.");
    const mine = await linksOf(ctx, t._id);
    for (const l of mine) if (l.learnerId === learnerId) await ctx.db.delete(l._id);
    if (mine.filter((l) => l.learnerId !== learnerId).length >= MAX_PARENT_LINKS) throw fail(409, "وصل عدد روابط الأسر إلى الحد. أوقف روابط طلاب سابقين.");
    await ctx.db.insert("parentLinks", { teacherId: t._id, learnerId, token: parentToken, createdAt: new Date().toISOString() });
  },
});
export const revoke = mutation({
  args: { token: v.string(), learnerId: v.string() },
  handler: async (ctx, { token, learnerId }) => {
    const t = await requireTeacher(ctx, token);
    for (const l of await linksOf(ctx, t._id)) if (l.learnerId === learnerId) await ctx.db.delete(l._id);
  },
});
export const replies = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const t = await requireTeacher(ctx, token);
    const rows = await ctx.db.query("parentReplies").withIndex("by_teacher", (q) => q.eq("teacherId", t._id)).order("desc").take(MAX_PARENT_REPLIES * 4);
    return rows.map((r) => ({ id: String(r._id), learnerId: r.learnerId, choice: r.choice as ParentChoice, text: r.text, at: r.at }));
  },
});
export const dismissReply = mutation({
  args: { token: v.string(), id: v.string() },
  handler: async (ctx, { token, id }) => {
    const t = await requireTeacher(ctx, token);
    const rowId = ctx.db.normalizeId("parentReplies", id); const row = rowId && (await ctx.db.get(rowId));
    if (row && row.teacherId === t._id) await ctx.db.delete(row._id);
  },
});

// Family side: no account, only the link. An unknown or revoked link reads as null, never as an error that tells a guesser anything.
export const view = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!PARENT_TOKEN_RE.test(token)) return null;
    const link = await linkFor(ctx, token); if (!link) return null;
    const teacher = await ctx.db.get(link.teacherId); if (!teacher?.active) return null;
    const w = await workspaceOf(ctx, link.teacherId); if (!w) return null;
    return parentView(w, link.learnerId, latinDigits(teacher.name));
  },
});
export const reply = mutation({
  args: { token: v.string(), choice: v.string(), text: v.string() },
  handler: async (ctx, { token, choice, text }) => {
    if (!PARENT_TOKEN_RE.test(token)) throw fail(404, "هذا الرابط لم يعد صالحًا.");
    const link = await linkFor(ctx, token); if (!link) throw fail(404, "هذا الرابط لم يعد صالحًا.");
    if (!validParentReply(choice, text)) throw fail(400, "اختاروا إحدى الإجابات، وكلمة قصيرة إن أحببتم.");
    // ponytail: the oldest answers of this child fall off at 50; the teacher clears the ones she has read.
    const mine = (await ctx.db.query("parentReplies").withIndex("by_teacher", (q) => q.eq("teacherId", link.teacherId)).collect()).filter((r) => r.learnerId === link.learnerId).sort((a, b) => a.at.localeCompare(b.at));
    for (const old of mine.slice(0, Math.max(0, mine.length + 1 - MAX_PARENT_REPLIES))) await ctx.db.delete(old._id);
    await ctx.db.insert("parentReplies", { teacherId: link.teacherId, learnerId: link.learnerId, choice, text: latinizeContent(text.trim()), at: new Date().toISOString() });
  },
});

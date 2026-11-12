import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { assertWorkspace } from "../packages/domain/index.ts";
import { latinizeContent, latinDigits } from "../packages/domain/numbers.ts";
import { AI_DAILY_LIMIT, MAX_TEACHERS, MAX_WORKSPACE_BYTES, TEACHER_SESSION_MS } from "./adminRules.ts";
import { audit, requireUser, sha256 } from "./admin.ts";

const fail = (status: number, message: string) => new ConvexError({ status, message });
const EXPIRED = "انتهت جلستك. سجّل الدخول مجددًا.";

async function teacherFromHash(ctx: QueryCtx, tokenHash: string) {
  const session = await ctx.db.query("teacherSessions").withIndex("by_token", (q) => q.eq("tokenHash", tokenHash)).first();
  if (!session || session.expires < Date.now()) return null;
  const teacher = await ctx.db.get(session.teacherId);
  return teacher?.active ? teacher : null;
}
export async function requireTeacher(ctx: QueryCtx, token: string) {
  const teacher = await teacherFromHash(ctx, await sha256(token));
  if (!teacher) throw fail(401, EXPIRED);
  return teacher;
}
async function endSessions(ctx: MutationCtx, teacherId: Id<"teachers">) {
  for (const s of await ctx.db.query("teacherSessions").withIndex("by_teacher", (q) => q.eq("teacherId", teacherId)).collect()) await ctx.db.delete(s._id);
}

// Public, but every call needs the teacher's own session token. No function lets anyone read another teacher's workspace.
export const me = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => { const t = await teacherFromHash(ctx, await sha256(token)); return t ? { username: t.username, name: latinDigits(t.name) } : null; },
});
export const aiReady = query({ args: {}, handler: async () => Boolean(process.env.ANTHROPIC_API_KEY) });
export const workspace = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const t = await requireTeacher(ctx, token);
    const row = await ctx.db.query("teacherWorkspaces").withIndex("by_teacher", (q) => q.eq("teacherId", t._id)).first();
    return { json: row?.json ?? null, revision: row?.revision ?? 0 };
  },
});
export const saveWorkspace = mutation({
  args: { token: v.string(), json: v.string(), revision: v.number() },
  handler: async (ctx, { token, json, revision }) => {
    const t = await requireTeacher(ctx, token);
    if (json.length > MAX_WORKSPACE_BYTES) throw fail(413, "بياناتك أكبر من حد المزامنة. احذف دروسًا أو سجلات قديمة، وصدّر نسخة احتياطية.");
    let parsed: unknown;
    try { parsed = JSON.parse(json); } catch { throw fail(400, "بيانات غير صالحة."); }
    if (!assertWorkspace(parsed)) throw fail(400, "بيانات غير صالحة.");
    const row = await ctx.db.query("teacherWorkspaces").withIndex("by_teacher", (q) => q.eq("teacherId", t._id)).first();
    // Two devices editing at once: the second save is refused instead of silently erasing the first.
    if ((row?.revision ?? 0) !== revision) throw fail(409, "تغيّرت بياناتك من جهاز آخر. حمّل آخر نسخة قبل المتابعة.");
    const next = { json: JSON.stringify(latinizeContent(parsed)), revision: revision + 1, updatedAt: new Date().toISOString() };
    if (row) await ctx.db.patch(row._id, next); else await ctx.db.insert("teacherWorkspaces", { teacherId: t._id, ...next });
    return next.revision;
  },
});
export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const tokenHash = await sha256(token);
    const row = await ctx.db.query("teacherSessions").withIndex("by_token", (q) => q.eq("tokenHash", tokenHash)).first();
    if (row) await ctx.db.delete(row._id);
  },
});

// Admin: switch an account off, or delete it with everything stored for it.
export const toggleTeacher = mutation({
  args: { token: v.string(), id: v.string() },
  handler: async (ctx, { token, id }) => {
    const actor = await requireUser(ctx, token);
    const teacherId = ctx.db.normalizeId("teachers", id); const teacher = teacherId && await ctx.db.get(teacherId);
    if (!teacher) throw fail(404, "الحساب غير موجود.");
    await ctx.db.patch(teacher._id, { active: !teacher.active }); await endSessions(ctx, teacher._id);
    await audit(ctx, actor.username, "تغيير حالة معلم: " + teacher.username);
  },
});
export const removeTeacher = mutation({
  args: { token: v.string(), id: v.string() },
  handler: async (ctx, { token, id }) => {
    const actor = await requireUser(ctx, token);
    const teacherId = ctx.db.normalizeId("teachers", id); const teacher = teacherId && await ctx.db.get(teacherId);
    if (!teacher) throw fail(404, "الحساب غير موجود.");
    await endSessions(ctx, teacher._id);
    for (const w of await ctx.db.query("teacherWorkspaces").withIndex("by_teacher", (q) => q.eq("teacherId", teacher._id)).collect()) await ctx.db.delete(w._id);
    for (const u of await ctx.db.query("aiUsage").withIndex("by_teacher", (q) => q.eq("teacherId", teacher._id)).collect()) await ctx.db.delete(u._id);
    for (const l of await ctx.db.query("parentLinks").withIndex("by_teacher", (q) => q.eq("teacherId", teacher._id)).collect()) await ctx.db.delete(l._id);
    for (const r of await ctx.db.query("parentReplies").withIndex("by_teacher", (q) => q.eq("teacherId", teacher._id)).collect()) await ctx.db.delete(r._id);
    for (const l of await ctx.db.query("specialistLinks").withIndex("by_teacher", (q) => q.eq("teacherId", teacher._id)).collect()) await ctx.db.delete(l._id);
    for (const r of await ctx.db.query("specialistNotes").withIndex("by_teacher", (q) => q.eq("teacherId", teacher._id)).collect()) await ctx.db.delete(r._id);
    for (const room of await ctx.db.query("rooms").withIndex("by_teacher", (q) => q.eq("teacherId", teacher._id)).collect()) { for (const a of await ctx.db.query("roomAnswers").withIndex("by_room", (q) => q.eq("roomId", room._id)).collect()) await ctx.db.delete(a._id); await ctx.db.delete(room._id); }
    await ctx.db.delete(teacher._id);
    await audit(ctx, actor.username, "حذف حساب معلم وبياناته: " + teacher.username);
  },
});

// Internal: reachable only from convex/adminAuth.ts and convex/author.ts.
export const teacherByUsername = internalQuery({
  args: { username: v.string() },
  handler: (ctx, { username }) => ctx.db.query("teachers").withIndex("by_username", (q) => q.eq("username", username)).first(),
});
export const teacherForToken = internalQuery({ args: { tokenHash: v.string() }, handler: (ctx, { tokenHash }) => teacherFromHash(ctx, tokenHash) });
export const createSession = internalMutation({
  args: { teacherId: v.id("teachers"), tokenHash: v.string() },
  handler: async (ctx, { teacherId, tokenHash }) => {
    for (const s of await ctx.db.query("teacherSessions").withIndex("by_teacher", (q) => q.eq("teacherId", teacherId)).collect()) if (s.expires < Date.now()) await ctx.db.delete(s._id);
    await ctx.db.insert("teacherSessions", { teacherId, tokenHash, expires: Date.now() + TEACHER_SESSION_MS });
    const t = await ctx.db.get(teacherId);
    return t ? { username: t.username, name: latinDigits(t.name) } : null;
  },
});
export const createTeacher = internalMutation({
  args: { actor: v.string(), username: v.string(), name: v.string(), hash: v.string(), salt: v.string() },
  handler: async (ctx, { actor, ...args }) => {
    const all = await ctx.db.query("teachers").take(MAX_TEACHERS + 1);
    if (all.length >= MAX_TEACHERS || all.some((t) => t.username === args.username)) throw fail(409, "اسم الدخول مستخدم أو وصل عدد الحسابات إلى الحد.");
    const id = await ctx.db.insert("teachers", { ...args, active: true });
    await audit(ctx, actor, "إضافة معلم: " + args.username);
    return { id: id as string, username: args.username, name: args.name, active: true };
  },
});
export const setPassword = internalMutation({
  args: { teacherId: v.id("teachers"), hash: v.string(), salt: v.string(), tokenHash: v.optional(v.string()), actor: v.optional(v.string()) },
  handler: async (ctx, { teacherId, hash, salt, tokenHash, actor }) => {
    await ctx.db.patch(teacherId, { hash, salt }); await endSessions(ctx, teacherId);
    if (tokenHash) await ctx.db.insert("teacherSessions", { teacherId, tokenHash, expires: Date.now() + TEACHER_SESSION_MS });
    const t = await ctx.db.get(teacherId);
    if (actor && t) await audit(ctx, actor, "تعيين كلمة مرور جديدة للمعلم: " + t.username);
  },
});
/** Counts one AI draft for this teacher. Returns false once today's limit is reached. */
export const useAi = internalMutation({
  args: { teacherId: v.id("teachers") },
  handler: async (ctx, { teacherId }) => {
    const since = Date.now() - 864e5;
    const rows = await ctx.db.query("aiUsage").withIndex("by_teacher", (q) => q.eq("teacherId", teacherId)).collect();
    for (const r of rows) if (r.at <= since) await ctx.db.delete(r._id);
    if (rows.filter((r) => r.at > since).length >= AI_DAILY_LIMIT) return false;
    await ctx.db.insert("aiUsage", { teacherId, at: Date.now() });
    return true;
  },
});

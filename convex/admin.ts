import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { defaultSite, validateSite } from "../packages/domain/site.ts";
import { latinizeContent, latinDigits } from "../packages/domain/numbers.ts";
import { ATTEMPT_WINDOW_MS, MAX_ADMINS, MAX_ATTEMPTS, MAX_SITE_BYTES, MAX_TEACHERS, SESSION_MS } from "./adminRules.ts";

const fail = (status: number, message: string) => new ConvexError({ status, message });
const EXPIRED = "انتهت جلسة الإدارة. سجّل الدخول مجددًا.";
type Admin = { _id: Id<"adminUsers">; username: string; name: string; active: boolean };
const publicUser = (u: Admin) => ({ id: u._id, username: u.username, name: latinDigits(u.name), active: u.active });

export async function sha256(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function userFromHash(ctx: QueryCtx, tokenHash: string) {
  const session = await ctx.db.query("adminSessions").withIndex("by_token", (q) => q.eq("tokenHash", tokenHash)).first();
  if (!session || session.expires < Date.now()) return null;
  const user = await ctx.db.get(session.userId);
  return user?.active ? user : null;
}
export async function requireUser(ctx: QueryCtx, token: string) {
  const user = await userFromHash(ctx, await sha256(token));
  if (!user) throw fail(401, EXPIRED);
  return user;
}
export async function audit(ctx: MutationCtx, actor: string, action: string) {
  await ctx.db.insert("adminAudit", { actor, action, date: new Date().toISOString() });
  for (const old of (await ctx.db.query("adminAudit").order("desc").take(320)).slice(300)) await ctx.db.delete(old._id);
}
async function revokeSessions(ctx: MutationCtx, userId: Id<"adminUsers">) {
  for (const s of await ctx.db.query("adminSessions").withIndex("by_user", (q) => q.eq("userId", userId)).collect()) await ctx.db.delete(s._id);
}

// Public: the settings every visitor needs. Nothing here identifies an admin.
export const getSite = query({ args: {}, handler: async (ctx) => (await ctx.db.query("platformSite").first())?.json ?? null });

export const session = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    const user = token ? await userFromHash(ctx, await sha256(token)) : null;
    return { setupRequired: !(await ctx.db.query("adminUsers").first()), user: user ? publicUser(user) : null };
  },
});

export const state = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireUser(ctx, token);
    const site = await ctx.db.query("platformSite").first();
    const entries = await ctx.db.query("adminAudit").order("desc").take(300);
    return {
      json: site?.json ?? JSON.stringify(defaultSite),
      users: (await ctx.db.query("adminUsers").take(MAX_ADMINS + 1)).map(publicUser),
      teachers: (await ctx.db.query("teachers").take(MAX_TEACHERS)).map((t) => ({ id: t._id, username: t.username, name: latinDigits(t.name), active: t.active })),
      audit: entries.map((a) => ({ id: a._id, actor: a.actor, action: a.action, date: a.date })),
      aiConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    };
  },
});

export const saveSettings = mutation({
  args: { token: v.string(), json: v.string() },
  handler: async (ctx, { token, json }) => {
    const user = await requireUser(ctx, token);
    if (json.length > MAX_SITE_BYTES) throw fail(413, "حجم الإعدادات أكبر من المسموح.");
    let site;
    try { site = latinizeContent(validateSite(JSON.parse(json))); }
    catch (e) { throw fail(400, (e as Error).message || "إعدادات غير صالحة."); }
    const current = await ctx.db.query("platformSite").first();
    if (site.revision !== (current?.revision ?? 0)) throw fail(409, "تغيّرت الإعدادات من جلسة أخرى. أعد تحميلها قبل الحفظ.");
    site.revision++;
    const next = JSON.stringify(site);
    if (current) await ctx.db.patch(current._id, { json: next, revision: site.revision });
    else await ctx.db.insert("platformSite", { json: next, revision: site.revision });
    await audit(ctx, user.username, "تحديث إعدادات المنصة");
    return next;
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const tokenHash = await sha256(token);
    const row = await ctx.db.query("adminSessions").withIndex("by_token", (q) => q.eq("tokenHash", tokenHash)).first();
    if (row) await ctx.db.delete(row._id);
  },
});

export const toggleUser = mutation({
  args: { token: v.string(), id: v.string() },
  handler: async (ctx, { token, id }) => {
    const actor = await requireUser(ctx, token);
    const userId = ctx.db.normalizeId("adminUsers", id);
    const user = userId && await ctx.db.get(userId);
    if (!user) throw fail(404, "الحساب غير موجود.");
    if (user._id === actor._id) throw fail(400, "لا يمكنك إيقاف حساب جلستك الحالية.");
    await ctx.db.patch(user._id, { active: !user.active });
    await revokeSessions(ctx, user._id);
    await audit(ctx, actor.username, "تغيير حالة المدير: " + user.username);
  },
});

export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => { await requireUser(ctx, token); return ctx.storage.generateUploadUrl(); },
});

/** Whether teachers may create their own accounts. Settings saved before the switch existed follow the default. */
export const signupOpen = internalQuery({
  args: {},
  handler: async (ctx): Promise<boolean> => {
    const json = (await ctx.db.query("platformSite").first())?.json;
    try { const saved = json ? JSON.parse(json).teacherSignup : undefined; return saved === undefined ? defaultSite.teacherSignup : saved === true; } catch { return defaultSite.teacherSignup; }
  },
});

// Internal: reachable only from convex/adminAuth.ts, never from a browser.
export const attempt = internalMutation({
  args: { key: v.string(), max: v.optional(v.number()) },
  // Returns instead of throwing, so a refused attempt is still recorded.
  handler: async (ctx, { key, max = MAX_ATTEMPTS }) => {
    const since = Date.now() - ATTEMPT_WINDOW_MS;
    const rows = await ctx.db.query("loginAttempts").withIndex("by_key", (q) => q.eq("key", key)).collect();
    for (const row of rows) if (row.at <= since) await ctx.db.delete(row._id);
    if (rows.filter((row) => row.at > since).length >= max) return false;
    await ctx.db.insert("loginAttempts", { key, at: Date.now() });
    return true;
  },
});
export const clearAttempts = internalMutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => { for (const row of await ctx.db.query("loginAttempts").withIndex("by_key", (q) => q.eq("key", key)).collect()) await ctx.db.delete(row._id); },
});
export const userByUsername = internalQuery({
  args: { username: v.string() },
  handler: (ctx, { username }) => ctx.db.query("adminUsers").withIndex("by_username", (q) => q.eq("username", username)).first(),
});
export const userForToken = internalQuery({ args: { tokenHash: v.string() }, handler: (ctx, { tokenHash }) => userFromHash(ctx, tokenHash) });
export const createFirst = internalMutation({
  args: { username: v.string(), name: v.string(), hash: v.string(), salt: v.string() },
  handler: async (ctx, args) => {
    // Inside one transaction, so two visitors cannot both become the first admin.
    if (await ctx.db.query("adminUsers").first()) throw fail(409, "تم إعداد الإدارة بالفعل. استخدم تسجيل الدخول.");
    const id = await ctx.db.insert("adminUsers", { ...args, active: true });
    await audit(ctx, args.username, "إنشاء حساب الإدارة الأول");
    return publicUser((await ctx.db.get(id))!);
  },
});
export const createUser = internalMutation({
  args: { actor: v.string(), username: v.string(), name: v.string(), hash: v.string(), salt: v.string() },
  handler: async (ctx, { actor, ...args }) => {
    const users = await ctx.db.query("adminUsers").take(MAX_ADMINS + 1);
    if (users.length >= MAX_ADMINS || users.some((u) => u.username === args.username)) throw fail(409, "اسم الدخول مستخدم أو وصل عدد الحسابات إلى الحد.");
    const id = await ctx.db.insert("adminUsers", { ...args, active: true });
    await audit(ctx, actor, "إضافة مدير: " + args.username);
    return publicUser((await ctx.db.get(id))!);
  },
});
export const createSession = internalMutation({
  args: { userId: v.id("adminUsers"), tokenHash: v.string(), action: v.optional(v.string()) },
  handler: async (ctx, { userId, tokenHash, action }) => {
    for (const s of await ctx.db.query("adminSessions").withIndex("by_user", (q) => q.eq("userId", userId)).collect()) if (s.expires < Date.now()) await ctx.db.delete(s._id);
    await ctx.db.insert("adminSessions", { userId, tokenHash, expires: Date.now() + SESSION_MS });
    const user = await ctx.db.get(userId);
    if (action && user) await audit(ctx, user.username, action);
    return user ? publicUser(user) : null;
  },
});
export const setPassword = internalMutation({
  args: { userId: v.id("adminUsers"), hash: v.string(), salt: v.string(), tokenHash: v.string() },
  handler: async (ctx, { userId, hash, salt, tokenHash }) => {
    await ctx.db.patch(userId, { hash, salt });
    await revokeSessions(ctx, userId);
    await ctx.db.insert("adminSessions", { userId, tokenHash, expires: Date.now() + SESSION_MS });
    const user = await ctx.db.get(userId);
    if (user) await audit(ctx, user.username, "تغيير كلمة مرور الإدارة");
  },
});
export const fileInfo = internalQuery({
  args: { storageId: v.id("_storage") },
  handler: (ctx, { storageId }) => ctx.db.system.get(storageId),
});
export const recordMedia = internalMutation({
  args: { actor: v.string() },
  handler: (ctx, { actor }) => audit(ctx, actor, "رفع وسائط إلى الحزم المشتركة"),
});

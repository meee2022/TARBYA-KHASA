"use node";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { ConvexError, v } from "convex/values";
import { action, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { mediaProblem, readCredentials, validPasswordLength, type Credentials } from "./adminRules.ts";

// Written out because these actions reference the generated API that also describes them.
type PublicUser = { id: string; username: string; name: string; active: boolean };
type SessionResult = { token: string; user: PublicUser | null };
const fail = (status: number, message: string) => new ConvexError({ status, message });
const hashOf = (token: string) => createHash("sha256").update(token).digest("hex");
const hashPassword = (password: string) => { const salt = randomBytes(16).toString("hex"); return { salt, hash: scryptSync(password, salt, 64).toString("hex") }; };
const verify = (password: string, user: { salt: string; hash: string }) => timingSafeEqual(scryptSync(password, user.salt, 64), Buffer.from(user.hash, "hex"));
// Spent on unknown usernames too, so response time does not reveal which accounts exist.
const DUMMY = { salt: "0".repeat(32), hash: "0".repeat(128) };
const credentials = (body: Parameters<typeof readCredentials>[0]): Credentials => { try { return readCredentials(body); } catch (e) { throw fail(400, (e as Error).message); } };
const startSession = async (ctx: ActionCtx, userId: Id<"adminUsers">, action?: string): Promise<SessionResult> => {
  const token = randomBytes(32).toString("hex");
  const user: PublicUser | null = await ctx.runMutation(internal.admin.createSession, { userId, tokenHash: hashOf(token), action });
  return { token, user };
};
const requireUser = async (ctx: ActionCtx, token: string): Promise<Doc<"adminUsers">> => {
  const user: Doc<"adminUsers"> | null = await ctx.runQuery(internal.admin.userForToken, { tokenHash: hashOf(token) });
  if (!user) throw fail(401, "انتهت جلسة الإدارة. سجّل الدخول مجددًا.");
  return user;
};

export const setup = action({
  args: { code: v.string(), username: v.string(), name: v.string(), password: v.string() },
  handler: async (ctx, { code, ...body }): Promise<SessionResult> => {
    // The site is public, so without this code any visitor could claim the first admin account.
    const expected = process.env.ADMIN_SETUP_CODE;
    if (!expected) throw fail(503, "رمز الإعداد غير مضبوط على الخادم.");
    if (!await ctx.runMutation(internal.admin.attempt, { key: "setup" })) throw fail(429, "محاولات كثيرة. حاول بعد 15 دقيقة.");
    if (!timingSafeEqual(Buffer.from(hashOf(code), "hex"), Buffer.from(hashOf(expected), "hex"))) throw fail(403, "رمز الإعداد غير صحيح.");
    const c = credentials(body);
    const { salt, hash } = hashPassword(c.password);
    const created: PublicUser = await ctx.runMutation(internal.admin.createFirst, { username: c.username, name: c.name, hash, salt });
    await ctx.runMutation(internal.admin.clearAttempts, { key: "setup" });
    return startSession(ctx, created.id as Id<"adminUsers">);
  },
});

export const login = action({
  args: { username: v.string(), password: v.string() },
  handler: async (ctx, { username: raw, password }): Promise<SessionResult> => {
    const denied = fail(401, "بيانات الدخول غير صحيحة.");
    if (raw.length > 40 || password.length > 128) throw denied;
    const username = raw.toLowerCase(); const key = "login:" + username;
    // ponytail: attempts are per username because Convex hides the client IP; add a global cap if bots appear.
    if (!await ctx.runMutation(internal.admin.attempt, { key })) throw fail(429, "محاولات كثيرة. حاول بعد 15 دقيقة.");
    const user: Doc<"adminUsers"> | null = await ctx.runQuery(internal.admin.userByUsername, { username });
    const ok = verify(password, user ?? DUMMY);
    if (!user || !user.active || !ok) throw denied;
    await ctx.runMutation(internal.admin.clearAttempts, { key });
    return startSession(ctx, user._id, "تسجيل الدخول");
  },
});

export const createUser = action({
  args: { token: v.string(), username: v.string(), name: v.string(), password: v.string() },
  handler: async (ctx, { token, ...body }): Promise<{ user: PublicUser }> => {
    const actor = await requireUser(ctx, token);
    const c = credentials(body);
    const user: PublicUser = await ctx.runMutation(internal.admin.createUser, { actor: actor.username, username: c.username, name: c.name, ...hashPassword(c.password) });
    return { user };
  },
});

export const changePassword = action({
  args: { token: v.string(), current: v.string(), password: v.string() },
  handler: async (ctx, { token, current, password }): Promise<{ token: string }> => {
    const user = await requireUser(ctx, token);
    if (current.length > 128 || !verify(current, user)) throw fail(400, "كلمة المرور الحالية غير صحيحة.");
    if (!validPasswordLength(password)) throw fail(400, "استخدم كلمة مرور من 12 إلى 128 حرفًا.");
    const next = randomBytes(32).toString("hex");
    await ctx.runMutation(internal.admin.setPassword, { userId: user._id, ...hashPassword(password), tokenHash: hashOf(next) });
    return { token: next };
  },
});

export const registerMedia = action({
  args: { token: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, { token, storageId }): Promise<{ url: string }> => {
    const user = await requireUser(ctx, token);
    const info: { contentType?: string; size: number } | null = await ctx.runQuery(internal.admin.fileInfo, { storageId });
    const blob = await ctx.storage.get(storageId);
    if (!info || !blob) throw fail(404, "الملف غير موجود.");
    const head = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
    const problem = mediaProblem(info.contentType ?? "", info.size, head);
    if (problem) { await ctx.storage.delete(storageId); throw fail(415, problem); }
    await ctx.runMutation(internal.admin.recordMedia, { actor: user.username });
    const url = await ctx.storage.getUrl(storageId);
    if (!url) throw fail(500, "تعذّر حفظ الملف على الخادم.");
    return { url };
  },
});

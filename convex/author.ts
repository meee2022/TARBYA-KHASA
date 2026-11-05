"use node";
import { createHash } from "node:crypto";
import { ConvexError, v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { generateContent, validateRequest } from "../packages/domain/author.ts";

const fail = (status: number, message: string) => new ConvexError({ status, message });
const hashOf = (token: string) => createHash("sha256").update(token).digest("hex");

/** A lesson or presentation draft from Claude, for a signed-in teacher only, within a daily limit, and only while the admin allows it. */
export const generate = action({
  args: { token: v.string(), request: v.any() },
  handler: async (ctx, { token, request }): Promise<string> => {
    const teacher: Doc<"teachers"> | null = await ctx.runQuery(internal.teacher.teacherForToken, { tokenHash: hashOf(token) });
    if (!teacher) throw fail(401, "سجّل الدخول بحساب المعلم لاستخدام المساعد.");
    const json: string | null = await ctx.runQuery(api.admin.getSite, {});
    const site = json ? JSON.parse(json) as { aiEnabled?: boolean; maintenance?: boolean } : null;
    if (site && (!site.aiEnabled || site.maintenance)) throw fail(403, "خدمة الذكاء الاصطناعي موقوفة من الإدارة حاليًا.");
    try { validateRequest(request); } catch (e) { throw fail(400, (e as Error).message); }
    if (!await ctx.runMutation(internal.teacher.useAi, { teacherId: teacher._id })) throw fail(429, "وصلت إلى حد اليوم من المسودات. حاول غدًا.");
    try { return JSON.stringify(await generateContent(request)); }
    catch (e) { const err = e as Error & { status?: number }; throw fail(err.status ?? 502, err.name === "TimeoutError" ? "استغرق الطلب وقتًا طويلًا. حاول مرة أخرى." : err.message || "تعذّر إنشاء المسودة."); }
  },
});

import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { latinizeContent } from "../packages/domain/numbers.ts";
import { validSharedPayload, type SharedKind } from "../packages/domain/shared.ts";
import { MAX_SHARED_ITEMS } from "./adminRules.ts";
import { audit, requireUser } from "./admin.ts";
import { requireTeacher } from "./teacher.ts";

const fail = (status: number, message: string) => new ConvexError({ status, message });
type Row = { _id: unknown; kind: string; title: string; subject: string; grade: string; summary: string; teacherName: string; createdAt: string; teacherId: unknown };
const meta = (row: Row, me?: unknown) => ({ id: String(row._id), kind: row.kind as SharedKind, title: row.title, subject: row.subject, grade: row.grade, summary: row.summary, teacherName: row.teacherName, createdAt: row.createdAt, mine: row.teacherId === me });

// Every teacher with a live session sees what colleagues published; only the author or an admin can take an item down.
export const list = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const t = await requireTeacher(ctx, token);
    return (await ctx.db.query("sharedLibrary").order("desc").take(MAX_SHARED_ITEMS)).map((r) => meta(r, t._id));
  },
});
export const get = query({
  args: { token: v.string(), id: v.string() },
  handler: async (ctx, { token, id }) => {
    await requireTeacher(ctx, token);
    const rowId = ctx.db.normalizeId("sharedLibrary", id); const row = rowId && (await ctx.db.get(rowId));
    if (!row) throw fail(404, "هذا العنصر لم يعد في المكتبة.");
    return { kind: row.kind as SharedKind, json: row.json };
  },
});
export const publish = mutation({
  args: { token: v.string(), kind: v.string(), title: v.string(), subject: v.string(), grade: v.string(), summary: v.string(), json: v.string() },
  handler: async (ctx, { token, ...payload }) => {
    const t = await requireTeacher(ctx, token);
    if (!validSharedPayload(payload)) throw fail(400, "تعذّر نشر هذا العنصر: محتواه غير مكتمل أو أكبر من 300 كيلوبايت. صغّر الصور أو اختصره.");
    if ((await ctx.db.query("sharedLibrary").take(MAX_SHARED_ITEMS)).length >= MAX_SHARED_ITEMS) throw fail(409, "المكتبة المشتركة ممتلئة. اطلب من الإدارة تنظيفها.");
    const clean = latinizeContent(payload);
    return String(await ctx.db.insert("sharedLibrary", { ...clean, kind: payload.kind, teacherId: t._id, teacherName: t.name, createdAt: new Date().toISOString() }));
  },
});
export const remove = mutation({
  args: { token: v.string(), id: v.string() },
  handler: async (ctx, { token, id }) => {
    const t = await requireTeacher(ctx, token);
    const rowId = ctx.db.normalizeId("sharedLibrary", id); const row = rowId && (await ctx.db.get(rowId));
    if (!row) return;
    if (row.teacherId !== t._id) throw fail(403, "لا يحذف العنصر إلا من نشره أو الإدارة.");
    await ctx.db.delete(row._id);
  },
});

// Admin: see everything in the library and take down what should not be there.
export const adminList = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => { await requireUser(ctx, token); return (await ctx.db.query("sharedLibrary").order("desc").take(MAX_SHARED_ITEMS)).map((r) => ({ ...meta(r), size: r.json.length })); },
});
export const adminRemove = mutation({
  args: { token: v.string(), id: v.string() },
  handler: async (ctx, { token, id }) => {
    const actor = await requireUser(ctx, token);
    const rowId = ctx.db.normalizeId("sharedLibrary", id); const row = rowId && (await ctx.db.get(rowId));
    if (!row) throw fail(404, "العنصر غير موجود.");
    await ctx.db.delete(row._id);
    await audit(ctx, actor.username, "حذف من المكتبة المشتركة: " + row.title);
  },
});

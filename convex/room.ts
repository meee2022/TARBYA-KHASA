import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { ROOM_CODE_RE, ROOM_HOURS, pupilView, validRoomSetup, type RoomAnswer, type RoomQuestion, type RoomSeat } from "../packages/domain/room.ts";
import { requireTeacher } from "./teacher.ts";

const fail = (status: number, message: string) => new ConvexError({ status, message });

// The live room. A teacher opens one room at a time from a lesson; pupils join with its six-character code and no account.
// A pupil's device is told the question and the seats, and the right answer only after the teacher reveals it.
const fresh = (r: Doc<"rooms">) => Date.now() - Date.parse(r.createdAt) < ROOM_HOURS * 3600000;
const roomBy = async (ctx: QueryCtx, code: string) => { if (!ROOM_CODE_RE.test(code)) return null; const r = await ctx.db.query("rooms").withIndex("by_code", (q) => q.eq("code", code)).first(); return r && fresh(r) ? r : null; };
const answersOf = (ctx: QueryCtx, roomId: Id<"rooms">) => ctx.db.query("roomAnswers").withIndex("by_room", (q) => q.eq("roomId", roomId)).collect();
const parts = (r: Doc<"rooms">) => ({ questions: JSON.parse(r.questions) as RoomQuestion[], seats: JSON.parse(r.seats) as RoomSeat[] });
async function drop(ctx: MutationCtx, r: Doc<"rooms">) { for (const a of await answersOf(ctx, r._id)) await ctx.db.delete(a._id); await ctx.db.delete(r._id); }
async function mine(ctx: QueryCtx, token: string, code: string) { const t = await requireTeacher(ctx, token); const r = await roomBy(ctx, code); if (!r || r.teacherId !== t._id) throw fail(404, "الغرفة غير موجودة أو انتهت."); return r; }

// Teacher side.
export const open = mutation({
  args: { token: v.string(), code: v.string(), title: v.string(), questions: v.string(), seats: v.string() },
  handler: async (ctx, { token, code, title, questions, seats }) => {
    const t = await requireTeacher(ctx, token);
    if (!ROOM_CODE_RE.test(code) || questions.length > 60000 || seats.length > 12000) throw fail(400, "تعذّر فتح الغرفة.");
    let q: unknown, s: unknown; try { q = JSON.parse(questions); s = JSON.parse(seats); } catch { throw fail(400, "تعذّر فتح الغرفة."); }
    if (!validRoomSetup(title, q, s)) throw fail(400, "يحتاج الدرس سؤالًا واحدًا على الأقل ببديلين، وطالبًا واحدًا على الأقل.");
    if (await ctx.db.query("rooms").withIndex("by_code", (x) => x.eq("code", code)).first()) throw fail(409, "حاول مرة أخرى.");
    // One room per teacher: opening a new one closes the last, and its answers go with it.
    for (const old of await ctx.db.query("rooms").withIndex("by_teacher", (x) => x.eq("teacherId", t._id)).collect()) await drop(ctx, old);
    await ctx.db.insert("rooms", { teacherId: t._id, code, title: title.trim(), questions: JSON.stringify(q), seats: JSON.stringify(s), index: -1, revealed: false, ended: false, createdAt: new Date().toISOString() });
    return code;
  },
});
export const current = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => { const t = await requireTeacher(ctx, token); const r = await ctx.db.query("rooms").withIndex("by_teacher", (x) => x.eq("teacherId", t._id)).first(); return r && fresh(r) ? r.code : null; },
});
export const board = query({
  args: { token: v.string(), code: v.string() },
  handler: async (ctx, { token, code }) => {
    const r = await mine(ctx, token, code); const { questions, seats } = parts(r);
    const answers: RoomAnswer[] = (await answersOf(ctx, r._id)).map((a) => ({ seat: a.seat, q: a.q, selected: a.selected }));
    return { code: r.code, title: r.title, questions, seats, index: r.index, revealed: r.revealed, ended: r.ended, answers };
  },
});
export const step = mutation({
  args: { token: v.string(), code: v.string(), action: v.union(v.literal("next"), v.literal("reveal"), v.literal("end")) },
  handler: async (ctx, { token, code, action }) => {
    const r = await mine(ctx, token, code); if (r.ended) return;
    const total = parts(r).questions.length;
    if (action === "reveal") { if (r.index >= 0) await ctx.db.patch(r._id, { revealed: true }); }
    else if (action === "next" && r.index + 1 < total) await ctx.db.patch(r._id, { index: r.index + 1, revealed: false });
    else await ctx.db.patch(r._id, { ended: true, revealed: true });
  },
});
export const close = mutation({
  args: { token: v.string(), code: v.string() },
  handler: async (ctx, { token, code }) => { const r = await mine(ctx, token, code); await drop(ctx, r); },
});

// Pupil side: the code only. A wrong or old code reads as null.
export const join = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const r = await roomBy(ctx, code); if (!r) return null;
    const { questions, seats } = parts(r);
    const done = r.index >= 0 ? (await answersOf(ctx, r._id)).filter((a) => a.q === r.index).map((a) => a.seat) : [];
    return { ...pupilView(r.title, questions, seats, { index: r.index, revealed: r.revealed, ended: r.ended }), answered: done };
  },
});
export const answer = mutation({
  args: { code: v.string(), seat: v.string(), q: v.number(), selected: v.number() },
  handler: async (ctx, { code, seat, q, selected }) => {
    const r = await roomBy(ctx, code); if (!r) throw fail(404, "انتهت هذه الغرفة.");
    const { questions, seats } = parts(r);
    // Only the question on screen takes answers, and only until the teacher reveals it.
    if (r.ended || r.revealed || q !== r.index || !seats.some((s) => s.id === seat) || !Number.isInteger(selected) || selected < 0 || selected >= questions[q].options.length) throw fail(409, "انتظر السؤال التالي.");
    const had = (await answersOf(ctx, r._id)).find((a) => a.seat === seat && a.q === q);
    if (had) await ctx.db.patch(had._id, { selected, at: new Date().toISOString() });
    else await ctx.db.insert("roomAnswers", { roomId: r._id, seat, q, selected, at: new Date().toISOString() });
  },
});

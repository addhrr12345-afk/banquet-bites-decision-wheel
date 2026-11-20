import { describe, expect, it } from "vitest";
import { prizeMode, limitForMode, wheelSchema, wheelDay, prizeAllowance } from "@/lib/wheel-schema";

const prize = (t: string, limit: number | null) => ({ t, e: "🎁", c: "#8d5524", limit });

describe("lucky wheel rules", () => {
  it("no limit means anyone can win", () => expect(prizeMode(null)).toBe("u"));
  it("a limit of 0 means shown on the wheel but nobody wins", () => expect(prizeMode(0)).toBe("z"));
  it("a positive limit is a daily cap", () => expect(prizeMode(3)).toBe("l"));
  it("switching to daily limit keeps at least 1 winner", () => expect(limitForMode("l", 0)).toBe(1));
  it("prize names must be different", () => {
    expect(wheelSchema.safeParse({ title: "", subtitle: "", max_spins: 2, prizes: [prize("Free Tea", 1), prize("free tea", null)] }).success).toBe(false);
  });
  it("the wheel needs at least 2 prizes", () => {
    expect(wheelSchema.safeParse({ title: "", subtitle: "", max_spins: 2, prizes: [prize("Free Tea", 1)] }).success).toBe(false);
  });
  it("the day rolls over at midnight café time (UTC+3)", () => {
    expect(wheelDay(new Date("2026-11-16T20:59:00Z"))).toBe("2026-11-16");
    expect(wheelDay(new Date("2026-11-16T21:01:00Z"))).toBe("2026-11-17");
  });
});

import { guestWheelSchema } from "@/lib/wheel-schema";
test("guest wheel accepts public settings without daily limits", () => {
  const ok = guestWheelSchema.safeParse({ title: "Çark", subtitle: "", max_spins: 2, prizes: [{ t: "Kahve", e: "☕", c: "#8d5524", x: false }, { t: "Yok", e: "🙂", c: "#2f9e44", x: true }] });
  expect(ok.success).toBe(true);
});

describe("limited prizes are spread over the open hours", () => {
  // 3 prizes, café open 08:00–22:00: they unlock at 10:20, 15:00 and 19:40.
  it("gives none of 3 prizes before 10:20", () => {
    expect(prizeAllowance(3, 7, 8, 22)).toBe(0);
    expect(prizeAllowance(3, 8.5, 8, 22)).toBe(0);
    expect(prizeAllowance(3, 10 + 19 / 60, 8, 22)).toBe(0);
  });
  it("allows only 1 of 3 prizes between 10:20 and 15:00", () => {
    expect(prizeAllowance(3, 10 + 21 / 60, 8, 22)).toBe(1);
    expect(prizeAllowance(3, 14 + 59 / 60, 8, 22)).toBe(1);
  });
  it("allows 2 of 3 prizes between 15:00 and 19:40", () => {
    expect(prizeAllowance(3, 15 + 1 / 60, 8, 22)).toBe(2);
    expect(prizeAllowance(3, 19 + 39 / 60, 8, 22)).toBe(2);
  });
  it("allows all 3 prizes after 19:40", () => {
    expect(prizeAllowance(3, 19 + 41 / 60, 8, 22)).toBe(3);
    expect(prizeAllowance(3, 23, 8, 22)).toBe(3);
  });
  it("unlocks a single daily prize at midday (15:00)", () => {
    expect(prizeAllowance(1, 14.9, 8, 22)).toBe(0);
    expect(prizeAllowance(1, 15.1, 8, 22)).toBe(1);
  });
  it("rejects a closing time before the opening time", () => {
    const p = (t: string) => ({ t, e: "🎁", c: "#8d5524", limit: null });
    expect(wheelSchema.safeParse({ title: "", subtitle: "", max_spins: 2, open_hour: 22, close_hour: 8, prizes: [p("A"), p("B")] }).success).toBe(false);
  });
});

import { z } from "zod";

/** limit: null = anyone can win (unlimited), 0 = shown only, n = at most n winners per day. */
export const prizeSchema = z.object({
  t: z.string().trim().min(1).max(24),
  e: z.string().trim().min(1).max(8),
  c: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  limit: z.number().int().min(0).max(999).nullable(),
  x: z.boolean().optional(),
});
export const wheelSchema = z.object({
  title: z.string().trim().max(80),
  subtitle: z.string().trim().max(160),
  max_spins: z.number().int().min(0).max(99),
  /** Café opening hours (local time); limited prizes are spread across them. */
  open_hour: z.number().int().min(0).max(23).default(8),
  close_hour: z.number().int().min(1).max(24).default(22),
  prizes: z.array(prizeSchema).min(2).max(16)
    .refine((p) => new Set(p.map((x) => x.t.toLocaleLowerCase("tr"))).size === p.length, "Prize names must be different."),
}).refine((w) => w.close_hour > w.open_hour, "Closing time must be after opening time.");
/** Public wheel data for guests: daily limits stay on the server. */
export const guestWheelSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  max_spins: z.number().int().min(0),
  prizes: z.array(prizeSchema.omit({ limit: true })),
});
export type Prize = z.infer<typeof prizeSchema>;
export type WheelSettings = z.infer<typeof wheelSchema>;
export type PrizeMode = "u" | "l" | "z";

export function prizeMode(limit: number | null): PrizeMode {
  return limit === null ? "u" : limit === 0 ? "z" : "l";
}
export function limitForMode(mode: PrizeMode, count: number): number | null {
  return mode === "u" ? null : mode === "z" ? 0 : Math.max(1, Math.round(count) || 1);
}
/** The wheel's day follows the café's local time (UTC+3). */
export function wheelDay(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
}

/**
 * How many winners a limited prize may have so far today. Open hours are split into `limit`
 * equal parts and each prize unlocks in the middle of its part (3 prizes, 08–22: 10:20, 15:00, 19:40).
 * Mirrors public.wheel_prize_allowance() in the database, which is what actually decides.
 */
export function prizeAllowance(limit: number, localHour: number, open: number, close: number): number {
  const frac = Math.max(0, Math.min(1, (localHour - open) / (close - open)));
  return Math.min(limit, Math.floor(limit * frac + 0.5));
}

import { describe, it, expect } from "vitest";
import { computeProjectContext } from "@/lib/metrics";
import { costCodes, changeOrders } from "@/lib/seed";
import type { TicketState } from "@/lib/tickets";

const GYP = "09 29 00"; // gypsum board — the labor-problem line
const ELEC = "26 05 00"; // electrical — the behind-schedule line

// The metrics engine only reads a ticket's id (for the week), header.costCode,
// and rows[].{hours,rate}, so a minimal shape is enough for these unit tests.
const laborTicket = (id: string, costCode: string, hours: number, rate = 85): TicketState =>
  ({ id, header: { costCode }, rows: [{ hours: String(hours), rate }] } as unknown as TicketState);

describe("computeProjectContext", () => {
  it("contract totals reflect the SOV baseline plus change orders", () => {
    const ctx = computeProjectContext([]);
    const baseline = costCodes.reduce((s, c) => s + c.scheduledValue, 0);
    const coTotal = changeOrders.reduce((s, c) => s + c.netIncrease, 0);
    expect(ctx.originalContract).toBe(baseline);
    expect(ctx.revisedContract).toBe(baseline + coTotal);
  });

  it("overall % complete stays within [0, 100]", () => {
    const ctx = computeProjectContext([]);
    for (const v of [ctx.overallActualPct, ctx.overallPlannedPct]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it("flags a line behind-schedule when actual lags planned by more than 8 pts", () => {
    const elec = computeProjectContext([]).byCostCode.find((m) => m.code === ELEC)!;
    expect(elec.plannedPercent - elec.percentComplete).toBeGreaterThan(8);
    expect(elec.flags).toContain("behind-schedule");
  });

  it("reports no labor metrics for lines without approved timecards", () => {
    const gyp = computeProjectContext([]).byCostCode.find((m) => m.code === GYP)!;
    expect(gyp.hasLaborData).toBe(false);
    expect(gyp.productivity).toBeNull();
    expect(gyp.projectedLaborOverrun).toBeNull();
  });

  it("ranks flagged codes by severity, highest first", () => {
    const ctx = computeProjectContext([]);
    const scores = ctx.flagged.map((code) => ctx.byCostCode.find((m) => m.code === code)!.severityScore);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it("productivity = earned hours / actual hours, and low-productivity flag follows the threshold", () => {
    const ctx = computeProjectContext([
      laborTicket("wk1-a", GYP, 160),
      laborTicket("wk2-b", GYP, 180),
      laborTicket("wk3-c", GYP, 200),
    ]);
    const gyp = ctx.byCostCode.find((m) => m.code === GYP)!;
    expect(gyp.actualHours).toBe(540);
    expect(gyp.hasLaborData).toBe(true);
    const earnedHours = (gyp.percentComplete / 100) * gyp.budgetHours;
    expect(gyp.productivity).toBeCloseTo(earnedHours / 540, 5);
    expect(gyp.flags.includes("low-productivity")).toBe(gyp.productivity! < 0.85);
  });
});

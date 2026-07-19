import { describe, it, expect } from "vitest";
import { isWrongProject, impossibleRows, isReady, ticketHours, ticketLabor } from "@/lib/tickets";
import type { TicketState } from "@/lib/tickets";
import { project } from "@/lib/seed";

// Minimal ticket shape — the validators read only scanned, header.job, and rows[].hours.
const ticket = (job: string, rows: { hours: string; rate: number }[], scanned = true): TicketState =>
  ({ scanned, header: { job }, rows } as unknown as TicketState);

const RIGHT = project.jobNumber;

describe("store validators", () => {
  it("isWrongProject flags a mismatched job number", () => {
    expect(isWrongProject(ticket(RIGHT, []))).toBe(false);
    expect(isWrongProject(ticket("0000", []))).toBe(true);
  });

  it("impossibleRows returns rows above the max weekly hours", () => {
    expect(
      impossibleRows(ticket(RIGHT, [{ hours: "40", rate: 85 }, { hours: "440", rate: 55 }]))
    ).toEqual([1]);
    expect(impossibleRows(ticket(RIGHT, [{ hours: "40", rate: 85 }]))).toEqual([]);
  });

  it("isReady requires scanned, the right project, and no impossible rows", () => {
    expect(isReady(ticket(RIGHT, [{ hours: "40", rate: 85 }]))).toBe(true);
    expect(isReady(ticket("0000", [{ hours: "40", rate: 85 }]))).toBe(false); // wrong project
    expect(isReady(ticket(RIGHT, [{ hours: "999", rate: 85 }]))).toBe(false); // impossible hours
    expect(isReady(ticket(RIGHT, [{ hours: "40", rate: 85 }], false))).toBe(false); // not scanned
  });

  it("ticketHours / ticketLabor sum the rows", () => {
    const t = ticket(RIGHT, [{ hours: "40", rate: 85 }, { hours: "36", rate: 55 }]);
    expect(ticketHours(t)).toBe(76);
    expect(ticketLabor(t)).toBe(40 * 85 + 36 * 55);
  });
});

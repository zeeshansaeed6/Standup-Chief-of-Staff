import { describe, it, expect } from "vitest";
import { parseNaturalDate } from "../src/scoring/dateParser.js";

describe("Natural Language Date Parser", () => {
  const refDate = new Date("2026-10-21T10:00:00Z"); // Wednesday

  it("parses 'tomorrow'", () => {
    const result = parseNaturalDate("tomorrow", refDate);
    expect(result.getDate()).toBe(refDate.getDate() + 1);
    expect(result.getHours()).toBe(9);
  });

  it("parses 'friday'", () => {
    const result = parseNaturalDate("friday", refDate);
    // refDate is Wednesday (3). Friday is 5 (+2 days)
    expect(result.getDay()).toBe(5);
    expect(result.getDate()).toBe(23);
  });

  it("parses 'next week'", () => {
    const result = parseNaturalDate("next week", refDate);
    // Next Monday
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(26);
  });

  it("parses 'in 3 days'", () => {
    const result = parseNaturalDate("in 3 days", refDate);
    expect(result.getDate()).toBe(24);
  });

  it("parses standard ISO date string", () => {
    const result = parseNaturalDate("2026-11-05T15:30:00Z", refDate);
    expect(result.toISOString()).toBe("2026-11-05T15:30:00.000Z");
  });
});

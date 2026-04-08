import { describe, expect, it } from "vitest";

import {
  formatAmount,
  formatDate,
  formatPercent,
  formatTime,
  truncateDecimals,
} from "../../src/utils/amount.js";

describe("truncateDecimals", () => {
  it("truncates without rounding (critical for CUFE/CUDE)", () => {
    expect(truncateDecimals(100.456, 2)).toBe("100.45");
    expect(truncateDecimals(99.999, 2)).toBe("99.99");
    expect(truncateDecimals(0.001, 2)).toBe("0.00");
    expect(truncateDecimals(1234.5, 2)).toBe("1234.50");
  });

  it("handles exact values", () => {
    expect(truncateDecimals(100, 2)).toBe("100.00");
    expect(truncateDecimals(0, 2)).toBe("0.00");
  });

  it("handles large amounts", () => {
    expect(truncateDecimals(999999999.99, 2)).toBe("999999999.99");
  });

  it("does NOT round up", () => {
    expect(truncateDecimals(100.999, 2)).toBe("100.99");
    expect(truncateDecimals(50.005, 2)).toBe("50.00");
    expect(truncateDecimals(25.999, 2)).toBe("25.99");
  });
});

describe("formatAmount", () => {
  it("formats monetary amounts with 2 decimal places", () => {
    expect(formatAmount(500000)).toBe("500000.00");
    expect(formatAmount(25000.5)).toBe("25000.50");
    expect(formatAmount(0)).toBe("0.00");
  });
});

describe("formatPercent", () => {
  it("formats percentages with 2 decimal places", () => {
    expect(formatPercent(19)).toBe("19.00");
    expect(formatPercent(5)).toBe("5.00");
    expect(formatPercent(0)).toBe("0.00");
  });
});

describe("formatDate", () => {
  it("formats date as YYYY-MM-DD", () => {
    const date = new Date(2026, 2, 24);
    expect(formatDate(date)).toBe("2026-03-24");
  });

  it("pads single-digit months and days", () => {
    const date = new Date(2026, 0, 5);
    expect(formatDate(date)).toBe("2026-01-05");
  });
});

describe("formatTime", () => {
  it("formats time with Colombia timezone offset", () => {
    const date = new Date(2026, 2, 24, 14, 30, 0);
    expect(formatTime(date)).toBe("14:30:00-05:00");
  });

  it("pads single-digit hours/minutes/seconds", () => {
    const date = new Date(2026, 2, 24, 8, 5, 3);
    expect(formatTime(date)).toBe("08:05:03-05:00");
  });

  it("accepts custom UTC offset", () => {
    const date = new Date(2026, 2, 24, 14, 30, 0);
    expect(formatTime(date, "+00:00")).toBe("14:30:00+00:00");
  });
});

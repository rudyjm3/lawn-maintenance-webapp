import { describe, expect, it } from "vitest"
import { getReminderTypeForDate } from "../../lib/billing/reminders"

describe("getReminderTypeForDate", () => {
  it("returns due_minus_3 at due date minus 3", () => {
    expect(getReminderTypeForDate("2026-06-10", "2026-06-07")).toBe("due_minus_3")
  })

  it("returns due_day at due date", () => {
    expect(getReminderTypeForDate("2026-06-10", "2026-06-10")).toBe("due_day")
  })

  it("returns overdue_plus_3 and overdue_plus_7", () => {
    expect(getReminderTypeForDate("2026-06-10", "2026-06-13")).toBe("overdue_plus_3")
    expect(getReminderTypeForDate("2026-06-10", "2026-06-17")).toBe("overdue_plus_7")
  })

  it("returns null on non-cadence days", () => {
    expect(getReminderTypeForDate("2026-06-10", "2026-06-12")).toBeNull()
  })
})

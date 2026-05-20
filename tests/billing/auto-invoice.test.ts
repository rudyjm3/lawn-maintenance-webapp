import { describe, expect, it } from "vitest"
import { getUninvoicedCompletedJobs, groupJobsByClient } from "../../lib/billing/auto-invoice"

describe("auto-invoice grouping and idempotency", () => {
  it("filters out already invoiced jobs", () => {
    const completed = [
      { id: "j1", client_id: "c1", price: 50, service_date: "2026-06-01" },
      { id: "j2", client_id: "c1", price: 60, service_date: "2026-06-02" },
      { id: "j3", client_id: "c2", price: 70, service_date: "2026-06-03" },
    ]
    const uninvoiced = getUninvoicedCompletedJobs(completed, new Set(["j2"]))
    expect(uninvoiced.map((j) => j.id)).toEqual(["j1", "j3"])
  })

  it("groups uninvoiced jobs by client", () => {
    const jobs = [
      { id: "j1", client_id: "c1", price: 50, service_date: "2026-06-01" },
      { id: "j3", client_id: "c2", price: 70, service_date: "2026-06-03" },
      { id: "j4", client_id: "c1", price: 80, service_date: "2026-06-04" },
    ]

    const grouped = groupJobsByClient(jobs)
    expect(grouped.get("c1")?.map((j) => j.id)).toEqual(["j1", "j4"])
    expect(grouped.get("c2")?.map((j) => j.id)).toEqual(["j3"])
  })
})

import { addUtcDaysToIso, todayUtc } from "@/lib/dates"

export type ReminderType = "due_minus_3" | "due_day" | "overdue_plus_3" | "overdue_plus_7" | "overdue_notice"

export function getReminderTypeForDate(dueDate: string, date = todayUtc()): ReminderType | null {
  if (date === addUtcDaysToIso(dueDate, -3)) return "due_minus_3"
  if (date === dueDate) return "due_day"
  if (date === addUtcDaysToIso(dueDate, 3)) return "overdue_plus_3"
  if (date === addUtcDaysToIso(dueDate, 7)) return "overdue_plus_7"
  return null
}

export function getReminderEmailSubjectPrefix(type: ReminderType): string {
  switch (type) {
    case "due_minus_3":
      return "Upcoming Due Date"
    case "due_day":
      return "Due Today"
    case "overdue_plus_3":
      return "Past Due (3 Days)"
    case "overdue_plus_7":
      return "Past Due (7 Days)"
    case "overdue_notice":
      return "Payment Overdue"
  }
}

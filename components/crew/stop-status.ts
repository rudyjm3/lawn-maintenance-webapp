export type StopStatus = "pending" | "arrived" | "in_progress" | "completed" | "skipped"

export const STOP_STATUS_BADGE: Record<
  StopStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Pending", variant: "secondary" },
  arrived: { label: "Arrived", variant: "default" },
  in_progress: { label: "In Progress", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
  skipped: { label: "Skipped", variant: "destructive" },
}

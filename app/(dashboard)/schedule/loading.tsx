export default function ScheduleLoading() {
  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <div className="h-7 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-4 lg:grid-cols-8">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="rounded-xl border border-border bg-card p-3">
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-2 w-full animate-pulse rounded bg-muted" />
            <div className="mt-3 space-y-2">
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

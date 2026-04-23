import { Leaf } from "lucide-react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4">
      {/* Brand mark */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-sm">
          <Leaf className="h-6 w-6 text-primary-foreground" />
        </div>
        <span className="text-xl font-semibold tracking-tight">GreenRoute</span>
        <span className="text-sm text-muted-foreground">
          Lawn &amp; Grounds Maintenance Platform
        </span>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-xl border border-border bg-background p-8 shadow-sm">
        {children}
      </div>
    </div>
  )
}

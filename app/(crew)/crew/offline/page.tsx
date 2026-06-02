import { WifiOff } from "lucide-react"

export const metadata = { title: "Offline" }

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <WifiOff className="h-12 w-12 text-muted-foreground/50" />
      <h1 className="text-lg font-semibold text-foreground">You&apos;re offline</h1>
      <p className="text-sm text-muted-foreground max-w-xs">
        No internet connection. Your jobs are cached and will sync automatically when you&apos;re back online.
      </p>
    </div>
  )
}

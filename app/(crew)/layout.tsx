import { BottomNav } from "@/components/crew/bottom-nav"

export default function CrewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Content — padded to clear the fixed bottom nav */}
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  )
}

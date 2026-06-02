import { BottomNav } from "@/components/crew/bottom-nav"
import { SwRegister } from "@/components/crew/sw-register"

export const metadata = {
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default" as const,
    title: "GreenRoute",
  },
}

export const viewport = {
  themeColor: "#16a34a",
}

export default function CrewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Content — padded to clear the fixed bottom nav */}
      <SwRegister />
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  )
}

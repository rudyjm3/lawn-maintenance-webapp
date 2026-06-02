import { Leaf } from "lucide-react"
import Link from "next/link"

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-border bg-white px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center gap-2">
          <Leaf className="h-5 w-5 text-emerald-600" />
          <Link href="/portal/dashboard" className="font-semibold text-foreground hover:text-primary">
            GreenRoute Client Portal
          </Link>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-8">
        {children}
      </main>
    </div>
  )
}

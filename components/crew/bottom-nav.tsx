"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { CalendarDays, Map, ClipboardCheck, History, User } from "lucide-react"

const navItems = [
  { label: "Today", href: "/crew/today", icon: CalendarDays },
  { label: "Route", href: "/crew/route", icon: Map },
  { label: "Jobs", href: "/crew/job", icon: ClipboardCheck },
  { label: "History", href: "/crew/history", icon: History },
  { label: "Profile", href: "/crew/profile", icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background safe-area-bottom">
      <ul className="flex">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.25]")} />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

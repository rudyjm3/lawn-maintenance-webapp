"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  CalendarDays,
  Map,
  ClipboardList,
  Users,
  Building2,
  Wrench,
  UserCog,
  Megaphone,
  FileText,
  Receipt,
  CreditCard,
  BarChart3,
  Settings,
  Leaf,
} from "lucide-react"

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, phase: "mvp" },
  { label: "Schedule", href: "/schedule", icon: CalendarDays, phase: "mvp" },
  { label: "Jobs", href: "/jobs", icon: ClipboardList, phase: "mvp" },
  { label: "Clients", href: "/clients", icon: Users, phase: "mvp" },
  { label: "Properties", href: "/properties", icon: Building2, phase: "mvp" },
  { label: "Services", href: "/service-catalog", icon: Wrench, phase: "mvp" },
  { label: "Route Planner", href: "/routes", icon: Map, phase: "phase2" },
  { label: "Crews & Team", href: "/crews", icon: UserCog, phase: "phase2" },
  { label: "Leads / CRM", href: "/leads", icon: Megaphone, phase: "phase2" },
  { label: "Estimates", href: "/estimates", icon: FileText, phase: "phase3" },
  { label: "Invoices", href: "/invoices", icon: Receipt, phase: "phase3" },
  { label: "Payments", href: "/payments", icon: CreditCard, phase: "phase3" },
  { label: "Reports", href: "/reports", icon: BarChart3, phase: "phase2" },
  { label: "Settings", href: "/settings", icon: Settings, phase: "mvp" },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-5">
        <Leaf className="h-5 w-5 text-primary" />
        <span className="text-base font-semibold tracking-tight text-sidebar-foreground">
          GreenRoute
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/")
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}

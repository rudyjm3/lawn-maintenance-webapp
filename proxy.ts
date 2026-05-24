import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Routes that require authentication
const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/schedule", "/routes", "/jobs", "/clients", "/properties", "/service-catalog", "/schedules", "/crews", "/leads", "/estimates", "/invoices", "/payments", "/reports", "/settings", "/crew", "/owner"]

// Routes that should redirect to dashboard if already authenticated
const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"]

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refresh the session — this keeps the user logged in
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Redirect unauthenticated users away from protected routes
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("redirectTo", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (user) {
    const role = (user.user_metadata?.role as string | undefined) ?? "owner"
    const isCrewRole = role === "crew_member" || role === "crew_lead"

    // Crew member trying to access owner/dashboard routes → crew today
    const isDashboardRoute = ["/dashboard", "/onboarding", "/schedule", "/routes", "/jobs", "/clients", "/properties", "/service-catalog", "/schedules", "/crews", "/leads", "/estimates", "/invoices", "/payments", "/reports", "/settings", "/owner"].some((p) => pathname.startsWith(p))
    if (isDashboardRoute && isCrewRole) {
      const dest = request.nextUrl.clone()
      dest.pathname = "/crew/today"
      return NextResponse.redirect(dest)
    }

    // Owner/manager trying to access crew routes → dashboard
    // Use "/crew/" to avoid matching "/crews" (the dashboard Crews & Team page)
    if ((pathname.startsWith("/crew/") || pathname === "/crew") && !isCrewRole) {
      const dest = request.nextUrl.clone()
      dest.pathname = "/dashboard"
      return NextResponse.redirect(dest)
    }

    // Redirect authenticated users away from auth pages
    const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p))
    if (isAuthRoute) {
      const dest = request.nextUrl.clone()
      dest.pathname = isCrewRole ? "/crew/today" : "/dashboard"
      return NextResponse.redirect(dest)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

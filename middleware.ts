import { createServerClient } from "@supabase/ssr"
import { NextRequest, NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Unauthenticated — send to login
  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    return NextResponse.redirect(loginUrl)
  }

  const role = (user.user_metadata?.role as string | undefined) ?? "owner"
  const isCrewRole = role === "crew_member" || role === "crew_lead"

  // Crew trying to access dashboard → send to crew today
  if (pathname.startsWith("/dashboard") && isCrewRole) {
    const dest = request.nextUrl.clone()
    dest.pathname = "/crew/today"
    return NextResponse.redirect(dest)
  }

  // Owner/manager trying to access crew routes → send to dashboard
  if (pathname.startsWith("/crew") && !isCrewRole) {
    const dest = request.nextUrl.clone()
    dest.pathname = "/dashboard"
    return NextResponse.redirect(dest)
  }

  return response
}

export const config = {
  matcher: ["/dashboard/:path*", "/crew/:path*"],
}

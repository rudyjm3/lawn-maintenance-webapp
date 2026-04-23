import { redirect } from "next/navigation"

// Root `/` — send users to the dashboard.
// The middleware will intercept unauthenticated requests and redirect to /login.
export default function RootPage() {
  redirect("/dashboard")
}

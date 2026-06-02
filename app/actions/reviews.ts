"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export async function submitReview(
  token: string,
  rating: number,
  text: string,
): Promise<{ success: boolean; message: string }> {
  if (!token || rating < 1 || rating > 5) {
    return { success: false, message: "Invalid submission." }
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  const { data: job, error } = await db
    .from("jobs")
    .select("id, review_submitted_at")
    .eq("review_token", token)
    .maybeSingle()

  if (error || !job) return { success: false, message: "Review link not found." }
  if (job.review_submitted_at) return { success: false, message: "Review already submitted." }

  const { error: updateError } = await db
    .from("jobs")
    .update({
      review_rating: rating,
      review_text: text.trim() || null,
      review_submitted_at: new Date().toISOString(),
    })
    .eq("id", job.id)

  if (updateError) return { success: false, message: updateError.message }
  return { success: true, message: "Thank you for your review!" }
}

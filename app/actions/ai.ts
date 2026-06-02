"use server"

import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"
import { getScheduleSuggestions } from "@/lib/ai/schedule-balancer"
import type { ScheduleSuggestion } from "@/types"

export async function getBalancingSuggestions(
  weekStart: string,
): Promise<{ success: boolean; message: string; suggestions: ScheduleSuggestion[] }> {
  const supabase = await createSupabaseClient()
  const { businessId, error: authError } = await getAuthenticatedBusinessId(supabase)
  if (authError || !businessId) return { success: false, message: "Not authenticated.", suggestions: [] }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, message: "AI features not configured. Add ANTHROPIC_API_KEY to enable.", suggestions: [] }
  }

  try {
    const suggestions = await getScheduleSuggestions(weekStart, businessId)
    return { success: true, message: suggestions.length === 0 ? "Schedule looks balanced!" : `${suggestions.length} suggestion${suggestions.length !== 1 ? "s" : ""} found.`, suggestions }
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Failed to generate suggestions.", suggestions: [] }
  }
}

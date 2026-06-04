"use client"

import { useState, useTransition } from "react"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { submitReview } from "@/app/actions/reviews"

export function ReviewForm({ token }: { token: string }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [text, setText] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (rating === 0) { setError("Please select a star rating."); return }
    startTransition(async () => {
      const result = await submitReview(token, rating, text)
      if (result.success) setSubmitted(true)
      else setError(result.message)
    })
  }

  if (submitted) {
    return (
      <div className="text-center py-8 space-y-2">
        <div className="flex justify-center gap-1 mb-3">
          {[1,2,3,4,5].map((s) => (
            <Star key={s} className={`h-7 w-7 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
          ))}
        </div>
        <p className="text-lg font-semibold text-foreground">Thank you!</p>
        <p className="text-sm text-muted-foreground">Your feedback helps us improve.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-sm font-medium text-foreground">Your rating</p>
        <div className="flex gap-2">
          {[1,2,3,4,5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRating(s)}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              className="rounded p-1 transition-transform hover:scale-110"
            >
              <Star className={`h-8 w-8 transition-colors ${s <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {["", "Poor", "Fair", "Good", "Very good", "Excellent"][rating]}
          </p>
        )}
      </div>

      <div>
        <label className="block mb-2 text-sm font-medium text-foreground">Comments (optional)</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="Tell us about your experience…"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={handleSubmit} disabled={isPending} className="w-full">
        {isPending ? "Submitting…" : "Submit Review"}
      </Button>
    </div>
  )
}

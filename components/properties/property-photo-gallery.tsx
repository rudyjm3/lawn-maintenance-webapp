"use client"

import { useState, useEffect, useTransition } from "react"
import Image from "next/image"
import { Images, ChevronDown, ChevronUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getPropertyPhotos, type PropertyPhotoGroup } from "@/app/actions/properties"

interface PropertyPhotoGalleryProps {
  propertyId: string
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Unknown date"
  const d = new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00"))
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function PropertyPhotoGallery({ propertyId }: PropertyPhotoGalleryProps) {
  const [groups, setGroups]         = useState<PropertyPhotoGroup[]>([])
  const [expanded, setExpanded]     = useState(false)
  const [loaded, setLoaded]         = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [, startTransition]         = useTransition()

  useEffect(() => {
    if (!expanded || loaded) return
    startTransition(async () => {
      const result = await getPropertyPhotos(propertyId)
      if (result.success) setGroups(result.groups)
      setLoaded(true)
    })
  }, [expanded, loaded, propertyId])

  const totalCount = groups.reduce((sum, g) => sum + g.photos.length, 0)

  return (
    <>
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Images className="h-3.5 w-3.5" />
        {expanded
          ? "Hide photos"
          : loaded
            ? totalCount > 0
              ? `${totalCount} photo${totalCount !== 1 ? "s" : ""}`
              : "No photos"
            : "View photos"}
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {expanded && (
        <div className="mt-2 space-y-3">
          {!loaded && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Loading photos…
            </div>
          )}

          {loaded && totalCount === 0 && (
            <p className="text-xs text-muted-foreground">No photos uploaded yet.</p>
          )}

          {loaded && groups.map((group, gi) => (
            <div key={gi}>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                Visit — {formatDate(group.serviceDate ?? group.photos[0]?.created_at ?? null)}
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {group.photos.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => setLightboxUrl(photo.photo_url)}
                    className="relative aspect-square overflow-hidden rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <Image
                      src={photo.photo_url}
                      alt={photo.photo_type}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 py-0.5 text-[9px] text-white capitalize">
                      {photo.photo_type}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightboxUrl(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 text-white hover:bg-white/20"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="h-5 w-5" />
          </Button>
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxUrl}
              alt="Full size"
              className="max-h-[90vh] max-w-[90vw] rounded object-contain"
            />
          </div>
        </div>
      )}
    </>
  )
}

"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { Camera, X, Upload } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface PhotoUploadProps {
  jobId: string
  propertyId: string
  businessId: string
  userId: string
  photoType: "before" | "after"
  required?: boolean
  onUploadComplete: (url: string) => void
}

export function PhotoUpload({
  jobId,
  propertyId,
  businessId,
  userId,
  photoType,
  required = false,
  onUploadComplete,
}: PhotoUploadProps) {
  const inputRef            = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.")
      return
    }

    // Local preview
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setError(null)
    setUploading(true)

    try {
      const supabase = createClient()
      const ext      = file.name.split(".").pop() ?? "jpg"
      const path     = `${businessId}/${propertyId}/${jobId}/${photoType}-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("property-photos")
        .upload(path, file, { upsert: true })

      if (uploadError) throw new Error(uploadError.message)

      const { data: { publicUrl } } = supabase.storage
        .from("property-photos")
        .getPublicUrl(path)

      // Insert record into property_photos table
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const { error: insertError } = await db.from("property_photos").insert({
        property_id: propertyId,
        job_id:      jobId,
        user_id:     userId,
        photo_url:   publicUrl,
        photo_type:  photoType,
        business_id: businessId,
      })

      if (insertError) throw new Error(insertError.message)

      onUploadComplete(publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.")
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function clear() {
    setPreview(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  const label = photoType === "before" ? "Before photo" : "After photo"

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {required && <span className="text-xs text-destructive">Required</span>}
      </div>

      {preview ? (
        <div className="relative">
          <div className="relative h-44 w-full overflow-hidden rounded-lg border border-border">
            <Image
              src={preview}
              alt={label}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          {!uploading && (
            <button
              onClick={clear}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              aria-label="Remove photo"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-44 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/40 text-sm text-muted-foreground transition-colors hover:bg-muted/70 disabled:pointer-events-none disabled:opacity-50"
        >
          {uploading ? (
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <>
              <Camera className="h-7 w-7" />
              <span>Tap to take photo or upload</span>
              <span className="flex items-center gap-1 text-xs">
                <Upload className="h-3 w-3" />
                {label}
              </span>
            </>
          )}
        </button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}

/**
 * Supabase database type definitions.
 *
 * Replace this stub with the generated types from the Supabase CLI:
 *   npx supabase gen types typescript --project-id <your-project-id> > types/supabase.ts
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Placeholder — the Supabase CLI will populate this once the schema is defined.
export type Database = {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

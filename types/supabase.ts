export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action_type: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          business_name: string
          created_at: string
          email: string | null
          id: string
          phone: string | null
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          business_name: string
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          business_name?: string
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          billing_address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          source: string | null
          status: Database["public"]["Enums"]["client_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          billing_address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          billing_address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          channel: Database["public"]["Enums"]["comm_channel"]
          client_id: string | null
          direction: string
          id: string
          job_id: string | null
          message: string
          sent_at: string
          tenant_id: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["comm_channel"]
          client_id?: string | null
          direction?: string
          id?: string
          job_id?: string | null
          message: string
          sent_at?: string
          tenant_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["comm_channel"]
          client_id?: string | null
          direction?: string
          id?: string
          job_id?: string | null
          message?: string
          sent_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_members: {
        Row: {
          created_at: string
          crew_id: string
          id: string
          is_lead: boolean
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          crew_id: string
          id?: string
          is_lead?: boolean
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          crew_id?: string
          id?: string
          is_lead?: boolean
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_members_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      crews: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_items: {
        Row: {
          created_at: string
          description: string
          duration_min: number | null
          estimate_id: string
          id: string
          qty: number
          service_type_id: string | null
          tenant_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          duration_min?: number | null
          estimate_id: string
          id?: string
          qty?: number
          service_type_id?: string | null
          tenant_id: string
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          duration_min?: number | null
          estimate_id?: string
          id?: string
          qty?: number
          service_type_id?: string | null
          tenant_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimate_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_items_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          client_id: string | null
          created_at: string
          estimate_number: string
          id: string
          lead_id: string | null
          status: Database["public"]["Enums"]["estimate_status"]
          subtotal: number
          tax: number
          tenant_id: string
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          estimate_number: string
          id?: string
          lead_id?: string | null
          status?: Database["public"]["Enums"]["estimate_status"]
          subtotal?: number
          tax?: number
          tenant_id: string
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          estimate_number?: string
          id?: string
          lead_id?: string | null
          status?: Database["public"]["Enums"]["estimate_status"]
          subtotal?: number
          tax?: number
          tenant_id?: string
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          job_id: string | null
          qty: number
          tenant_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          job_id?: string | null
          qty?: number
          tenant_id: string
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          job_id?: string | null
          qty?: number
          tenant_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string
          created_at: string
          due_date: string | null
          id: string
          invoice_number: string
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax: number
          tenant_id: string
          total: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax?: number
          tenant_id: string
          total?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax?: number
          tenant_id?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          actual_duration_min: number | null
          client_id: string
          created_at: string
          estimated_duration_min: number
          id: string
          photo_required: boolean
          price: number
          property_id: string
          property_service_id: string | null
          service_date: string | null
          status: Database["public"]["Enums"]["job_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          actual_duration_min?: number | null
          client_id: string
          created_at?: string
          estimated_duration_min?: number
          id?: string
          photo_required?: boolean
          price?: number
          property_id: string
          property_service_id?: string | null
          service_date?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          actual_duration_min?: number | null
          client_id?: string
          created_at?: string
          estimated_duration_min?: number
          id?: string
          photo_required?: boolean
          price?: number
          property_id?: string
          property_service_id?: string | null
          service_date?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_property_service_id_fkey"
            columns: ["property_service_id"]
            isOneToOne: false
            referencedRelation: "property_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          requested_services: Json
          service_address: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          requested_services?: Json
          service_address?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          requested_services?: Json
          service_address?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          method: string | null
          notes: string | null
          payment_date: string
          reference: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          method?: string | null
          notes?: string | null
          payment_date?: string
          reference?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: string | null
          notes?: string | null
          payment_date?: string
          reference?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          access_notes: string | null
          address: string
          client_id: string
          created_at: string
          gate_code: string | null
          id: string
          is_commercial: boolean
          lat: number | null
          lawn_size: string | null
          lng: number | null
          pet_notes: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          access_notes?: string | null
          address: string
          client_id: string
          created_at?: string
          gate_code?: string | null
          id?: string
          is_commercial?: boolean
          lat?: number | null
          lawn_size?: string | null
          lng?: number | null
          pet_notes?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          access_notes?: string | null
          address?: string
          client_id?: string
          created_at?: string
          gate_code?: string | null
          id?: string
          is_commercial?: boolean
          lat?: number | null
          lawn_size?: string | null
          lng?: number | null
          pet_notes?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      property_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          job_id: string | null
          photo_type: Database["public"]["Enums"]["photo_type"]
          photo_url: string
          property_id: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          photo_type?: Database["public"]["Enums"]["photo_type"]
          photo_url: string
          property_id: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          photo_type?: Database["public"]["Enums"]["photo_type"]
          photo_url?: string
          property_id?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_photos_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_photos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      property_services: {
        Row: {
          created_at: string
          custom_price: number | null
          duration_min: number | null
          id: string
          instructions: string | null
          is_active: boolean
          property_id: string
          service_type_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_price?: number | null
          duration_min?: number | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          property_id: string
          service_type_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_price?: number | null
          duration_min?: number | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          property_id?: string
          service_type_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_services_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_services_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      recurrence_rules: {
        Row: {
          active_months: number[] | null
          created_at: string
          day_of_week: number | null
          end_date: string | null
          frequency_type: Database["public"]["Enums"]["frequency_type"]
          id: string
          interval: number
          property_service_id: string
          start_date: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active_months?: number[] | null
          created_at?: string
          day_of_week?: number | null
          end_date?: string | null
          frequency_type: Database["public"]["Enums"]["frequency_type"]
          id?: string
          interval?: number
          property_service_id: string
          start_date: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active_months?: number[] | null
          created_at?: string
          day_of_week?: number | null
          end_date?: string | null
          frequency_type?: Database["public"]["Enums"]["frequency_type"]
          id?: string
          interval?: number
          property_service_id?: string
          start_date?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurrence_rules_property_service_id_fkey"
            columns: ["property_service_id"]
            isOneToOne: false
            referencedRelation: "property_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurrence_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      route_stops: {
        Row: {
          actual_arrival: string | null
          actual_finish: string | null
          created_at: string
          est_arrival: string | null
          est_finish: string | null
          id: string
          job_id: string
          route_id: string
          status: Database["public"]["Enums"]["route_stop_status"]
          stop_order: number
          tenant_id: string
          travel_time_min: number
        }
        Insert: {
          actual_arrival?: string | null
          actual_finish?: string | null
          created_at?: string
          est_arrival?: string | null
          est_finish?: string | null
          id?: string
          job_id: string
          route_id: string
          status?: Database["public"]["Enums"]["route_stop_status"]
          stop_order: number
          tenant_id: string
          travel_time_min?: number
        }
        Update: {
          actual_arrival?: string | null
          actual_finish?: string | null
          created_at?: string
          est_arrival?: string | null
          est_finish?: string | null
          id?: string
          job_id?: string
          route_id?: string
          status?: Database["public"]["Enums"]["route_stop_status"]
          stop_order?: number
          tenant_id?: string
          travel_time_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          created_at: string
          crew_id: string
          end_lat: number | null
          end_lng: number | null
          id: string
          is_locked: boolean
          optimization_status: Database["public"]["Enums"]["optimization_status"]
          route_date: string
          start_lat: number | null
          start_lng: number | null
          tenant_id: string
          total_drive_min: number
          total_job_min: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          crew_id: string
          end_lat?: number | null
          end_lng?: number | null
          id?: string
          is_locked?: boolean
          optimization_status?: Database["public"]["Enums"]["optimization_status"]
          route_date: string
          start_lat?: number | null
          start_lng?: number | null
          tenant_id: string
          total_drive_min?: number
          total_job_min?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          crew_id?: string
          end_lat?: number | null
          end_lng?: number | null
          id?: string
          is_locked?: boolean
          optimization_status?: Database["public"]["Enums"]["optimization_status"]
          route_date?: string
          start_lat?: number | null
          start_lng?: number | null
          tenant_id?: string
          total_drive_min?: number
          total_job_min?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_exceptions: {
        Row: {
          created_at: string
          exception_type: Database["public"]["Enums"]["exception_type"]
          id: string
          new_date: string | null
          original_date: string
          reason: string | null
          recurrence_rule_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          exception_type: Database["public"]["Enums"]["exception_type"]
          id?: string
          new_date?: string | null
          original_date: string
          reason?: string | null
          recurrence_rule_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          exception_type?: Database["public"]["Enums"]["exception_type"]
          id?: string
          new_date?: string | null
          original_date?: string
          reason?: string | null
          recurrence_rule_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_exceptions_recurrence_rule_id_fkey"
            columns: ["recurrence_rule_id"]
            isOneToOne: false
            referencedRelation: "recurrence_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_exceptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      service_types: {
        Row: {
          created_at: string
          default_duration_min: number
          default_price: number
          id: string
          is_recurring: boolean
          is_seasonal: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_duration_min?: number
          default_price?: number
          id?: string
          is_recurring?: boolean
          is_seasonal?: boolean
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_duration_min?: number
          default_price?: number
          id?: string
          is_recurring?: boolean
          is_seasonal?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      service_zones: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_zones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      time_logs: {
        Row: {
          created_at: string
          duration_min: number | null
          end_time: string | null
          id: string
          job_id: string
          notes: string | null
          start_time: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_min?: number | null
          end_time?: string | null
          id?: string
          job_id: string
          notes?: string | null
          start_time: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_min?: number | null
          end_time?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          start_time?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string
          created_at: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          created_at: string
          crew_id: string
          id: string
          is_active: boolean
          name: string
          plate: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          crew_id: string
          id?: string
          is_active?: boolean
          name: string
          plate?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          crew_id?: string
          id?: string
          is_active?: boolean
          name?: string
          plate?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_alerts: {
        Row: {
          affected_jobs: Json
          alert_date: string
          created_at: string
          id: string
          rain_probability: number
          resolved: boolean
          tenant_id: string
        }
        Insert: {
          affected_jobs?: Json
          alert_date: string
          created_at?: string
          id?: string
          rain_probability?: number
          resolved?: boolean
          tenant_id: string
        }
        Update: {
          affected_jobs?: Json
          alert_date?: string
          created_at?: string
          id?: string
          rain_probability?: number
          resolved?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weather_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_tenant_id: { Args: never; Returns: string }
    }
    Enums: {
      client_status: "lead" | "active" | "inactive" | "archived"
      comm_channel: "email" | "sms" | "app"
      estimate_status: "draft" | "sent" | "approved" | "rejected" | "expired"
      exception_type: "skip" | "reschedule" | "cancel"
      frequency_type: "weekly" | "biweekly" | "monthly" | "custom"
      invoice_status: "draft" | "sent" | "partial" | "paid" | "overdue" | "void"
      job_status:
        | "unscheduled"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "skipped"
        | "cancelled"
      lead_status:
        | "new"
        | "contacted"
        | "site_visit"
        | "estimate_sent"
        | "won"
        | "lost"
      optimization_status: "pending" | "optimized" | "manual"
      photo_type: "before" | "after" | "reference" | "issue"
      route_stop_status:
        | "pending"
        | "arrived"
        | "in_progress"
        | "completed"
        | "skipped"
      user_role: "owner" | "manager" | "crew_lead" | "crew_member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      client_status: ["lead", "active", "inactive", "archived"],
      comm_channel: ["email", "sms", "app"],
      estimate_status: ["draft", "sent", "approved", "rejected", "expired"],
      exception_type: ["skip", "reschedule", "cancel"],
      frequency_type: ["weekly", "biweekly", "monthly", "custom"],
      invoice_status: ["draft", "sent", "partial", "paid", "overdue", "void"],
      job_status: [
        "unscheduled",
        "scheduled",
        "in_progress",
        "completed",
        "skipped",
        "cancelled",
      ],
      lead_status: [
        "new",
        "contacted",
        "site_visit",
        "estimate_sent",
        "won",
        "lost",
      ],
      optimization_status: ["pending", "optimized", "manual"],
      photo_type: ["before", "after", "reference", "issue"],
      route_stop_status: [
        "pending",
        "arrived",
        "in_progress",
        "completed",
        "skipped",
      ],
      user_role: ["owner", "manager", "crew_lead", "crew_member"],
    },
  },
} as const

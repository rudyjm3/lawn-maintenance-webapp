import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { createClient } from "@supabase/supabase-js"

function loadEnvFile(path) {
  const envPath = resolve(process.cwd(), path)
  const text = readFileSync(envPath, "utf8")

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    const eq = trimmed.indexOf("=")
    if (eq === -1) continue

    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvFile(".env.local")

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

async function getBusinessId() {
  if (process.env.DEMO_BUSINESS_ID) return process.env.DEMO_BUSINESS_ID

  const { data, error } = await supabase
    .from("businesses")
    .select("id, business_name")
    .order("created_at", { ascending: true })
    .limit(1)
    .single()

  if (error) {
    throw new Error(`Could not find a business to seed: ${error.message}`)
  }

  console.log(`Using business: ${data.business_name} (${data.id})`)
  return data.id
}

const DEMO_CLIENT_NAMES = [
  "Jane Smith",
  "Bob & Carol Johnson",
  "Riverside HOA",
  "Michael Torres",
  "Laura Chen",
  "Greenfield Office Park",
]

const DEMO_PROPERTY_ADDRESSES = [
  "12 Oak Lane, Springfield, IL 62701",
  "45 Maple Ave, Springfield, IL 62702",
  "1 Community Dr, Springfield, IL 62703",
  "78 Elm Ct, Springfield, IL 62704",
  "9 Birch Rd, Springfield, IL 62705",
  "200 Commerce Blvd, Springfield, IL 62706",
]

function clients(businessId) {
  return [
    {
      id: "11111111-1111-4111-8111-111111111111",
      business_id: businessId,
      name: "Jane Smith",
      email: "jane@example.com",
      phone: "(555) 201-1234",
      billing_address: "12 Oak Lane, Springfield, IL 62701",
      status: "active",
      source: "referral",
      notes: "Prefers morning visits",
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      business_id: businessId,
      name: "Bob & Carol Johnson",
      email: "bob@johnsons.net",
      phone: "(555) 202-5678",
      billing_address: "45 Maple Ave, Springfield, IL 62702",
      status: "active",
      source: "website",
      notes: null,
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      business_id: businessId,
      name: "Riverside HOA",
      email: "mgr@riversidehoa.org",
      phone: "(555) 203-9012",
      billing_address: "1 Community Dr, Springfield, IL 62703",
      status: "active",
      source: "referral",
      notes: "Commercial - 3 parcels",
    },
    {
      id: "44444444-4444-4444-8444-444444444444",
      business_id: businessId,
      name: "Michael Torres",
      email: "mtorres@gmail.com",
      phone: "(555) 204-3456",
      billing_address: "78 Elm Ct, Springfield, IL 62704",
      status: "active",
      source: "website",
      notes: "Gate code: 4421",
    },
    {
      id: "55555555-5555-4555-8555-555555555555",
      business_id: businessId,
      name: "Laura Chen",
      email: "laura.chen@work.com",
      phone: "(555) 205-7890",
      billing_address: "9 Birch Rd, Springfield, IL 62705",
      status: "active",
      source: "ad",
      notes: null,
    },
    {
      id: "66666666-6666-4666-8666-666666666666",
      business_id: businessId,
      name: "Greenfield Office Park",
      email: "facilities@greenfield.com",
      phone: "(555) 206-2345",
      billing_address: "200 Commerce Blvd, Springfield, IL 62706",
      status: "active",
      source: "referral",
      notes: "Commercial - biweekly contract",
    },
  ]
}

function properties(businessId) {
  return [
    {
      id: "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      business_id: businessId,
      client_id: "11111111-1111-4111-8111-111111111111",
      address: "12 Oak Lane, Springfield, IL 62701",
      lat: 39.7817,
      lng: -89.6501,
      access_notes: null,
      gate_code: null,
      pet_notes: "Small dog - Biscuit",
      lawn_size: "0.25 acres",
      is_commercial: false,
    },
    {
      id: "aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
      business_id: businessId,
      client_id: "22222222-2222-4222-8222-222222222222",
      address: "45 Maple Ave, Springfield, IL 62702",
      lat: 39.784,
      lng: -89.6523,
      access_notes: "Side gate unlocked",
      gate_code: null,
      pet_notes: null,
      lawn_size: "0.4 acres",
      is_commercial: false,
    },
    {
      id: "aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
      business_id: businessId,
      client_id: "33333333-3333-4333-8333-333333333333",
      address: "1 Community Dr, Springfield, IL 62703",
      lat: 39.786,
      lng: -89.654,
      access_notes: "Check in with manager",
      gate_code: "7755",
      pet_notes: null,
      lawn_size: "3.2 acres",
      is_commercial: true,
    },
    {
      id: "aaaaaaa4-aaaa-4aaa-8aaa-aaaaaaaaaaa4",
      business_id: businessId,
      client_id: "44444444-4444-4444-8444-444444444444",
      address: "78 Elm Ct, Springfield, IL 62704",
      lat: 39.7795,
      lng: -89.648,
      access_notes: null,
      gate_code: "4421",
      pet_notes: null,
      lawn_size: "0.3 acres",
      is_commercial: false,
    },
    {
      id: "aaaaaaa5-aaaa-4aaa-8aaa-aaaaaaaaaaa5",
      business_id: businessId,
      client_id: "55555555-5555-4555-8555-555555555555",
      address: "9 Birch Rd, Springfield, IL 62705",
      lat: 39.781,
      lng: -89.6515,
      access_notes: null,
      gate_code: null,
      pet_notes: null,
      lawn_size: "0.2 acres",
      is_commercial: false,
    },
    {
      id: "aaaaaaa6-aaaa-4aaa-8aaa-aaaaaaaaaaa6",
      business_id: businessId,
      client_id: "66666666-6666-4666-8666-666666666666",
      address: "200 Commerce Blvd, Springfield, IL 62706",
      lat: 39.787,
      lng: -89.656,
      access_notes: "Parking in lot B",
      gate_code: null,
      pet_notes: null,
      lawn_size: "8.0 acres",
      is_commercial: true,
    },
  ]
}

const businessId = await getBusinessId()

async function ensureAuthUserProfile(businessId) {
  const { data, error } = await supabase.auth.admin.listUsers()
  if (error) {
    throw new Error(`Failed to list auth users: ${error.message}`)
  }

  const email = process.env.DEMO_AUTH_EMAIL
  const authUser = email
    ? data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
    : data.users[0]

  if (!authUser) {
    console.log("No auth users found. Skipping user profile link.")
    return
  }

  const [firstName = "", ...lastNameParts] = (authUser.email?.split("@")[0] ?? "")
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)

  const profile = {
    business_id: businessId,
    auth_user_id: authUser.id,
    first_name: firstName,
    last_name: lastNameParts.join(" "),
    role: "owner",
    is_active: true,
  }

  const { error: profileError } = await supabase
    .from("users")
    .upsert(profile, { onConflict: "auth_user_id" })

  if (profileError) {
    throw new Error(`Failed to link auth user profile: ${profileError.message}`)
  }

  const { error: metadataError } = await supabase.auth.admin.updateUserById(authUser.id, {
    user_metadata: {
      ...authUser.user_metadata,
      business_id: businessId,
      onboarding_complete: true,
    },
  })

  if (metadataError) {
    throw new Error(`Failed to update auth user metadata: ${metadataError.message}`)
  }

  console.log(`Linked auth user ${authUser.email} to business ${businessId}.`)
}

await ensureAuthUserProfile(businessId)

const { error: deletePropertiesError } = await supabase
  .from("properties")
  .delete()
  .eq("business_id", businessId)
  .in("address", DEMO_PROPERTY_ADDRESSES)

if (deletePropertiesError) {
  throw new Error(`Failed to clear existing demo properties: ${deletePropertiesError.message}`)
}

const { error: deleteClientsError } = await supabase
  .from("clients")
  .delete()
  .eq("business_id", businessId)
  .in("name", DEMO_CLIENT_NAMES)

if (deleteClientsError) {
  throw new Error(`Failed to clear existing demo clients: ${deleteClientsError.message}`)
}

const { error: clientsError } = await supabase
  .from("clients")
  .upsert(clients(businessId), { onConflict: "id" })

if (clientsError) {
  throw new Error(`Failed to seed clients: ${clientsError.message}`)
}

const { error: propertiesError } = await supabase
  .from("properties")
  .upsert(properties(businessId), { onConflict: "id" })

if (propertiesError) {
  throw new Error(`Failed to seed properties: ${propertiesError.message}`)
}

console.log("Seeded 6 clients and 6 properties.")

import { stripe } from "@/lib/stripe/client"

export async function ensureStripeCustomer(input: {
  existingCustomerId?: string | null
  email?: string | null
  name: string
  clientId: string
  businessId: string
}) {
  if (input.existingCustomerId) {
    return input.existingCustomerId
  }

  const customer = await stripe.customers.create({
    email: input.email ?? undefined,
    name: input.name,
    metadata: {
      client_id: input.clientId,
      business_id: input.businessId,
    },
  })

  return customer.id
}

import { QuoteForm } from "@/components/marketing/quote-form"

export default function QuotePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Request a Free Quote
        </h1>
        <p className="mt-3 text-muted-foreground">
          Share your property details and requested services. Our team will review your request and
          follow up with next steps.
        </p>
      </div>

      <QuoteForm />
    </div>
  )
}

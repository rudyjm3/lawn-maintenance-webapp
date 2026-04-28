import Link from "next/link"
import { CheckCircle2, MapPin, ShieldCheck, Sprout, Timer } from "lucide-react"
import { Button } from "@/components/ui/button"

const highlights = [
  {
    title: "Reliable weekly service",
    description: "Consistent lawn care visits that keep your property sharp all season.",
    icon: Sprout,
  },
  {
    title: "Local crews you can trust",
    description: "Background-checked team members with clear communication and on-time arrival.",
    icon: ShieldCheck,
  },
  {
    title: "Fast quote turnaround",
    description: "Request service online and get a response quickly from our office team.",
    icon: Timer,
  },
]

const serviceBullets = [
  "Weekly and bi-weekly mowing",
  "Seasonal cleanups",
  "Hedge and shrub trimming",
  "Fertilization and weed control",
]

export default function HomePage() {
  return (
    <div>
      <section className="border-b border-border bg-gradient-to-b from-emerald-50/80 via-background to-background">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100/70 px-3 py-1 text-xs font-semibold text-emerald-800">
              <MapPin className="h-3.5 w-3.5" />
              Serving local neighborhoods
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Lawn care that stays on schedule and looks professional.
            </h1>
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              GreenRoute helps homeowners and property managers keep outdoor spaces clean, healthy,
              and guest-ready with dependable maintenance service.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/quote">Get a Free Quote</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/services">View Services</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">What we handle</h2>
            <ul className="mt-4 space-y-3">
              {serviceBullets.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {highlights.map(({ title, description, icon: Icon }) => (
            <article key={title} className="rounded-xl border border-border bg-card p-5">
              <Icon className="h-5 w-5 text-emerald-700" />
              <h3 className="mt-3 text-base font-semibold text-foreground">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

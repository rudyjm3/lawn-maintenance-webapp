export default function ServicesPage() {
  const services = [
    {
      name: "Weekly Mowing",
      description:
        "Routine mowing, edging, and cleanup to keep your lawn neat and healthy through the growing season.",
    },
    {
      name: "Seasonal Cleanups",
      description:
        "Spring and fall debris removal, bed cleanup, and property reset for a clean and professional look.",
    },
    {
      name: "Shrub & Hedge Trimming",
      description:
        "Shaping and trimming to maintain curb appeal, visibility, and plant health around your home.",
    },
    {
      name: "Fertilization & Weed Control",
      description:
        "Targeted treatment plans to strengthen turf and reduce invasive weeds over time.",
    },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Services</h1>
        <p className="mt-3 text-muted-foreground">
          Choose from recurring lawn maintenance and seasonal services designed for residential
          and small commercial properties.
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {services.map((service) => (
          <article key={service.name} className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">{service.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{service.description}</p>
          </article>
        ))}
      </div>
    </div>
  )
}

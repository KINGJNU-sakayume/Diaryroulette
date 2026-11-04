export default function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="panel p-5">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

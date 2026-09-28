export default function Loading({ label = '불러오는 중' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
      <span className="text-sm text-muted">{label}…</span>
    </div>
  )
}

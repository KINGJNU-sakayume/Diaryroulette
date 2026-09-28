/** 앱 로고: 공책 한 장과 작은 다이얼 */
export default function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="var(--color-accent)" />
      <rect x="14" y="11" width="32" height="42" rx="4" fill="#fbf6ee" />
      <path d="M21 22h18M21 29h18M21 36h11" stroke="#d6c7b2" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="44" cy="45" r="10" fill="#2b2622" />
      <path d="M44 45V37.5" stroke="#fbf6ee" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="44" cy="45" r="2.2" fill="#fbf6ee" />
    </svg>
  )
}

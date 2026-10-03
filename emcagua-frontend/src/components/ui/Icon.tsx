/** Ícono de trazo (Heroicons outline): recibe el path `d` del SVG. */
export default function Icon({ d, className = 'w-4 h-4', strokeWidth = 1.8 }: { d: string; className?: string; strokeWidth?: number }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d={d} />
    </svg>
  )
}

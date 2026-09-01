type LogoProps = {
  size?: number
  showText?: boolean
  variant?: 'full' | 'icon'
  light?: boolean
}

export default function Logo({ size = 48, showText = true, variant = 'full', light = false }: LogoProps) {
  const h = (115 * size) / 100

  return (
    <div className="flex items-center gap-3">
      <img
        src="/logo_circulo.png"
        alt="EMCAGUA APC"
        style={{ height: h, width: 'auto' }}
        className="shrink-0 object-contain"
      />
      {showText && variant === 'full' && (
        <div className="leading-none">
          <span
            className={`block font-extrabold tracking-tight ${light ? 'text-white' : 'text-[#156D6D]'}`}
            style={{ fontSize: size * 0.34, letterSpacing: '-0.02em' }}
          >
            EMCAGUA
          </span>
          <span
            className={`block font-bold ${light ? 'text-white/90' : 'text-[#8AC43A]'}`}
            style={{ fontSize: size * 0.15, letterSpacing: '0.22em' }}
          >
            APC
          </span>
        </div>
      )}
    </div>
  )
}

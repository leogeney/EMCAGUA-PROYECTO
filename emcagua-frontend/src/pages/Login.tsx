import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../utils/session'
import { buscarCuenta, registrarAcceso } from '../data/cuentas'
import Icon from '../components/ui/Icon'

const Ico = ({ d, className = 'w-[18px] h-[18px]' }: { d: string; className?: string }) => <Icon d={d} className={className} />

const D = {
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  eye: 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  eyeOff: 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21',
  arrow: 'M14 5l7 7m0 0l-7 7m7-7H3',
  chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  receipt: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
  bell: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  alert: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
}

const FEATURES = [
  { icon: D.receipt, title: 'Facturación y pagos', desc: 'Cobro en caja, recibos y cortes del primer viernes' },
  { icon: D.chart, title: 'Analítica de consumo', desc: 'Indicadores de recaudo, cartera y barrios' },
  { icon: D.bell, title: 'Alertas inteligentes', desc: 'Consumos atípicos y posibles fugas' },
]

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.username.trim() || !form.password) {
      setError('Ingresa tu usuario y contraseña')
      return
    }
    const cuenta = buscarCuenta(form.username)
    if (!cuenta) { setError('Ese usuario no existe. Pídele al gerente que te cree una cuenta.'); return }
    if (!cuenta.activo) { setError('Tu cuenta está desactivada. Habla con el gerente.'); return }
    setError('')
    setLoading(true)
    setTimeout(() => {
      login(cuenta.usuario)
      registrarAcceso(cuenta.usuario)
      navigate('/mi-dia')
    }, 600)
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* ---------- Panel de marca ---------- */}
      <aside className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative overflow-hidden bg-[#0B3F3F] text-white">
        {/* Fondo */}
        <div className="absolute inset-0 bg-gradient-to-br from-secondary via-[#0F5656] to-[#082E2E]" />
        <div className="absolute -top-32 -right-24 w-[520px] h-[520px] rounded-full bg-primary/25 blur-[120px]" />
        <div className="absolute bottom-10 -left-32 w-[420px] h-[420px] rounded-full bg-[#2bb3a3]/20 blur-[110px]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1.4px)', backgroundSize: '22px 22px' }}
        />
        {/* Olas */}
        <svg className="absolute bottom-0 left-0 w-[200%] h-40 animate-[wave_18s_linear_infinite] opacity-[0.12]" viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true">
          <path fill="#fff" d="M0 80c120 40 240 40 360 0s240-40 360 0 240 40 360 0 240-40 360 0v80H0z" />
        </svg>
        <svg className="absolute bottom-0 left-0 w-[200%] h-28 animate-[wave_12s_linear_infinite_reverse] opacity-[0.10]" viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true">
          <path fill="#8AC43A" d="M0 90c120-30 240-30 360 0s240 30 360 0 240-30 360 0 240 30 360 0v70H0z" />
        </svg>

        <div className="relative z-10 flex flex-col justify-between w-full p-12 xl:p-16">
          {/* Marca */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/95 shadow-lg shadow-black/10 flex items-center justify-center">
              <img src="/logo_circulo.png" alt="" className="h-9 w-9 object-contain" />
            </div>
            <div className="leading-tight">
              <p className="text-lg font-extrabold tracking-tight">EMCAGUA <span className="text-primary-light">APC</span></p>
              <p className="text-xs text-white/60">El Carmen · Guamalito</p>
            </div>
          </div>

          {/* Mensaje + vista previa */}
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 h-7 px-3 rounded-full bg-white/10 border border-white/15 text-xs font-medium text-white/80 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-light" /> Portal interno de gestión
            </span>
            <h1 className="mt-5 text-[38px] xl:text-[50px] font-extrabold leading-[1.05] tracking-tight">
              Agua bien gestionada,<br />
              <span className="bg-gradient-to-r from-primary-light to-[#c7ef8f] bg-clip-text text-transparent">comunidad bien servida.</span>
            </h1>
            <p className="mt-5 text-base text-white/70 max-w-md leading-relaxed">
              Usuarios, facturación, pagos y analítica del servicio de acueducto y alcantarillado en un solo lugar.
            </p>

            {/* Tarjeta de vista previa */}
            <div className="mt-10 relative hidden [@media(min-height:740px)]:block">
              <div className="rounded-3xl bg-white/[0.07] border border-white/15 backdrop-blur-xl p-5 shadow-2xl shadow-black/20 max-w-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-white/50 font-semibold">Recaudo del mes</p>
                    <p className="text-2xl font-extrabold mt-1">$2,8 M</p>
                  </div>
                  <span className="text-xs font-bold text-[#c7ef8f] bg-primary/20 px-2 py-1 rounded-lg">▲ 82% al día</span>
                </div>
                <div className="mt-4 flex items-end gap-1.5 h-16">
                  {[48, 56, 52, 64, 70, 66, 58, 62, 74, 68, 80, 72].map((h, i) => (
                    <div key={i} className={`flex-1 rounded-t-[4px] ${i === 10 ? 'bg-primary-light' : 'bg-white/25'}`} style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
              <div className="absolute -right-2 xl:-right-10 -bottom-6 rounded-2xl bg-white text-dark shadow-2xl px-4 py-3 flex items-center gap-3 animate-[float_6s_ease-in-out_infinite]">
                <span className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Ico d={D.alert} /></span>
                <div>
                  <p className="text-xs font-bold">Consumo atípico</p>
                  <p className="text-[11px] text-gray-500">2 posibles fugas detectadas</p>
                </div>
              </div>
            </div>
          </div>

          {/* Funciones */}
          <div className="hidden [@media(min-height:860px)]:grid grid-cols-3 gap-4 max-w-2xl">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <span className="h-9 w-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-primary-light"><Ico d={f.icon} /></span>
                <p className="mt-3 text-sm font-semibold">{f.title}</p>
                <p className="text-xs text-white/55 mt-1 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ---------- Formulario ---------- */}
      <main className="flex-1 flex flex-col relative">
        {/* Fondo suave (móvil y escritorio) */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,rgba(138,196,58,0.10),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(21,109,109,0.08),transparent_55%)]" />

        <div className="relative flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-[400px] animate-[pop_.35s_ease-out]">
            {/* Logo grande */}
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl scale-110" />
                <img src="/logo_circulo.png" alt="EMCAGUA APC" className="relative h-20 w-20 object-contain drop-shadow-sm" />
              </div>
              <h2 className="mt-6 text-[28px] font-extrabold tracking-tight text-dark leading-tight">Bienvenido de nuevo</h2>
              <p className="mt-2 text-sm text-gray-500">Ingresa con tu cuenta de trabajador de EMCAGUA</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-9 space-y-4" noValidate>
              <div>
                <label htmlFor="username" className="block text-sm font-semibold text-dark mb-2">Usuario</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-secondary transition-colors"><Ico d={D.user} /></span>
                  <input
                    id="username"
                    autoComplete="username"
                    autoFocus
                    value={form.username}
                    onChange={(e) => { setForm({ ...form, username: e.target.value }); setError('') }}
                    placeholder="nombre.apellido"
                    className="w-full h-12 pl-12 pr-4 rounded-2xl border border-gray-200 bg-white/80 text-[15px] text-dark placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-4 focus:ring-secondary/10 focus:border-secondary transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-semibold text-dark">Contraseña</label>
                  <button type="button" className="text-xs font-semibold text-secondary hover:text-secondary-dark">¿La olvidaste?</button>
                </div>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-secondary transition-colors"><Ico d={D.lock} /></span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={form.password}
                    onChange={(e) => { setForm({ ...form, password: e.target.value }); setError('') }}
                    placeholder="••••••••"
                    className="w-full h-12 pl-12 pr-12 rounded-2xl border border-gray-200 bg-white/80 text-[15px] text-dark placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-4 focus:ring-secondary/10 focus:border-secondary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl text-gray-400 hover:text-dark hover:bg-gray-100 flex items-center justify-center transition-colors"
                  >
                    <Ico d={showPassword ? D.eyeOff : D.eye} />
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 text-sm text-red-700 animate-[pop_.15s_ease-out]">
                  <Ico d={D.alert} className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit pt-1">
                <input type="checkbox" className="w-4 h-4 rounded accent-secondary" />
                <span className="text-sm text-gray-600">Mantener sesión iniciada</span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full h-12 mt-2 rounded-2xl bg-secondary text-white font-semibold text-[15px] shadow-lg shadow-secondary/25 hover:bg-secondary-dark hover:shadow-xl hover:shadow-secondary/30 active:scale-[0.99] disabled:opacity-80 transition-all overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      Ingresando…
                    </>
                  ) : (
                    <>
                      Ingresar
                      <Ico d={D.arrow} className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </span>
              </button>
            </form>

            <div className="mt-8 rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 px-4 py-3 text-center">
              <p className="text-xs text-amber-800"><span className="font-semibold">Modo demostración:</span> entra con <b>admin</b> (gerente), <b>yaneth</b> (cajera), <b>diana</b> (atención), <b>alvaro</b> (técnico) o <b>martha</b> (contadora), con cualquier contraseña. Cada rol ve solo sus módulos.</p>
            </div>
          </div>
        </div>

        <footer className="relative px-6 pb-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} EMCAGUA APC · Acceso exclusivo para personal autorizado
        </footer>
      </main>
    </div>
  )
}

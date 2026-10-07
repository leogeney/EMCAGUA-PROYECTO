import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../utils/session'
import { buscarCuenta, registrarAcceso } from '../data/cuentas'
import { API_URL, ErrorApi, loginApi } from '../data/api'
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
  { icon: D.receipt, title: 'Facturación y caja', desc: 'Cobro con o sin medidor, recibos y cierres' },
  { icon: D.chart, title: 'Analítica', desc: 'Recaudo, cartera y consumo por sector' },
  { icon: D.bell, title: 'Atención al usuario', desc: 'PQR, avisos y oficina virtual' },
]

/** Pregunta si el servidor responde (para mostrar si se trabaja con la base de datos o en modo de prueba). */
function useServidor() {
  const [estado, setEstado] = useState<'revisando' | 'ok' | 'apagado'>('revisando')
  useEffect(() => {
    let vivo = true
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 4000)
    fetch(`${API_URL}/api/configuracion/publica`, { signal: ctrl.signal })
      .then((r) => { if (vivo) setEstado(r.ok ? 'ok' : 'apagado') })
      .catch(() => { if (vivo) setEstado('apagado') })
      .finally(() => clearTimeout(t))
    return () => { vivo = false; clearTimeout(t); ctrl.abort() }
  }, [])
  return estado
}

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [olvido, setOlvido] = useState(false)
  const servidor = useServidor()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.username.trim() || !form.password) {
      setError('Ingresa tu usuario y contraseña')
      return
    }
    setError('')
    setLoading(true)
    // 1) Con la API encendida, la clave se valida en el servidor y los datos salen de la base de datos.
    const r = await loginApi(form.username.trim(), form.password)
    if (r instanceof ErrorApi) { setLoading(false); setError(r.message); return }
    if (r) {
      login(r.cuenta.usuario, { token: r.token, cuenta: r.cuenta })
      window.location.assign('/mi-dia') // recarga para que todo se lea de la API
      return
    }
    // 2) Sin API: modo demostración con las cuentas guardadas en el navegador.
    const cuenta = buscarCuenta(form.username)
    if (!cuenta) { setLoading(false); setError('Ese usuario no existe. Pídele al gerente que te cree una cuenta.'); return }
    if (!cuenta.activo) { setLoading(false); setError('Tu cuenta está desactivada. Habla con el gerente.'); return }
    login(cuenta.usuario)
    registrarAcceso(cuenta.usuario)
    navigate('/mi-dia')
  }

  const campo = 'w-full h-12 pl-11 pr-4 rounded-xl border border-gray-200 bg-white text-[15px] text-dark placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-secondary/10 focus:border-secondary transition-all'

  return (
    <div className="min-h-screen flex bg-[#F4F5F3]">
      {/* ---------- Panel de marca (escritorio) ---------- */}
      <aside className="hidden lg:flex lg:w-[46%] xl:w-[44%] relative overflow-hidden text-white">
        <div className="absolute inset-0 bg-gradient-to-b from-[#125F5F] via-[#0E4C4C] to-[#093838]" />
        <div className="absolute -top-40 -left-24 w-[460px] h-[460px] rounded-full bg-primary/20 blur-[110px]" />
        {/* Gota grande de fondo */}
        <svg className="absolute -right-24 top-1/2 -translate-y-1/2 h-[120%] opacity-[0.07]" viewBox="0 0 100 130" aria-hidden="true">
          <path fill="#fff" d="M50 4C50 4 8 54 8 82a42 42 0 0084 0C92 54 50 4 50 4z" />
        </svg>
        {/* Olas */}
        <svg className="absolute bottom-0 left-0 w-[200%] h-32 animate-[wave_20s_linear_infinite] opacity-[0.10]" viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true">
          <path fill="#fff" d="M0 80c120 40 240 40 360 0s240-40 360 0 240 40 360 0 240-40 360 0v80H0z" />
        </svg>
        <svg className="absolute bottom-0 left-0 w-[200%] h-20 animate-[wave_13s_linear_infinite_reverse] opacity-[0.16]" viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true">
          <path fill="#8AC43A" d="M0 90c120-30 240-30 360 0s240 30 360 0 240-30 360 0 240 30 360 0v70H0z" />
        </svg>

        <div className="relative z-10 flex flex-col w-full px-12 xl:px-16 py-12">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-white shadow-lg shadow-black/15 flex items-center justify-center">
              <img src="/logo_circulo.png" alt="" className="h-10 w-10 object-contain" />
            </div>
            <div className="leading-tight">
              <p className="text-lg font-extrabold tracking-tight">EMCAGUA <span className="text-primary-light">APC</span></p>
              <p className="text-xs text-white/60">Servicios públicos de El Carmen y Guamalito</p>
            </div>
          </div>

          <div className="my-auto py-10 max-w-md">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-primary-light">Sistema de gestión</p>
            <h1 className="mt-4 text-[34px] xl:text-[40px] font-extrabold leading-[1.1] tracking-tight">
              El agua de El Carmen, bien administrada.
            </h1>
            <p className="mt-4 text-[15px] text-white/70 leading-relaxed">
              Usuarios, facturación, pagos y atención del acueducto y alcantarillado en un solo lugar.
            </p>
            <ul className="mt-9 space-y-5">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex items-start gap-3.5">
                  <span className="h-10 w-10 shrink-0 rounded-xl bg-white/10 ring-1 ring-white/15 flex items-center justify-center text-primary-light"><Ico d={f.icon} /></span>
                  <div>
                    <p className="text-sm font-semibold">{f.title}</p>
                    <p className="text-[13px] text-white/60 mt-0.5">{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-white/45">© {new Date().getFullYear()} EMCAGUA APC · El Carmen, Norte de Santander</p>
        </div>
      </aside>

      {/* ---------- Formulario ---------- */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Encabezado en celular */}
        <div className="lg:hidden relative overflow-hidden bg-gradient-to-br from-[#125F5F] to-[#093838] text-white px-6 pt-10 pb-16">
          <svg className="absolute bottom-0 left-0 w-[200%] h-14 animate-[wave_16s_linear_infinite] opacity-[0.14]" viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true">
            <path fill="#8AC43A" d="M0 90c120-30 240-30 360 0s240 30 360 0 240-30 360 0 240 30 360 0v70H0z" />
          </svg>
          <div className="relative flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-lg shadow-black/15"><img src="/logo_circulo.png" alt="" className="h-10 w-10 object-contain" /></div>
            <div className="leading-tight">
              <p className="text-lg font-extrabold">EMCAGUA <span className="text-primary-light">APC</span></p>
              <p className="text-xs text-white/65">Sistema de gestión</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex-1 flex items-start lg:items-center justify-center px-4 sm:px-6 -mt-10 lg:mt-0 pb-8 lg:py-10">
          <div className="w-full max-w-[420px] animate-[pop_.35s_ease-out]">
            <div className="bg-white rounded-3xl shadow-xl shadow-black/[0.06] ring-1 ring-black/[0.04] p-7 sm:p-9">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-dark">Iniciar sesión</h2>
                  <p className="mt-1 text-sm text-gray-500">Acceso para funcionarios de EMCAGUA</p>
                </div>
                <span title={servidor === 'apagado' ? 'El servidor no responde: se abrirá en modo de prueba con datos de ejemplo' : undefined}
                  className={`shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-semibold ${servidor === 'ok' ? 'bg-green-50 text-green-700' : servidor === 'apagado' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${servidor === 'ok' ? 'bg-green-500' : servidor === 'apagado' ? 'bg-amber-500' : 'bg-gray-400 animate-pulse'}`} />
                  {servidor === 'ok' ? 'En línea' : servidor === 'apagado' ? 'Modo prueba' : 'Conectando'}
                </span>
              </div>

              <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
                <div>
                  <label htmlFor="username" className="block text-sm font-semibold text-dark mb-1.5">Usuario</label>
                  <div className="relative group">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-secondary transition-colors"><Ico d={D.user} /></span>
                    <input id="username" autoComplete="username" autoFocus value={form.username}
                      onChange={(e) => { setForm({ ...form, username: e.target.value }); setError('') }}
                      placeholder="Tu usuario" className={campo} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-sm font-semibold text-dark">Contraseña</label>
                    <button type="button" onClick={() => setOlvido((x) => !x)} className="text-xs font-semibold text-secondary hover:text-secondary-dark">¿La olvidaste?</button>
                  </div>
                  <div className="relative group">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-secondary transition-colors"><Ico d={D.lock} /></span>
                    <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={form.password}
                      onChange={(e) => { setForm({ ...form, password: e.target.value }); setError('') }}
                      placeholder="••••••••" className={`${campo} pr-12`} />
                    <button type="button" onClick={() => setShowPassword((x) => !x)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg text-gray-400 hover:text-dark hover:bg-gray-100 flex items-center justify-center transition-colors">
                      <Ico d={showPassword ? D.eyeOff : D.eye} />
                    </button>
                  </div>
                  {olvido && <p className="mt-2 text-xs text-gray-600 bg-gray-soft rounded-lg px-3 py-2 animate-[pop_.15s_ease-out]">Pídele al gerente que te asigne una contraseña nueva desde <b>Cuentas y roles</b>.</p>}
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 text-sm text-red-700 animate-[pop_.15s_ease-out]">
                    <Ico d={D.alert} className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="group w-full h-12 !mt-6 rounded-xl bg-secondary text-white font-semibold text-[15px] shadow-lg shadow-secondary/20 hover:bg-secondary-dark active:scale-[0.99] disabled:opacity-80 transition-all flex items-center justify-center gap-2">
                  {loading
                    ? <><span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Ingresando…</>
                    : <>Ingresar <Ico d={D.arrow} className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>}
                </button>
              </form>
            </div>

            <Link to="/portal" className="mt-4 flex items-center gap-3 rounded-2xl bg-white/70 hover:bg-white ring-1 ring-black/[0.04] px-4 py-3.5 transition-colors group">
              <span className="h-10 w-10 shrink-0 rounded-xl bg-primary/15 text-primary-700 flex items-center justify-center"><Ico d={D.receipt} /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-dark">¿Eres usuario del servicio?</span>
                <span className="block text-xs text-gray-500">Consulta y paga tu factura en la oficina virtual</span>
              </span>
              <Ico d={D.arrow} className="w-4 h-4 text-gray-400 group-hover:text-dark group-hover:translate-x-0.5 transition-all" />
            </Link>

            <p className="mt-6 text-center text-xs text-gray-400">
              <Link to="/verificar" className="hover:text-dark">Verificar un documento</Link>
              <span className="mx-2">·</span>
              Acceso exclusivo para personal autorizado
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

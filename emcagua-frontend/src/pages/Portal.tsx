import { useCallback, useEffect, useState } from 'react'
import { ImprimirFactura } from '../components/FacturaMediaHoja'
import { ubicacion } from '../data/zonas'
import { Link } from 'react-router-dom'
import { useData } from '../data/DataContext'
import { usePqr, type NuevaPqr as DatosPqr } from '../data/PqrContext'
import { facturasDe, nombrePeriodo, resumenUsuario } from '../data/billing'
import { API_URL, mensajeError } from '../data/api'
import { cargarConfigPublica } from '../data/config'
import { barriosDe, cargarZonasPublicas, sectores, useZonas } from '../data/zonas'
import { detalleFactura, reemplazarVigencias, type TarifaCRA } from '../data/tarifa'
import { CHART, MESES } from '../data/constants'
import { diasHabilesRestantes, sugerirCategoria } from '../data/pqr'
import type { Factura, Pqr, TipoPqr, Usuario } from '../data/types'
import { ColumnChart } from '../components/charts/charts'
import Qr from '../components/Qr'
import GraficaPagos from '../components/GraficaPagos'
import { codigoFactura, urlVerificacion } from '../data/verificacion'
import Logo from '../components/Logo'
import Modal from '../components/ui/Modal'
import Ico from '../components/ui/Icon'
import { useConfig } from '../data/config'
import { cop, fecha, fechaCorta } from '../utils/format'
import { etiquetaPredio, limpiarCedula, otrosPredios, saldoPropietario } from '../data/propietarios'
import { getUsername, haySesionFuncionario, logout } from '../utils/session'

const D = {
  lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  check: 'M5 13l4 4L19 7',
  out: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  chat: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
  drop: 'M12 21a7 7 0 007-7c0-4-7-11-7-11S5 10 5 14a7 7 0 007 7z',
}

/** Portal público para los suscriptores: consultar, pagar y radicar PQR sin ir a la oficina. */
/** Datos del suscriptor que ve el portal: de la base de datos (API) o de la demostración. */
type Fuente = {
  usuarios: Usuario[]
  pqrs: Pqr[]
  pagar: (facturas: string[], referencia: string) => Promise<void>
  radicar: (p: DatosPqr) => Promise<Pqr>
}
type Remoto = { codigo: string; clave: string; usuarios: Usuario[]; pqrs: Pqr[] }

/* Demostración sin servidor: cuentas de la oficina virtual guardadas en este navegador (cédula → contraseña) */
const CLAVE_DEMO = 'emcagua_portal_demo'
const cuentasDemo = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(CLAVE_DEMO) ?? '{}') } catch { return {} } }
const guardarCuentasDemo = (c: Record<string, string>) => { try { localStorage.setItem(CLAVE_DEMO, JSON.stringify(c)) } catch { /* sin almacenamiento */ } }

/** Llamada pública al portal de la API. null = la API no está encendida (se usa la demostración). */
async function portalApi<T>(ruta: string, cuerpo: unknown): Promise<T | null> {
  let r: Response
  try {
    r = await fetch(`${API_URL}/api/portal/vista${ruta}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) })
  } catch {
    return null
  }
  const datos = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(datos.error || `Error ${r.status} del servidor`)
  return datos as T
}

export default function Portal() {
  const { usuarios } = useData()
  const [id, setId] = useState('')
  const [tel, setTel] = useState('')
  const [error, setError] = useState('')
  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [remoto, setRemoto] = useState<Remoto | null>(null)
  const [entrando, setEntrando] = useState(false)
  const lista = remoto?.usuarios ?? usuarios
  const u = lista.find((x) => x.id === usuarioId)
  useEffect(() => { void cargarConfigPublica() }, [])

  const [modo, setModo] = useState<'entrar' | 'crear' | 'nuevo'>('entrar')
  const [funcionario, setFuncionario] = useState(haySesionFuncionario)
  /** Un suscriptor entró en este navegador: la sesión de funcionario (si había) se cierra para que no pueda pasar al sistema interno. */
  const cerrarFuncionario = () => { if (haySesionFuncionario()) { logout(); setFuncionario(false) } }
  const [clave, setClave] = useState('')
  const [clave2, setClave2] = useState('')
  const [ver, setVer] = useState(false)
  const [olvide, setOlvide] = useState(false)
  const cambiarModo = (m: 'entrar' | 'crear' | 'nuevo') => { setModo(m); setError(''); setClave(''); setClave2(''); setTel(''); setOlvide(false) }
  type RespCuenta = { inicial: string; usuarios: Usuario[]; pqrs: Pqr[]; tarifas: TarifaCRA[] }
  const abrir = (q: string, c: string, r: RespCuenta) => { cerrarFuncionario(); reemplazarVigencias(r.tarifas); setError(''); setRemoto({ codigo: q, clave: c, usuarios: r.usuarios, pqrs: r.pqrs }); setUsuarioId(r.inicial) }
  const buscarDemo = (q: string) => { const ced = limpiarCedula(q); return usuarios.find((y) => y.id === q) ?? (ced.length >= 6 ? usuarios.find((y) => limpiarCedula(y.cedula) === ced) : undefined) }

  const entrar = async () => {
    const q = id.trim()
    if (!q || !clave) { setError('Escribe tu código o cédula y tu contraseña.'); return }
    setEntrando(true)
    try {
      // 1) Con la API: la base de datos valida la contraseña y devuelve los predios del dueño
      const r = await portalApi<RespCuenta>('/cuenta', { codigo: q, clave })
      if (r) { abrir(q, clave, r); return }
    } catch (e) {
      setError(mensajeError(e)); return
    } finally {
      setEntrando(false)
    }
    // 2) Demostración (sin servidor): cuentas guardadas en este navegador
    const x = buscarDemo(q)
    if (!x || cuentasDemo()[limpiarCedula(x.cedula)] !== clave) { setError('El código o la cédula no coinciden con la contraseña.'); return }
    cerrarFuncionario(); setError(''); setUsuarioId(x.id)
  }

  const crear = async () => {
    const q = id.trim()
    if (!q) { setError('Escribe tu código de suscriptor o tu cédula.'); return }
    if (tel.length !== 4) { setError('Escribe los últimos 4 dígitos de tu celular.'); return }
    if (clave.length < 8 || !/[a-zA-Z]/.test(clave) || !/\d/.test(clave)) { setError('La contraseña debe tener mínimo 8 caracteres, con letras y números.'); return }
    if (clave !== clave2) { setError('Las dos contraseñas no coinciden.'); return }
    setEntrando(true)
    try {
      const r = await portalApi<RespCuenta>('/registro', { codigo: q, ultimos4: tel, clave })
      if (r) { abrir(q, clave, r); return }
    } catch (e) {
      setError(mensajeError(e)); return
    } finally {
      setEntrando(false)
    }
    const x = buscarDemo(q)
    if (!x) { setError('No encontramos ese código de suscriptor o cédula. Revisa tu factura.'); return }
    if (x.telefono.replace(/\D/g, '').slice(-4) !== tel) { setError('Los últimos 4 dígitos no coinciden con el celular registrado en tu factura.'); return }
    const cs = cuentasDemo()
    if (cs[limpiarCedula(x.cedula)]) { setError('Ya tienes una cuenta: entra con tu contraseña.'); return }
    guardarCuentasDemo({ ...cs, [limpiarCedula(x.cedula)]: clave })
    cerrarFuncionario(); setError(''); setUsuarioId(x.id)
  }
  const salir = () => { setUsuarioId(null); setRemoto(null); setId(''); setTel(''); setClave(''); setClave2('') }
  const reglas = [{ ok: clave.length >= 8, t: 'Mínimo 8 caracteres' }, { ok: /[a-zA-Z]/.test(clave) && /\d/.test(clave), t: 'Letras y números' }, { ok: !!clave && clave === clave2, t: 'Las dos coinciden' }]
  const enter = (fn: () => Promise<void>) => (e: React.KeyboardEvent) => { if (e.key === 'Enter') void fn() }
  const campoClave = (valor: string, set: (v: string) => void, label: string, fn: () => Promise<void>, auto: string) => (
    <div>
      <label className="field-label">{label}</label>
      <div className="relative">
        <input type={ver ? 'text' : 'password'} value={valor} onChange={(e) => { set(e.target.value); setError('') }} onKeyDown={enter(fn)} autoComplete={auto} placeholder="••••••••" className="field h-12 text-lg pr-20" />
        <button type="button" onClick={() => setVer((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-2.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-dark hover:bg-gray-100">{ver ? 'Ocultar' : 'Ver'}</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F4F5F3]">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2"><Logo /><span className="hidden sm:inline text-xs text-gray-400 border-l border-gray-200 pl-3">Oficina virtual</span></div>
          {u ? <button onClick={salir} className="btn-sm"><Ico d={D.out} /> Salir</button> : <div className="flex items-center gap-4"><Link to="/verificar" className="text-xs font-semibold text-secondary hover:underline">Verificar un documento</Link><Link to="/login" className="text-xs text-gray-400 hover:text-dark">Acceso funcionarios</Link></div>}
        </div>
      </header>

      {funcionario && !u && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-5xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-amber-900">
            <span className="flex-1">Hay una sesión de funcionario abierta en este navegador ({getUsername()}). Si este computador lo va a usar un suscriptor, ciérrala primero.</span>
            <button onClick={() => { logout(); setFuncionario(false) }} className="btn-sm h-8 bg-white">Cerrar sesión de funcionario</button>
          </div>
        </div>
      )}

      {!u ? (
        <main className={`max-w-5xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-2 gap-8 ${modo === 'nuevo' ? 'items-start' : 'items-center'}`}>
          <div className={modo === 'nuevo' ? 'lg:sticky lg:top-10 lg:pt-16' : ''}>
            <p className="text-xs font-semibold tracking-[0.14em] text-primary-700 uppercase mb-3">Oficina virtual EMCAGUA</p>
            <h1 className="text-4xl font-extrabold tracking-tight text-dark leading-tight">Tu agua, desde el celular</h1>
            <p className="text-gray-600 mt-3">Consulta tu factura, págala en línea, revisa tu consumo y radica peticiones o reclamos sin hacer fila.</p>
            <ul className="mt-6 space-y-2 text-sm text-gray-700">
              {['Paga con PSE, Nequi o Daviplata', 'Mira cuánta agua gastas cada mes', 'Radica una PQR y sigue su respuesta'].map((t) => <li key={t} className="flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-primary/15 text-primary-700 flex items-center justify-center"><Ico d={D.check} className="w-3.5 h-3.5" /></span>{t}</li>)}
            </ul>
          </div>
          <div className="card p-6 sm:p-8">
            {modo === 'nuevo' ? (
              <RegistroNuevo onVolver={() => cambiarModo('entrar')} onTipo={cambiarModo} />
            ) : modo === 'entrar' ? (
              <>
                <h2 className="text-lg font-bold text-dark mb-1">Ingresa</h2>
                <p className="text-sm text-gray-500 mb-5">Con el código de suscriptor que aparece en tu factura (o tu cédula, si tienes varias casas) y tu contraseña.</p>
                <div className="space-y-3">
                  <div><label className="field-label">Código de suscriptor o cédula</label><input value={id} onChange={(e) => { setId(e.target.value); setError('') }} placeholder="Ej: 10237" className="field h-12 text-lg tabular-nums" inputMode="numeric" autoComplete="username" /></div>
                  {campoClave(clave, setClave, 'Contraseña', entrar, 'current-password')}
                  <div className="flex justify-end"><button type="button" onClick={() => setOlvide((x) => !x)} className="text-xs font-semibold text-secondary hover:underline">¿Olvidaste tu contraseña?</button></div>
                  {olvide && <p className="text-xs text-gray-600 bg-gray-soft rounded-lg px-3 py-2">Acércate a la oficina de EMCAGUA con tu cédula: te quitamos la contraseña anterior y vuelves a crear tu cuenta desde aquí.</p>}
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <button onClick={() => void entrar()} disabled={entrando} className="btn-primary w-full h-12">{entrando ? 'Entrando…' : 'Entrar'}</button>
                </div>
                <div className="flex items-center gap-3 my-5"><span className="h-px flex-1 bg-gray-200" /><span className="text-xs text-gray-400">¿Primera vez aquí?</span><span className="h-px flex-1 bg-gray-200" /></div>
                <button onClick={() => cambiarModo('crear')} className="btn-secondary w-full h-12 border-secondary/30 text-secondary hover:bg-secondary/5">Crear cuenta</button>
              </>
            ) : (
              <>
                <button onClick={() => cambiarModo('entrar')} className="text-xs font-semibold text-gray-500 hover:text-dark mb-3">← Ya tengo cuenta</button>
                <TiposCuenta modo={modo} onCambiar={cambiarModo} />
                <h2 className="text-lg font-bold text-dark mb-1">Crea tu cuenta</h2>
                <p className="text-sm text-gray-500 mb-5">Para confirmar que eres el dueño te pedimos los últimos 4 dígitos del celular registrado en tu factura.</p>
                <div className="space-y-3">
                  <div><label className="field-label">Código de suscriptor o cédula</label><input value={id} onChange={(e) => { setId(e.target.value); setError('') }} placeholder="Ej: 10237" className="field h-12 text-lg tabular-nums" inputMode="numeric" autoComplete="username" /></div>
                  <div><label className="field-label">Últimos 4 dígitos de tu celular</label><input value={tel} onChange={(e) => { setTel(e.target.value.replace(/\D/g, '').slice(0, 4)); setError('') }} placeholder="••••" className="field h-12 text-lg tracking-[0.4em] tabular-nums" inputMode="numeric" /></div>
                  {campoClave(clave, setClave, 'Crea una contraseña', crear, 'new-password')}
                  {campoClave(clave2, setClave2, 'Repite la contraseña', crear, 'new-password')}
                  <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {reglas.map((r) => <li key={r.t} className={`flex items-center gap-1.5 ${r.ok ? 'text-green-700' : 'text-gray-400'}`}><Ico d={D.check} className="w-3.5 h-3.5" />{r.t}</li>)}
                  </ul>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <button onClick={() => void crear()} disabled={entrando} className="btn-primary w-full h-12">{entrando ? 'Creando…' : 'Crear cuenta y entrar'}</button>
                </div>
              </>
            )}
            <p className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-4"><Ico d={D.lock} className="w-3.5 h-3.5" /> Solo tú ves la información de tu cuenta. Tu contraseña se guarda cifrada.</p>
          </div>
        </main>
      ) : (
        remoto ? <CuentaRemota u={u} remoto={remoto} setRemoto={setRemoto} onCambiar={setUsuarioId} /> : <CuentaDemo u={u} onCambiar={setUsuarioId} />
      )}
      <Pie />
    </div>
  )
}

/** Portal con los datos de demostración del navegador. */
function CuentaDemo({ u, onCambiar }: { u: Usuario; onCambiar: (id: string) => void }) {
  const { pagarFacturas, usuarios } = useData()
  const { pqrs, radicar } = usePqr()
  const fuente: Fuente = { usuarios, pqrs, radicar, pagar: async (ids, ref) => { await pagarFacturas(ids, { metodo: 'En línea', comprobante: ref }) } }
  return <Cuenta u={u} onCambiar={onCambiar} fuente={fuente} />
}

/** Portal con los datos de la base de datos: pagar y radicar van a la API pública del portal. */
function CuentaRemota({ u, remoto, setRemoto, onCambiar }: { u: Usuario; remoto: Remoto; setRemoto: (r: Remoto) => void; onCambiar: (id: string) => void }) {
  const acceso = { codigo: remoto.codigo, clave: remoto.clave }
  const releer = async () => {
    const r = await portalApi<{ usuarios: Usuario[]; pqrs: Pqr[] }>('/cuenta', acceso)
    if (r) setRemoto({ ...remoto, usuarios: r.usuarios, pqrs: r.pqrs })
  }
  const fuente: Fuente = {
    usuarios: remoto.usuarios,
    pqrs: remoto.pqrs,
    pagar: async (facturas, referencia) => { await portalApi('/pagar', { ...acceso, facturas, referencia }); await releer() },
    radicar: async (p) => {
      const x = await portalApi<Pqr>('/pqr', { ...acceso, predio: p.suscriptorId, tipo: p.tipo, categoria: p.categoria, descripcion: p.descripcion })
      await releer()
      if (!x) throw new Error('No hay conexión con el servidor')
      return x
    },
  }
  return <Cuenta u={u} onCambiar={onCambiar} fuente={fuente} />
}

function Cuenta({ u, onCambiar, fuente }: { u: Usuario; onCambiar: (id: string) => void; fuente: Fuente }) {
  const { usuarios, pqrs, radicar } = fuente
  const resumen = resumenUsuario
  const casas = [u, ...otrosPredios(usuarios, u)].sort((a, b) => a.id.localeCompare(b.id))
  const total = saldoPropietario(casas, (x) => resumen(x))
  const pendTodas = casas.flatMap((c) => facturasDe(c).filter((f) => f.estado === 'Pendiente'))
  const [error, setError] = useState<string | null>(null)
  const r = resumen(u)
  const pendientes = facturasDe(u).filter((f) => f.estado === 'Pendiente')
  const hist = u.historial.slice(-6)
  const misPqr = pqrs.filter((p) => p.suscriptorId === u.id)
  const [pagar, setPagar] = useState<Factura[] | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [pqrAbierta, setPqrAbierta] = useState(false)
  const [verFactura, setVerFactura] = useState<Factura | null>(null)
  const fijo = !u.conMedidor || (u.historial.length > 0 && u.historial.slice(-6).every((h) => h.fija || h.estado === 'Suspendido'))

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-5">
      <div>
        <p className="text-sm text-gray-500">Hola,</p>
        <h1 className="text-2xl font-extrabold text-dark">{u.nombre}</h1>
        <p className="text-xs text-gray-400">Suscriptor {u.id} · {u.conMedidor && u.medidor ? `Medidor ${u.medidor}` : 'Sin medidor'} · {[u.direccion, ubicacion(u)].filter(Boolean).join(' · ')}</p>
      </div>

      {casas.length > 1 && (
        <section className="card p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <p className="font-bold text-dark">Tus {casas.length} predios</p>
            {total.deuda > 0 && <button onClick={() => setPagar(pendTodas)} className="btn-primary h-10 text-sm whitespace-nowrap">Pagar todo · {cop(total.deuda)}</button>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {casas.map((c) => { const rc = resumen(c); return (
              <button key={c.id} onClick={() => onCambiar(c.id)} className={`text-left rounded-xl border-2 px-3.5 py-3 transition-colors ${c.id === u.id ? 'border-secondary bg-secondary/5' : 'border-gray-100 hover:border-gray-200'}`}>
                <p className="text-sm font-semibold text-dark truncate">{etiquetaPredio(c)}</p>
                <p className="text-xs text-gray-500">Código {c.id}{c.estado === 'Cortado' ? ' · suspendido' : ''}</p>
                <p className={`text-sm font-bold tabular-nums mt-1 ${rc.deuda ? (rc.vencido ? 'text-red-600' : 'text-dark') : 'text-green-700'}`}>{rc.deuda ? cop(rc.deuda) : 'Al día'}</p>
              </button>
            ) })}
          </div>
        </section>
      )}

      {error && <div className="rounded-2xl bg-red-50 border border-red-100 text-red-800 px-4 py-3 text-sm">{error}</div>}
      {ok && <div className="rounded-2xl bg-green-50 border border-green-100 text-green-900 px-4 py-3 text-sm flex items-center gap-2"><Ico d={D.check} className="w-4 h-4" /> {ok}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5">
        <section className={`rounded-3xl p-6 text-white shadow-lg ${r.deuda > 0 ? (r.vencido ? 'bg-gradient-to-br from-[#7A1F12] to-[#C2410C]' : 'bg-gradient-to-br from-secondary-700 to-secondary') : 'bg-gradient-to-br from-primary-700 to-primary'}`}>
          <p className="text-sm text-white/80">{r.deuda > 0 ? (r.vencido ? 'Tienes saldo vencido' : 'Valor a pagar') : 'Estás al día'}</p>
          <p className="text-4xl font-extrabold tabular-nums mt-1">{cop(r.deuda)}</p>
          {pendientes[0] && <p className="text-sm text-white/80 mt-1">{pendientes.length} factura(s) · {r.vencido ? 'venció' : 'vence'} el {fechaCorta(pendientes[0].vencimiento)}</p>}
          {u.estado === 'Cortado' && <p className="mt-3 text-sm bg-white/15 rounded-xl px-3 py-2">Tu servicio está suspendido. Al pagar, la empresa programa la reconexión.</p>}
          {r.deuda > 0 ? <button onClick={() => setPagar(pendientes)} className="mt-5 h-12 w-full rounded-xl bg-white text-dark font-bold hover:bg-white/90">Pagar en línea</button> : <p className="mt-5 text-sm">¡Gracias por pagar a tiempo! 💧</p>}
        </section>

        <section className="card p-5">
          <h2 className="font-bold text-dark mb-1">{fijo ? 'Tus pagos' : 'Tu consumo'}</h2>
          {fijo ? (
            <>
              <p className="text-xs text-gray-500 mb-3">Tu predio aún no tiene medidor: pagas un valor fijo según tu estrato. Cuando se instale, aquí verás cuánta agua gastas.</p>
              <GraficaPagos facturas={facturasDe(u)} />
            </>
          ) : <>
          <p className="text-xs text-gray-500 mb-3">Últimos {hist.length} meses · promedio {Math.round(r.consumoPromedio)} m³</p>
          <ColumnChart data={hist.map((h, i) => ({ label: MESES[h.mes - 1].slice(0, 3), full: nombrePeriodo(h.mes, h.anio), values: [h.consumo], colors: [i === hist.length - 1 ? CHART.serie1 : '#b9d9d4'] }))} series={[{ name: 'Consumo', color: CHART.serie1 }]} format={(n) => `${n} m³`} height={170} />
          {r.consumoActual > r.consumoPromedio * 1.5 && r.consumoPromedio > 0 && <p className="text-xs mt-2 rounded-xl bg-amber-50 text-amber-900 px-3 py-2">Tu último consumo fue más alto de lo normal. Revisa si hay fugas: cierra todas las llaves y mira si el medidor sigue girando.</p>}
          </>}
        </section>
      </div>

      <MisFacturas facturas={facturasDe(u)} onVer={setVerFactura} />

      <section className="card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <h2 className="font-bold text-dark">Peticiones, quejas y reclamos</h2>
          <button onClick={() => setPqrAbierta(true)} className="btn-primary h-10 text-sm whitespace-nowrap"><Ico d={D.chat} /> Radicar PQR</button>
        </div>
        {misPqr.length === 0 ? <p className="text-sm text-gray-500">No tienes PQR radicadas.</p> : (
          <ul className="divide-y divide-gray-100">
            {misPqr.map((p) => <li key={p.radicado} className="py-3 text-sm flex flex-col sm:flex-row sm:justify-between gap-1.5 sm:gap-3"><div className="min-w-0"><p className="font-semibold text-dark">{p.radicado} · {p.categoria}</p><p className="text-gray-500 line-clamp-2 sm:truncate">{p.descripcion}</p>{p.respuesta && <p className="text-xs text-green-800 mt-1">Respuesta: {p.respuesta}</p>}</div><div className="sm:text-right shrink-0 flex sm:block items-center gap-2"><span className={p.estado === 'Respondida' || p.estado === 'Cerrada' ? 'badge-ok' : 'badge-warn'}>{p.estado}</span>{p.estado !== 'Respondida' && p.estado !== 'Cerrada' && <p className="text-[11px] text-gray-400 sm:mt-1">Respuesta en máx. {Math.max(0, diasHabilesRestantes(p.vence))} días hábiles</p>}</div></li>)}
          </ul>
        )}
      </section>

      {verFactura && <FacturaPortal f={verFactura} u={u} onClose={() => setVerFactura(null)} onPagar={() => { setPagar([verFactura]); setVerFactura(null) }} />}
      {pagar && <PagoEnLinea facturas={pagar} casas={casas} onClose={() => setPagar(null)} onPagado={async (ref) => {
        try { await fuente.pagar(pagar.map((f) => f.id), ref); setError(null); setOk(`Pago aprobado. Comprobante ${ref}. ¡Gracias!`) } catch (e) { setOk(null); setError(mensajeError(e)) }
        setPagar(null)
      }} />}
      {pqrAbierta && <NuevaPqr u={u} onClose={() => setPqrAbierta(false)} onRadicar={async (p) => {
        try { const x = await radicar(p); setError(null); setOk(`Radicamos tu ${x.tipo.toLowerCase()} con el número ${x.radicado}. Te responderemos en máximo 15 días hábiles.`) } catch (e) { setOk(null); setError(mensajeError(e)) }
        setPqrAbierta(false)
      }} />}
    </main>
  )
}

/** Todas las facturas del predio, de la más reciente a la más antigua. */
function MisFacturas({ facturas, onVer }: { facturas: Factura[]; onVer: (f: Factura) => void }) {
  const [anio, setAnio] = useState('Todos')
  const [cuantas, setCuantas] = useState(12)
  const anios = [...new Set(facturas.map((f) => f.anio))].sort((a, b) => b - a)
  const lista = facturas.filter((f) => anio === 'Todos' || f.anio === Number(anio)).slice().reverse()
  const pagadas = facturas.filter((f) => f.estado === 'Pagada').reduce((s, f) => s + f.monto, 0)
  return (
    <section className="card p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="font-bold text-dark">Mis facturas</h2>
          <p className="text-xs text-gray-500">{facturas.length} factura(s) · pagado en total {cop(pagadas)}</p>
        </div>
        {anios.length > 1 && <div className="flex flex-wrap gap-1.5">{['Todos', ...anios.map(String)].map((a) => <button key={a} onClick={() => { setAnio(a); setCuantas(12) }} className={anio === a ? 'chip-on' : 'chip'}>{a}</button>)}</div>}
      </div>
      {lista.length === 0 ? <p className="text-sm text-gray-500">Todavía no tienes facturas. La primera se genera en el cierre de este mes.</p> : (
        <>
          <ul className="divide-y divide-gray-100 -mx-1">
            {lista.slice(0, cuantas).map((f) => (
              <li key={f.id}>
                <button onClick={() => onVer(f)} className="w-full text-left flex items-center gap-3 px-1 py-3 hover:bg-gray-50 rounded-xl">
                  <div className="h-10 w-10 rounded-xl bg-secondary/10 text-secondary flex flex-col items-center justify-center shrink-0 leading-none">
                    <span className="text-[10px] font-bold uppercase">{MESES[f.mes - 1].slice(0, 3)}</span><span className="text-[10px]">{f.anio}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-dark">{f.periodo}</p>
                    <p className="text-xs text-gray-500 truncate">{f.fija ? 'Cobro fijo · sin medidor' : `${f.consumo} m³`} · {f.estado === 'Pagada' ? (f.fechaPago ? `pagada el ${fechaCorta(new Date(f.fechaPago))}` : 'pagada') : `vence el ${fechaCorta(f.vencimiento)}`}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-dark tabular-nums">{cop(f.monto)}</p>
                    {f.estado === 'Pagada' ? <span className="badge-ok">Pagada</span> : <span className={f.vencida ? 'badge-bad' : 'badge-warn'}>{f.vencida ? 'Vencida' : 'Por pagar'}</span>}
                  </div>
                  <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </li>
            ))}
          </ul>
          {lista.length > cuantas && <button onClick={() => setCuantas(cuantas + 12)} className="btn-secondary w-full mt-3 h-10 text-sm">Ver más ({lista.length - cuantas})</button>}
        </>
      )}
    </section>
  )
}

/** Una factura completa, como la impresa: para verla, descargarla en PDF o pagarla. */
function FacturaPortal({ f, u, onClose, onPagar }: { f: Factura; u: Usuario; onClose: () => void; onPagar: () => void }) {
  const c = useConfig()
  const det = detalleFactura(f)
  const anterior = u.historial.find((h) => h.anio * 12 + h.mes === f.anio * 12 + f.mes - 1)
  const [imprimir, setImprimir] = useState(false)
  const listo = useCallback(() => setImprimir(false), [])
  return (
    <Modal open onClose={onClose} size="lg" title={`Factura ${f.periodo}`} subtitle={f.id}
      footer={<>
        <button onClick={onClose} className="btn-secondary flex-1">Cerrar</button>
        <button onClick={() => setImprimir(true)} className="btn flex-1 bg-dark text-white hover:bg-black">Descargar / imprimir</button>
        {f.estado !== 'Pagada' && <button onClick={onPagar} className="btn-primary flex-1">Pagar {cop(f.monto)}</button>}
      </>}>
      {imprimir && <ImprimirFactura f={f} u={u} onListo={listo} />}
      <div className="print-area px-6 py-5">
        <div className="flex items-start justify-between gap-4 pb-4 border-b-2 border-secondary">
          <div className="flex gap-3">
            <img src="/logo_circulo.png" alt="" className="h-14 w-14 object-contain" />
            <div>
              <p className="text-sm font-extrabold text-dark leading-none">{c.nombre}</p>
              <p className="text-[11px] text-gray-500 mt-1 leading-snug max-w-xs">{c.razon}</p>
              <p className="text-[11px] text-gray-400">{c.ciudad}</p>
            </div>
          </div>
          <div className="text-right">
            {f.estado === 'Pagada' ? <span className="badge-ok">PAGADA</span> : <span className={f.vencida ? 'badge-bad' : 'badge-warn'}>{f.vencida ? 'VENCIDA' : 'POR PAGAR'}</span>}
            {f.fechaPago && <p className="text-[11px] text-gray-500 mt-2">Pagada el {fecha(f.fechaPago)}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <div className="bg-gray-soft rounded-xl p-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Suscriptor</p>
            <p className="text-sm font-bold text-dark mt-1">{f.cliente}</p>
            <p className="text-xs text-gray-500">Código {f.clienteId} · {f.barrio} · Estrato {f.estrato}</p>
            <p className="text-xs text-gray-500">{f.fija ? 'Sin medidor instalado' : u.medidor ? `Medidor ${u.medidor}` : ''}</p>
          </div>
          <div className="bg-gray-soft rounded-xl p-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Periodo facturado</p>
            <p className="text-sm font-bold text-dark mt-1">{f.periodo}</p>
            <p className="text-xs text-gray-500">Vence: <b className="text-dark">{fechaCorta(f.vencimiento)}</b></p>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-gray-100 divide-y divide-gray-100 text-sm overflow-hidden">
          <div className="flex justify-between gap-3 px-4 py-2.5"><span className="text-gray-500">Consumo del periodo</span><span className="font-semibold tabular-nums text-right">{f.fija ? 'Sin medidor (cobro fijo)' : `${f.consumo} m³ · ${(f.consumo * 1000).toLocaleString('es-CO')} L`}</span></div>
          {!f.fija && anterior && !anterior.fija && <div className="flex justify-between px-4 py-2.5"><span className="text-gray-500">Consumo periodo anterior</span><span className="tabular-nums text-gray-600">{anterior.consumo} m³</span></div>}
          {det.lineas.filter((l) => l.tipo !== 'total').map((l) => (
            <div key={l.concepto} className="flex justify-between gap-3 px-4 py-2"><span className={l.tipo === 'subsidio' ? 'text-green-700' : 'text-gray-500'}>{l.concepto}{l.cantidad && <span className="text-gray-400"> · {l.cantidad}</span>}</span><span className={`tabular-nums ${l.tipo === 'subsidio' ? 'text-green-700 font-semibold' : 'text-gray-600'}`}>{cop(l.valor)}</span></div>
          ))}
          <div className="flex justify-between px-4 py-3 bg-dark text-white"><span className="font-semibold">Total a pagar</span><span className="text-lg font-extrabold tabular-nums">{cop(f.monto)} <span className="text-xs font-normal text-white/60">COP</span></span></div>
        </div>
        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex gap-3 items-center bg-gray-soft rounded-xl p-3">
            <Qr value={urlVerificacion(f.id, codigoFactura(f))} size={88} />
            <div className="text-[11px] text-gray-500 leading-relaxed">
              <p className="font-mono font-bold text-dark">{f.id}</p>
              <p>Escanea para verificar la factura y ver si ya está pagada</p>
              <p>Código <b className="font-mono text-dark">{codigoFactura(f)}</b></p>
            </div>
          </div>
          <div className="flex-1 bg-secondary/5 border border-secondary/10 rounded-xl p-3 text-xs text-gray-600">
            <p className="font-bold text-secondary uppercase tracking-wider text-[11px]">Información de pago</p>
            <p className="mt-1">En línea desde esta oficina virtual, o en las oficinas de {c.nombre}{c.horario ? ` (${c.horario})` : ''}.</p>
            <p>Si vence, se suspende el servicio. Reconexión {cop(c.reconexion)}.</p>
          </div>
        </div>
      </div>
    </Modal>
  )
}

/** Selector: ¿ya es suscriptor (tiene factura) o es una persona nueva? */
function TiposCuenta({ modo, onCambiar }: { modo: 'entrar' | 'crear' | 'nuevo'; onCambiar: (m: 'crear' | 'nuevo') => void }) {
  return (
    <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-gray-soft mb-5">
      {([['crear', 'Ya tengo factura'], ['nuevo', 'Soy nuevo']] as const).map(([m, t]) => (
        <button key={m} type="button" onClick={() => onCambiar(m)} className={`h-9 rounded-lg text-sm font-semibold transition-colors ${modo === m ? 'bg-white text-dark shadow-sm' : 'text-gray-500 hover:text-dark'}`}>{t}</button>
      ))}
    </div>
  )
}

/** Registro de una persona nueva: queda como solicitud hasta que la empresa la apruebe. */
function RegistroNuevo({ onVolver, onTipo }: { onVolver: () => void; onTipo: (m: 'crear' | 'nuevo') => void }) {
  useZonas()
  useEffect(() => { void cargarZonasPublicas() }, [])
  const [f, setF] = useState({ nombre: '', cedula: '', telefono: '', correo: '', direccion: '', sector: '', barrio: '', estrato: 0, conMedidor: false, medidor: '', observacion: '', clave: '', clave2: '', acepta: false })
  const [ver, setVer] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [listo, setListo] = useState<{ radicado: string; nombre: string } | null>(null)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((x) => ({ ...x, [k]: v })); setError('') }
  const sec = f.sector || sectores()[0] || ''
  const barrios = barriosDe(sec)
  const reglas = [{ ok: f.clave.length >= 8, t: 'Mínimo 8 caracteres' }, { ok: /[a-zA-Z]/.test(f.clave) && /\d/.test(f.clave), t: 'Letras y números' }, { ok: !!f.clave && f.clave === f.clave2, t: 'Las dos coinciden' }]

  const enviar = async () => {
    const tel = f.telefono.replace(/\D/g, '')
    if (f.nombre.trim().split(/\s+/).length < 2) return setError('Escribe tu nombre completo (nombre y apellido).')
    if (f.cedula.length < 5) return setError('Escribe tu número de cédula.')
    if (!/^3\d{9}$/.test(tel)) return setError('Escribe un celular de 10 dígitos que empiece por 3.')
    if (f.direccion.trim().length < 5) return setError('Escribe la dirección del predio.')
    if (!f.estrato) return setError('Elige el estrato (aparece en tu recibo de la luz).')
    if (!reglas.every((r) => r.ok)) return setError('Revisa la contraseña: mínimo 8 caracteres, con letras y números, y que las dos coincidan.')
    if (!f.acepta) return setError('Debes autorizar el tratamiento de tus datos personales.')
    setEnviando(true)
    try {
      const r = await portalApi<{ radicado: string; nombre: string }>('/solicitud', { nombre: f.nombre, cedula: f.cedula, telefono: tel, correo: f.correo, direccion: f.direccion, sector: sec, barrio: f.barrio, estrato: f.estrato, conMedidor: f.conMedidor, medidor: f.medidor, observacion: f.observacion, clave: f.clave, aceptaDatos: f.acepta })
      if (!r) return setError('No hay conexión con el servidor. Intenta más tarde o acércate a la oficina.')
      setListo(r)
    } catch (e) { setError(mensajeError(e)) } finally { setEnviando(false) }
  }

  if (listo) return (
    <div className="text-center py-4">
      <span className="mx-auto h-14 w-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center"><Ico d={D.check} className="w-7 h-7" /></span>
      <h2 className="text-lg font-bold text-dark mt-4">¡Solicitud enviada!</h2>
      <p className="text-sm text-gray-600 mt-2">Tu número de solicitud es <b className="font-mono text-dark">{listo.radicado}</b>.</p>
      <p className="text-sm text-gray-500 mt-2">La empresa revisará tus datos (puede visitar el predio para confirmar el estrato y el medidor). Cuando la aprueben podrás entrar con tu <b>cédula</b> y la <b>contraseña</b> que creaste.</p>
      <button onClick={onVolver} className="btn-primary w-full h-12 mt-6">Volver a ingresar</button>
    </div>
  )

  const txt = (k: 'nombre' | 'correo' | 'direccion', label: string, ph: string, extra = {}) => (
    <div><label className="field-label">{label}</label><input value={f[k]} onChange={(e) => set(k, e.target.value)} placeholder={ph} className="field h-11" {...extra} /></div>
  )
  return (
    <>
      <button onClick={onVolver} className="text-xs font-semibold text-gray-500 hover:text-dark mb-3">← Ya tengo cuenta</button>
      <TiposCuenta modo="nuevo" onCambiar={onTipo} />
      <h2 className="text-lg font-bold text-dark mb-1">Regístrate como usuario nuevo</h2>
      <p className="text-sm text-gray-500 mb-5">Llena tus datos y los del predio. La empresa los revisa y, al aprobarlos, queda creada tu cuenta.</p>
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-secondary">Tus datos</p>
        {txt('nombre', 'Nombre completo', 'Nombres y apellidos', { autoComplete: 'name' })}
        <div className="grid grid-cols-2 gap-3">
          <div><label className="field-label">Cédula</label><input value={f.cedula} onChange={(e) => set('cedula', e.target.value.replace(/\D/g, '').slice(0, 15))} placeholder="Solo números" className="field h-11 tabular-nums" inputMode="numeric" /></div>
          <div><label className="field-label">Celular</label><input value={f.telefono} onChange={(e) => set('telefono', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="3001234567" className="field h-11 tabular-nums" inputMode="tel" autoComplete="tel" /></div>
        </div>
        {txt('correo', 'Correo (opcional)', 'tucorreo@ejemplo.com', { type: 'email', autoComplete: 'email' })}

        <p className="text-[11px] font-bold uppercase tracking-wider text-secondary pt-2">El predio</p>
        {txt('direccion', 'Dirección', 'Ej: Calle 5 # 4-20', { autoComplete: 'street-address' })}
        <div className="grid grid-cols-2 gap-3">
          <div><label className="field-label">Sector</label><select value={sec} onChange={(e) => setF((x) => ({ ...x, sector: e.target.value, barrio: '' }))} className="field h-11">{sectores().map((z) => <option key={z}>{z}</option>)}</select></div>
          <div><label className="field-label">Barrio</label>{barrios.length ? <select value={f.barrio} onChange={(e) => set('barrio', e.target.value)} className="field h-11"><option value="">No sé / otro</option>{barrios.map((b) => <option key={b}>{b}</option>)}</select> : <input value={f.barrio} onChange={(e) => set('barrio', e.target.value)} placeholder="Opcional" className="field h-11" />}</div>
        </div>
        <div>
          <label className="field-label">Estrato</label>
          <div className="flex gap-2">{[1, 2, 3, 4, 5, 6].map((e) => <button key={e} type="button" onClick={() => set('estrato', e)} className={`flex-1 h-10 rounded-xl border-2 text-sm font-bold ${f.estrato === e ? 'border-secondary text-secondary bg-secondary/5' : 'border-gray-200 text-gray-500'}`}>{e}</button>)}</div>
          <p className="text-[11px] text-gray-400 mt-1">Lo encuentras en tu recibo de la luz.</p>
        </div>
        <div className="rounded-xl border border-gray-100 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-dark cursor-pointer"><input type="checkbox" checked={f.conMedidor} onChange={(e) => set('conMedidor', e.target.checked)} className="accent-secondary h-4 w-4" /> El predio tiene medidor de agua</label>
          {f.conMedidor && <input value={f.medidor} onChange={(e) => set('medidor', e.target.value)} placeholder="Número del medidor (si lo ves)" className="field h-11 mt-2" />}
        </div>
        <div><label className="field-label">Algo más que debamos saber (opcional)</label><textarea value={f.observacion} onChange={(e) => set('observacion', e.target.value)} rows={2} placeholder="Ej: es una casa nueva, el contador está en el andén…" className="field py-2.5 h-auto" /></div>

        <p className="text-[11px] font-bold uppercase tracking-wider text-secondary pt-2">Tu contraseña</p>
        {(['clave', 'clave2'] as const).map((k) => (
          <div key={k}><label className="field-label">{k === 'clave' ? 'Crea una contraseña' : 'Repite la contraseña'}</label>
            <div className="relative"><input type={ver ? 'text' : 'password'} value={f[k]} onChange={(e) => set(k, e.target.value)} autoComplete="new-password" placeholder="••••••••" className="field h-11 pr-20" /><button type="button" onClick={() => setVer((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-2.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-dark hover:bg-gray-100">{ver ? 'Ocultar' : 'Ver'}</button></div>
          </div>
        ))}
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">{reglas.map((r) => <li key={r.t} className={`flex items-center gap-1.5 ${r.ok ? 'text-green-700' : 'text-gray-400'}`}><Ico d={D.check} className="w-3.5 h-3.5" />{r.t}</li>)}</ul>

        <label className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer pt-1"><input type="checkbox" checked={f.acepta} onChange={(e) => set('acepta', e.target.checked)} className="accent-secondary h-4 w-4 mt-0.5 shrink-0" /> Autorizo a EMCAGUA APC a tratar mis datos personales para prestar el servicio y contactarme (Ley 1581 de 2012).</label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button onClick={() => void enviar()} disabled={enviando} className="btn-primary w-full h-12">{enviando ? 'Enviando…' : 'Enviar solicitud'}</button>
      </div>
    </>
  )
}

function PagoEnLinea({ facturas, casas, onClose, onPagado }: { facturas: Factura[]; casas: Usuario[]; onClose: () => void; onPagado: (ref: string) => void }) {
  const varias = new Set(facturas.map((f) => f.clienteId)).size > 1
  const dir = (id: string) => casas.find((c) => c.id === id)?.direccion ?? id
  const total = facturas.reduce((s, f) => s + f.monto, 0)
  const [medio, setMedio] = useState<'PSE' | 'Nequi' | 'Daviplata'>('PSE')
  const [banco, setBanco] = useState('Bancolombia')
  const [paso, setPaso] = useState<'elegir' | 'procesando'>('elegir')
  const pagar = () => { setPaso('procesando'); setTimeout(() => onPagado(`${medio.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-8)}`), 1400) }
  return (
    <Modal open onClose={onClose} size="sm" title="Pagar en línea" subtitle={`${facturas.length} factura(s) · ${cop(total)}`}>
      {paso === 'procesando' ? (
        <div className="p-10 text-center"><div className="mx-auto h-10 w-10 rounded-full border-4 border-secondary/20 border-t-secondary animate-spin" /><p className="mt-4 text-sm text-gray-600">Procesando el pago…</p></div>
      ) : (
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-2">{(['PSE', 'Nequi', 'Daviplata'] as const).map((m) => <button key={m} onClick={() => setMedio(m)} className={`h-12 rounded-xl border-2 font-bold text-sm ${medio === m ? 'border-secondary text-secondary bg-secondary/5' : 'border-gray-200 text-gray-600'}`}>{m}</button>)}</div>
          {medio === 'PSE' && <div><label className="field-label">Banco</label><select value={banco} onChange={(e) => setBanco(e.target.value)} className="field">{['Bancolombia', 'Banco de Bogotá', 'Davivienda', 'BBVA', 'Banco Agrario', 'Banco Caja Social'].map((b) => <option key={b}>{b}</option>)}</select></div>}
          <ul className="text-sm rounded-xl bg-gray-soft divide-y divide-gray-200">{facturas.map((f) => <li key={f.id} className="flex justify-between gap-3 px-3 py-2"><span className="min-w-0 truncate">{varias ? `${dir(f.clienteId)} · ` : ''}{f.periodo}</span><b className="tabular-nums">{cop(f.monto)}</b></li>)}</ul>
          <button onClick={pagar} className="btn-primary w-full h-12">Pagar {cop(total)}</button>
          <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2">Modo demostración: no se cobra dinero real. En producción este paso redirige a la pasarela de pagos contratada por la empresa.</p>
        </div>
      )}
    </Modal>
  )
}

function NuevaPqr({ u, onClose, onRadicar }: { u: Usuario; onClose: () => void; onRadicar: (p: DatosPqr) => void }) {
  const [tipo, setTipo] = useState<TipoPqr>('Reclamo')
  const [texto, setTexto] = useState('')
  return (
    <Modal open onClose={onClose} title="Radicar PQR" subtitle="Cuéntanos qué pasa. Te respondemos en máximo 15 días hábiles."
      footer={<div className="flex justify-end gap-2"><button onClick={onClose} className="btn-secondary">Cancelar</button><button disabled={texto.trim().length < 10} onClick={() => onRadicar({ tipo, categoria: sugerirCategoria(texto), canal: 'Portal web', suscriptorId: u.id, nombre: u.nombre, telefono: u.telefono, barrio: u.barrio, descripcion: texto.trim() })} className="btn-primary">Radicar</button></div>}>
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap gap-2">{(['Petición', 'Queja', 'Reclamo', 'Sugerencia'] as TipoPqr[]).map((t) => <button key={t} onClick={() => setTipo(t)} className={tipo === t ? 'chip-on' : 'chip'}>{t}</button>)}</div>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={5} placeholder="Ej: la factura de este mes llegó muy alta y en la casa no ha cambiado nada" className="field py-2.5 h-auto" />
        <p className="text-xs text-gray-400">Mínimo 10 caracteres.</p>
      </div>
    </Modal>
  )
}

/** Pie con los datos de contacto de Configuración. */
function Pie() {
  const c = useConfig()
  const wa = c.whatsapp.replace(/\D/g, '')
  return (
    <footer className="max-w-5xl mx-auto px-4 py-8 text-center text-xs text-gray-500 space-y-1.5">
      {wa && <a href={`https://wa.me/57${wa}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#25D366] text-white text-sm font-semibold mb-2">Escríbenos por WhatsApp</a>}
      <p className="font-semibold text-gray-600">{c.nombre} · {c.ciudad}</p>
      {(c.direccion || c.telefono) && <p>{[c.direccion, c.telefono && `Tel. ${c.telefono}`].filter(Boolean).join(' · ')}</p>}
      {c.horario && <p>Atención: {c.horario}</p>}
    </footer>
  )
}

import { useState, useMemo, useEffect } from 'react'
import { formatCutoff, getNextCutoff } from '../utils/cutoff'
import WhatsAppIcon from '../components/WhatsAppIcon'

type Factura = { id: string; mes: number; anio: number; consumo: number; monto: number; fechaPago: string }
type HistorialMes = { mes: number; anio: number; consumo: number; pagosDebe: number }
type Usuario = {
  id: string
  nombre: string
  barrio: string
  estrato: number
  medidor: string
  telefono: string
  consumo: number
  pagosDebe: number
  debe: boolean
  deuda: number
  estado: 'Activo' | 'Cortado'
  mes: number
  anio: number
  historial: HistorialMes[]
  facturas: Factura[]
}

const UMBRAL_ALTO = 30
const tarifaPorEstrato: Record<number, number> = { 1: 1800, 2: 2600, 3: 3400 }
const barrios = ['Todos', 'Centro', 'Guamalito', 'El Carmen', 'La Esperanza']
const estratos = ['Todos', '1', '2', '3']
const mesesCompletos = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const hoy = new Date()
const meses = ['Todos', ...mesesCompletos.slice(0, hoy.getMonth() + 1)]
const anios = ['Todos', ...Array.from({ length: hoy.getFullYear() - 2023 }, (_, i) => String(2024 + i)).filter((a) => Number(a) <= hoy.getFullYear())]

function genHistorial(base: number, pagosActuales: number, mesDeuda?: number, anioDeuda?: number): HistorialMes[] {
  const arr: HistorialMes[] = []
  for (let i = 17; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    const m = d.getMonth() + 1
    const a = d.getFullYear()
    const esDeuda = mesDeuda !== undefined && anioDeuda !== undefined && pagosActuales > 0 && (a > anioDeuda || (a === anioDeuda && m >= mesDeuda))
    const esMesDeuda = mesDeuda !== undefined && anioDeuda !== undefined && m === mesDeuda && a === anioDeuda && pagosActuales > 0
    const vari = Math.floor((Math.random() * 8 - 4))
    const consumoBase = esDeuda && !esMesDeuda ? 0 : Math.max(6, base + vari)
    const pagos = esMesDeuda ? 1 : 0
    arr.push({ mes: m, anio: a, consumo: consumoBase, pagosDebe: pagos })
  }
  return arr
}

function genFacturas(historial: HistorialMes[], estrato: number): Factura[] {
  return historial
    .filter((h) => h.pagosDebe === 0)
    .slice(-8)
    .map((h) => ({
      id: `FAC-${h.anio}-${String(h.mes).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`,
      mes: h.mes,
      anio: h.anio,
      consumo: h.consumo,
      monto: h.consumo * tarifaPorEstrato[estrato],
      fechaPago: `${String(Math.floor(5 + Math.random() * 10)).padStart(2, '0')}/${String(h.mes).padStart(2, '0')}/${h.anio}`,
    }))
    .reverse()
}

const baseUsuarios = [
  { id: '10234', nombre: 'Juan Pérez', barrio: 'Centro', estrato: 2, medidor: 'MED-10234', telefono: '310 456 7890', consumo: 18, pagosDebe: 0, debe: false, deuda: 0, estado: 'Activo' as const, mes: 8, anio: 2026, base: 18 },
  { id: '10235', nombre: 'María López', barrio: 'Guamalito', estrato: 1, medidor: 'MED-10235', telefono: '312 234 5678', consumo: 32, pagosDebe: 1, debe: true, deuda: 57600, estado: 'Cortado' as const, mes: 8, anio: 2026, base: 32 },
  { id: '10236', nombre: 'Carlos Ruiz', barrio: 'El Carmen', estrato: 3, medidor: 'MED-10236', telefono: '315 678 9012', consumo: 12, pagosDebe: 0, debe: false, deuda: 0, estado: 'Activo' as const, mes: 7, anio: 2026, base: 12 },
  { id: '10237', nombre: 'Ana Torres', barrio: 'Centro', estrato: 2, medidor: 'MED-10237', telefono: '320 111 2233', consumo: 45, pagosDebe: 1, debe: true, deuda: 117000, estado: 'Cortado' as const, mes: 8, anio: 2026, base: 45 },
  { id: '10238', nombre: 'Jorge Gómez', barrio: 'La Esperanza', estrato: 1, medidor: 'MED-10238', telefono: '318 444 5566', consumo: 8, pagosDebe: 0, debe: false, deuda: 0, estado: 'Activo' as const, mes: 8, anio: 2026, base: 8 },
  { id: '10239', nombre: 'Lucía Martínez', barrio: 'Guamalito', estrato: 2, medidor: 'MED-10239', telefono: '311 777 8899', consumo: 28, pagosDebe: 1, debe: true, deuda: 72800, estado: 'Cortado' as const, mes: 7, anio: 2026, base: 28 },
  { id: '10240', nombre: 'Pedro Díaz', barrio: 'Centro', estrato: 3, medidor: 'MED-10240', telefono: '316 999 0011', consumo: 15, pagosDebe: 0, debe: false, deuda: 0, estado: 'Activo' as const, mes: 8, anio: 2026, base: 15 },
  { id: '10241', nombre: 'Sofía Ramírez', barrio: 'La Esperanza', estrato: 2, medidor: 'MED-10241', telefono: '313 222 3344', consumo: 38, pagosDebe: 1, debe: true, deuda: 98800, estado: 'Cortado' as const, mes: 8, anio: 2026, base: 38 },
  { id: '10242', nombre: 'Andrés Castro', barrio: 'El Carmen', estrato: 1, medidor: 'MED-10242', telefono: '319 555 6677', consumo: 22, pagosDebe: 0, debe: false, deuda: 0, estado: 'Activo' as const, mes: 6, anio: 2026, base: 22 },
  { id: '10243', nombre: 'Diana Herrera', barrio: 'Centro', estrato: 3, medidor: 'MED-10243', telefono: '317 888 9900', consumo: 14, pagosDebe: 0, debe: false, deuda: 0, estado: 'Activo' as const, mes: 8, anio: 2025, base: 14 },
  { id: '10244', nombre: 'Fernando Ortiz', barrio: 'Guamalito', estrato: 2, medidor: 'MED-10244', telefono: '314 333 4455', consumo: 41, pagosDebe: 1, debe: true, deuda: 106600, estado: 'Cortado' as const, mes: 8, anio: 2026, base: 41 },
  { id: '10245', nombre: 'Valentina Ríos', barrio: 'La Esperanza', estrato: 1, medidor: 'MED-10245', telefono: '322 666 7788', consumo: 9, pagosDebe: 1, debe: true, deuda: 16200, estado: 'Cortado' as const, mes: 8, anio: 2026, base: 9 },
  { id: '10246', nombre: 'Ejemplo Deuda Marzo', barrio: 'Centro', estrato: 2, medidor: 'MED-10246', telefono: '300 123 4567', consumo: 22, pagosDebe: 1, debe: true, deuda: 57200, estado: 'Cortado' as const, mes: 3, anio: 2026, base: 22 },
  { id: '10247', nombre: 'Usuario WhatsApp', barrio: 'Centro', estrato: 2, medidor: 'MED-10247', telefono: '312 324 4168', consumo: 19, pagosDebe: 0, debe: false, deuda: 0, estado: 'Activo' as const, mes: 8, anio: 2026, base: 19 },
  { id: '10248', nombre: 'Mariana Muñoz', barrio: 'Centro', estrato: 2, medidor: 'MED-10248', telefono: '313 468 5430', consumo: 21, pagosDebe: 0, debe: false, deuda: 0, estado: 'Activo' as const, mes: 8, anio: 2026, base: 21 },
  { id: '10249', nombre: 'Alto Consumo Al Día', barrio: 'La Esperanza', estrato: 2, medidor: 'MED-10249', telefono: '315 999 8877', consumo: 52, pagosDebe: 0, debe: false, deuda: 0, estado: 'Activo' as const, mes: 8, anio: 2026, base: 52 },
]

const usuariosInicial: Usuario[] = baseUsuarios.map((u) => {
  const hist = genHistorial(u.base, u.pagosDebe, u.pagosDebe > 0 ? u.mes : undefined, u.pagosDebe > 0 ? u.anio : undefined)
  return { ...u, historial: hist, facturas: genFacturas(hist, u.estrato) }
})

export default function Users() {
  const [usuarios, setUsuarios] = useState<Usuario[]>(usuariosInicial)
  const [search, setSearch] = useState('')
  const [barrio, setBarrio] = useState('Todos')
  const [estrato, setEstrato] = useState('Todos')
  const [ordenConsumo, setOrdenConsumo] = useState<'ninguno' | 'mayor' | 'menor'>('ninguno')
  const [filtroPagos, setFiltroPagos] = useState<'todos' | '0' | '1'>('todos')
  const [mes, setMes] = useState('Todos')
  const [anio, setAnio] = useState('Todos')
  const [soloAlto, setSoloAlto] = useState(false)
  const [perfil, setPerfil] = useState<Usuario | null>(null)
  const [pagina, setPagina] = useState(1)
  const porPagina = 6
  const [showCrear, setShowCrear] = useState(false)
  const [editing, setEditing] = useState<Usuario | null>(null)
  const [form, setForm] = useState({ id: '', nombre: '', barrio: 'Centro', estrato: '1', medidor: '', telefono: '', consumo: '0' })
  const [telError, setTelError] = useState('')

  const validarTelefono = (tel: string) => {
    const limpio = tel.replace(/\D/g, '')
    if (!limpio) return ''
    if (limpio.length !== 10) return 'Debe tener 10 dígitos'
    if (!limpio.startsWith('3')) return 'Debe iniciar con 3'
    if (!/^3\d{9}$/.test(limpio)) return 'Número no válido'
    return ''
  }

  const handleEditar = (u: Usuario) => {
    setEditing(u)
    setForm({ id: u.id, nombre: u.nombre, barrio: u.barrio, estrato: String(u.estrato), medidor: u.medidor, telefono: u.telefono, consumo: String(u.consumo) })
    setTelError('')
    setShowCrear(true)
  }

  const handleCrear = (e: React.FormEvent) => {
    e.preventDefault()
    const err = validarTelefono(form.telefono)
    if (form.telefono && err) { setTelError(err); return }
    const consumoNum = Number(form.consumo) || 0
    const estratoNum = Number(form.estrato) as 1 | 2 | 3
    const idFinal = form.id || String(10246 + usuarios.length)
    const medidorNum = form.medidor.replace(/\D/g, '') || idFinal
    const medidorFinal = `MED-${medidorNum}`
    if (editing) {
      setUsuarios((prev) => prev.map((x) => (x.id === editing.id ? { ...x, id: idFinal, nombre: form.nombre, barrio: form.barrio, estrato: estratoNum, medidor: medidorFinal, telefono: form.telefono || x.telefono, consumo: consumoNum } : x)))
      setPerfil((p) => (p && p.id === editing.id ? { ...p, id: idFinal, nombre: form.nombre, barrio: form.barrio, estrato: estratoNum, medidor: medidorFinal, telefono: form.telefono || p.telefono, consumo: consumoNum } : p))
      setEditing(null)
      setShowCrear(false)
      setForm({ id: '', nombre: '', barrio: 'Centro', estrato: '1', medidor: '', telefono: '', consumo: '0' })
      return
    }
    const nuevo: Usuario = {
      id: idFinal,
      nombre: form.nombre,
      barrio: form.barrio,
      estrato: estratoNum,
      medidor: medidorFinal,
      telefono: form.telefono || '300 000 0000',
      consumo: consumoNum,
      pagosDebe: 0,
      debe: false,
      deuda: 0,
      estado: 'Activo',
      mes: hoy.getMonth() + 1,
      anio: hoy.getFullYear(),
      historial: genHistorial(consumoNum, 0),
      facturas: [],
    }
    const hist = genHistorial(consumoNum, 0)
    nuevo.historial = hist
    nuevo.facturas = genFacturas(hist, estratoNum)
    setUsuarios([nuevo, ...usuarios])
    setShowCrear(false)
    setForm({ id: '', nombre: '', barrio: 'Centro', estrato: '1', medidor: '', telefono: '', consumo: '15' })
  }

  const filtered = useMemo(() => {
    let result = usuarios.filter((u) => {
      const matchSearch = u.nombre.toLowerCase().includes(search.toLowerCase()) || u.id.includes(search)
      const matchBarrio = barrio === 'Todos' || u.barrio === barrio
      const matchEstrato = estrato === 'Todos' || String(u.estrato) === estrato
      const matchPagos = filtroPagos === 'todos' || (filtroPagos === '0' && u.pagosDebe === 0) || (filtroPagos === '1' && u.pagosDebe >= 1)
      const matchAlto = !soloAlto || u.consumo > UMBRAL_ALTO
      return matchSearch && matchBarrio && matchEstrato && matchPagos && matchAlto
    })
    if (ordenConsumo === 'mayor') result = [...result].sort((a, b) => b.consumo - a.consumo)
    if (ordenConsumo === 'menor') result = [...result].sort((a, b) => a.consumo - b.consumo)
    return result
  }, [search, barrio, estrato, ordenConsumo, filtroPagos, soloAlto])

  const alertas = useMemo(() => usuarios.filter((u) => u.consumo > UMBRAL_ALTO), [])
  const nextCutoff = getNextCutoff()
  const totalPaginas = Math.max(1, Math.ceil(filtered.length / porPagina))
  const usuariosPagina = useMemo(() => filtered.slice((pagina - 1) * porPagina, pagina * porPagina), [filtered, pagina])
  useEffect(() => { setPagina(1) }, [search, barrio, estrato, ordenConsumo, filtroPagos, mes, anio, soloAlto])

  const isVencido = (u: Usuario) => {
    const hoyD = new Date()
    const corte = getNextCutoff(new Date(hoyD.getFullYear(), hoyD.getMonth(), 1))
    const pasoCorte = hoyD > corte
    return pasoCorte && u.pagosDebe > 0
  }
  const vencidos = useMemo(() => usuarios.filter(isVencido), [usuarios])
  const handleCortar = (id: string) => {
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, estado: 'Cortado' as const } : u)))
    setPerfil((p) => (p && p.id === id ? { ...p, estado: 'Cortado' as const } : p))
  }
  const handleReactivar = (id: string) => {
    if (!confirm('Reactivar cuesta $30.000. ¿Confirmar? Se reinicia el conteo desde hoy.')) return
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, estado: 'Activo' as const, pagosDebe: 0, debe: false, deuda: 0 } : u)))
    setPerfil((p) => (p && p.id === id ? { ...p, estado: 'Activo' as const, pagosDebe: 0, debe: false, deuda: 0 } : p))
  }
  const clearFilters = () => { setSearch(''); setBarrio('Todos'); setEstrato('Todos'); setOrdenConsumo('ninguno'); setFiltroPagos('todos'); setMes('Todos'); setAnio('Todos'); setSoloAlto(false); setPagina(1) }

  const getConsumoForPeriodo = (u: Usuario) => {
    if (mes === 'Todos' && anio === 'Todos') return u.consumo
    const mesIdx = mesesCompletos.indexOf(mes) + 1
    const m = mes === 'Todos' ? u.mes : mesIdx
    const a = anio === 'Todos' ? u.anio : Number(anio)
    const h = u.historial.find((x) => x.mes === m && x.anio === a)
    return h ? h.consumo : 0
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-dark">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} de {usuarios.length} usuarios — El Carmen, Norte de Santander</p>
        </div>
        <button onClick={() => setShowCrear(true)} className="bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-dark transition-colors whitespace-nowrap">+ Nuevo usuario</button>
      </div>

      {alertas.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-3">
          <div className="h-1 bg-gradient-to-r from-red-400 to-red-500" />
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-dark">Consumo elevado · {alertas.length} usuarios superan {UMBRAL_ALTO} m³</h3>
                <p className="text-xs text-gray-500 mt-1">Posible fuga o desperdicio — Revisar historial y contactar</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {alertas.map((u) => (
                    <span key={u.id} className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full pl-1 pr-3 py-1 text-xs">
                      <span className="h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold">{u.consumo}</span>
                      <span className="font-medium text-dark">{u.nombre}</span>
                      <span className="text-gray-400">· {u.barrio}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {vencidos.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-4">
          <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
          <div className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="h-8 w-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-dark">Vencidos para corte · {vencidos.length} usuarios</h3>
                  <p className="text-xs text-gray-500 mt-1">Pasaron el primer viernes sin pagar · Acción manual requerida</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {vencidos.slice(0, 6).map((u) => (
                      <span key={u.id} className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-full pl-1 pr-3 py-1 text-xs">
                        <span className="h-5 w-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">!</span>
                        <span className="font-medium text-dark">{u.nombre}</span>
                        <span className="text-gray-500">· 1 pago</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!confirm(`¿Enviar WhatsApp personalizado a los ${vencidos.length} vencidos? Se abrirán ${vencidos.length} chats (uno por usuario).`)) return
                  vencidos.forEach((u, i) => {
                    setTimeout(() => {
                      const venc = `05/${String(u.mes).padStart(2, '0')}/${u.anio}`
                      const alto = u.consumo > UMBRAL_ALTO
                      const extraAlto = alto ? `%0A⚠️ Hemos notado que has gastado agua más de lo normal (${u.consumo} m³, tope ${UMBRAL_ALTO} m³), ¿hay un problema que quieras contarnos?` : ''
                      const msg = `Hola ${u.nombre}, te escribe EMCAGUA APC%0AReactiva nuestro servicio de EMCAGUA 💧%0ATu servicio ${u.medidor} está Cortado por 1 pago pendiente de $${u.deuda.toLocaleString('es-CO')} (vencido ${venc}).%0AReactivar cuesta $30.000.${extraAlto}%0AEl Carmen, Norte de Santander.`
                      const tel = u.telefono.replace(/\D/g, '')
                      const full = tel.startsWith('57') ? tel : `57${tel}`
                      window.open(`https://wa.me/${full}?text=${msg}`, '_blank')
                    }, i * 800)
                  })
                }}
                className="hidden sm:inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1FAF57] text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm shrink-0"
              >
                <WhatsAppIcon className="w-4 h-4" />
                Enviar a todos
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-3">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Buscar por nombre o ID</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ej: Juan Pérez o 10234" className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Barrio</label>
            <select value={barrio} onChange={(e) => setBarrio(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
              {barrios.map((b) => (<option key={b} value={b}>{b}</option>))}
            </select>
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Estrato</label>
            <select value={estrato} onChange={(e) => setEstrato(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
              {estratos.map((e) => (<option key={e} value={e}>{e === 'Todos' ? 'Todos' : `E${e}`}</option>))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Mes</label>
            <select value={mes} onChange={(e) => setMes(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
              {meses.map((m) => (<option key={m} value={m}>{m}</option>))}
            </select>
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Año</label>
            <select value={anio} onChange={(e) => setAnio(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
              {anios.map((a) => (<option key={a} value={a}>{a}</option>))}
            </select>
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Orden</label>
            <select value={ordenConsumo} onChange={(e) => setOrdenConsumo(e.target.value as never)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
              <option value="ninguno">—</option>
              <option value="mayor">Mayor</option>
              <option value="menor">Menor</option>
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Pagos debe</label>
            <select value={filtroPagos} onChange={(e) => setFiltroPagos(e.target.value as never)} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
              <option value="todos">Todos</option>
              <option value="0">Al día (0)</option>
              <option value="1">Con deuda — Cortado</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button onClick={clearFilters} className="text-xs font-medium text-gray-500 hover:text-dark border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">Limpiar filtros</button>
          <label className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 cursor-pointer">
            <input type="checkbox" checked={soloAlto} onChange={(e) => setSoloAlto(e.target.checked)} className="w-3.5 h-3.5 rounded border-red-300 text-red-600 focus:ring-red-500" />
            Solo alto consumo (&gt;{UMBRAL_ALTO} m³)
          </label>
          <span className="text-xs text-gray-400">{filtered.length} resultados</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <div className="bg-primary/5 border border-primary/10 rounded-lg px-4 py-2 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold text-dark">Equivalencias:</span>
          <span className="text-gray-600">1 m³ = 1.000 L</span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-600">E1 $1.800</span>
          <span className="text-gray-600">E2 $2.600</span>
          <span className="text-gray-600">E3 $3.400/m³</span>
        </div>
        <div className="bg-secondary/10 border border-secondary/20 rounded-lg px-4 py-2 flex items-center gap-2 text-xs">
          <span className="w-2 h-2 bg-secondary rounded-full" />
          <span className="font-semibold text-secondary">Corte: primer viernes</span>
          <span className="text-gray-500">· {formatCutoff(nextCutoff)}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-soft">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">ID</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Nombre</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Barrio</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Estrato</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Consumo<span className="block text-[10px] font-normal normal-case tracking-normal text-gray-400">m³ · Litros · $</span></th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Pagos / Deuda<span className="block text-[10px] font-normal normal-case tracking-normal text-gray-400">Debe = Cortado</span></th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Estado</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usuariosPagina.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-400">No se encontraron usuarios con los filtros aplicados.</td></tr>
              ) : (
                usuariosPagina.map((u) => {
                  const alto = u.consumo > UMBRAL_ALTO
                  const consumoPeriodo = getConsumoForPeriodo(u)
                  const isHistorial = mes !== 'Todos' || anio !== 'Todos'
                  return (
                      <tr key={u.id} onClick={() => setPerfil(u)} className={`hover:bg-gray-50/70 cursor-pointer ${alto ? 'bg-red-50/30' : ''}`}>

                        <td className="px-5 py-3.5 text-sm font-mono font-medium text-dark">{u.id}</td>
                        <td className="px-5 py-3.5 text-sm font-medium text-dark">{u.nombre}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">{u.barrio}</td>
                        <td className="px-5 py-3.5"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-dark">{u.estrato}</span></td>
                        <td className="px-5 py-3.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-semibold ${alto ? 'text-red-600' : 'text-dark'}`}>{isHistorial ? consumoPeriodo : u.consumo} m³</span>
                              <span className="text-xs text-gray-400">{((isHistorial ? consumoPeriodo : u.consumo) * 1000).toLocaleString('es-CO')} L</span>
                              {alto && !isHistorial && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">ALTO</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-medium text-secondary">${((isHistorial ? consumoPeriodo : u.consumo) * tarifaPorEstrato[u.estrato]).toLocaleString('es-CO')}</span>
                              <span className="text-[10px] text-gray-400">(${tarifaPorEstrato[u.estrato].toLocaleString('es-CO')}/m³)</span>
                            </div>
                            <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1.5">
                              <div className={`h-full rounded-full ${alto ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${Math.min(100, ((isHistorial ? consumoPeriodo : u.consumo) / 50) * 100)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {u.pagosDebe === 0 ? (
                            <span className="text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">Al día · 0 pagos</span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex w-fit text-xs font-bold px-2.5 py-1 rounded-full border ${u.pagosDebe === 1 ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{u.pagosDebe} {u.pagosDebe === 1 ? 'pago' : 'pagos'} · ${u.deuda.toLocaleString('es-CO')}</span>
                              <span className="text-[11px] text-gray-400">{u.pagosDebe === 1 ? '→ Cortado' : '→ Cortado'}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${u.estado === 'Activo' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{u.estado}</span>
                          {isVencido(u) && u.estado === 'Activo' && <span className="ml-1 bg-orange-100 text-orange-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-orange-200">VENCIDO</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            {u.estado === 'Activo' ? (
                              <button onClick={(e) => { e.stopPropagation(); if (confirm(`¿Cortar agua a ${u.nombre}?`)) handleCortar(u.id) }} className="h-8 px-3 rounded-xl bg-white border border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 text-xs font-semibold shadow-sm transition-colors">Cortar</button>
                            ) : (
                              <button onClick={(e) => { e.stopPropagation(); handleReactivar(u.id) }} className="h-8 px-3 rounded-xl bg-[#0F4F4F] hover:bg-[#0A3A3A] text-white text-xs font-semibold shadow-sm transition-colors">Reactivar $30k</button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const venc = `05/${String(u.mes).padStart(2, '0')}/${u.anio}`
                                const alto = u.consumo > UMBRAL_ALTO
                                const extraAlto = alto ? `%0A⚠️ Hemos notado que has gastado agua más de lo normal (${u.consumo} m³, tope ${UMBRAL_ALTO} m³), ¿hay un problema que quieras contarnos?` : ''
                                const msg = `Hola ${u.nombre}, te escribe EMCAGUA APC%0A${u.estado === 'Cortado' ? `Reactiva nuestro servicio de EMCAGUA 💧%0ATu servicio ${u.medidor} está Cortado por 1 pago pendiente de $${u.deuda.toLocaleString('es-CO')} (vencido ${venc}).%0AReactivar cuesta $30.000.${extraAlto}` : `¡Vas bien de pagos! ✅%0ATu día de pago es el primer viernes (próximo: ${venc}).%0ATu consumo: ${u.consumo} m³ · $${(u.consumo * tarifaPorEstrato[u.estrato]).toLocaleString('es-CO')}. ¡Sigue así!${extraAlto}`}%0AEl Carmen, Norte de Santander`
                                const tel = u.telefono.replace(/\D/g, '')
                                const full = tel.startsWith('57') ? tel : `57${tel}`
                                window.open(`https://wa.me/${full}?text=${msg}`, '_blank')
                              }}
                              title="Enviar WhatsApp"
                              className="h-8 w-8 rounded-full bg-[#25D366] hover:bg-[#1FAF57] text-white flex items-center justify-center shadow-sm transition-colors"
                            >
                              <WhatsAppIcon className="w-4 h-4" />
                            </button>
                            <div className="h-6 w-px bg-gray-100 mx-0.5" />
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditar(u) }}
                              title="Editar usuario"
                              className="h-8 w-8 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-500 hover:text-dark flex items-center justify-center shadow-sm transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-gray-100 bg-white">
          <span className="text-xs text-gray-500">
            Mostrando {(pagina - 1) * porPagina + 1}-{Math.min(pagina * porPagina, filtered.length)} de {filtered.length} usuarios
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="h-8 px-3 rounded-lg border border-gray-200 text-xs font-medium text-dark hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPagina(n)}
                className={`h-8 w-8 rounded-lg text-xs font-bold border ${pagina === n ? 'bg-secondary text-white border-secondary' : 'bg-white text-dark border-gray-200 hover:bg-gray-50'}`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              className="h-8 px-3 rounded-lg border border-gray-200 text-xs font-medium text-dark hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {showCrear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowCrear(false); setEditing(null); setTelError('') }} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-base font-bold text-dark">{editing ? 'Editar usuario' : 'Nuevo usuario'}</h2>
              <button onClick={() => { setShowCrear(false); setEditing(null); setTelError('') }} className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400">✕</button>
            </div>
            <form onSubmit={handleCrear} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">ID *</label>
                  <input required value={form.id} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, id: v, medidor: f.medidor ? f.medidor : v ? `MED-${v}` : '' })) }} placeholder="Ej: 10246" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  <p className="text-[11px] text-gray-400 mt-1">Número que va después de MED-</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Estrato *</label>
                  <select value={form.estrato} onChange={(e) => setForm({ ...form, estrato: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    <option value="1">Estrato 1 — $1.800/m³</option>
                    <option value="2">Estrato 2 — $2.600/m³</option>
                    <option value="3">Estrato 3 — $3.400/m³</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nombre completo *</label>
                <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Juan Pérez" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Barrio *</label>
                  <select value={form.barrio} onChange={(e) => setForm({ ...form, barrio: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    {barrios.filter((b) => b !== 'Todos').map((b) => (<option key={b} value={b}>{b}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Teléfono *</label>
                  <input
                    required
                    value={form.telefono}
                    onChange={(e) => { const v = e.target.value; setForm({ ...form, telefono: v }); if (telError) setTelError(validarTelefono(v)) }}
                    onBlur={() => setTelError(validarTelefono(form.telefono))}
                    placeholder="Ej: 310 456 7890"
                    className={`w-full px-3 py-2.5 rounded-lg border bg-white text-sm text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-primary ${telError ? 'border-red-300 focus:ring-red-500/20 focus:border-red-400' : 'border-gray-200 focus:ring-primary/20'}`}
                  />
                  {telError ? <p className="text-[11px] text-red-500 mt-1">{telError}</p> : <p className="text-[11px] text-gray-400 mt-1">10 dígitos, inicia con 3 · Ej: 3101234567</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Medidor</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 text-sm font-mono font-bold text-gray-500">MED-</span>
                    <input value={form.medidor.replace(/^MED-/, '')} onChange={(e) => setForm({ ...form, medidor: e.target.value.replace(/\D/g, '') ? `MED-${e.target.value.replace(/\D/g, '')}` : '' })} placeholder="10246" className="flex-1 min-w-0 px-3 py-2.5 rounded-r-lg rounded-l-none border border-gray-200 bg-white text-sm text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Se llena solo con el ID · Solo números</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Consumo inicial</label>
                  <input type="number" min="0" value={form.consumo} onChange={(e) => setForm({ ...form, consumo: e.target.value })} placeholder="0" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  <p className="text-[11px] text-gray-400 mt-1">Opcional · Deja 0 si el medidor es nuevo. Si ya tiene lectura, escribe los m³ actuales.</p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowCrear(false); setEditing(null); setTelError('') }} className="flex-1 h-10 rounded-lg border border-gray-200 text-sm font-medium text-dark hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="flex-1 h-10 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark">{editing ? 'Guardar cambios' : 'Crear usuario'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {perfil && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPerfil(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                  {perfil.nombre.charAt(0)}
                </div>
                <div>
                  <h2 className="text-base font-bold text-dark">{perfil.nombre}</h2>
                  <p className="text-xs text-gray-500">ID {perfil.id} · {perfil.barrio} · Estrato {perfil.estrato}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const venc = `05/${String(perfil.mes).padStart(2, '0')}/${perfil.anio}`
                    const alto = perfil.consumo > UMBRAL_ALTO
                    const extraAlto = alto ? `%0A⚠️ Hemos notado que has gastado agua más de lo normal (${perfil.consumo} m³, tope ${UMBRAL_ALTO} m³), ¿hay un problema que quieras contarnos?` : ''
                    const msg = `Hola ${perfil.nombre}, te escribe EMCAGUA APC%0A${perfil.estado === 'Cortado' ? `Reactiva nuestro servicio de EMCAGUA 💧%0ATu servicio ${perfil.medidor} está Cortado por 1 pago pendiente de $${perfil.deuda.toLocaleString('es-CO')} (vencido ${venc}).%0AReactivar cuesta $30.000.${extraAlto}` : `¡Vas bien de pagos! ✅%0ATu día de pago es el primer viernes (próximo: ${venc}).%0ATu consumo: ${perfil.consumo} m³ · $${(perfil.consumo * tarifaPorEstrato[perfil.estrato]).toLocaleString('es-CO')}. ¡Sigue así!${extraAlto}`}%0AEl Carmen, Norte de Santander`
                    const tel = perfil.telefono.replace(/\D/g, '')
                    const full = tel.startsWith('57') ? tel : `57${tel}`
                    window.open(`https://wa.me/${full}?text=${msg}`, '_blank')
                  }}
                  className="h-8 px-3 rounded-lg bg-[#25D366] hover:bg-[#1FAF57] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  WhatsApp
                </button>
                <button onClick={() => { handleEditar(perfil); setPerfil(null) }} className="h-8 w-8 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 flex items-center justify-center" title="Editar">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button onClick={() => setPerfil(null)} className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-dark">✕</button>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">ID Usuario</p>
                  <p className="text-sm font-mono font-bold text-dark mt-1">{perfil.id}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Medidor</p>
                  <p className="text-sm font-mono font-bold text-dark mt-1">{perfil.medidor}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Barrio</p>
                  <p className="text-sm font-bold text-dark mt-1">{perfil.barrio}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Teléfono</p>
                  <p className="text-sm font-bold text-dark mt-1">{perfil.telefono}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Estrato</p>
                  <p className="text-sm font-bold text-dark mt-1">Estrato {perfil.estrato} · ${tarifaPorEstrato[perfil.estrato].toLocaleString('es-CO')}/m³</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</p>
                  <p className="mt-1"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${perfil.estado === 'Activo' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{perfil.estado} · {perfil.pagosDebe} {perfil.pagosDebe === 1 ? 'pago' : 'pagos'}</span></p>
                </div>
              </div>

              <h3 className="text-sm font-bold text-dark mb-3">Consumo últimos 6 meses</h3>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-end gap-2 h-32">
                  {perfil.historial.slice(-6).map((h) => {
                    const max = Math.max(...perfil.historial.slice(-6).map((x) => x.consumo))
                    const alto = h.consumo > UMBRAL_ALTO
                    return (
                      <div key={`${h.anio}-${h.mes}`} className="flex-1 flex flex-col items-center gap-2">
                        <span className={`text-xs font-bold ${alto ? 'text-red-600' : 'text-dark'}`}>{h.consumo} m³</span>
                        <div className={`w-full rounded-t-lg ${alto ? 'bg-red-400' : h.pagosDebe > 0 ? 'bg-orange-400' : 'bg-primary'}`} style={{ height: `${Math.max(12, (h.consumo / max) * 80)}px` }} />
                        <span className="text-[11px] font-medium text-gray-500">{mesesCompletos[h.mes - 1].slice(0, 3)}</span>
                        {h.pagosDebe > 0 && <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${h.pagosDebe === 1 ? 'bg-orange-100 text-orange-700' : 'bg-red-500 text-white'}`}>{h.pagosDebe}p</span>}
                      </div>
                    )
                  })}
                </div>
                <div className="grid grid-cols-6 gap-2 mt-4">
                  {perfil.historial.slice(-6).map((h) => (
                    <div key={`det-${h.anio}-${h.mes}`} className={`rounded-lg border p-2 text-center text-xs ${h.pagosDebe > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
                      <p className="font-semibold text-gray-500">{mesesCompletos[h.mes - 1].slice(0, 3)} {h.anio}</p>
                      <p className="font-bold text-dark">{h.consumo} m³</p>
                      <p className="text-gray-400">{(h.consumo * 1000).toLocaleString('es-CO')} L</p>
                      <p className="font-medium text-secondary">${(h.consumo * tarifaPorEstrato[perfil.estrato]).toLocaleString('es-CO')}</p>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">Tope normal: {UMBRAL_ALTO} m³ · Encima se marca <span className="text-red-600 font-bold">ALTO</span> y requiere revisión</p>

              <h3 className="text-sm font-bold text-dark mt-6 mb-3">Facturas · {perfil.historial.length} periodos</h3>
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr>
                        <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2">Factura</th>
                        <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2">Periodo</th>
                        <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2">Consumo</th>
                        <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2">Monto</th>
                        <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2">Vencimiento</th>
                        <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[...perfil.historial].reverse().map((h) => {
                        const pagada = h.pagosDebe === 0
                        const monto = h.consumo * tarifaPorEstrato[perfil.estrato]
                        const venc = `05/${String(h.mes).padStart(2, '0')}/${h.anio}`
                        const id = `FAC-${h.anio}-${String(h.mes).padStart(2, '0')}-${perfil.id.slice(-4)}`
                        return (
                          <tr key={`${h.anio}-${h.mes}`} className={`hover:bg-gray-50 ${!pagada ? 'bg-red-50/40' : ''}`}>
                            <td className="px-4 py-2.5 text-xs font-mono font-medium text-dark">{id}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-600">{mesesCompletos[h.mes - 1]} {h.anio}</td>
                            <td className="px-4 py-2.5 text-xs text-dark">{h.consumo} m³</td>
                            <td className="px-4 py-2.5 text-xs font-semibold text-dark">${monto.toLocaleString('es-CO')}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{venc}</td>
                            <td className="px-4 py-2.5">
                              {pagada ? (
                                <span className="bg-green-100 text-green-700 border border-green-200 text-[10px] font-bold px-2 py-0.5 rounded-full">Pagada</span>
                              ) : (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${h.pagosDebe === 1 ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-red-500 text-white border-red-500'}`}>
                                  {h.pagosDebe === 1 ? 'Pendiente · Cortado' : 'Pendiente · Cortado'}
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

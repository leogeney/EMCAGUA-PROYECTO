import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useData } from '../data/DataContext'
import { CHART, cobroFijo, COSTO_RECONEXION, MESES, TARIFA, UMBRAL_ALTO } from '../data/constants'
import { barriosDe, sectores, ubicacion, useZonas } from '../data/zonas'
import { facturasDe, leerPeriodo, nombrePeriodo, periodosFacturados } from '../data/billing'
import type { Usuario, UsuarioForm } from '../data/types'
import WhatsAppIcon from '../components/WhatsAppIcon'
import Ico from '../components/ui/Icon'
import Modal, { ConfirmDialog } from '../components/ui/Modal'
import Drawer from '../components/ui/Drawer'
import Avatar from '../components/ui/Avatar'
import PagoDialog from '../components/PagoDialog'
import { ColumnChart } from '../components/charts/charts'
import { useToast } from '../components/ui/Toast'
import { api } from '../data/api'
import { medido, useConfig } from '../data/config'
import { isAdmin } from '../utils/session'
import Paginacion from '../components/ui/Paginacion'
import { usePagina } from '../hooks'
import { formatCutoff, getNextCutoff } from '../utils/cutoff'
import { cop, fechaCorta, num } from '../utils/format'
import { exportarXls } from '../utils/excel'
import { whatsappUrl } from '../utils/whatsapp'
import { etiquetaPredio, formatoCedula, limpiarCedula, otrosPredios, propietarios, saldoPropietario } from '../data/propietarios'

/** Lectura del periodo elegido ('actual' = la última registrada). */
function lecturaEn(u: Usuario, periodo: string) {
  if (periodo === 'actual') return u.historial[u.historial.length - 1]
  const { anio, mes } = leerPeriodo(periodo)
  return u.historial.find((h) => h.anio === anio && h.mes === mes)
}

type Tab = 'todos' | 'aldia' | 'deuda' | 'vencidos' | 'cortados' | 'alto'
const POR_PAGINA = 10
const FORM_VACIO: UsuarioForm = { id: '', nombre: '', cedula: '', direccion: '', sector: 'Centro', barrio: '', estrato: 1, medidor: '', conMedidor: false, telefono: '' }

function validarTelefono(tel: string) {
  const limpio = tel.replace(/\D/g, '')
  if (!limpio) return 'El teléfono es obligatorio'
  if (limpio.length !== 10) return 'Debe tener 10 dígitos'
  if (!limpio.startsWith('3')) return 'Debe iniciar con 3'
  return ''
}

/* ------------------------------------------------------------------ */
/* Iconos                                                              */
/* ------------------------------------------------------------------ */
const I = {
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  plus: 'M12 4v16m8-8H4',
  dots: 'M12 6h.01M12 12h.01M12 18h.01',
  edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  cut: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
  power: 'M5.636 5.636a9 9 0 1012.728 0M12 3v9',
  x: 'M6 18L18 6M6 6l12 12',
  down: 'M12 10v6m0 0l-3-3m3 3l3-3M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2',
  warn: 'M12 9v3.75m0 3.75h.008M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  pin: 'M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
  phone: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.04 11.04 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
  gauge: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  casa: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  id: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2',
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  tag: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
}

/** Mini tendencia de consumo (6 meses). */
function MiniSpark({ values, alto }: { values: number[]; alto: boolean }) {
  const w = 64, h = 22
  const max = Math.max(...values, 1)
  const min = Math.min(...values) * 0.7
  const pts = values.map((v, i) => [2 + (i / Math.max(1, values.length - 1)) * (w - 4), h - 3 - ((v - min) / (max - min || 1)) * (h - 6)])
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join('')
  const color = alto ? CHART.critico : CHART.serie1
  const last = pts[pts.length - 1]
  return (
    <svg width={w} height={h} aria-hidden="true" className="shrink-0">
      <path d={`${d}L${last[0]},${h}L${pts[0][0]},${h}Z`} fill={color} opacity={0.08} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} />
    </svg>
  )
}

/** Menú contextual con posición fija (no lo recorta ningún contenedor). */
function RowMenu({ items }: { items: { label: string; icon: string; onClick: () => void; danger?: boolean }[] }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btn = useRef<HTMLButtonElement>(null)
  useLayoutEffect(() => {
    if (!open || !btn.current) return
    const r = btn.current.getBoundingClientRect()
    const below = window.innerHeight - r.bottom > 140
    setPos({ top: below ? r.bottom + 6 : r.top - 6 - 44 * items.length, left: Math.max(8, r.right - 192) })
  }, [open, items.length])
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    document.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); document.removeEventListener('keydown', onKey) }
  }, [open])
  return (
    <>
      <button ref={btn} onClick={() => setOpen((o) => !o)} aria-label="Más acciones" className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${open ? 'bg-gray-100 text-dark' : 'text-gray-400 hover:bg-gray-100 hover:text-dark'}`}>
        <Ico d={I.dots} className="w-5 h-5" />
      </button>
      {open && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed z-50 w-48 rounded-xl bg-white border border-gray-100 shadow-xl p-1 animate-[pop_.12s_ease-out]" style={pos}>
            {items.map((it) => (
              <button key={it.label} onClick={() => { setOpen(false); it.onClick() }} className={`w-full flex items-center gap-2.5 px-3 h-10 rounded-lg text-sm font-medium text-left transition-colors ${it.danger ? 'text-red-600 hover:bg-red-50' : 'text-dark hover:bg-gray-50'}`}>
                <Ico d={it.icon} />
                {it.label}
              </button>
            ))}
          </div>
        </>,
        document.body,
      )}
    </>
  )
}

function SelectPill({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <label className="relative flex sm:inline-flex items-center h-10 min-w-0 rounded-xl border border-gray-200 bg-white hover:border-gray-300 focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary transition-colors">
      <span className="pl-3 text-xs text-gray-400 whitespace-nowrap">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="appearance-none bg-transparent pl-1.5 pr-8 h-full flex-1 min-w-0 text-sm font-semibold text-dark focus:outline-none cursor-pointer">
        {children}
      </select>
      <svg className="pointer-events-none absolute right-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
    </label>
  )
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */
export default function Users() {
  const { usuarios, resumen, crearUsuario, editarUsuario, cortar, reactivar } = useData()
  const conf = useConfig()
  const periodos = useMemo(() => periodosFacturados(usuarios, 12).reverse(), [usuarios])
  const toast = useToast()
  const [params, setParams] = useSearchParams()

  const [tab, setTab] = useState<Tab>(params.get('filtro') === 'vencidos' ? 'vencidos' : 'todos')
  const [search, setSearch] = useState(() => params.get('q') ?? '')
  const zonas = useZonas()
  const [barrio, setBarrio] = useState('Todos')
  const [estrato, setEstrato] = useState('Todos')
  const [periodo, setPeriodo] = useState('actual')
  const [orden, setOrden] = useState('nombre')

  const [perfilId, setPerfilId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(params.get('nuevo') === '1')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<UsuarioForm>(FORM_VACIO)
  const [formError, setFormError] = useState<{ id?: string; telefono?: string }>({})
  const [confirmCorte, setConfirmCorte] = useState<Usuario | null>(null)
  const [confirmMasivo, setConfirmMasivo] = useState(false)
  const [reactivando, setReactivando] = useState<Usuario | null>(null)

  useEffect(() => {
    if (params.has('nuevo') || params.has('filtro') || params.has('q')) setParams({}, { replace: true })
  }, [params, setParams])

  const perfil = usuarios.find((u) => u.id === perfilId) ?? null
  const duenos = useMemo(() => propietarios(usuarios), [usuarios])
  const nPredios = (u: Usuario) => duenos.get(limpiarCedula(u.cedula))?.predios.length ?? 1

  const periodoDe = (u: Usuario) => lecturaEn(u, periodo)
  const etiquetaPeriodo = periodo === 'actual' ? 'último periodo' : (() => { const { anio, mes } = leerPeriodo(periodo); return nombrePeriodo(mes, anio) })()

  // Conteos por pestaña
  const conteos = useMemo(() => {
    const c = { todos: usuarios.length, aldia: 0, deuda: 0, vencidos: 0, cortados: 0, alto: 0 }
    for (const u of usuarios) {
      const r = resumen(u)
      if (r.pagosDebe === 0) c.aldia++
      else c.deuda++
      if (u.estado === 'Activo' && r.vencido) c.vencidos++
      if (u.estado === 'Cortado') c.cortados++
      if (r.consumoActual > UMBRAL_ALTO) c.alto++
    }
    return c
  }, [usuarios, resumen])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const consumo = (u: Usuario) => lecturaEn(u, periodo)?.consumo ?? 0
    const res = usuarios.filter((u) => {
      const r = resumen(u)
      const qn = q.replace(/\D/g, '')
      if (q && !u.nombre.toLowerCase().includes(q) && !u.id.includes(q) && !u.medidor.toLowerCase().includes(q) && !u.direccion.toLowerCase().includes(q) && !(u.ocupante?.nombre.toLowerCase().includes(q)) && !(qn.length >= 4 && (u.telefono.replace(/\D/g, '').includes(qn) || limpiarCedula(u.cedula).includes(qn)))) return false
      // Filtro de zona: un sector completo o un barrio ("Sector › Barrio")
      if (barrio !== 'Todos' && (barrio.includes(' › ') ? `${u.sector} › ${u.barrio}` !== barrio : u.sector !== barrio)) return false
      if (estrato !== 'Todos' && String(u.estrato) !== estrato) return false
      if (tab === 'aldia' && r.pagosDebe > 0) return false
      if (tab === 'deuda' && r.pagosDebe === 0) return false
      if (tab === 'vencidos' && !(r.vencido && u.estado === 'Activo')) return false
      if (tab === 'cortados' && u.estado !== 'Cortado') return false
      if (tab === 'alto' && consumo(u) <= UMBRAL_ALTO) return false
      return true
    })
    if (orden === 'mayor') res.sort((a, b) => consumo(b) - consumo(a))
    else if (orden === 'menor') res.sort((a, b) => consumo(a) - consumo(b))
    else if (orden === 'deuda') res.sort((a, b) => resumen(b).deuda - resumen(a).deuda)
    else res.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    return res
  }, [usuarios, resumen, search, barrio, estrato, periodo, orden, tab])

  const [pagina, setPagina] = usePagina([search, barrio, estrato, periodo, orden, tab].join('|'))
  const vencidos = useMemo(() => usuarios.filter((u) => u.estado === 'Activo' && resumen(u).vencido), [usuarios, resumen])
  const totalPaginas = Math.max(1, Math.ceil(filtered.length / POR_PAGINA))
  const pag = Math.min(pagina, totalPaginas)
  const visibles = filtered.slice((pag - 1) * POR_PAGINA, pag * POR_PAGINA)
  const hayFiltros = !!search || barrio !== 'Todos' || estrato !== 'Todos' || periodo !== 'actual'
  const limpiar = () => { setSearch(''); setBarrio('Todos'); setEstrato('Todos'); setPeriodo('actual') }

  /* ---------- Crear / editar ---------- */
  const abrirNuevo = () => { setEditingId(null); setForm(FORM_VACIO); setFormError({}); setFormOpen(true) }
  const abrirEditar = (u: Usuario) => {
    setEditingId(u.id)
    setForm({ id: u.id, nombre: u.nombre, cedula: u.cedula, direccion: u.direccion, ocupante: u.ocupante, sector: u.sector, barrio: u.barrio, estrato: u.estrato, medidor: u.medidor, conMedidor: u.conMedidor, telefono: u.telefono })
    setFormError({})
    setPerfilId(null)
    setFormOpen(true)
  }
  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    const telErr = validarTelefono(form.telefono)
    const idErr = !editingId && !/^\d{3,10}$/.test(form.id) ? 'Solo números (3 a 10 dígitos)' : ''
    if (telErr || idErr) return setFormError({ telefono: telErr || undefined, id: idErr || undefined })
    const medidor = form.medidor && form.medidor !== 'MED-' ? form.medidor : `MED-${form.id}`
    const tel = form.telefono.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')
    const cedula = limpiarCedula(form.cedula)
    const ocupante = form.ocupante?.nombre.trim() ? { nombre: form.ocupante.nombre.trim(), telefono: form.ocupante.telefono.trim() } : undefined
    const datos = { nombre: form.nombre, cedula, direccion: form.direccion.trim(), ocupante, sector: form.sector, barrio: form.barrio, estrato: form.estrato, medidor, conMedidor: form.conMedidor, telefono: tel }
    if (editingId) {
      const antes = usuarios.find((x) => x.id === editingId)!
      // El nombre y el teléfono son del propietario: se actualizan en todos sus predios
      const otros = otrosPredios(usuarios, { ...antes, cedula })
      setFormOpen(false)
      await editarUsuario(editingId, datos)
      for (const o of otros) await editarUsuario(o.id, { nombre: form.nombre, cedula, direccion: o.direccion, ocupante: o.ocupante, sector: o.sector, barrio: o.barrio, estrato: o.estrato, medidor: o.medidor, conMedidor: o.conMedidor, telefono: tel })
      toast('Predio actualizado', otros.length ? `${form.nombre} · también en sus otros ${otros.length} predio(s)` : form.nombre)
    } else {
      const err = await crearUsuario({ id: form.id, ...datos })
      if (err) return setFormError({ id: err })
      toast('Predio creado', `${form.nombre} · ${medidor}${mismoDueno.length ? ` · ahora tiene ${mismoDueno.length + 1} predios` : ''}`)
    }
    setFormOpen(false)
  }

  // Propietario que ya existe con esa cédula (para agregarle otro predio)
  const cedForm = limpiarCedula(form.cedula)
  const mismoDueno = cedForm.length >= 6 ? usuarios.filter((x) => limpiarCedula(x.cedula) === cedForm && x.id !== editingId) : []
  const usarDueno = () => { const d = mismoDueno[0]; setForm((f) => ({ ...f, nombre: d.nombre, telefono: d.telefono })) }

  const enviarMasivo = () => {
    setConfirmMasivo(false)
    vencidos.forEach((u, i) => setTimeout(() => window.open(whatsappUrl(u, resumen(u)), '_blank'), i * 800))
    toast('Abriendo chats de WhatsApp', `${vencidos.length} mensajes personalizados`, 'info')
  }

  const exportar = () =>
    exportarXls(
      `EMCAGUA-Usuarios-${new Date().toISOString().slice(0, 10)}`,
      'EMCAGUA APC — Usuarios',
      `${filtered.length} usuarios · consumo ${etiquetaPeriodo} · generado ${new Date().toLocaleString('es-CO')}`,
      ['Código', 'Propietario', 'Cédula', 'Dirección', 'Medidor', 'Teléfono', 'Sector', 'Barrio', 'Estrato', 'Consumo (m³)', 'Saldo', 'Facturas pendientes', 'Servicio', 'Vive en el predio'],
      filtered.map((u) => { const r = resumen(u); return [u.id, u.nombre, u.cedula, u.direccion, u.medidor, u.telefono, u.sector, u.barrio, u.estrato, periodoDe(u)?.consumo ?? 0, r.deuda, r.pagosDebe, u.estado, u.ocupante?.nombre ?? ''] }),
      [8, 9, 10],
    )

  const TABS: { key: Tab; label: string; dot?: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'aldia', label: 'Al día', dot: 'bg-green-500' },
    { key: 'deuda', label: 'Con saldo', dot: 'bg-amber-400' },
    { key: 'vencidos', label: 'Para corte', dot: 'bg-orange-500' },
    { key: 'cortados', label: 'Cortados', dot: 'bg-red-500' },
    { key: 'alto', label: 'Consumo alto', dot: 'bg-rose-400' },
  ]

  const rReact = reactivando ? resumen(reactivando) : null

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-primary-700 uppercase mb-2">Suscriptores</p>
          <h1 className="text-[28px] font-extrabold tracking-tight text-dark leading-none">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-2">{usuarios.length} predios de {duenos.size} propietarios en El Carmen y Guamalito · próximo corte {formatCutoff(getNextCutoff())}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportar} className="btn-secondary"><Ico d={I.down} /> Exportar</button>
          <button onClick={abrirNuevo} className="btn-primary"><Ico d={I.plus} /> Nuevo predio</button>
        </div>
      </div>

      {/* Aviso de corte */}
      {vencidos.length > 0 && tab !== 'vencidos' && (
        <div className="mb-4 rounded-2xl border border-amber-200/70 bg-gradient-to-r from-amber-50 to-white px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="h-9 w-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0"><Ico d={I.warn} /></span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-dark">{vencidos.length} {vencidos.length === 1 ? 'usuario pasó' : 'usuarios pasaron'} la fecha de corte con saldo pendiente</p>
              <p className="text-xs text-gray-500 truncate">{[...new Set(vencidos.map((u) => u.nombre))].join(', ')}</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setTab('vencidos')} className="btn-sm">Revisar</button>
            <button onClick={() => setConfirmMasivo(true)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#25D366] hover:bg-[#1FAF57] text-white text-xs font-semibold shadow-sm transition-colors">
              <WhatsAppIcon className="w-3.5 h-3.5" /> Avisar a todos
            </button>
          </div>
        </div>
      )}

      <section className="card overflow-hidden">
        {/* Pestañas */}
        <div className="px-2 sm:px-4 border-b border-gray-100 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {TABS.map((t) => {
              const on = tab === t.key
              return (
                <button key={t.key} onClick={() => setTab(t.key)} className={`relative flex items-center gap-2 px-3 h-12 text-sm font-semibold whitespace-nowrap transition-colors ${on ? 'text-dark' : 'text-gray-400 hover:text-gray-600'}`}>
                  {t.dot && <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />}
                  {t.label}
                  <span className={`text-[11px] font-bold px-1.5 min-w-5 h-5 inline-flex items-center justify-center rounded-md tabular-nums ${on ? 'bg-dark text-white' : 'bg-gray-100 text-gray-500'}`}>{conteos[t.key]}</span>
                  {on && <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-dark" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Barra de herramientas */}
        <div className="px-4 sm:px-5 py-4 flex flex-col lg:flex-row gap-2.5 lg:items-center border-b border-gray-100 bg-gray-soft/40">
          <div className="relative flex-1 min-w-0">
            <Ico d={I.search} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, cédula, código, dirección o teléfono" className="w-full h-10 pl-10 pr-9 rounded-xl border border-gray-200 bg-white text-sm text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-colors" />
            {search && <button onClick={() => setSearch('')} aria-label="Borrar búsqueda" className="absolute right-2.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md text-gray-400 hover:text-dark hover:bg-gray-100 flex items-center justify-center"><Ico d={I.x} className="w-3.5 h-3.5" /></button>}
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            <SelectPill label="Zona" value={barrio} onChange={setBarrio}>
              <option value="Todos">Todas</option>
              {zonas.map((z) => [<option key={z.nombre} value={z.nombre}>{z.nombre}</option>, ...z.barrios.map((b) => <option key={`${z.nombre}-${b.nombre}`} value={`${z.nombre} › ${b.nombre}`}>{'\u00a0\u00a0'}{b.nombre}</option>)])}
            </SelectPill>
            <SelectPill label="Estrato" value={estrato} onChange={setEstrato}>
              {['Todos', '1', '2', '3'].map((e) => <option key={e} value={e}>{e}</option>)}
            </SelectPill>
            <SelectPill label="Periodo" value={periodo} onChange={setPeriodo}>
              <option value="actual">Último</option>
              {periodos.map((p) => <option key={`${p.anio}-${p.mes}`} value={`${p.anio}-${p.mes}`}>{MESES[p.mes - 1].slice(0, 3)} {p.anio}</option>)}
            </SelectPill>
            <SelectPill label="Orden" value={orden} onChange={setOrden}>
              <option value="nombre">Nombre</option>
              <option value="mayor">Mayor consumo</option>
              <option value="menor">Menor consumo</option>
              <option value="deuda">Mayor saldo</option>
            </SelectPill>
            {hayFiltros && <button onClick={limpiar} className="h-10 px-3 text-xs font-semibold text-gray-500 hover:text-dark">Limpiar</button>}
          </div>
        </div>

        {/* Encabezado de columnas */}
        <div className="hidden md:grid grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1.3fr)_minmax(0,1fr)_120px] gap-4 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
          <span>Suscriptor</span>
          <span>Ubicación</span>
          <span>Consumo{periodo !== 'actual' && ` · ${etiquetaPeriodo}`}</span>
          <span>Saldo</span>
          <span>Servicio</span>
          <span />
        </div>

        {/* Filas */}
        {visibles.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-gray-soft text-gray-400 flex items-center justify-center mb-3"><Ico d={I.search} className="w-5 h-5" /></div>
            <p className="text-sm font-semibold text-dark">Sin resultados</p>
            <p className="text-xs text-gray-500 mt-1">Prueba con otra búsqueda o cambia los filtros.</p>
            {(hayFiltros || tab !== 'todos') && <button onClick={() => { limpiar(); setTab('todos') }} className="btn-sm mt-4">Ver todos</button>}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {visibles.map((u) => {
              const r = resumen(u)
              const per = periodoDe(u)
              const c = per?.consumo ?? 0
              const alto = c > UMBRAL_ALTO
              const paraCorte = u.estado === 'Activo' && r.vencido
              const serie = u.historial.slice(-6).map((h) => h.consumo)
              return (
                <li key={u.id} onClick={() => setPerfilId(u.id)} className="group grid grid-cols-[1fr_auto] md:grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1.3fr)_minmax(0,1fr)_120px] gap-x-4 gap-y-3 items-center px-4 sm:px-5 py-3.5 cursor-pointer hover:bg-gray-soft/60 transition-colors">
                  {/* Suscriptor */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar nombre={u.nombre} estado={u.estado === 'Cortado' ? 'Cortado' : paraCorte ? 'Alerta' : 'Activo'} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-dark truncate group-hover:text-secondary transition-colors flex items-center gap-2">
                        <span className="truncate">{u.nombre}</span>
                        {nPredios(u) > 1 && <button onClick={(e) => { e.stopPropagation(); setSearch(limpiarCedula(u.cedula)); setTab('todos') }} title="Ver todos sus predios" className="shrink-0 inline-flex items-center gap-1 h-5 px-1.5 rounded-md bg-secondary/10 text-secondary text-[10px] font-bold hover:bg-secondary hover:text-white"><Ico d={I.casa} className="w-3 h-3" />{nPredios(u)} predios</button>}
                      </p>
                      <p className="text-xs text-gray-400 truncate"><span className="font-mono">{u.id}</span> · {u.direccion || u.telefono}{u.ocupante ? ` · vive ${u.ocupante.nombre}` : ''}</p>
                    </div>
                  </div>

                  {/* Acciones (móvil arriba a la derecha) */}
                  <div className="md:hidden flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                    <Acciones u={u} paraCorte={paraCorte} r={r} onEditar={() => abrirEditar(u)} onCortar={() => setConfirmCorte(u)} onReactivar={() => setReactivando(u)} />
                  </div>

                  {/* Ubicación */}
                  <div className="hidden md:block min-w-0">
                    <p className="text-sm text-dark truncate">{u.barrio || u.sector}</p>{u.barrio && <p className="text-[11px] text-gray-400 truncate">{u.sector}</p>}
                    <p className="text-xs text-gray-400">Estrato {u.estrato}</p>
                  </div>

                  {/* Consumo */}
                  <div className="col-span-2 md:col-span-1 flex items-center gap-3 min-w-0 pl-[52px] md:pl-0">
                    {!medido(u, conf) && per?.estado !== 'Suspendido' ? (
                      <div><p className="text-sm font-bold text-dark tabular-nums">{cop(cobroFijo(u.estrato))}</p><p className="text-xs text-gray-400">Fijo · {u.conMedidor ? 'modo sin medidores' : 'sin medidor'}</p></div>
                    ) : per?.estado === 'Suspendido' || u.historial.length === 0 ? (
                      <span className="text-xs text-gray-400 italic">{u.historial.length === 0 ? 'Sin lecturas aún' : 'Servicio suspendido'}</span>
                    ) : (
                      <>
                        <div className="w-[68px]">
                          <p className={`text-sm font-bold tabular-nums ${alto ? 'text-red-600' : 'text-dark'}`}>{c} m³</p>
                          <p className="text-xs text-gray-400 tabular-nums">{cop(c * TARIFA[u.estrato])}</p>
                        </div>
                        {serie.length > 1 && <MiniSpark values={serie} alto={alto} />}
                      </>
                    )}
                    <span className="md:hidden ml-auto text-right">
                      {r.pagosDebe === 0 ? <span className="text-xs text-gray-500">Al día</span> : <span className={`text-sm font-bold tabular-nums ${r.vencido ? 'text-red-600' : 'text-dark'}`}>{cop(r.deuda)}</span>}
                    </span>
                  </div>

                  {/* Saldo */}
                  <div className="hidden md:block">
                    {r.pagosDebe === 0 ? (
                      <p className="text-sm text-gray-500 flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Al día</p>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-dark tabular-nums">{cop(r.deuda)}</p>
                        <p className={`text-xs ${r.vencido ? 'text-red-600' : 'text-amber-700'}`}>
                          {r.pagosDebe} {r.pagosDebe === 1 ? 'factura' : 'facturas'} · {r.vencido ? 'vencida' : `vence ${fechaCorta(r.pendientes[0].vencimiento).slice(0, 5)}`}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Servicio */}
                  <div className="hidden md:block">
                    <EstadoPill estado={u.estado} paraCorte={paraCorte} />
                  </div>

                  <div className="hidden md:flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                    <Acciones u={u} paraCorte={paraCorte} r={r} onEditar={() => abrirEditar(u)} onCortar={() => setConfirmCorte(u)} onReactivar={() => setReactivando(u)} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <Paginacion pagina={pag} total={totalPaginas} items={filtered.length} porPagina={POR_PAGINA} onChange={setPagina} />
      </section>

      {/* Crear / editar */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editingId ? 'Editar predio' : 'Nuevo predio'} subtitle={editingId ? `Código ${editingId}` : 'Cada casa o local es un suscriptor con su medidor y su factura'}>
        <form onSubmit={guardar} className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-gray-soft">
            <Avatar nombre={form.nombre || '?'} size={48} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-dark truncate">{form.nombre || 'Nombre del propietario'}</p>
              <p className="text-xs text-gray-500">{ubicacion(form)} · Estrato {form.estrato} · {medido(form, conf) ? `${cop(TARIFA[form.estrato])}/m³` : `${cop(cobroFijo(form.estrato))}/mes fijo`}</p>
            </div>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 -mb-1">Propietario</p>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-4">
            <div>
              <label className="field-label" htmlFor="f-ced">Cédula o NIT</label>
              <input id="f-ced" required autoFocus inputMode="numeric" value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value.replace(/[^\d.]/g, '') })} placeholder="1.091.234.567" className="field" />
            </div>
            <div>
              <label className="field-label" htmlFor="f-nombre">Nombre completo</label>
              <input id="f-nombre" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Juan Pérez" className="field" />
            </div>
          </div>
          {mismoDueno.length > 0 && (
            <div className="rounded-xl bg-secondary/5 border border-secondary/20 px-3.5 py-2.5 text-sm">
              <p className="text-dark"><b>{mismoDueno[0].nombre}</b> ya tiene {mismoDueno.length} predio(s): {mismoDueno.map(etiquetaPredio).join(' · ')}.</p>
              <p className="text-xs text-gray-500 mt-0.5">{editingId ? 'Este predio queda con el mismo propietario.' : 'Este se agrega como otro predio suyo, con su propio medidor y factura.'}</p>
              {(form.nombre !== mismoDueno[0].nombre || form.telefono !== mismoDueno[0].telefono) && <button type="button" onClick={usarDueno} className="text-xs font-semibold text-secondary hover:underline mt-1">Usar su nombre y teléfono</button>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label" htmlFor="f-id">Código de suscriptor</label>
              <input
                id="f-id"
                required
                inputMode="numeric"
                readOnly={!!editingId}
                value={form.id}
                onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); setForm((f) => ({ ...f, id: v, medidor: `MED-${v}` })); setFormError((x) => ({ ...x, id: undefined })) }}
                placeholder="10300"
                className={`field ${editingId ? 'bg-gray-soft text-gray-500 cursor-not-allowed' : ''} ${formError.id ? 'border-red-300' : ''}`}
              />
              {formError.id && <p className="text-[11px] text-red-600 mt-1">{formError.id}</p>}
            </div>
            <div>
              <label className="field-label" htmlFor="f-tel">Teléfono (WhatsApp)</label>
              <input
                id="f-tel"
                inputMode="tel"
                value={form.telefono}
                onChange={(e) => { setForm({ ...form, telefono: e.target.value }); if (formError.telefono) setFormError((x) => ({ ...x, telefono: validarTelefono(e.target.value) || undefined })) }}
                onBlur={() => setFormError((x) => ({ ...x, telefono: validarTelefono(form.telefono) || undefined }))}
                placeholder="310 456 7890"
                className={`field ${formError.telefono ? 'border-red-300' : ''}`}
              />
              {formError.telefono && <p className="text-[11px] text-red-600 mt-1">{formError.telefono}</p>}
            </div>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 -mb-1 pt-1">Predio</p>
          <div>
            <label className="field-label" htmlFor="f-dir">Dirección del predio</label>
            <input id="f-dir" required value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} placeholder="Ej: Calle 5 # 4-20" className="field" />
          </div>
          <div>
            <p className="field-label">Sector</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {sectores().map((b) => (
                <button type="button" key={b} onClick={() => setForm({ ...form, sector: b, barrio: form.sector === b ? form.barrio : '' })} className={`h-10 px-2 rounded-xl border text-sm font-medium transition-colors ${form.sector === b ? 'border-secondary bg-secondary/5 text-secondary' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>{b}</button>
              ))}
            </div>
            <label className="field-label mt-3" htmlFor="f-barrio">Barrio</label>
            <select id="f-barrio" value={form.barrio} onChange={(e) => setForm({ ...form, barrio: e.target.value })} className="field">
              <option value="">{barriosDe(form.sector).length ? '— Sin definir —' : 'Este sector aún no tiene barrios'}</option>
              {barriosDe(form.sector).map((b) => <option key={b}>{b}</option>)}
            </select>
            {!barriosDe(form.sector).length && <p className="text-[11px] text-gray-400 mt-1">Los barrios se agregan en Configuración → Sectores y barrios.</p>}
          </div>
          <div>
            <p className="field-label">Estrato</p>
            <div className="grid grid-cols-3 gap-2">
              {([1, 2, 3] as const).map((e) => (
                <button type="button" key={e} onClick={() => setForm({ ...form, estrato: e })} className={`rounded-xl border px-3 py-2 text-left transition-colors ${form.estrato === e ? 'border-secondary bg-secondary/5' : 'border-gray-200 hover:border-gray-300'}`}>
                  <p className={`text-sm font-bold ${form.estrato === e ? 'text-secondary' : 'text-dark'}`}>Estrato {e}</p>
                  <p className="text-[11px] text-gray-500">{cop(TARIFA[e])} / m³</p>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-dark cursor-pointer">
              <input type="checkbox" checked={form.conMedidor} onChange={(e) => setForm({ ...form, conMedidor: e.target.checked })} className="accent-secondary h-4 w-4" />
              Tiene medidor instalado
            </label>
            <p className="text-[11px] text-gray-500 mt-1 ml-6">{conf.modoSinMedidores ? `Modo sin medidores activo: por ahora se cobra el valor fijo de su estrato, ${cop(cobroFijo(form.estrato))} al mes, aunque tenga medidor.` : form.conMedidor ? 'Se cobra por consumo (m³) con la tarifa CRA.' : `Sin medidor: se cobra el valor fijo de su estrato, ${cop(cobroFijo(form.estrato))} al mes (se cambia en Configuración).`}</p>
          </div>
          {form.conMedidor && <div>
            <label className="field-label" htmlFor="f-med">Medidor</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-200 bg-gray-soft text-sm font-mono font-bold text-gray-500">MED-</span>
              <input id="f-med" value={form.medidor.replace(/^MED-/, '')} onChange={(e) => setForm({ ...form, medidor: `MED-${e.target.value.replace(/\D/g, '')}` })} placeholder={form.id || '10300'} className="field rounded-l-none" />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Por defecto usa el mismo número del código</p>
          </div>}
          <div className="rounded-xl border border-gray-100 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-dark cursor-pointer">
              <input type="checkbox" checked={!!form.ocupante} onChange={(e) => setForm({ ...form, ocupante: e.target.checked ? { nombre: '', telefono: '' } : undefined })} className="accent-secondary h-4 w-4" />
              En este predio vive otra persona (arrendatario)
            </label>
            {form.ocupante && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <input value={form.ocupante.nombre} onChange={(e) => setForm({ ...form, ocupante: { ...form.ocupante!, nombre: e.target.value } })} placeholder="Nombre de quien vive" className="field" />
                <input value={form.ocupante.telefono} inputMode="tel" onChange={(e) => setForm({ ...form, ocupante: { ...form.ocupante!, telefono: e.target.value } })} placeholder="Teléfono" className="field" />
                <p className="col-span-2 text-[11px] text-gray-500">La deuda sigue siendo del predio. A esta persona le llegan los avisos de cortes programados y fugas.</p>
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" className="btn-primary flex-1">{editingId ? 'Guardar cambios' : 'Crear predio'}</button>
          </div>
        </form>
      </Modal>

      {/* Perfil */}
      <Drawer open={!!perfil} onClose={() => setPerfilId(null)}>
        {perfil && (
          <Perfil
            usuario={perfil}
            onClose={() => setPerfilId(null)}
            onEditar={() => abrirEditar(perfil)}
            onCortar={() => setConfirmCorte(perfil)}
            onReactivar={() => setReactivando(perfil)}
            onAbrir={(id) => setPerfilId(id)}
          />
        )}
      </Drawer>

      <ConfirmDialog
        open={!!confirmCorte}
        tone="danger"
        title={`¿Cortar el servicio a ${confirmCorte?.nombre}?`}
        message={confirmCorte && <>Medidor <b>{confirmCorte.medidor}</b>. Para reactivarlo deberá pagar el saldo más {cop(COSTO_RECONEXION)} de reconexión.</>}
        confirmLabel="Cortar servicio"
        onCancel={() => setConfirmCorte(null)}
        onConfirm={() => { cortar(confirmCorte!.id); toast('Servicio cortado', `${confirmCorte!.nombre} · ${confirmCorte!.medidor}`, 'warning'); setConfirmCorte(null) }}
      />

      <ConfirmDialog
        open={confirmMasivo}
        title="Enviar aviso por WhatsApp"
        message={`Se abrirán ${vencidos.length} chats, uno por usuario, con un mensaje personalizado. Tu navegador puede pedir permiso para abrir ventanas emergentes.`}
        confirmLabel={`Abrir ${vencidos.length} chats`}
        onCancel={() => setConfirmMasivo(false)}
        onConfirm={enviarMasivo}
      />

      {reactivando && (
        <PagoDialog
          open
          onClose={() => setReactivando(null)}
          titulo="Reactivar servicio"
          cliente={`${reactivando.nombre} · ${reactivando.medidor}`}
          lineas={[...(rReact?.pendientes.map((f) => ({ label: `Factura ${f.periodo}`, sub: f.id, monto: f.monto })) ?? []), { label: 'Reconexión del servicio', monto: COSTO_RECONEXION }]}
          confirmLabel="Pagar y reactivar"
          onConfirm={async (datos) => {
            const p = await reactivar(reactivando.id, datos)
            if (p) toast('Servicio reactivado', `${p.id} · ${cop(p.monto)}${p.vueltos ? ` · vueltos ${cop(p.vueltos)}` : ''}`)
            setReactivando(null)
          }}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function EstadoPill({ estado, paraCorte }: { estado: Usuario['estado']; paraCorte: boolean }) {
  const [txt, cls, dot] =
    estado === 'Cortado' ? ['Cortado', 'bg-red-50 text-red-700', 'bg-red-500']
    : paraCorte ? ['Para corte', 'bg-amber-50 text-amber-800', 'bg-amber-500']
    : ['Activo', 'bg-green-50 text-green-700', 'bg-green-500']
  return (
    <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-semibold ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {txt}
    </span>
  )
}

function Acciones({ u, r, paraCorte, onEditar, onCortar, onReactivar }: { u: Usuario; r: ReturnType<ReturnType<typeof useData>['resumen']>; paraCorte: boolean; onEditar: () => void; onCortar: () => void; onReactivar: () => void }) {
  return (
    <div className="flex items-center gap-1">
      {u.estado === 'Cortado' ? (
        <button onClick={onReactivar} className="h-8 px-3 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary hover:text-white text-xs font-semibold transition-colors">Reactivar</button>
      ) : paraCorte ? (
        <button onClick={onCortar} className="h-8 px-3 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white text-xs font-semibold transition-colors">Cortar</button>
      ) : null}
      <a href={whatsappUrl(u, r)} target="_blank" rel="noreferrer" title="Enviar WhatsApp" className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-[#25D366]/10 hover:text-[#1a9e4b] transition-colors">
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 01-4.8-1.31l-.34-.2-3.57.94.95-3.48-.22-.36a9.43 9.43 0 01-1.45-5.03c0-5.2 4.24-9.44 9.45-9.44 2.52 0 4.89.98 6.68 2.77a9.38 9.38 0 012.76 6.68c0 5.2-4.24 9.43-9.45 9.43zm8.04-17.47A11.3 11.3 0 0012.05.7C5.78.7.68 5.8.68 12.06c0 2 .52 3.96 1.52 5.68L.6 23.6l6-1.57a11.34 11.34 0 005.44 1.38h.01c6.26 0 11.36-5.1 11.36-11.36 0-3.03-1.18-5.89-3.32-8.03z" /></svg>
      </a>
      <RowMenu
        items={[
          { label: 'Editar datos', icon: I.edit, onClick: onEditar },
          ...(u.estado === 'Activo' ? [{ label: 'Cortar servicio', icon: I.cut, onClick: onCortar, danger: true }] : [{ label: 'Reactivar servicio', icon: I.power, onClick: onReactivar }]),
        ]}
      />
    </div>
  )
}

function Perfil({ usuario: u, onClose, onEditar, onCortar, onReactivar, onAbrir }: { usuario: Usuario; onClose: () => void; onEditar: () => void; onCortar: () => void; onReactivar: () => void; onAbrir: (id: string) => void }) {
  const { resumen, usuarios, modoApi, recargar } = useData()
  const conf = useConfig()
  const toast = useToast()
  const [simulando, setSimulando] = useState(false)
  // Pruebas (solo gerente, predio sin facturas): 6 meses de consumo simulado en la base de datos
  const simular = async () => {
    setSimulando(true)
    try {
      const r = await api<{ consumos: number[]; mesEnCurso: number }>(`/vista/simular/${u.id}`, { metodo: 'POST' })
      await recargar()
      toast('Consumo simulado', `6 meses: ${r.consumos.join(', ')} m³ · este mes lleva ${r.mesEnCurso} m³`)
    } catch (e) {
      toast('No se pudo simular', e instanceof Error ? e.message : String(e), 'warning')
    } finally {
      setSimulando(false)
    }
  }
  const otros = otrosPredios(usuarios, u)
  const total = saldoPropietario([u, ...otros], resumen)
  const r = resumen(u)
  const paraCorte = u.estado === 'Activo' && r.vencido
  const facturas = [...facturasDe(u)].reverse()
  const hist = u.historial.slice(-12)

  return (
    <>
      {/* Cabecera */}
      <div className="relative shrink-0 bg-gradient-to-br from-secondary to-secondary-700 text-white px-6 pt-5 pb-6">
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 85% 20%, #fff 0, transparent 45%), radial-gradient(circle at 10% 110%, #8AC43A 0, transparent 40%)' }} />
        <div className="relative flex items-start justify-between">
          <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-white/60">Predio del suscriptor</span>
          <button onClick={onClose} aria-label="Cerrar" className="h-8 w-8 -mr-2 -mt-1 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white"><Ico d={I.x} /></button>
        </div>
        <div className="relative flex items-center gap-4 mt-3">
          <div className="rounded-full ring-4 ring-white/15"><Avatar nombre={u.nombre} size={60} /></div>
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold tracking-tight truncate">{u.nombre}</h2>
            <p className="text-sm text-white/70">Código {u.id} · <span className="font-mono">{u.medidor}</span></p>
            <p className="text-xs text-white/60 truncate">{u.direccion}</p>
            <div className="mt-2"><EstadoPill estado={u.estado} paraCorte={paraCorte} /></div>
          </div>
        </div>
        <div className="relative flex flex-wrap gap-2 mt-5">
          <a href={whatsappUrl(u, r)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#25D366] hover:bg-[#1FAF57] text-white text-sm font-semibold no-underline shadow-sm transition-colors">
            <WhatsAppIcon className="w-4 h-4" /> WhatsApp
          </a>
          <button onClick={onEditar} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors"><Ico d={I.edit} /> Editar</button>
          {u.estado === 'Cortado' ? (
            <button onClick={onReactivar} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-white text-secondary hover:bg-white/90 text-sm font-semibold transition-colors"><Ico d={I.power} /> Reactivar</button>
          ) : (
            <button onClick={onCortar} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-white/10 hover:bg-red-500 text-white text-sm font-semibold transition-colors"><Ico d={I.cut} /> Cortar</button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {modoApi && isAdmin() && u.historial.length === 0 && (
          <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Este predio todavía no tiene consumos</p>
            <p className="text-xs mt-0.5">Para probar el sistema puedes darle 6 meses de consumo simulado (lecturas, facturas pagadas y la lectura de este mes).</p>
            <button disabled={simulando} onClick={simular} className="btn-sm h-8 mt-2 bg-amber-500 text-white hover:bg-amber-600 border-0">{simulando ? 'Simulando…' : 'Simular consumo (pruebas)'}</button>
          </div>
        )}
        {/* Indicadores */}
        <div className="grid grid-cols-3 gap-3">
          <Kpi label="Consumo actual" value={r.ultimaLectura?.estado === 'Suspendido' ? 'Suspendido' : !medido(u, conf) ? (u.conMedidor ? 'Cobro fijo' : 'Sin medidor') : `${r.consumoActual} m³`} tone={r.consumoActual > UMBRAL_ALTO ? 'text-red-600' : 'text-dark'} />
          <Kpi label="Promedio 6 m" value={`${num(r.consumoPromedio, 1)} m³`} />
          <Kpi label="Saldo" value={r.deuda ? cop(r.deuda) : 'Al día'} tone={r.deuda ? (r.vencido ? 'text-red-600' : 'text-amber-700') : 'text-green-700'} />
        </div>

        {/* Datos */}
        <div className="rounded-2xl border border-gray-100 divide-y divide-gray-100">
          <Fila icon={I.id} k="Propietario" v={`${u.nombre} · C.C. ${formatoCedula(u.cedula) || '—'}`} />
          <Fila icon={I.pin} k="Dirección" v={`${u.direccion || '—'} · ${ubicacion(u)}`} />
          {u.ocupante && <Fila icon={I.user} k="Vive ahí" v={`${u.ocupante.nombre}${u.ocupante.telefono ? ` · ${u.ocupante.telefono}` : ''}`} />}
          <Fila icon={I.tag} k="Estrato y tarifa" v={medido(u, conf) ? `Estrato ${u.estrato} · ${cop(TARIFA[u.estrato])} por m³` : `Estrato ${u.estrato} · ${cop(cobroFijo(u.estrato))} fijo al mes (${u.conMedidor ? 'modo sin medidores' : 'sin medidor'})`} />
          <Fila icon={I.phone} k="Teléfono" v={u.telefono} />
          <Fila icon={I.gauge} k="Medidor" v={u.conMedidor ? <span className="font-mono">{u.medidor}{conf.modoSinMedidores ? ' · no se usa para cobrar' : ''}</span> : 'Sin instalar · cobro fijo'} />
        </div>

        {/* Otros predios del mismo dueño */}
        {otros.length > 0 && (
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-sm font-bold text-dark">Otros predios de {u.nombre.split(' ')[0]} <span className="text-gray-400 font-medium">· {otros.length}</span></h3>
              {total.deuda > 0 && <span className={`text-xs font-semibold ${total.vencido ? 'text-red-600' : 'text-amber-700'}`}>Debe en total {cop(total.deuda)}</span>}
            </div>
            <ul className="rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
              {otros.map((o) => { const ro = resumen(o); return (
                <li key={o.id}>
                  <button onClick={() => onAbrir(o.id)} className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-gray-soft/60">
                    <span className="h-8 w-8 rounded-lg bg-gray-soft text-gray-500 flex items-center justify-center shrink-0"><Ico d={I.casa} /></span>
                    <span className="flex-1 min-w-0"><span className="block text-sm font-medium text-dark truncate">{etiquetaPredio(o)}</span><span className="block text-[11px] text-gray-400">Código {o.id} · estrato {o.estrato} · {o.estado}{o.ocupante ? ` · vive ${o.ocupante.nombre}` : ''}</span></span>
                    <span className={`text-sm font-semibold tabular-nums ${ro.deuda ? (ro.vencido ? 'text-red-600' : 'text-dark') : 'text-green-700'}`}>{ro.deuda ? cop(ro.deuda) : 'Al día'}</span>
                  </button>
                </li>
              ) })}
            </ul>
            <p className="text-[11px] text-gray-400 mt-1.5">Cada predio tiene su medidor, su estrato y su factura. En Pagos y caja se pueden cobrar juntos.</p>
          </div>
        )}

        {/* Consumo */}
        {hist.length > 1 && (
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-sm font-bold text-dark">Consumo últimos {hist.length} meses</h3>
              <span className="text-xs text-gray-400">tope normal {UMBRAL_ALTO} m³</span>
            </div>
            <ColumnChart
              data={hist.map((h) => ({
                label: MESES[h.mes - 1].slice(0, 1),
                full: `${nombrePeriodo(h.mes, h.anio)}${h.estado === 'Suspendido' ? ' · suspendido' : h.estado === 'Pendiente' ? ' · pendiente' : ''}`,
                values: [h.consumo],
                colors: [h.consumo > UMBRAL_ALTO ? CHART.critico : h.estado === 'Pendiente' ? CHART.serie2 : CHART.serie1],
              }))}
              series={[{ name: 'Consumo', color: CHART.serie1 }]}
              format={(n) => `${n} m³`}
              axisFormat={(n) => `${n}`}
              height={170}
            />
            <div className="flex gap-4 mt-1 text-[11px] text-gray-500">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: CHART.serie1 }} />Pagada</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: CHART.serie2 }} />Pendiente</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: CHART.critico }} />Consumo alto</span>
            </div>
          </div>
        )}

        {/* Facturas */}
        <div>
          <h3 className="text-sm font-bold text-dark mb-2">Facturas <span className="text-gray-400 font-medium">· {facturas.length}</span></h3>
          {facturas.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center rounded-2xl border border-dashed border-gray-200">Aún no tiene facturas</p>
          ) : (
            <ul className="rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
              {facturas.map((f) => (
                <li key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${f.estado === 'Pagada' ? 'bg-green-500' : f.vencida ? 'bg-red-500' : 'bg-amber-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark">{f.periodo}</p>
                    <p className="text-[11px] text-gray-400">{f.fija ? 'Cobro fijo' : `${f.consumo} m³`} · {f.estado === 'Pagada' ? 'Pagada' : f.vencida ? `Venció ${fechaCorta(f.vencimiento)}` : `Vence ${fechaCorta(f.vencimiento)}`}</p>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${f.estado === 'Pagada' ? 'text-gray-500' : 'text-dark'}`}>{cop(f.monto)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}

function Kpi({ label, value, tone = 'text-dark' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl bg-gray-soft px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`text-base font-extrabold mt-1 tabular-nums ${tone}`}>{value}</p>
    </div>
  )
}

function Fila({ icon, k, v }: { icon: string; k: string; v: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="h-8 w-8 rounded-lg bg-gray-soft text-gray-500 flex items-center justify-center shrink-0"><Ico d={icon} /></span>
      <span className="text-xs text-gray-500 w-28 shrink-0">{k}</span>
      <span className="text-sm font-semibold text-dark min-w-0 truncate">{v}</span>
    </div>
  )
}

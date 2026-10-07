import { useState } from 'react'
import { useNomina } from '../data/NominaContext'
import { mensajeError, MODO_API } from '../data/api'
import { borrarRol, guardarCuenta, guardarRol, MODULOS, useCuentas, type Cuenta, type Rol } from '../data/cuentas'
import Modal from '../components/ui/Modal'
import Avatar from '../components/ui/Avatar'
import Ico from '../components/ui/Icon'
import { useToast } from '../components/ui/Toast'
import { fecha, hora } from '../utils/format'
import { getUsername } from '../utils/session'

type Tab = 'cuentas' | 'roles'
const D = { plus: 'M12 4v16m8-8H4', lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
const GRUPOS = [...new Set(MODULOS.map((m) => m.grupo))]
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')

export default function Cuentas() {
  const [tab, setTab] = useState<Tab>('cuentas')
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-primary-700 uppercase mb-2">Administración</p>
          <h1 className="text-[28px] font-extrabold tracking-tight text-dark leading-none">Cuentas y roles</h1>
          <p className="text-sm text-gray-500 mt-2">Quién entra al sistema y qué módulos ve cada uno.</p>
        </div>
        <div className="flex p-1 bg-white border border-gray-100 rounded-xl shadow-sm">
          {([['cuentas', 'Cuentas'], ['roles', 'Roles y permisos']] as [Tab, string][]).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`px-3 h-9 rounded-lg text-sm font-semibold ${tab === k ? 'bg-dark text-white' : 'text-gray-500 hover:text-dark'}`}>{l}</button>)}
        </div>
      </div>
      {tab === 'cuentas' ? <ListaCuentas /> : <Roles />}
    </div>
  )
}

/* -------------------------------- Cuentas -------------------------------- */

function ListaCuentas() {
  const { cuentas, roles } = useCuentas()
  const toast = useToast()
  const [editar, setEditar] = useState<Cuenta | 'nueva' | null>(null)
  const yo = getUsername('').toLowerCase()
  const gerentesActivos = cuentas.filter((c) => c.activo && roles.find((r) => r.id === c.rol)?.fijo).length
  const [q, setQ] = useState('')
  const norm = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const visibles = cuentas.filter((c) => !q.trim() || norm(`${c.nombre} ${c.usuario} ${c.cargo} ${roles.find((r) => r.id === c.rol)?.nombre ?? ''}`).includes(norm(q.trim())))

  const alternar = (c: Cuenta) => {
    const esGerente = roles.find((r) => r.id === c.rol)?.fijo
    if (c.usuario.toLowerCase() === yo) return toast('No puedes desactivar tu propia cuenta', 'Pídeselo a otro gerente.')
    if (c.activo && esGerente && gerentesActivos <= 1) return toast('Debe quedar al menos un gerente activo', 'Asigna otro gerente antes de desactivar esta cuenta.')
    guardarCuenta({ ...c, activo: !c.activo })
      .then(() => toast(c.activo ? 'Cuenta desactivada' : 'Cuenta activada', `${c.nombre} ${c.activo ? 'ya no puede entrar' : 'puede volver a entrar'}.`))
      .catch((e) => toast('No se guardó el cambio', mensajeError(e), 'warning'))
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nombre, usuario o rol" className="field h-10 pl-9 text-sm w-64" />
          </div>
          <p className="text-sm text-gray-500">{cuentas.filter((c) => c.activo).length} cuenta(s) activa(s) de {cuentas.length}</p>
        </div>
        <button onClick={() => setEditar('nueva')} className="btn-primary"><Ico d={D.plus} /> Nueva cuenta</button>
      </div>
      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-soft/60 border-b border-gray-100"><tr><th className="th">Funcionario</th><th className="th">Usuario</th><th className="th">Rol</th><th className="th">Último acceso</th><th className="th">Estado</th><th className="th" /></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {visibles.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">Ninguna cuenta coincide con “{q}”</td></tr>}
              {visibles.map((c) => (
                <tr key={c.usuario} className={c.activo ? '' : 'opacity-50'}>
                  <td className="td"><div className="flex items-center gap-3"><Avatar nombre={c.nombre} size={34} /><div><p className="font-semibold text-dark">{c.nombre}{c.usuario.toLowerCase() === yo && <span className="ml-2 badge-muted">Tú</span>}</p><p className="text-xs text-gray-400">{c.cargo}</p></div></div></td>
                  <td className="td font-mono text-sm">{c.usuario}</td>
                  <td className="td">{roles.find((r) => r.id === c.rol)?.nombre ?? <span className="text-red-600">Sin rol</span>}</td>
                  <td className="td text-gray-500 text-sm whitespace-nowrap">{c.ultimoAcceso ? `${fecha(c.ultimoAcceso)} ${hora(c.ultimoAcceso)}` : 'Nunca'}</td>
                  <td className="td">
                    <button onClick={() => alternar(c)} className={`relative h-6 w-11 rounded-full transition-colors ${c.activo ? 'bg-secondary' : 'bg-gray-300'}`} aria-label={c.activo ? 'Desactivar' : 'Activar'}>
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${c.activo ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </td>
                  <td className="td text-right"><button onClick={() => setEditar(c)} className="btn-sm">Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="text-xs text-gray-500 mt-3 flex gap-2"><Ico d={D.lock} className="w-4 h-4 shrink-0" />{MODO_API ? 'Las contraseñas se guardan cifradas en el servidor (BCrypt); nadie, ni el gerente, puede verlas. Para cambiar la de otra persona, edita su cuenta y escribe una nueva.' : 'Demostración: se entra solo con el usuario. Con la API encendida, las contraseñas se guardan cifradas en el servidor.'}</p>
      {editar && <FormCuenta inicial={editar === 'nueva' ? null : editar} onClose={() => setEditar(null)} />}
    </>
  )
}

function FormCuenta({ inicial, onClose }: { inicial: Cuenta | null; onClose: () => void }) {
  const { cuentas, roles } = useCuentas()
  const { empleados } = useNomina()
  const toast = useToast()
  const [c, setC] = useState<Cuenta>(inicial ?? { usuario: '', nombre: '', cargo: '', rol: roles.find((r) => !r.fijo)?.id ?? roles[0].id, activo: true, creada: 0 })
  const repetido = !inicial && cuentas.some((x) => x.usuario.toLowerCase() === c.usuario.toLowerCase())
  const sinCuenta = empleados.filter((e) => e.activo && !cuentas.some((x) => x.nombre === e.nombre))
  // Con la base de datos cada cuenta nueva necesita una contraseña inicial (se guarda cifrada en el servidor)
  const [clave, setClave] = useState('')
  const claveOk = !MODO_API ? true : inicial ? clave === '' || clave.length >= 8 : clave.length >= 8
  const valido = c.nombre.trim().length > 2 && /^[a-z0-9._]{3,20}$/.test(c.usuario) && !repetido && claveOk

  const elegirEmpleado = (id: string) => {
    const e = empleados.find((x) => x.id === id)
    if (!e) return
    let u = slug(e.nombre.split(' ')[0]); const base = u; let n = 2
    while (cuentas.some((x) => x.usuario === u)) u = `${base}${n++}`
    setC((x) => ({ ...x, nombre: e.nombre, cargo: e.cargo, usuario: u }))
  }

  return (
    <Modal open onClose={onClose} title={inicial ? `Editar cuenta · ${inicial.usuario}` : 'Nueva cuenta'}
      footer={<div className="flex justify-end gap-2"><button onClick={onClose} className="btn-secondary">Cancelar</button><button disabled={!valido} onClick={() => { guardarCuenta({ ...c, creada: c.creada || Date.now() }, clave).then(() => toast(inicial ? 'Cuenta actualizada' : 'Cuenta creada', `${c.nombre} entra con el usuario «${c.usuario}».`)).catch((e) => toast('No se guardó la cuenta', mensajeError(e), 'warning')); onClose() }} className="btn-primary">Guardar</button></div>}>
      <div className="p-6 space-y-4">
        {!inicial && sinCuenta.length > 0 && (
          <div>
            <label className="field-label">Tomar datos de un empleado (opcional)</label>
            <select onChange={(e) => elegirEmpleado(e.target.value)} defaultValue="" className="field"><option value="">— Escribir a mano —</option>{sinCuenta.map((e) => <option key={e.id} value={e.id}>{e.nombre} · {e.cargo}</option>)}</select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="field-label">Nombre completo</label><input value={c.nombre} onChange={(e) => setC({ ...c, nombre: e.target.value })} className="field" /></div>
          <div><label className="field-label">Usuario</label><input value={c.usuario} disabled={!!inicial} onChange={(e) => setC({ ...c, usuario: e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '') })} className="field font-mono" /></div>
          <div><label className="field-label">Cargo</label><input value={c.cargo} onChange={(e) => setC({ ...c, cargo: e.target.value })} className="field" /></div>
        </div>
        {repetido && <p className="text-xs text-red-600">Ese usuario ya existe.</p>}
        {MODO_API && (
          <div>
            <label className="field-label">{inicial ? 'Nueva contraseña (déjala vacía para no cambiarla)' : 'Contraseña inicial'}</label>
            <input type="password" value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="new-password" placeholder="Mínimo 8 caracteres" className="field" />
            {clave && clave.length < 8 && <p className="text-xs text-red-600 mt-1">Mínimo 8 caracteres.</p>}
          </div>
        )}
        <div>
          <label className="field-label">Rol</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {roles.map((r) => (
              <button key={r.id} onClick={() => setC({ ...c, rol: r.id })} className={`text-left rounded-xl border-2 p-3 transition-colors ${c.rol === r.id ? 'border-secondary bg-secondary/5' : 'border-gray-100 hover:border-gray-200'}`}>
                <p className="text-sm font-semibold text-dark">{r.nombre}</p>
                <p className="text-[11px] text-gray-500">{r.descripcion}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

/* --------------------------------- Roles --------------------------------- */

function Roles() {
  const { roles, cuentas } = useCuentas()
  const toast = useToast()
  const [nuevo, setNuevo] = useState(false)
  const alternar = (r: Rol, m: string) => { guardarRol({ ...r, permisos: r.permisos.includes(m) ? r.permisos.filter((x) => x !== m) : [...r.permisos, m] }).catch((e) => toast('No se guardó el permiso', mensajeError(e), 'warning')) }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm text-gray-500 flex items-center gap-2"><Ico d={D.info} className="w-4 h-4" />Los cambios aplican de inmediato: el menú de cada funcionario muestra solo lo que su rol permite.</p>
        <button onClick={() => setNuevo(true)} className="btn-primary"><Ico d={D.plus} /> Nuevo rol</button>
      </div>
      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-soft/60 border-b border-gray-100">
              <tr>
                <th className="th sticky left-0 bg-gray-soft">Módulo</th>
                {roles.map((r) => (
                  <th key={r.id} className="th text-center normal-case tracking-normal">
                    <p className="text-dark text-xs font-bold">{r.nombre}</p>
                    <p className="text-[10px] text-gray-400 font-normal">{cuentas.filter((c) => c.rol === r.id).length} cuenta(s)</p>
                    {!r.fijo && cuentas.every((c) => c.rol !== r.id) && <button onClick={() => { borrarRol(r.id).then(() => toast('Rol eliminado', r.nombre)).catch((e) => toast('No se eliminó el rol', mensajeError(e), 'warning')) }} className="text-[10px] text-red-500 hover:underline font-normal">Eliminar</button>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GRUPOS.map((g) => [
                <tr key={g} className="bg-gray-soft/40"><td colSpan={roles.length + 1} className="px-5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 sticky left-0">{g}</td></tr>,
                ...MODULOS.filter((m) => m.grupo === g).map((m) => (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-soft/30">
                    <td className="px-5 py-2 text-dark sticky left-0 bg-white whitespace-nowrap">{m.nombre}</td>
                    {roles.map((r) => (
                      <td key={r.id} className="text-center py-2">
                        <input type="checkbox" checked={r.permisos.includes(m.id)} disabled={r.fijo} onChange={() => alternar(r, m.id)} className="h-4 w-4 accent-[#156D6D] cursor-pointer disabled:cursor-not-allowed" aria-label={`${r.nombre}: ${m.nombre}`} />
                      </td>
                    ))}
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      </section>
      <p className="text-xs text-gray-500 mt-3">El rol Gerente siempre tiene acceso a todo y no se puede modificar.</p>
      {nuevo && <NuevoRol onClose={() => setNuevo(false)} />}
    </>
  )
}

function NuevoRol({ onClose }: { onClose: () => void }) {
  const { roles } = useCuentas()
  const toast = useToast()
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [base, setBase] = useState(roles.find((r) => !r.fijo)?.id ?? '')
  const id = slug(nombre)
  const repetido = roles.some((r) => r.id === id)
  return (
    <Modal open onClose={onClose} size="sm" title="Nuevo rol"
      footer={<div className="flex justify-end gap-2"><button onClick={onClose} className="btn-secondary">Cancelar</button><button disabled={nombre.trim().length < 3 || repetido} onClick={() => { guardarRol({ id, nombre: nombre.trim(), descripcion: descripcion.trim() || 'Rol personalizado.', permisos: [...(roles.find((r) => r.id === base)?.permisos ?? ['mi-dia'])] }).then(() => toast('Rol creado', 'Ajusta sus permisos en la tabla.')).catch((e) => toast('No se creó el rol', mensajeError(e), 'warning')); onClose() }} className="btn-primary">Crear</button></div>}>
      <div className="p-6 space-y-3">
        <div><label className="field-label">Nombre del rol</label><input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Operador de planta" className="field" /></div>
        {repetido && <p className="text-xs text-red-600">Ya existe un rol con ese nombre.</p>}
        <div><label className="field-label">Descripción</label><input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="field" /></div>
        <div><label className="field-label">Empezar con los permisos de</label><select value={base} onChange={(e) => setBase(e.target.value)} className="field">{roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}</select></div>
      </div>
    </Modal>
  )
}

export type EstadoPeriodo = 'Pagada' | 'Pendiente' | 'Suspendido'

export type Periodo = {
  mes: number // 1-12
  anio: number
  consumo: number // m³
  estado: EstadoPeriodo
  fechaPago?: number // timestamp
  estimado?: boolean // facturado por promedio (sin lectura)
}

export type EstadoServicio = 'Activo' | 'Cortado'

/** Quien vive en el predio cuando no es el dueño (arrendatario). Recibe los avisos. */
export type Ocupante = { nombre: string; telefono: string }

/**
 * Un Usuario es un PREDIO (suscriptor): tiene su medidor, su estrato y su factura.
 * Un mismo propietario (misma cédula) puede tener varios predios.
 */
export type Usuario = {
  id: string
  /** Nombre del propietario */
  nombre: string
  /** Cédula o NIT del propietario: agrupa sus predios */
  cedula: string
  direccion: string
  ocupante?: Ocupante
  barrio: string
  estrato: 1 | 2 | 3
  medidor: string
  telefono: string
  estado: EstadoServicio
  historial: Periodo[] // orden cronológico
}

export type MetodoPago = 'Efectivo' | 'Transferencia' | 'En línea'

export type Pago = {
  id: string
  clienteId: string
  cliente: string
  facturaIds: string[]
  concepto: string
  monto: number
  metodo: MetodoPago
  recibido?: number
  vueltos?: number
  comprobante?: string
  cajero?: string // quién lo recibió ('Portal web' si lo pagó el usuario)
  timestamp: number
}

export type Factura = {
  id: string
  clienteId: string
  cliente: string
  barrio: string
  estrato: 1 | 2 | 3
  mes: number
  anio: number
  periodo: string
  consumo: number
  monto: number
  vencimiento: Date
  estado: 'Pagada' | 'Pendiente'
  vencida: boolean
  fechaPago?: number
}

export type UsuarioForm = {
  id: string
  nombre: string
  cedula: string
  direccion: string
  ocupante?: Ocupante
  barrio: string
  estrato: 1 | 2 | 3
  medidor: string
  telefono: string
}

export type Lectura = {
  valor: number // lectura del medidor (m³ acumulados)
  ts: number
  lector: string // 'Telemetría' o el usuario que la tomó en sitio
  origen: 'telemetria' | 'manual'
  foto?: string
  nota?: string
}

export type TipoPqr = 'Petición' | 'Queja' | 'Reclamo' | 'Recurso' | 'Sugerencia'
export type CategoriaPqr = 'Facturación' | 'Daño o fuga' | 'Calidad del agua' | 'Corte y reconexión' | 'Atención' | 'Otro'
export type EstadoPqr = 'Radicada' | 'En trámite' | 'Respondida' | 'Cerrada'

export type Pqr = {
  radicado: string
  tipo: TipoPqr
  categoria: CategoriaPqr
  canal: 'Presencial' | 'Teléfono' | 'WhatsApp' | 'Correo' | 'Portal web'
  suscriptorId?: string
  nombre: string
  telefono: string
  barrio: string
  descripcion: string
  estado: EstadoPqr
  radicadaEn: number
  vence: number
  responsable?: string
  respuesta?: string
  respondidaEn?: number
  historial: { ts: number; usuario: string; accion: string }[]
}

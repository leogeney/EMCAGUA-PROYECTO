export type EstadoPeriodo = 'Pagada' | 'Pendiente' | 'Suspendido'

export type Periodo = {
  mes: number // 1-12
  anio: number
  consumo: number // m³
  estado: EstadoPeriodo
  fechaPago?: number // timestamp
}

export type EstadoServicio = 'Activo' | 'Cortado'

export type Usuario = {
  id: string
  nombre: string
  barrio: string
  estrato: 1 | 2 | 3
  medidor: string
  telefono: string
  estado: EstadoServicio
  historial: Periodo[] // orden cronológico
}

export type MetodoPago = 'Efectivo' | 'Transferencia'

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
  barrio: string
  estrato: 1 | 2 | 3
  medidor: string
  telefono: string
}

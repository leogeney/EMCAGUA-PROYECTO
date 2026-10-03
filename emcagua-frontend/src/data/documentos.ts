/**
 * Plantillas de documentos de EMCAGUA APC. Cada plantilla arma un borrador con los datos
 * del sistema; el texto se puede editar o redactar con la IA local antes de emitirlo.
 */
import { COSTO_RECONEXION, MESES } from './constants'
import { lecturaMedidor, nombrePeriodo, type Resumen } from './billing'
import type { Empleado, Liquidacion } from './nomina'
import type { Pqr, Usuario } from './types'
import { cop, num } from '../utils/format'
import { crearDocx, firmas, p, pMixto, tabla } from '../utils/docx'

export type Grupo = 'Suscriptores' | 'Cartera y cobro' | 'Nómina y personal' | 'Oficios y comunicaciones'
export type Formato = 'carta' | 'certificado' | 'memorando' | 'acta' | 'comunicado'
export type Sujeto = 'suscriptor' | 'empleado' | 'pqr' | 'ninguno'

export type Campo = { k: string; label: string; tipo?: 'text' | 'textarea' | 'number' | 'date' | 'select'; opciones?: string[]; def?: string; placeholder?: string }

export type Tabla = { columnas: string[]; filas: string[][]; total?: string[] }

export type Borrador = {
  titulo?: string // certificados, actas y comunicados
  destinatario?: string[]
  asunto: string
  saludo?: string
  cuerpo: string
  despedida?: string
  tabla?: Tabla
  /** Texto destacado después de la tabla. */
  pie?: string
  firmas: { nombre: string; cargo: string }[]
  memo?: { para: string; de: string } // memorandos
}

export type Datos = {
  v: Record<string, string>
  hoy: Date
  gerente: Empleado
  u?: Usuario
  r?: Resumen
  e?: Empleado
  liq?: Liquidacion
  pqr?: Pqr
  empleados: Empleado[]
}

export type Plantilla = {
  id: string
  nombre: string
  descripcion: string
  grupo: Grupo
  prefijo: string
  formato: Formato
  sujeto: Sujeto
  soloAdmin?: boolean
  campos: Campo[]
  /** Mensaje si con estos datos no se debe expedir. */
  bloqueo?: (d: Datos) => string | null
  generar: (d: Datos) => Borrador
  /** Qué se le pide a la IA cuando redacta el cuerpo. */
  guiaIA: string
}

export const GRUPOS: Grupo[] = ['Suscriptores', 'Cartera y cobro', 'Nómina y personal', 'Oficios y comunicaciones']

export const EMPRESA = {
  nombre: 'EMCAGUA APC',
  razon: 'Empresa de Servicios Públicos de El Carmen y Guamalito · Administración Pública Cooperativa',
  ciudad: 'El Carmen, Norte de Santander',
}

export const fechaLarga = (d: Date) => `${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`
const fechaISO = (s: string) => (s ? fechaLarga(new Date(`${s}T00:00:00`)) : '[fecha]')
const sumarDias = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const iso = (d: Date) => d.toISOString().slice(0, 10)
const firmaGerente = (d: Datos) => ({ nombre: d.gerente.nombre, cargo: 'Gerente' })
const sr = (nombre: string) => `Señor(a)\n${nombre}`
const predio = (u: Usuario) => `${u.barrio}, ${EMPRESA.ciudad}`
const ultimoPeriodo = (u: Usuario) => { const p = u.historial[u.historial.length - 1]; return p ? nombrePeriodo(p.mes, p.anio) : '—' }
const antiguedad = (desde: string, hoy: Date) => {
  const a = new Date(`${desde}T00:00:00`)
  let m = (hoy.getFullYear() - a.getFullYear()) * 12 + hoy.getMonth() - a.getMonth()
  if (hoy.getDate() < a.getDate()) m--
  const anios = Math.floor(m / 12), meses = m % 12
  return [anios && `${anios} año${anios > 1 ? 's' : ''}`, meses && `${meses} mes${meses > 1 ? 'es' : ''}`].filter(Boolean).join(' y ') || 'menos de un mes'
}

function tablaDeuda(r: Resumen): Tabla {
  return {
    columnas: ['Periodo', 'Consumo', 'Vencimiento', 'Valor'],
    filas: r.pendientes.map((f) => [f.periodo, `${f.consumo} m³`, f.vencimiento.toLocaleDateString('es-CO'), cop(f.monto)]),
    total: ['Total adeudado', '', '', cop(r.deuda)],
  }
}

export const PLANTILLAS: Plantilla[] = [
  /* ---------------------------- Suscriptores ---------------------------- */
  {
    id: 'paz-salvo', nombre: 'Paz y salvo', descripcion: 'Certifica que el suscriptor no tiene deudas con la empresa.', grupo: 'Suscriptores', prefijo: 'PS', formato: 'certificado', sujeto: 'suscriptor',
    campos: [{ k: 'destino', label: 'Con destino a', placeholder: 'Ej: Notaría, venta del inmueble, banco', def: 'quien interese' }],
    bloqueo: (d) => (d.r && d.r.deuda > 0 ? `${d.u!.nombre} debe ${cop(d.r.deuda)}. No se puede expedir paz y salvo: genera un aviso de cobro o un acuerdo de pago.` : null),
    generar: (d) => ({
      titulo: 'PAZ Y SALVO',
      asunto: `Paz y salvo — ${d.u!.nombre}`,
      cuerpo: `La suscrita gerencia de ${EMPRESA.nombre}\n\nCERTIFICA:\n\nQue el(la) señor(a) ${d.u!.nombre.toUpperCase()}, suscriptor(a) No. ${d.u!.id}, del predio ubicado en el barrio ${predio(d.u!)}, estrato ${d.u!.estrato}, con medidor ${d.u!.medidor}, se encuentra a PAZ Y SALVO por concepto de los servicios de acueducto y alcantarillado hasta el periodo de ${ultimoPeriodo(d.u!)}.\n\nSe expide a solicitud del interesado, con destino a ${d.v.destino || 'quien interese'}, en ${EMPRESA.ciudad}, a los ${fechaLarga(d.hoy)}.`,
      firmas: [firmaGerente(d)],
    }),
    guiaIA: 'un certificado de paz y salvo de servicios públicos',
  },
  {
    id: 'cert-suscriptor', nombre: 'Certificado de suscriptor', descripcion: 'Constancia de que el predio tiene el servicio y su estado actual.', grupo: 'Suscriptores', prefijo: 'CS', formato: 'certificado', sujeto: 'suscriptor',
    campos: [{ k: 'destino', label: 'Con destino a', def: 'quien interese' }],
    generar: (d) => {
      const u = d.u!, desde = u.historial[0]
      return {
        titulo: 'CERTIFICADO',
        asunto: `Certificado de suscriptor — ${u.nombre}`,
        cuerpo: `La suscrita gerencia de ${EMPRESA.nombre}\n\nCERTIFICA:\n\nQue el(la) señor(a) ${u.nombre.toUpperCase()} figura como suscriptor(a) No. ${u.id} de los servicios de acueducto y alcantarillado en el predio ubicado en el barrio ${predio(u)}, estrato ${u.estrato}, con medidor No. ${u.medidor}${desde ? `, con registros de facturación desde ${nombrePeriodo(desde.mes, desde.anio)}` : ''}.\n\nA la fecha el servicio se encuentra ${u.estado === 'Activo' ? 'ACTIVO' : 'SUSPENDIDO'}, con un consumo promedio de ${num(d.r!.consumoPromedio, 1)} m³ mensuales${d.r!.deuda > 0 ? ` y un saldo pendiente de ${cop(d.r!.deuda)}` : ' y sin saldos pendientes'}.\n\nSe expide a solicitud del interesado, con destino a ${d.v.destino || 'quien interese'}, a los ${fechaLarga(d.hoy)}.`,
        firmas: [firmaGerente(d)],
      }
    },
    guiaIA: 'un certificado de suscriptor de servicios públicos',
  },

  /* --------------------------- Cartera y cobro -------------------------- */
  {
    id: 'aviso-cobro', nombre: 'Aviso de cobro', descripcion: 'Carta al usuario en mora con el detalle de lo que debe y el plazo para pagar.', grupo: 'Cartera y cobro', prefijo: 'AC', formato: 'carta', sujeto: 'suscriptor',
    campos: [{ k: 'plazo', label: 'Días para pagar', tipo: 'number', def: '5' }],
    bloqueo: (d) => (d.r && d.r.deuda <= 0 ? `${d.u!.nombre} está al día. No hay nada que cobrar.` : null),
    generar: (d) => ({
      destinatario: [sr(d.u!.nombre), `Suscriptor No. ${d.u!.id} · Medidor ${d.u!.medidor}`, predio(d.u!)],
      asunto: 'Aviso de cobro por servicios de acueducto y alcantarillado',
      saludo: 'Respetado(a) usuario(a):',
      cuerpo: `Le informamos que, revisado nuestro sistema, su cuenta presenta un saldo pendiente de ${cop(d.r!.deuda)}, correspondiente a ${d.r!.pendientes.length} factura(s) que se detallan a continuación.\n\nLe invitamos a ponerse al día dentro de los próximos ${d.v.plazo || 5} días hábiles, en nuestras oficinas o por los medios de pago autorizados. Si ya realizó el pago, por favor haga caso omiso de esta comunicación.\n\nLe recordamos que, de acuerdo con el artículo 140 de la Ley 142 de 1994, la falta de pago da lugar a la suspensión del servicio, y su restablecimiento genera un cobro de reconexión de ${cop(COSTO_RECONEXION)}. Si tiene dificultades para pagar, puede acercarse a la oficina para estudiar un acuerdo de pago.`,
      tabla: tablaDeuda(d.r!),
      despedida: 'Atentamente,',
      firmas: [firmaGerente(d)],
    }),
    guiaIA: 'una carta de cobro amable pero firme a un usuario en mora',
  },
  {
    id: 'aviso-suspension', nombre: 'Aviso de suspensión', descripcion: 'Notifica la fecha en que se suspenderá el servicio por falta de pago.', grupo: 'Cartera y cobro', prefijo: 'SU', formato: 'carta', sujeto: 'suscriptor',
    campos: [{ k: 'fecha', label: 'Fecha de suspensión', tipo: 'date' }],
    bloqueo: (d) => (d.r && d.r.deuda <= 0 ? `${d.u!.nombre} está al día. No procede la suspensión.` : null),
    generar: (d) => ({
      destinatario: [sr(d.u!.nombre), `Suscriptor No. ${d.u!.id} · Medidor ${d.u!.medidor}`, predio(d.u!)],
      asunto: 'Aviso de suspensión del servicio por falta de pago',
      saludo: 'Respetado(a) usuario(a):',
      cuerpo: `A pesar de los avisos anteriores, su cuenta continúa con un saldo vencido de ${cop(d.r!.deuda)}.\n\nPor lo anterior, y conforme al artículo 140 de la Ley 142 de 1994 y al contrato de condiciones uniformes, le informamos que el servicio de acueducto será SUSPENDIDO a partir del ${fechaISO(d.v.fecha)}, si antes de esa fecha no se ha realizado el pago o firmado un acuerdo de pago.\n\nUna vez suspendido, para restablecer el servicio deberá cancelar la totalidad de la deuda más el valor de la reconexión (${cop(COSTO_RECONEXION)}).`,
      tabla: tablaDeuda(d.r!),
      despedida: 'Atentamente,',
      firmas: [firmaGerente(d)],
    }),
    guiaIA: 'un aviso formal de suspensión del servicio de agua por falta de pago',
  },
  {
    id: 'acuerdo-pago', nombre: 'Acuerdo de pago', descripcion: 'Compromiso para pagar la deuda en cuotas mensuales, con firma de ambas partes.', grupo: 'Cartera y cobro', prefijo: 'AP', formato: 'acta', sujeto: 'suscriptor',
    campos: [
      { k: 'inicial', label: 'Cuota inicial ($)', tipo: 'number', placeholder: 'Ej: 50000' },
      { k: 'cuotas', label: 'Número de cuotas', tipo: 'select', opciones: ['2', '3', '4', '6', '8', '12'], def: '3' },
    ],
    bloqueo: (d) => (d.r && d.r.deuda <= 0 ? `${d.u!.nombre} está al día. No necesita acuerdo de pago.` : null),
    generar: (d) => {
      const deuda = d.r!.deuda
      const inicial = Math.min(deuda, Number(d.v.inicial) || Math.round(deuda * 0.3 / 1000) * 1000)
      const n = Number(d.v.cuotas) || 3
      const cuota = Math.ceil((deuda - inicial) / n / 100) * 100
      const filas = [['Cuota inicial', fechaLarga(d.hoy), cop(inicial)], ...Array.from({ length: n }, (_, i) => {
        const f = new Date(d.hoy.getFullYear(), d.hoy.getMonth() + i + 1, Math.min(d.hoy.getDate(), 28))
        return [`Cuota ${i + 1} de ${n}`, fechaLarga(f), cop(i === n - 1 ? deuda - inicial - cuota * (n - 1) : cuota)]
      })]
      return {
        titulo: 'ACUERDO DE PAGO',
        asunto: `Acuerdo de pago — ${d.u!.nombre}`,
        cuerpo: `Entre ${EMPRESA.nombre}, representada por su gerente ${d.gerente.nombre}, y el(la) señor(a) ${d.u!.nombre.toUpperCase()}, suscriptor(a) No. ${d.u!.id} del predio ubicado en ${predio(d.u!)}, se celebra el presente acuerdo de pago, así:\n\n1. El suscriptor reconoce adeudar a la empresa la suma de ${cop(deuda)} por concepto de servicios de acueducto y alcantarillado.\n\n2. El suscriptor pagará una cuota inicial de ${cop(inicial)} y el saldo de ${cop(deuda - inicial)} en ${n} cuotas mensuales, según el cuadro siguiente.\n\n3. Además de las cuotas, el suscriptor se compromete a pagar oportunamente las facturas que se generen mientras dure el acuerdo.\n\n4. El incumplimiento de dos (2) cuotas dará por terminado el acuerdo, la deuda será exigible en su totalidad y procederá la suspensión del servicio.\n\nPara constancia se firma en ${EMPRESA.ciudad}, a los ${fechaLarga(d.hoy)}.`,
        tabla: { columnas: ['Concepto', 'Fecha límite', 'Valor'], filas, total: ['Total', '', cop(deuda)] },
        firmas: [firmaGerente(d), { nombre: d.u!.nombre, cargo: `Suscriptor(a) No. ${d.u!.id}` }],
      }
    },
    guiaIA: 'un acuerdo de pago de deuda de servicios públicos',
  },

  /* -------------------------- Nómina y personal ------------------------- */
  {
    id: 'cert-laboral', nombre: 'Certificado laboral', descripcion: 'Certifica cargo, tipo de contrato, antigüedad y (opcional) salario.', grupo: 'Nómina y personal', prefijo: 'CL', formato: 'certificado', sujeto: 'empleado', soloAdmin: true,
    campos: [
      { k: 'salario', label: '¿Incluir salario?', tipo: 'select', opciones: ['Sí', 'No'], def: 'Sí' },
      { k: 'destino', label: 'Con destino a', def: 'quien interese' },
    ],
    generar: (d) => {
      const e = d.e!
      return {
        titulo: 'CERTIFICADO LABORAL',
        asunto: `Certificado laboral — ${e.nombre}`,
        cuerpo: `La suscrita gerencia de ${EMPRESA.nombre}\n\nCERTIFICA:\n\nQue el(la) señor(a) ${e.nombre.toUpperCase()}, identificado(a) con cédula de ciudadanía No. ${e.cedula}, labora en esta empresa desde el ${fechaISO(e.fechaIngreso)} (${antiguedad(e.fechaIngreso, d.hoy)}), con contrato a ${e.contrato.toLowerCase()}, desempeñando el cargo de ${e.cargo.toUpperCase()} en el área ${e.area.toLowerCase()}${d.v.salario === 'No' ? '' : `, con un salario básico mensual de ${cop(e.salario)}`}.\n\nSe expide a solicitud del interesado, con destino a ${d.v.destino || 'quien interese'}, en ${EMPRESA.ciudad}, a los ${fechaLarga(d.hoy)}.`,
        firmas: [firmaGerente(d)],
      }
    },
    guiaIA: 'un certificado laboral',
  },
  {
    id: 'desprendible', nombre: 'Desprendible de pago', descripcion: 'Detalle de devengados, deducciones y neto pagado al empleado en el mes.', grupo: 'Nómina y personal', prefijo: 'DP', formato: 'certificado', sujeto: 'empleado', soloAdmin: true,
    campos: [{ k: 'periodo', label: 'Mes de nómina', tipo: 'select' }],
    generar: (d) => {
      const l = d.liq!, e = d.e!
      const filas: string[][] = [
        ['Salario básico', `${l.novedad.dias} días`, cop(l.basico), ''],
        ...(l.auxilio ? [['Auxilio de transporte', '', cop(l.auxilio), '']] : []),
        ...l.extras.filter((x) => x.horas > 0).map((x) => [x.concepto, `${num(x.horas)} h`, cop(x.valor), '']),
        ...(l.comisiones ? [['Comisiones', '', cop(l.comisiones), '']] : []),
        ...(l.bonificacion ? [['Bonificación (no salarial)', '', cop(l.bonificacion), '']] : []),
        ['Aporte a salud (4%)', '', '', cop(l.salud)],
        ['Aporte a pensión (4%)', '', '', cop(l.pension)],
        ...(l.fsp ? [[`Fondo de solidaridad pensional (${num(l.tasaFsp * 100, 1)}%)`, '', '', cop(l.fsp)]] : []),
        ...(l.otrosDescuentos ? [['Otros descuentos (préstamos, libranzas, retención)', '', '', cop(l.otrosDescuentos)]] : []),
      ]
      return {
        titulo: 'COMPROBANTE DE PAGO DE NÓMINA',
        asunto: `Desprendible ${d.v.periodo} — ${e.nombre}`,
        cuerpo: `Empleado: ${e.nombre} · C.C. ${e.cedula}\nCargo: ${e.cargo} · Periodo: ${d.v.periodo}\nEPS: ${e.eps} · Pensión: ${e.pension}`,
        tabla: { columnas: ['Concepto', 'Cantidad', 'Devengado', 'Deducido'], filas, total: ['Totales', '', cop(l.devengado), cop(l.deducciones)] },
        pie: `NETO PAGADO: ${cop(l.neto)}`,
        firmas: [firmaGerente(d), { nombre: e.nombre, cargo: 'Recibí conforme' }],
      }
    },
    guiaIA: 'una nota breve para un desprendible de pago',
  },
  {
    id: 'memorando', nombre: 'Memorando', descripcion: 'Comunicación interna a un empleado: instrucción, información o llamado de atención.', grupo: 'Nómina y personal', prefijo: 'ME', formato: 'memorando', sujeto: 'empleado',
    campos: [
      { k: 'clase', label: 'Tipo', tipo: 'select', opciones: ['Informativo', 'Instrucción', 'Llamado de atención', 'Felicitación'], def: 'Informativo' },
      { k: 'asunto', label: 'Asunto', placeholder: 'Ej: Uso de la dotación' },
      { k: 'texto', label: 'Qué quieres decir', tipo: 'textarea', placeholder: 'Escríbelo con tus palabras; la IA lo puede redactar formal.' },
    ],
    generar: (d) => {
      const llamado = d.v.clase === 'Llamado de atención'
      return {
        titulo: `MEMORANDO ${d.v.clase?.toUpperCase() ?? ''}`.trim(),
        memo: { para: `${d.e!.nombre} — ${d.e!.cargo}`, de: `${d.gerente.nombre} — Gerente` },
        asunto: d.v.asunto || '[Asunto]',
        cuerpo: d.v.texto || (llamado
          ? `Por medio del presente le hacemos un llamado de atención por [describir el hecho, fecha y lugar].\n\nLe recordamos que esta conducta va en contra de [norma o reglamento interno incumplido]. Le solicitamos [acción esperada] y le informamos que una nueva falta podrá dar lugar a las medidas disciplinarias previstas en el reglamento interno de trabajo.\n\nCopia de este memorando se archiva en su hoja de vida.`
          : '[Escribe aquí el contenido del memorando]'),
        despedida: 'Cordialmente,',
        firmas: [firmaGerente(d), ...(llamado ? [{ nombre: d.e!.nombre, cargo: 'Recibido por' }] : [])],
      }
    },
    guiaIA: 'un memorando interno de una empresa',
  },

  /* ---------------------- Oficios y comunicaciones ---------------------- */
  {
    id: 'oficio', nombre: 'Oficio', descripcion: 'Carta formal a cualquier persona o entidad.', grupo: 'Oficios y comunicaciones', prefijo: 'OF', formato: 'carta', sujeto: 'ninguno',
    campos: [
      { k: 'nombre', label: 'Destinatario', placeholder: 'Ej: Dr. Carlos Pérez' },
      { k: 'cargo', label: 'Cargo', placeholder: 'Ej: Alcalde municipal' },
      { k: 'entidad', label: 'Entidad', placeholder: 'Ej: Alcaldía de El Carmen' },
      { k: 'asunto', label: 'Asunto' },
      { k: 'texto', label: 'Qué quieres decir', tipo: 'textarea', placeholder: 'Escríbelo con tus palabras; la IA lo puede redactar formal.' },
    ],
    generar: (d) => ({
      destinatario: [d.v.nombre || '[Nombre del destinatario]', d.v.cargo, d.v.entidad, EMPRESA.ciudad].filter(Boolean),
      asunto: d.v.asunto || '[Asunto]',
      saludo: 'Respetado(a) señor(a):',
      cuerpo: d.v.texto || '[Escribe aquí el contenido del oficio]',
      despedida: 'Atentamente,',
      firmas: [firmaGerente(d)],
    }),
    guiaIA: 'un oficio formal',
  },
  {
    id: 'peticion', nombre: 'Derecho de petición', descripcion: 'Solicitud formal a una entidad (alcaldía, CORPONOR, Superservicios…).', grupo: 'Oficios y comunicaciones', prefijo: 'DPE', formato: 'carta', sujeto: 'ninguno',
    campos: [
      { k: 'nombre', label: 'Dirigido a', placeholder: 'Ej: Director(a)' },
      { k: 'entidad', label: 'Entidad', placeholder: 'Ej: CORPONOR' },
      { k: 'asunto', label: 'Asunto', placeholder: 'Ej: Solicitud de concesión de aguas' },
      { k: 'hechos', label: 'Hechos (qué pasó)', tipo: 'textarea' },
      { k: 'solicitud', label: 'Qué se solicita', tipo: 'textarea' },
    ],
    generar: (d) => ({
      destinatario: [d.v.nombre || '[Cargo o nombre]', d.v.entidad || '[Entidad]', 'E. S. D.'],
      asunto: `Derecho de petición — ${d.v.asunto || '[asunto]'}`,
      saludo: 'Respetado(a) señor(a):',
      cuerpo: `${d.gerente.nombre}, en calidad de gerente y representante legal de ${EMPRESA.nombre}, en ejercicio del derecho fundamental de petición consagrado en el artículo 23 de la Constitución Política y regulado por la Ley 1755 de 2015, respetuosamente me dirijo a ustedes con base en los siguientes:\n\nHECHOS\n\n${d.v.hechos || '[Describa los hechos en orden]'}\n\nPETICIÓN\n\n${d.v.solicitud || '[Lo que se solicita, de forma concreta]'}\n\nNOTIFICACIONES\n\nRecibiré respuesta en las oficinas de ${EMPRESA.nombre}, ${EMPRESA.ciudad}, dentro del término legal de quince (15) días hábiles.`,
      despedida: 'Atentamente,',
      firmas: [{ nombre: d.gerente.nombre, cargo: 'Gerente y representante legal' }],
    }),
    guiaIA: 'un derecho de petición dirigido a una entidad pública colombiana',
  },
  {
    id: 'respuesta-pqr', nombre: 'Respuesta formal a PQR', descripcion: 'Carta de respuesta al usuario con los recursos de ley.', grupo: 'Oficios y comunicaciones', prefijo: 'RP', formato: 'carta', sujeto: 'pqr',
    campos: [{ k: 'texto', label: 'Respuesta', tipo: 'textarea', placeholder: 'Si la PQR ya tiene respuesta, se usa esa.' }],
    generar: (d) => {
      const p = d.pqr!
      return {
        destinatario: [sr(p.nombre), p.suscriptorId ? `Suscriptor No. ${p.suscriptorId}` : '', `Barrio ${p.barrio}, ${EMPRESA.ciudad}`, `Tel. ${p.telefono}`].filter(Boolean),
        asunto: `Respuesta a ${p.tipo.toLowerCase()} radicada No. ${p.radicado}`,
        saludo: 'Respetado(a) usuario(a):',
        cuerpo: `En atención a su ${p.tipo.toLowerCase()} radicada el ${fechaLarga(new Date(p.radicadaEn))}, en la que manifiesta: "${p.descripcion}", nos permitimos dar respuesta en los siguientes términos:\n\n${d.v.texto || p.respuesta || '[Respuesta de fondo a lo solicitado]'}\n\nContra esta decisión proceden los recursos de reposición ante esta empresa y, en subsidio, de apelación ante la Superintendencia de Servicios Públicos Domiciliarios, que deberán presentarse dentro de los cinco (5) días hábiles siguientes a su notificación (artículo 154 de la Ley 142 de 1994).`,
        despedida: 'Atentamente,',
        firmas: [firmaGerente(d)],
      }
    },
    guiaIA: 'la respuesta de fondo a una PQR de un usuario de servicios públicos',
  },
  {
    id: 'acta-visita', nombre: 'Acta de visita técnica', descripcion: 'Registro de la visita al predio: lectura, hallazgos y acciones.', grupo: 'Oficios y comunicaciones', prefijo: 'AV', formato: 'acta', sujeto: 'suscriptor',
    campos: [
      { k: 'motivo', label: 'Motivo', tipo: 'select', opciones: ['Posible fuga', 'Revisión de medidor', 'Medidor sin comunicación', 'Posible manipulación', 'Atención de PQR', 'Corte del servicio', 'Reconexión'], def: 'Posible fuga' },
      { k: 'tecnico', label: 'Técnico', tipo: 'select' },
      { k: 'hallazgos', label: 'Hallazgos', tipo: 'textarea', placeholder: 'Ej: fuga en el flotador del tanque' },
      { k: 'acciones', label: 'Acciones y recomendaciones', tipo: 'textarea' },
    ],
    generar: (d) => {
      const u = d.u!
      const tec = d.empleados.find((x) => x.nombre === d.v.tecnico) ?? d.empleados.find((x) => x.area === 'Operativa')!
      return {
        titulo: 'ACTA DE VISITA TÉCNICA',
        asunto: `Acta de visita — ${u.nombre}`,
        cuerpo: `En ${EMPRESA.ciudad}, el ${fechaLarga(d.hoy)}, se realizó visita técnica al predio del(la) suscriptor(a) ${u.nombre.toUpperCase()}, No. ${u.id}, barrio ${u.barrio}, estrato ${u.estrato}.\n\nMotivo de la visita: ${d.v.motivo || '[motivo]'}.\nMedidor: ${u.medidor} · Lectura encontrada: ${num(lecturaMedidor(u))} m³ · Estado del servicio: ${u.estado}.\n\nHALLAZGOS\n\n${d.v.hallazgos || '[Lo que se encontró en el predio]'}\n\nACCIONES Y RECOMENDACIONES\n\n${d.v.acciones || '[Lo que se hizo y lo que se recomienda al usuario]'}\n\nEl usuario manifiesta conocer el contenido de la presente acta y firma en constancia.`,
        firmas: [{ nombre: tec.nombre, cargo: tec.cargo }, { nombre: u.nombre, cargo: 'Suscriptor(a) o quien atiende' }],
      }
    },
    guiaIA: 'un acta de visita técnica a un predio por parte de la empresa de acueducto',
  },
  {
    id: 'comunicado', nombre: 'Comunicado a la comunidad', descripcion: 'Aviso público: cortes programados, mantenimientos, calidad del agua.', grupo: 'Oficios y comunicaciones', prefijo: 'CO', formato: 'comunicado', sujeto: 'ninguno',
    campos: [
      { k: 'clase', label: 'Tipo', tipo: 'select', opciones: ['Suspensión programada', 'Mantenimiento de redes', 'Calidad del agua', 'Informativo'], def: 'Suspensión programada' },
      { k: 'barrios', label: 'Barrios afectados', placeholder: 'Ej: Centro y La Esperanza' },
      { k: 'fecha', label: 'Fecha', tipo: 'date' },
      { k: 'horario', label: 'Horario', placeholder: 'Ej: 8:00 a. m. a 4:00 p. m.' },
      { k: 'texto', label: 'Motivo o mensaje', tipo: 'textarea', placeholder: 'Ej: cambio de válvula en la red principal' },
    ],
    generar: (d) => {
      const corte = d.v.clase === 'Suspensión programada' || d.v.clase === 'Mantenimiento de redes'
      return {
        titulo: `COMUNICADO A LA COMUNIDAD`,
        asunto: d.v.clase || 'Comunicado',
        cuerpo: corte
          ? `${EMPRESA.nombre} informa a los usuarios de ${d.v.barrios || '[barrios]'} que el ${fechaISO(d.v.fecha)}, en el horario de ${d.v.horario || '[horario]'}, se suspenderá el servicio de acueducto debido a ${d.v.texto || '[motivo]'}.\n\nRecomendamos almacenar agua para las necesidades básicas y mantener las llaves cerradas durante la suspensión. El servicio se restablecerá de forma gradual una vez terminen los trabajos.\n\nAgradecemos su comprensión. Estos trabajos buscan mejorar la calidad y continuidad del servicio.`
          : `${EMPRESA.nombre} informa a la comunidad${d.v.barrios ? ` de ${d.v.barrios}` : ''}:\n\n${d.v.texto || '[Mensaje]'}`,
        firmas: [{ nombre: 'Gerencia', cargo: EMPRESA.nombre }],
      }
    },
    guiaIA: 'un comunicado público corto y claro para la comunidad, que se leerá en la emisora y se pegará en carteleras',
  },
]

export const plantilla = (id: string) => PLANTILLAS.find((p) => p.id === id)!

/* --------------------------- Exportar a Word --------------------------- */

const VERDE = '156D6D'
let logoCache: Uint8Array | undefined

async function logo() {
  if (logoCache) return logoCache
  try {
    const r = await fetch('/logo_circulo.png')
    if (r.ok) logoCache = new Uint8Array(await r.arrayBuffer())
  } catch { /* sin logo */ }
  return logoCache
}

/** Cuerpo del documento en WordprocessingML (mismo orden que la vista previa). */
function cuerpoDocx(b: Borrador, consecutivo: string, fecha: Date, formato: Formato) {
  const out: string[] = [p(consecutivo, { alin: 'right', tam: 8, color: '666666', antes: 120 })]
  if (formato === 'carta') {
    out.push(p(`${EMPRESA.ciudad.split(',')[0]}, ${fechaLarga(fecha)}`, { despues: 280 }))
    out.push(p((b.destinatario ?? []).join('\n'), { despues: 280 }))
    out.push(pMixto([['Asunto: ', true], [b.asunto, false]], { despues: 240 }))
    if (b.saludo) out.push(p(b.saludo))
  }
  if (b.titulo) out.push(p(b.titulo, { b: true, tam: 13, alin: 'center', espaciado: 30, antes: 240, despues: 360 }))
  if (b.memo) {
    out.push(pMixto([['PARA: ', true], [b.memo.para, false]], { despues: 40 }), pMixto([['DE: ', true], [b.memo.de, false]], { despues: 40 }), pMixto([['FECHA: ', true], [fechaLarga(fecha), false]], { despues: 40 }))
    out.push(pMixto([['ASUNTO: ', true], [b.asunto, false]], { despues: 0 }), p('', { bordeAbajo: 'BBBBBB', despues: 240 }))
  }
  b.cuerpo.split(/\n{2,}/).forEach((par) => {
    const t = par.trim()
    const titulo = /^[A-ZÁÉÍÓÚÑ ,:]+:?$/.test(t)
    out.push(p(t, titulo ? { b: true, alin: 'center', antes: 120, despues: 200 } : { alin: t.includes('\n') ? 'left' : 'both' }))
  })
  if (b.tabla) out.push(tabla(b.tabla.columnas, b.tabla.filas, b.tabla.total, VERDE))
  if (b.pie) out.push(p(b.pie, { b: true, tam: 12, alin: 'right' }))
  if (b.despedida) out.push(p(b.despedida, { antes: 120 }))
  out.push(firmas(b.firmas))
  return out.join('')
}

/** Descarga el documento como .docx real, con el logo en el encabezado de cada página. */
export async function descargarWord(nombre: string, b: Borrador, consecutivo: string, fecha: Date, formato: Formato) {
  const blob = crearDocx(cuerpoDocx(b, consecutivo, fecha, formato), {
    logo: await logo(),
    logoAncho: 0.62,
    logoAlto: 0.7,
    titulo: EMPRESA.nombre,
    lineas: [EMPRESA.razon, EMPRESA.ciudad],
    color: VERDE,
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombre}.docx`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const sugerirFecha = (d: Date, dias: number) => iso(sumarDias(d, dias))

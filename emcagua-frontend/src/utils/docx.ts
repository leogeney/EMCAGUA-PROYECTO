/**
 * Generador mínimo de archivos .docx (Word) sin dependencias:
 * arma el XML de Office Open y lo empaqueta en un ZIP sin compresión.
 */

/* ------------------------------- ZIP ------------------------------- */

const CRC_TABLA = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(d: Uint8Array) {
  let c = 0xffffffff
  for (let i = 0; i < d.length; i++) c = CRC_TABLA[(c ^ d[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export function zip(archivos: { nombre: string; datos: Uint8Array | string }[]): Blob {
  const enc = new TextEncoder()
  const partes: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  for (const a of archivos) {
    const nombre = enc.encode(a.nombre)
    const datos = typeof a.datos === 'string' ? enc.encode(a.datos) : a.datos
    const crc = crc32(datos)
    const local = new Uint8Array(30 + nombre.length)
    const v = new DataView(local.buffer)
    v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(6, 0x0800, true); v.setUint16(8, 0, true)
    v.setUint32(14, crc, true); v.setUint32(18, datos.length, true); v.setUint32(22, datos.length, true); v.setUint16(26, nombre.length, true)
    local.set(nombre, 30)
    const cen = new Uint8Array(46 + nombre.length)
    const w = new DataView(cen.buffer)
    w.setUint32(0, 0x02014b50, true); w.setUint16(4, 20, true); w.setUint16(6, 20, true); w.setUint16(8, 0x0800, true)
    w.setUint32(16, crc, true); w.setUint32(20, datos.length, true); w.setUint32(24, datos.length, true); w.setUint16(28, nombre.length, true)
    w.setUint32(42, offset, true)
    cen.set(nombre, 46)
    partes.push(local, datos)
    central.push(cen)
    offset += local.length + datos.length
  }
  const tamCentral = central.reduce((s, c) => s + c.length, 0)
  const fin = new Uint8Array(22)
  const f = new DataView(fin.buffer)
  f.setUint32(0, 0x06054b50, true); f.setUint16(8, archivos.length, true); f.setUint16(10, archivos.length, true)
  f.setUint32(12, tamCentral, true); f.setUint32(16, offset, true)
  return new Blob([...partes, ...central, fin].map((u) => u.slice().buffer), { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
}

/* ---------------------------- WordprocessingML ---------------------------- */

const x = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export type Estilo = { b?: boolean; tam?: number; color?: string; alin?: 'left' | 'center' | 'right' | 'both'; despues?: number; antes?: number; espaciado?: number; bordeAbajo?: string; bordeArriba?: string }

/** Párrafo; los saltos de línea simples se vuelven <w:br/>. */
export function p(texto: string, e: Estilo = {}) {
  const rpr = `<w:rPr>${e.b ? '<w:b/>' : ''}${e.color ? `<w:color w:val="${e.color}"/>` : ''}${e.tam ? `<w:sz w:val="${e.tam * 2}"/><w:szCs w:val="${e.tam * 2}"/>` : ''}${e.espaciado ? `<w:spacing w:val="${e.espaciado}"/>` : ''}</w:rPr>`
  const runs = texto.split('\n').map((l, i) => `<w:r>${rpr}${i ? '<w:br/>' : ''}<w:t xml:space="preserve">${x(l)}</w:t></w:r>`).join('')
  const bordes = e.bordeAbajo || e.bordeArriba ? `<w:pBdr>${e.bordeArriba ? `<w:top w:val="single" w:sz="8" w:space="4" w:color="${e.bordeArriba}"/>` : ''}${e.bordeAbajo ? `<w:bottom w:val="single" w:sz="12" w:space="6" w:color="${e.bordeAbajo}"/>` : ''}</w:pBdr>` : ''
  return `<w:p><w:pPr>${bordes}<w:spacing w:before="${e.antes ?? 0}" w:after="${e.despues ?? 160}"/>${e.alin ? `<w:jc w:val="${e.alin}"/>` : ''}</w:pPr>${runs}</w:p>`
}

/** Párrafo con partes en negrita: [['Asunto: ', true], ['texto', false]] */
export function pMixto(partes: [string, boolean][], e: Estilo = {}) {
  const runs = partes.map(([t, b]) => `<w:r><w:rPr>${b ? '<w:b/>' : ''}</w:rPr><w:t xml:space="preserve">${x(t)}</w:t></w:r>`).join('')
  return `<w:p><w:pPr><w:spacing w:before="0" w:after="${e.despues ?? 160}"/>${e.alin ? `<w:jc w:val="${e.alin}"/>` : ''}</w:pPr>${runs}</w:p>`
}

const SIN_BORDES = '<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>'

/** Tabla de datos con encabezado de color y fila de total opcional. Columnas 2+ alineadas a la derecha. */
export function tabla(columnas: string[], filas: string[][], total: string[] | undefined, color: string) {
  const celda = (t: string, j: number, o: { head?: boolean; total?: boolean } = {}) =>
    `<w:tc><w:tcPr>${o.head ? `<w:shd w:val="clear" w:color="auto" w:fill="${color}"/>` : ''}<w:tcBorders>${o.total ? `<w:top w:val="single" w:sz="12" w:color="${color}"/>` : ''}<w:bottom w:val="single" w:sz="4" w:color="${o.head ? color : 'DDDDDD'}"/></w:tcBorders><w:tcMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/></w:tcMar></w:tcPr>${p(t, { b: o.head || o.total, tam: o.head ? 9 : 10, color: o.head ? 'FFFFFF' : undefined, alin: j ? 'right' : 'left', despues: 0 })}</w:tc>`
  const fila = (r: string[], o: { head?: boolean; total?: boolean } = {}) => `<w:tr>${o.head ? '<w:trPr><w:tblHeader/></w:trPr>' : ''}${r.map((c, j) => celda(c, j, o)).join('')}</w:tr>`
  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>${SIN_BORDES}<w:tblCellMar><w:left w:w="90" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${columnas.map(() => '<w:gridCol/>').join('')}</w:tblGrid>${fila(columnas, { head: true })}${filas.map((r) => fila(r)).join('')}${total ? fila(total, { total: true }) : ''}</w:tbl>${p('', { despues: 120 })}`
}

/** Bloque de firmas: una o dos columnas con línea arriba. */
export function firmas(lista: { nombre: string; cargo: string }[]) {
  const ancho = Math.floor(5000 / Math.max(2, lista.length))
  const tc = (f: { nombre: string; cargo: string }) => `<w:tc><w:tcPr><w:tcW w:w="${ancho}" w:type="pct"/><w:tcMar><w:right w:w="500" w:type="dxa"/></w:tcMar></w:tcPr>${p(f.nombre, { b: true, despues: 0, bordeArriba: '444444' })}${p(f.cargo, { tam: 9, color: '666666', despues: 0 })}</w:tc>`
  return `${p('', { despues: 900 })}<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>${SIN_BORDES}</w:tblPr><w:tblGrid>${lista.map(() => '<w:gridCol/>').join('')}</w:tblGrid><w:tr>${lista.map(tc).join('')}${lista.length === 1 ? `<w:tc><w:tcPr><w:tcW w:w="${ancho}" w:type="pct"/></w:tcPr>${p('', { despues: 0 })}</w:tc>` : ''}</w:tr></w:tbl>`
}

type Encabezado = { logo?: Uint8Array; logoAncho: number; logoAlto: number; titulo: string; lineas: string[]; color: string }

function encabezadoXml(h: Encabezado) {
  const EMU = 914400 // por pulgada
  const cx = Math.round(h.logoAncho * EMU), cy = Math.round(h.logoAlto * EMU)
  const imagen = h.logo
    ? `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="1" name="Logo"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="1" name="logo.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`
    : ''
  const celdaLogo = `<w:tc><w:tcPr><w:tcW w:w="1300" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr>${imagen}</w:p></w:tc>`
  const celdaTexto = `<w:tc><w:tcPr><w:tcW w:w="8000" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>${p(h.titulo, { b: true, tam: 16, color: h.color, despues: 40 })}${h.lineas.map((l) => p(l, { tam: 8, color: '666666', despues: 0 })).join('')}</w:tc>`
  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>${SIN_BORDES}</w:tblPr><w:tblGrid><w:gridCol w:w="1300"/><w:gridCol w:w="8000"/></w:tblGrid><w:tr>${celdaLogo}${celdaTexto}</w:tr></w:tbl>${p('', { despues: 0, bordeAbajo: h.color, tam: 4 })}`
}

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"'

/** Arma el .docx: el encabezado (logo + membrete) se repite en todas las páginas. */
export function crearDocx(cuerpoXml: string, h: Encabezado): Blob {
  const decl = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  const documento = `${decl}<w:document ${NS}><w:body>${cuerpoXml}<w:sectPr><w:headerReference w:type="default" r:id="rHeader"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="2300" w:right="1300" w:bottom="1300" w:left="1500" w:header="500" w:footer="500" w:gutter="0"/></w:sectPr></w:body></w:document>`
  const header = `${decl}<w:hdr ${NS}>${encabezadoXml(h)}</w:hdr>`
  const estilos = `${decl}<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/><w:color w:val="222222"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="es-CO"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`
  const tipos = `${decl}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`
  const rels = `${decl}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`
  const docRels = `${decl}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
  const headerRels = `${decl}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${h.logo ? '<Relationship Id="rLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/>' : ''}</Relationships>`
  return zip([
    { nombre: '[Content_Types].xml', datos: tipos },
    { nombre: '_rels/.rels', datos: rels },
    { nombre: 'word/document.xml', datos: documento },
    { nombre: 'word/_rels/document.xml.rels', datos: docRels },
    { nombre: 'word/header1.xml', datos: header },
    { nombre: 'word/_rels/header1.xml.rels', datos: headerRels },
    { nombre: 'word/styles.xml', datos: estilos },
    ...(h.logo ? [{ nombre: 'word/media/logo.png', datos: h.logo }] : []),
  ])
}

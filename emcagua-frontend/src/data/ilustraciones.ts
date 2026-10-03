/**
 * Ilustraciones propias (SVG, estilo plano) para las piezas de redes.
 * Gente del común, casas de teja, montañas y "Gotita", la mascota de EMCAGUA.
 */

const C = {
  teal: '#156D6D', tealD: '#0F4F4F', green: '#8AC43A', greenD: '#5A8426', agua: '#38BDF8', aguaL: '#BAE6FD', aguaD: '#0284C7',
  muro: '#FFF7E6', muro2: '#FDE7C7', teja: '#C2410C', tejaD: '#9A3412', madera: '#92400E', amarillo: '#FBBF24', naranja: '#F97316',
  gris: '#94A3B8', grisL: '#E2E8F0', blanco: '#FFFFFF', oscuro: '#1F2937', mejilla: '#FB7185',
}
const PIEL = ['#E0B08A', '#C68A5E', '#8D5A3B']

const sombra = (cx = 200, cy = 372, rx = 160) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="16" fill="#000" opacity=".12"/>`

const montanas = () => `<g clip-path="url(#marco)"><circle cx="200" cy="215" r="178" fill="#fff" opacity=".14"/>
  <path d="M0 250 L70 170 L120 215 L190 130 L270 225 L320 180 L400 240 L400 400 L0 400Z" fill="${C.greenD}" opacity=".35"/>
  <path d="M0 285 L90 225 L160 265 L240 205 L330 260 L400 230 L400 400 L0 400Z" fill="${C.green}" opacity=".45"/></g>`

function casa(x: number, y: number, w: number, h: number, muro = C.muro) {
  const techo = h * 0.32
  const tejas = Array.from({ length: Math.floor(w / 14) + 2 }, (_, i) => `<line x1="${-10 + i * 14}" y1="${techo}" x2="${w / 2 + (i * 14 - w / 2) * 0.35}" y2="4" stroke="${C.tejaD}" stroke-width="2" opacity=".5"/>`).join('')
  return `<g transform="translate(${x} ${y})">
    <rect x="0" y="${techo}" width="${w}" height="${h - techo}" fill="${muro}"/>
    <rect x="0" y="${h - 10}" width="${w}" height="10" fill="${C.muro2}"/>
    <path d="M-12 ${techo + 4} L${w / 2} 0 L${w + 12} ${techo + 4}Z" fill="${C.teja}"/>${tejas}
    <rect x="${w * 0.4}" y="${h * 0.58}" width="${w * 0.22}" height="${h * 0.42}" rx="3" fill="${C.madera}"/>
    <rect x="${w * 0.1}" y="${h * 0.5}" width="${w * 0.2}" height="${w * 0.2}" fill="${C.aguaL}" stroke="${C.madera}" stroke-width="4"/>
    <rect x="${w * 0.7}" y="${h * 0.5}" width="${w * 0.2}" height="${w * 0.2}" fill="${C.aguaL}" stroke="${C.madera}" stroke-width="4"/>
  </g>`
}

type Persona = { x: number; y: number; piel: string; pelo: string; ropa: string; pantalon?: string; manoI: [number, number]; manoD: [number, number]; pelo_largo?: boolean; casco?: boolean; escala?: number }

/** Persona de pie; (x, y) son los pies. Las manos son relativas a los pies. */
function persona(p: Persona) {
  const s = p.escala ?? 1
  const brazo = (h: [number, number], lado: number) => `<path d="M${lado * 20} -118 Q${lado * 30 + (h[0] - lado * 20) * 0.3} ${-100 + (h[1] + 118) * 0.2} ${h[0]} ${h[1]}" stroke="${p.ropa}" stroke-width="15" fill="none" stroke-linecap="round"/><circle cx="${h[0]}" cy="${h[1]}" r="8" fill="${p.piel}"/>`
  return `<g transform="translate(${p.x} ${p.y}) scale(${s})">
    <rect x="-17" y="-62" width="14" height="62" rx="6" fill="${p.pantalon ?? C.tealD}"/><rect x="3" y="-62" width="14" height="62" rx="6" fill="${p.pantalon ?? C.tealD}"/>
    <ellipse cx="-11" cy="-2" rx="11" ry="5" fill="${C.oscuro}"/><ellipse cx="11" cy="-2" rx="11" ry="5" fill="${C.oscuro}"/>
    <path d="M-24 -60 Q-26 -124 0 -128 Q26 -124 24 -60Z" fill="${p.ropa}"/>
    ${brazo(p.manoI, -1)}${brazo(p.manoD, 1)}
    <rect x="-6" y="-140" width="12" height="14" fill="${p.piel}"/>
    ${p.pelo_largo ? `<path d="M-23 -168 Q-32 -136 -26 -112 L-12 -116 Q-18 -146 -12 -172Z" fill="${p.pelo}"/><path d="M23 -168 Q32 -136 26 -112 L12 -116 Q18 -146 12 -172Z" fill="${p.pelo}"/>` : ''}
    <circle cx="0" cy="-160" r="22" fill="${p.piel}"/>
    <path d="M-23 -162 Q-22 -186 0 -186 Q22 -186 23 -162 Q12 -172 -23 -162Z" fill="${p.pelo}"/>
    ${p.casco ? `<path d="M-26 -164 Q-25 -192 0 -192 Q25 -192 26 -164Z" fill="${C.amarillo}"/><rect x="-30" y="-167" width="60" height="6" rx="3" fill="${C.naranja}"/>` : ''}
    <circle cx="-8" cy="-158" r="2.6" fill="${C.oscuro}"/><circle cx="8" cy="-158" r="2.6" fill="${C.oscuro}"/>
    <path d="M-7 -148 Q0 -142 7 -148" stroke="${C.oscuro}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <circle cx="-14" cy="-150" r="4" fill="${C.mejilla}" opacity=".35"/><circle cx="14" cy="-150" r="4" fill="${C.mejilla}" opacity=".35"/>
  </g>`
}

/** Gotita: la mascota. (x, y) es el centro de la panza. */
function gotita(x: number, y: number, s = 1, extra = '', brazos = '') {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    ${brazos}
    <path d="M0 -92 C24 -56 52 -24 52 12 A52 52 0 1 1 -52 12 C-52 -24 -24 -56 0 -92Z" fill="${C.agua}"/>
    <path d="M-30 -6 C-30 -30 -16 -48 -6 -62" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round" opacity=".55"/>
    <ellipse cx="-17" cy="6" rx="7" ry="9" fill="${C.oscuro}"/><ellipse cx="17" cy="6" rx="7" ry="9" fill="${C.oscuro}"/>
    <circle cx="-15" cy="3" r="2.5" fill="#fff"/><circle cx="19" cy="3" r="2.5" fill="#fff"/>
    <path d="M-14 26 Q0 40 14 26" stroke="${C.oscuro}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <circle cx="-30" cy="22" r="7" fill="${C.mejilla}" opacity=".45"/><circle cx="30" cy="22" r="7" fill="${C.mejilla}" opacity=".45"/>
    ${extra}
  </g>`
}
const brazoG = (x1: number, y1: number, x2: number, y2: number) => `<path d="M${x1} ${y1} Q${(x1 + x2) / 2} ${Math.min(y1, y2) - 10} ${x2} ${y2}" stroke="${C.aguaD}" stroke-width="10" fill="none" stroke-linecap="round"/><circle cx="${x2}" cy="${y2}" r="9" fill="${C.agua}" stroke="${C.aguaD}" stroke-width="3"/>`

function grifo(x: number, y: number, s = 1, conAgua = false) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <rect x="-70" y="-14" width="70" height="28" rx="6" fill="${C.gris}"/>
    <path d="M-6 -18 L40 -18 Q62 -18 62 4 L62 26 L40 26 L40 8 L-6 8Z" fill="${C.grisL}" stroke="${C.gris}" stroke-width="4"/>
    <rect x="8" y="-44" width="14" height="28" fill="${C.gris}"/><rect x="-10" y="-52" width="50" height="12" rx="6" fill="${C.teja}"/>
    ${conAgua ? `<path d="M44 30 Q51 70 44 110 L58 110 Q51 70 58 30Z" fill="${C.agua}" opacity=".8"/>` : `<path d="M51 40 C57 50 62 56 62 63 A11 11 0 0 1 40 63 C40 56 45 50 51 40Z" fill="none" stroke="${C.agua}" stroke-width="3" stroke-dasharray="5 4"/>`}
  </g>`
}

function balde(x: number, y: number, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-30 -50 L30 -50 L24 0 L-24 0Z" fill="${C.teal}"/><ellipse cx="0" cy="-50" rx="30" ry="7" fill="${C.aguaL}"/><path d="M-28 -50 Q0 -90 28 -50" stroke="${C.oscuro}" stroke-width="3" fill="none"/></g>`
}

function calendario(x: number, y: number, s = 1, texto = '') {
  return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-44" y="-40" width="88" height="84" rx="12" fill="#fff" stroke="${C.grisL}" stroke-width="3"/><rect x="-44" y="-40" width="88" height="24" rx="12" fill="${C.teja}"/><rect x="-44" y="-26" width="88" height="10" fill="${C.teja}"/><rect x="-26" y="-50" width="8" height="20" rx="4" fill="${C.oscuro}"/><rect x="18" y="-50" width="8" height="20" rx="4" fill="${C.oscuro}"/>
  ${texto ? `<text x="0" y="28" text-anchor="middle" font-family="Arial" font-weight="800" font-size="34" fill="${C.oscuro}">${texto}</text>` : `<path d="M-20 14 L-4 28 L22 -2" stroke="${C.green}" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`}</g>`
}

function chispa(x: number, y: number, s = 1, color = '#fff') {
  return `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -14 L4 -4 L14 0 L4 4 L0 14 L-4 4 L-14 0 L-4 -4Z" fill="${color}"/>`
}

const svg = (contenido: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="800" height="800"><defs><clipPath id="marco"><circle cx="200" cy="215" r="178"/></clipPath></defs>${contenido}</svg>`

export type Ilustracion = { id: string; nombre: string; svg: string }

export const ILUSTRACIONES: Ilustracion[] = [
  {
    id: 'corte', nombre: 'Familia guardando agua',
    svg: svg(`${montanas()}${casa(150, 165, 150, 150)}${casa(20, 205, 110, 112, '#FEF3C7')}${sombra()}
      ${grifo(320, 230, 0.8)}
      ${balde(258, 370, 1)}
      ${persona({ x: 140, y: 370, piel: PIEL[1], pelo: '#2B1B12', ropa: C.naranja, pantalon: '#334155', manoI: [-34, -78], manoD: [44, -88], pelo_largo: true })}
      ${persona({ x: 200, y: 370, piel: PIEL[1], pelo: '#2B1B12', ropa: C.green, pantalon: '#1E3A8A', manoI: [-22, -50], manoD: [30, -74], escala: 0.62 })}
      ${calendario(335, 95, 0.8, '')}`),
  },
  {
    id: 'fontanero', nombre: 'Fontanero trabajando',
    svg: svg(`${montanas()}${casa(240, 175, 130, 130)}${sombra()}
      <rect x="40" y="300" width="230" height="70" rx="10" fill="#A16207" opacity=".5"/>
      <rect x="30" y="318" width="250" height="26" rx="13" fill="${C.gris}"/><rect x="138" y="312" width="34" height="38" rx="6" fill="${C.grisL}" stroke="${C.gris}" stroke-width="3"/>
      <path d="M320 370 L345 290 L370 370Z" fill="${C.naranja}"/><rect x="326" y="335" width="38" height="10" fill="#fff"/><rect x="314" y="366" width="62" height="8" rx="3" fill="${C.oscuro}"/>
      ${persona({ x: 215, y: 370, piel: PIEL[2], pelo: '#111', ropa: C.teal, pantalon: '#1E293B', manoI: [-50, -64], manoD: [-62, -40], casco: true })}
      <g transform="translate(150 330) rotate(-30)"><rect x="-6" y="-60" width="12" height="60" rx="4" fill="${C.gris}"/><path d="M-16 -60 L16 -60 L12 -78 L4 -70 L-4 -70 L-12 -78Z" fill="${C.gris}"/></g>
      `),
  },
  {
    id: 'pago', nombre: 'Pagando la factura',
    svg: svg(`<circle cx="200" cy="190" r="150" fill="#fff" opacity=".12"/>${sombra()}
      <g transform="translate(270 150) rotate(8)"><rect x="-62" y="-80" width="124" height="160" rx="10" fill="#fff"/><rect x="-62" y="-80" width="124" height="30" rx="10" fill="${C.teal}"/><rect x="-62" y="-60" width="124" height="10" fill="${C.teal}"/>
        <rect x="-44" y="-30" width="88" height="8" rx="4" fill="${C.grisL}"/><rect x="-44" y="-12" width="60" height="8" rx="4" fill="${C.grisL}"/><rect x="-44" y="6" width="74" height="8" rx="4" fill="${C.grisL}"/>
        <text x="0" y="52" text-anchor="middle" font-family="Arial" font-weight="800" font-size="24" fill="${C.teal}">PAGADO</text></g>
      <circle cx="330" cy="235" r="30" fill="${C.green}"/><path d="M316 235 L327 246 L346 224" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      ${persona({ x: 140, y: 370, piel: PIEL[0], pelo: '#4B2E1A', ropa: '#6366F1', pantalon: '#334155', manoI: [-30, -70], manoD: [58, -120], pelo_largo: true })}
      
      <g transform="translate(205 236)"><rect x="-14" y="-24" width="28" height="48" rx="5" fill="${C.oscuro}"/><rect x="-10" y="-18" width="20" height="34" rx="2" fill="${C.aguaL}"/></g>
      <circle cx="60" cy="110" r="18" fill="${C.amarillo}"/><text x="60" y="117" text-anchor="middle" font-family="Arial" font-weight="800" font-size="20" fill="#92400E">$</text>
      <circle cx="95" cy="70" r="13" fill="${C.amarillo}"/><text x="95" y="76" text-anchor="middle" font-family="Arial" font-weight="800" font-size="15" fill="#92400E">$</text>`),
  },
  {
    id: 'ahorro', nombre: 'Gotita cierra la llave',
    svg: svg(`<circle cx="200" cy="200" r="160" fill="${C.green}" opacity=".15"/>${sombra(200, 372, 120)}
      ${grifo(150, 110, 1.15, false)}
      ${gotita(215, 290, 1, '', brazoG(-44, 0, -60, -100) + brazoG(44, 6, 70, 40))}
      <g transform="translate(320 370)"><rect x="-22" y="-34" width="44" height="34" rx="6" fill="${C.teja}"/><path d="M0 -34 Q-30 -70 -6 -96 Q4 -70 0 -34Z" fill="${C.green}"/><path d="M0 -40 Q26 -70 14 -100 Q-2 -76 0 -40Z" fill="${C.greenD}"/></g>
      ${chispa(70, 220, 1.2, C.agua)}${chispa(330, 120, 0.9, C.agua)}`),
  },
  {
    id: 'tanque', nombre: 'Tanque limpio',
    svg: svg(`${montanas()}${casa(70, 210, 230, 150)}${sombra()}
      <g transform="translate(185 150)"><rect x="-70" y="-20" width="140" height="80" rx="16" fill="${C.teal}"/><rect x="-78" y="-34" width="156" height="22" rx="10" fill="${C.tealD}"/><rect x="-60" y="60" width="12" height="16" fill="${C.gris}"/><rect x="48" y="60" width="12" height="16" fill="${C.gris}"/>
        <rect x="-48" y="0" width="30" height="8" rx="4" fill="#fff" opacity=".4"/></g>
      ${gotita(320, 300, 0.75, '', brazoG(-44, 0, -64, -40) + brazoG(44, 0, 60, 30))}
      <g transform="translate(250 255) rotate(-35)"><rect x="-5" y="-50" width="10" height="50" rx="4" fill="${C.madera}"/><rect x="-16" y="-64" width="32" height="16" rx="4" fill="${C.amarillo}"/></g>
      ${chispa(110, 110, 1.3)}${chispa(270, 90, 1)}${chispa(240, 130, 0.7)}`),
  },
  {
    id: 'megafono', nombre: 'Gotita informa',
    svg: svg(`<circle cx="200" cy="200" r="160" fill="#fff" opacity=".12"/>${sombra(200, 372, 120)}
      ${gotita(150, 290, 1.05, '', brazoG(40, 10, 92, -10) + brazoG(-44, 6, -66, 50))}
      <g transform="translate(250 270) rotate(-18)"><path d="M0 -26 L80 -62 L80 62 L0 26Z" fill="${C.amarillo}"/><rect x="-26" y="-26" width="30" height="52" rx="8" fill="${C.naranja}"/><ellipse cx="80" cy="0" rx="12" ry="62" fill="#F59E0B"/></g>
      <path d="M352 170 Q372 200 352 230" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity=".8"/><path d="M372 150 Q402 200 372 250" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity=".5"/>`),
  },
  {
    id: 'mundo', nombre: 'Planeta y agua',
    svg: svg(`${sombra(200, 372, 120)}<circle cx="200" cy="195" r="130" fill="${C.agua}"/>
      <path d="M110 120 Q150 90 190 115 Q205 150 170 165 Q140 190 150 230 Q115 225 100 180 Q92 145 110 120Z" fill="${C.green}"/>
      <path d="M235 95 Q285 105 300 150 Q280 165 258 150 Q238 140 235 95Z" fill="${C.green}"/><path d="M230 240 Q275 225 300 255 Q285 300 240 300 Q215 270 230 240Z" fill="${C.green}"/>
      <path d="M120 140 Q130 110 160 100" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round" opacity=".45"/>
      ${gotita(320, 320, 0.55, '', brazoG(-44, 0, -70, -30) + brazoG(44, 0, 70, -30))}
      ${chispa(70, 90, 1.2)}${chispa(345, 80, 0.9)}`),
  },
  {
    id: 'comunidad', nombre: 'Vecinos del barrio',
    svg: svg(`${montanas()}${casa(30, 190, 110, 120, '#FEF3C7')}${casa(150, 170, 120, 140)}${casa(280, 195, 100, 115, '#ECFCCB')}${sombra()}
      ${persona({ x: 110, y: 372, piel: PIEL[2], pelo: '#111', ropa: C.teal, pantalon: '#334155', manoI: [-30, -60], manoD: [32, -60] })}
      ${persona({ x: 200, y: 372, piel: PIEL[0], pelo: '#7C2D12', ropa: C.naranja, pantalon: '#1E3A8A', manoI: [-32, -60], manoD: [44, -130], pelo_largo: true })}
      ${persona({ x: 290, y: 372, piel: PIEL[1], pelo: '#9CA3AF', ropa: '#7C3AED', pantalon: '#374151', manoI: [-30, -62], manoD: [30, -62] })}
      ${gotita(250, 205, 0.32)}`),
  },
]

export const ilustracion = (id: string) => ILUSTRACIONES.find((i) => i.id === id)

export const svgUrl = (s: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`

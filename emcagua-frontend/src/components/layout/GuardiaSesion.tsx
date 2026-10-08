import { useEffect } from 'react'
import { API_URL, tokenApi } from '../../data/api'
import { logout, registrarActividad, sesionVigente } from '../../utils/session'

const salir = (motivo: string) => { logout(); window.location.assign(`/login?motivo=${motivo}`) }

/**
 * Cuida la sesión del funcionario mientras usa el sistema:
 * - la cierra tras un rato sin usarlo o cuando vence el token,
 * - si se cierra en otra pestaña, también se cierra aquí,
 * - una sesión de demostración (sin token) no sirve cuando el servidor está encendido.
 */
export default function GuardiaSesion() {
  useEffect(() => {
    let ultima = 0
    const actividad = () => { const ahora = Date.now(); if (ahora - ultima > 15_000) { ultima = ahora; registrarActividad() } }
    const eventos = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const
    eventos.forEach((e) => window.addEventListener(e, actividad, { passive: true }))
    const reloj = setInterval(() => { if (!sesionVigente()) salir('inactividad') }, 20_000)
    const otraPestana = (e: StorageEvent) => { if (e.key === 'emcagua_user' && !e.newValue) window.location.assign('/login') }
    window.addEventListener('storage', otraPestana)
    // Sesión sin token = demostración: solo vale si el servidor está apagado
    if (!tokenApi()) {
      fetch(`${API_URL}/api/configuracion/publica`).then((r) => { if (r.ok) salir('servidor') }).catch(() => { /* servidor apagado: sigue la demostración */ })
    }
    return () => {
      eventos.forEach((e) => window.removeEventListener(e, actividad))
      clearInterval(reloj)
      window.removeEventListener('storage', otraPestana)
    }
  }, [])
  return null
}

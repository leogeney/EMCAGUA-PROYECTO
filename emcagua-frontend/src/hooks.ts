import { useState } from 'react'

/** Página actual que vuelve a 1 cuando cambia `clave` (p. ej. los filtros), sin efectos. */
export function usePagina(clave: string) {
  const [st, setSt] = useState({ clave, n: 1 })
  const pagina = st.clave === clave ? st.n : 1
  return [pagina, (n: number) => setSt({ clave, n })] as const
}

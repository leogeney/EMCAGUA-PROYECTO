# EMCAGUA APC — Frontend

Portal interno de gestión para EMCAGUA APC (El Carmen y Guamalito, Norte de Santander).

## Tecnologías
React 19 · TypeScript · Vite · Tailwind CSS 4 · React Router 7

## Ejecutar
```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # compila a dist/
npm run lint     # oxlint
```

Modo demostración: cualquier usuario y contraseña. Con el usuario `admin` se habilita el módulo de Nómina.

## Módulos
| Ruta | Módulo |
|---|---|
| `/dashboard` | Panel de control |
| `/analitica` | Analítica de consumo, facturación y cartera |
| `/usuarios` | Suscriptores, cortes y reactivaciones |
| `/facturacion` | Facturas por periodo |
| `/pagos` | Cobro en caja, recibos y cierre de caja |
| `/nomina` | Nómina, prestaciones y análisis (solo admin) |

## Estructura
```
src/
  components/   UI reutilizable (charts, modales, layout)
  data/         Modelos, reglas de negocio y datos de demostración
    DataContext.tsx    usuarios, facturas y pagos  ← aquí se conecta la API
    NominaContext.tsx  nómina                      ← aquí se conecta la API
  pages/        Pantallas
  utils/        Formatos, fechas de corte, Excel, sesión, WhatsApp
```

Los datos actuales son de demostración (en memoria). Para conectar el backend solo hay que
reemplazar los `useState` de los contextos en `src/data/` por llamadas a la API.

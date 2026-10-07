# EMCAGUA APC — Backend (API)

API del sistema inteligente de gestión de información de EMCAGUA APC.
Hecha con **Java 21 + Spring Boot 3.5 + PostgreSQL**. El frontend (React) está en la carpeta `emcagua-frontend`.

## 0. La forma fácil

Doble clic en **`INSTALAR-Y-CORRER.bat`**. Instala lo que falte (Java 21, Maven y PostgreSQL 16), crea la base de datos y arranca la API. Si Windows pregunta si permites cambios, responde **Sí**. La clave de PostgreSQL se genera sola y queda en `%USERPROFILE%\.emcagua\clave-postgres.txt`. Todo lo que pasa queda en `arranque.log`.

Cuando la consola diga `Started EmcaguaApplication`, abre **http://localhost:8080**: ahí está el sistema completo (el frontend compilado se sirve desde la carpeta `emcagua-frontend/dist`) conectado a la base de datos. Si cambias el frontend, vuelve a compilarlo con `npm run build` dentro de `emcagua-frontend`.
Para reiniciar la API (por ejemplo después de cambiar el código Java), vuelve a dar doble clic al `.bat`: detiene la que estaba corriendo y arranca la nueva.

Si prefieres hacerlo paso a paso, sigue las secciones de abajo.

## 1. Instalar lo necesario (una sola vez, en Windows)

Abre **PowerShell** y ejecuta estos tres comandos (aceptan con `Y` si preguntan):

```powershell
winget install EclipseAdoptium.Temurin.21.JDK
winget install PostgreSQL.PostgreSQL.16
winget install JetBrains.IntelliJIDEA.Community
```

- **JDK 21**: el Java con el que corre la API.
- **PostgreSQL 16**: la base de datos. Durante la instalación pide una contraseña para el usuario `postgres`: **anótala**. Deja el puerto en `5432`.
- **IntelliJ IDEA Community** (gratis): el editor para abrir y correr el proyecto. Trae Maven incluido, así que no hay que instalarlo aparte.

Cierra y vuelve a abrir PowerShell, y comprueba: `java -version` debe decir 21.

## 2. Crear la base de datos

Abre **pgAdmin 4** (se instaló con PostgreSQL) → clic derecho en *Databases* → *Create* → *Database…* → nombre: `emcagua` → *Save*.

(O en PowerShell: `& "C:\Program Files\PostgreSQL\16\bin\createdb.exe" -U postgres emcagua`)

## 3. Abrir y correr

1. IntelliJ → *Open* → elige la carpeta `emcagua-backend`. Espera a que termine de descargar las dependencias (barra de abajo). La primera vez tarda unos minutos.
2. Si te pide habilitar *Lombok* o *annotation processing*, acepta.
3. Pon la contraseña de PostgreSQL: *Run* → *Edit Configurations…* → `EmcaguaApplication` → *Environment variables*:
   `EMCAGUA_DB_PASSWORD=la-que-anotaste`
   (o cámbiala directamente en `src/main/resources/application.yml`, línea `password`).
4. Abre `src/main/java/co/emcagua/api/EmcaguaApplication.java` y dale al botón verde ▶.

La primera vez crea todas las tablas y la cuenta `admin` (sin datos de prueba; ver la sección 8).
Cuando veas en la consola `Started EmcaguaApplication`, ya está corriendo en **http://localhost:8080**.

## 4. Probarla

Abre **http://localhost:8080/swagger-ui.html**: ahí están todos los servicios de la API para probarlos desde el navegador.

1. Busca **Sesión → POST /api/auth/login** → *Try it out* → escribe:
   ```json
   { "usuario": "admin", "clave": "Emcagua2026*" }
   ```
2. Copia el `token` que responde, sube al botón **Authorize** 🔒 y pégalo.
3. Ya puedes probar cualquier servicio, por ejemplo `GET /api/predios`.

Al empezar solo existe la cuenta `admin` (contraseña `Emcagua2026*`, **cámbiala**). Las demás cuentas las crea el gerente en *Cuentas y roles*.

## 5. Qué hay en la API

| Ruta | Para qué |
|---|---|
| `POST /api/auth/login` · `GET /api/auth/yo` · `POST /api/auth/clave` | Entrar, ver la cuenta actual, cambiar la contraseña |
| `/api/propietarios` · `/api/predios` · `/api/medidores` · `/api/lecturas` · `/api/alarmas` | Suscriptores, dueños con varias casas, medidores inteligentes |
| `/api/tarifas` · `/api/facturas` · `GET /api/facturacion/calendario` · `POST /api/facturacion/cerrar` · `GET /api/facturacion/liquidar` | Tarifa CRA con subsidios, facturas y cierre mensual (automático todos los días a las 12:10 a. m.) |
| `POST /api/caja/cobrar` · `GET /api/caja/dia` · `POST /api/caja/cerrar` · `/api/pagos` · `/api/egresos` · `/api/cierres-caja` | Cobro de una o varias facturas en un recibo, reconexión, arqueo y gastos |
| `POST /api/pqr/radicar` · `/api/pqr/{radicado}/asignar` · `/responder` · `/cerrar` · `/historial` · `/api/pqrs` | PQR con plazo de 15 días hábiles (con festivos) |
| `/api/materiales` · `POST /api/inventario/mover` · `/api/movimientos-inventario` | Inventario |
| `/api/empleados` · `/api/parametros-nomina` · `/api/periodos-nomina` · `/api/novedades-nomina` | Nómina |
| `POST /api/emision` · `POST /api/emision/{consecutivo}/anular` · `/api/documentos` | Documentos con consecutivo y código QR |
| `GET /api/verificar?d=…&c=…` | **Público**: verificar facturas, recibos y documentos por su QR |
| `POST /api/portal/cuenta` · `/pagar` · `/pqr` | **Público**: oficina virtual del suscriptor |
| `/api/macromediciones` | Agua que entra a cada sector (pérdidas) |
| `/api/chats` | Conversaciones con Gotita (cada funcionario ve las suyas) |
| `/api/avisos-enviados` | Registro de avisos por WhatsApp |
| `GET/PUT /api/configuracion` · `GET /api/configuracion/publica` | Datos de la empresa y parámetros |
| `/api/cuentas` · `/api/roles` | Funcionarios, roles y permisos |
| `/api/vista/...` | Datos ya armados para cada pantalla del frontend: `suscriptores`, `pagos`, `cobrar`, `lecturas`, `telemetria`, `facturar`, `pqrs`, `tarifas`, `cuentas`, `roles`, `operacion` (inventario, gastos y cierres de caja), `materiales`, `movimientos`, `egresos`, `cierres`, `macromediciones`, `avisos`, `nomina`, `documentos` |
| `POST /api/portal/vista/cuenta` · `/pagar` · `/pqr` | **Público**: oficina virtual con los predios del dueño (código o cédula + últimos 4 dígitos del celular) |

Las rutas en plural (`/api/predios`, `/api/facturas`…) aceptan `GET` (lista con `?page=0&size=50&sort=codigo`), `GET /{id}`, `POST`, `PUT`, `PATCH` y `DELETE`, y búsquedas en `/search` (por ejemplo `/api/predios/search/findByPropietarioCedula?cedula=94477643`).
Las facturas, pagos, PQR y documentos **no** se crean ni se borran directamente: se hacen con sus servicios (`/caja/cobrar`, `/pqr/radicar`…) para que siempre queden con consecutivo, firma e historial.

## 6. Seguridad

- Contraseñas cifradas con **BCrypt**; nunca se guardan ni se devuelven en texto.
- Sesión con **token JWT** (dura 10 horas).
- **Permisos por rol**: cada ruta pertenece a un módulo (igual que el menú del frontend). Si el rol no lo tiene, la API responde 403 aunque se llame directamente.
- Códigos QR firmados con **HMAC-SHA256** y una clave secreta del servidor: nadie puede fabricar un código válido.
- **Antes de producción**: cambiar `EMCAGUA_SECRETO` por una clave larga y aleatoria, poner `EMCAGUA_DEMO=false` y `EMCAGUA_DDL=validate`.

## 7. Variables de entorno

| Variable | Por defecto | Para qué |
|---|---|---|
| `EMCAGUA_DB_URL` | `jdbc:postgresql://localhost:5432/emcagua` | Base de datos |
| `EMCAGUA_DB_USER` / `EMCAGUA_DB_PASSWORD` | `postgres` / `postgres` | Usuario y contraseña de PostgreSQL |
| `EMCAGUA_SECRETO` | (clave de desarrollo) | Firma de sesiones y QR |
| `EMCAGUA_FRONTEND` | `http://localhost:5173` | Dirección del frontend que puede usar la API |
| `EMCAGUA_DEMO` | `false` | `true` = cargar datos de demostración la primera vez (64 predios, facturas, pagos, empleados) |
| `EMCAGUA_DDL` | `update` | `update` en desarrollo, `validate` en producción |

## 8. Empezar de cero

Para vaciar la base de datos y dejar solo la cuenta `admin`: crea un archivo vacío llamado `reiniciar-base-de-datos.txt` dentro de la carpeta `emcagua-backend` y vuelve a dar doble clic a `INSTALAR-Y-CORRER.bat`. Al arrancar, la API borra **todos** los datos (no se puede deshacer), borra ese archivo y crea de nuevo los datos iniciales: roles, configuración, tarifa de ejemplo, catálogo de materiales en cero, parámetros de nómina 2026 y la cuenta `admin` con la contraseña `Emcagua2026*`.

Si quieres volver a ver los datos de demostración, pon antes la variable de entorno `EMCAGUA_DEMO=true`.

# Modelo de datos — EMCAGUA APC

Todas las tablas tienen además `id`, `creado`, `actualizado` y `version` (control de cambios simultáneos).
Los valores en pesos se guardan como enteros (`long`), sin decimales.

```mermaid
erDiagram
    ROL ||--o{ CUENTA : "tiene"
    ROL ||--o{ ROL_PERMISO : "módulos"
    CUENTA ||--o{ CONVERSACION : "chats con Gotita"
    CUENTA ||--o{ PAGO : "recibe (cajero)"

    PROPIETARIO ||--o{ PREDIO : "es dueño de"
    SECTOR ||--o{ BARRIO : "tiene"
    SECTOR ||--o{ PREDIO : "ubica"
    BARRIO |o--o{ PREDIO : "ubica"
    SECTOR ||--o{ MACROMEDICION : "agua que entra"
    PREDIO ||--o| MEDIDOR : "tiene"
    MEDIDOR ||--o{ LECTURA : "reporta"
    MEDIDOR ||--o{ ALARMA_MEDIDOR : "genera"
    PREDIO ||--o{ FACTURA : "se le factura"
    TARIFA ||..o{ FACTURA : "vigente al liquidar"
    PAGO }o--o{ FACTURA : "paga (pago_factura)"
    PREDIO ||--o{ PAGO : "predio principal"
    PREDIO ||--o{ PQR : "relacionada"
    PQR ||--o{ EVENTO_PQR : "historial"
    PREDIO ||--o{ AVISO_ENVIADO : "se avisó"

    MATERIAL ||--o{ MOVIMIENTO_INVENTARIO : "entradas y salidas"
    EMPLEADO ||--o{ NOVEDAD_NOMINA : "por mes"
    PERIODO_NOMINA ||--o{ NOVEDAD_NOMINA : "contiene"

    PROPIETARIO { string cedula UK; string nombre; string telefono; string correo }
    SECTOR { string nombre UK; int orden }
    BARRIO { string nombre; long sector_id FK }
    PREDIO { string codigo UK; string direccion; long sector_id FK; long barrio_id FK; int estrato; enum uso; enum estado; string ocupanteNombre }
    MEDIDOR { string serial UK; enum tipo; date instalado; instant ultimaComunicacion; int senal }
    LECTURA { instant fecha; decimal valor; enum origen; string lector }
    ALARMA_MEDIDOR { enum tipo; string detalle; instant detectada; instant resuelta }
    TARIFA { int desdeAnio; int desdeMes; long cargosFijos; long porM3; int consumoBasico; double subsidios }
    FACTURA { string numero UK; int anio; int mes; int consumo; bool estimado; long total; date vencimiento; enum estado; string codigoVerificacion }
    PAGO { string numero UK; long monto; long reconexion; enum metodo; instant fecha; string codigoVerificacion }
    PQR { string radicado UK; enum tipo; enum categoria; enum canal; enum estado; date vence; text respuesta }
    DOCUMENTO_EMITIDO { string consecutivo UK; string plantillaId; string dirigidoA; text contenido; string codigoVerificacion; instant anulado }
    EGRESO { date fecha; enum categoria; long valor; enum medio }
    CIERRE_CAJA { date fecha UK; long efectivoContado; long diferencia }
    MACROMEDICION { int anio; int mes; long sector_id FK; long volumen }
    CONFIGURACION { string nombre; string nit; long reconexion; int umbralAlto; long baseCaja; double metaIanc }
```

## Reglas que cumple la base de datos

| Regla | Cómo |
|---|---|
| Un predio tiene una sola factura por mes | Llave única `(predio_id, anio, mes)` |
| Sectores y barrios | 5 sectores (Centro, Líbano, Pique Tierra, Calle Nueva, San Luis); cada barrio pertenece a un sector y su nombre no se repite dentro del mismo sector |
| Un dueño con varias casas | `propietario` 1 → N `predio`, por cédula única |
| La tarifa no es retroactiva | La factura guarda su valor liquidado; `tarifa` se aplica desde `desdeAnio/desdeMes` |
| Facturas, pagos, PQR y documentos no se borran | La API no permite `DELETE`; se **anulan** con motivo |
| Un recibo puede pagar varias facturas | Tabla intermedia `pago_factura` |
| No se pisan los cambios de dos personas | Columna `version` (bloqueo optimista) |
| Plazo legal de las PQR | `vence` = radicación + 15 días hábiles (sin sábados, domingos ni festivos) |
| Autenticidad de los papeles | `codigoVerificacion` = HMAC-SHA256 de los datos con la clave del servidor |

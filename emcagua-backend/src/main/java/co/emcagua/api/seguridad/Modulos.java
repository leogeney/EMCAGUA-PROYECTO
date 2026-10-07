package co.emcagua.api.seguridad;

import java.util.List;
import java.util.Map;

/**
 * Qué módulo (permiso del rol) protege cada recurso de la API.
 * Los ids de los módulos son los mismos del frontend (Cuentas y roles).
 */
public final class Modulos {
    private Modulos() {}

    public static final List<String> TODOS = List.of(
        "mi-dia", "dashboard", "analitica", "asistente", "reporte", "usuarios", "lecturas", "facturacion", "pagos", "gastos", "pqr",
        "perdidas", "inventario", "documentos", "redes", "avisos", "tarifas", "sui", "nomina", "configuracion", "cuentas");

    /** recurso (primer tramo después de /api/) → módulo que lo protege. */
    private static final Map<String, String> RECURSOS = Map.ofEntries(
        Map.entry("propietarios", "usuarios"), Map.entry("predios", "usuarios"),
        Map.entry("medidores", "lecturas"), Map.entry("lecturas", "lecturas"), Map.entry("alarmas", "lecturas"),
        Map.entry("facturas", "facturacion"), Map.entry("facturacion", "facturacion"), Map.entry("tarifas", "tarifas"),
        Map.entry("pagos", "pagos"), Map.entry("caja", "pagos"), Map.entry("cierres-caja", "pagos"),
        Map.entry("egresos", "gastos"),
        Map.entry("pqrs", "pqr"), Map.entry("pqr", "pqr"), Map.entry("eventos-pqr", "pqr"),
        Map.entry("macromediciones", "perdidas"),
        Map.entry("materiales", "inventario"), Map.entry("movimientos-inventario", "inventario"), Map.entry("inventario", "inventario"),
        Map.entry("empleados", "nomina"), Map.entry("parametros-nomina", "nomina"), Map.entry("periodos-nomina", "nomina"), Map.entry("novedades-nomina", "nomina"),
        Map.entry("documentos", "documentos"), Map.entry("emision", "documentos"),
        Map.entry("avisos-enviados", "avisos"),
        Map.entry("cuentas", "cuentas"), Map.entry("roles", "cuentas"),
        Map.entry("configuracion", "configuracion"), Map.entry("sectores", "configuracion"), Map.entry("barrios", "configuracion"), Map.entry("chats", "asistente"));

    /** Recursos que cualquier funcionario con sesión puede LEER (los necesitan varias pantallas). */
    private static final List<String> LECTURA_LIBRE = List.of("configuracion", "sectores", "barrios", "tarifas", "predios", "propietarios", "facturas", "medidores");

    public static String moduloDe(String recurso) { return RECURSOS.get(recurso); }

    public static boolean lecturaLibre(String recurso) { return LECTURA_LIBRE.contains(recurso); }
}

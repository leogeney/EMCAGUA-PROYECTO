package co.emcagua.api.vista;

import java.util.Map;

import co.emcagua.api.caja.Egreso;
import co.emcagua.api.comun.ErrorNegocio;
import co.emcagua.api.inventario.Material;
import co.emcagua.api.inventario.MovimientoInventario;
import co.emcagua.api.nomina.Empleado;
import co.emcagua.api.nomina.PeriodoNomina;
import co.emcagua.api.pqr.Pqr;

/** Nombres que se ven en pantalla (con tildes) para los valores guardados en la base de datos, y al revés. */
final class Etiquetas {
    private Etiquetas() {}

    static final Map<Pqr.Tipo, String> TIPO_PQR = Map.of(
        Pqr.Tipo.PETICION, "Petición", Pqr.Tipo.QUEJA, "Queja", Pqr.Tipo.RECLAMO, "Reclamo", Pqr.Tipo.RECURSO, "Recurso", Pqr.Tipo.SUGERENCIA, "Sugerencia");
    static final Map<Pqr.Categoria, String> CATEGORIA_PQR = Map.of(
        Pqr.Categoria.FACTURACION, "Facturación", Pqr.Categoria.DANO_O_FUGA, "Daño o fuga", Pqr.Categoria.CALIDAD_DEL_AGUA, "Calidad del agua",
        Pqr.Categoria.CORTE_Y_RECONEXION, "Corte y reconexión", Pqr.Categoria.ATENCION, "Atención", Pqr.Categoria.OTRO, "Otro");
    static final Map<Pqr.Canal, String> CANAL_PQR = Map.of(
        Pqr.Canal.PRESENCIAL, "Presencial", Pqr.Canal.TELEFONO, "Teléfono", Pqr.Canal.WHATSAPP, "WhatsApp", Pqr.Canal.CORREO, "Correo", Pqr.Canal.PORTAL_WEB, "Portal web");
    static final Map<Pqr.Estado, String> ESTADO_PQR = Map.of(
        Pqr.Estado.RADICADA, "Radicada", Pqr.Estado.EN_TRAMITE, "En trámite", Pqr.Estado.RESPONDIDA, "Respondida", Pqr.Estado.CERRADA, "Cerrada");

    static final Map<Egreso.Categoria, String> CATEGORIA_EGRESO = Map.of(
        Egreso.Categoria.QUIMICOS_Y_MATERIALES, "Químicos y materiales", Egreso.Categoria.COMBUSTIBLE_Y_TRANSPORTE, "Combustible y transporte",
        Egreso.Categoria.ENERGIA_Y_SERVICIOS, "Energía y servicios", Egreso.Categoria.MANTENIMIENTO_DE_PLANTA, "Mantenimiento de planta",
        Egreso.Categoria.HONORARIOS_Y_ASESORIAS, "Honorarios y asesorías", Egreso.Categoria.PAPELERIA_Y_OFICINA, "Papelería y oficina",
        Egreso.Categoria.IMPUESTOS_Y_TASAS, "Impuestos y tasas", Egreso.Categoria.OTROS, "Otros");
    static final Map<Egreso.Medio, String> MEDIO_EGRESO = Map.of(Egreso.Medio.EFECTIVO_CAJA, "Efectivo (caja)", Egreso.Medio.TRANSFERENCIA, "Transferencia");

    static final Map<Material.Categoria, String> CATEGORIA_MATERIAL = Map.of(
        Material.Categoria.MEDIDORES, "Medidores", Material.Categoria.TUBERIA_Y_ACCESORIOS, "Tubería y accesorios",
        Material.Categoria.QUIMICOS_DE_PLANTA, "Químicos de planta", Material.Categoria.DOTACION_Y_HERRAMIENTAS, "Dotación y herramientas");
    static final Map<MovimientoInventario.Tipo, String> TIPO_MOVIMIENTO = Map.of(
        MovimientoInventario.Tipo.ENTRADA, "Entrada", MovimientoInventario.Tipo.SALIDA, "Salida", MovimientoInventario.Tipo.AJUSTE, "Ajuste");

    static final Map<Empleado.Area, String> AREA = Map.of(Empleado.Area.ADMINISTRATIVA, "Administrativa", Empleado.Area.OPERATIVA, "Operativa");
    static final Map<Empleado.Contrato, String> CONTRATO = Map.of(Empleado.Contrato.INDEFINIDO, "Indefinido", Empleado.Contrato.TERMINO_FIJO, "Término fijo");
    static final Map<PeriodoNomina.Estado, String> ESTADO_NOMINA = Map.of(
        PeriodoNomina.Estado.BORRADOR, "Borrador", PeriodoNomina.Estado.APROBADA, "Aprobada", PeriodoNomina.Estado.PAGADA, "Pagada");

    /** Valor del enum a partir de la etiqueta de pantalla (o del nombre del enum). */
    static <E extends Enum<E>> E de(Map<E, String> mapa, String etiqueta, String campo) {
        if (etiqueta == null) throw new ErrorNegocio("Falta " + campo);
        for (Map.Entry<E, String> e : mapa.entrySet())
            if (e.getValue().equalsIgnoreCase(etiqueta.trim()) || e.getKey().name().equalsIgnoreCase(etiqueta.trim())) return e.getKey();
        throw new ErrorNegocio("Valor no válido para " + campo + ": " + etiqueta);
    }
}

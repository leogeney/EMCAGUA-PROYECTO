package co.emcagua.api.vista;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import co.emcagua.api.caja.CajaServicio;
import co.emcagua.api.caja.CierreCaja;
import co.emcagua.api.caja.CierreCajaRepositorio;
import co.emcagua.api.caja.Egreso;
import co.emcagua.api.caja.EgresoRepositorio;
import co.emcagua.api.comun.ErrorNegocio;
import co.emcagua.api.comun.NoEncontrado;
import co.emcagua.api.comunicacion.AvisoEnviado;
import co.emcagua.api.comunicacion.AvisoEnviadoRepositorio;
import co.emcagua.api.facturacion.FacturacionServicio;
import co.emcagua.api.inventario.Material;
import co.emcagua.api.inventario.MaterialRepositorio;
import co.emcagua.api.inventario.MovimientoInventario;
import co.emcagua.api.inventario.MovimientoRepositorio;
import co.emcagua.api.perdidas.Macromedicion;
import co.emcagua.api.perdidas.MacromedicionRepositorio;
import co.emcagua.api.seguridad.Sesion;
import co.emcagua.api.suscriptores.PredioRepositorio;
import io.swagger.v3.oas.annotations.tags.Tag;

/** Inventario, gastos, cierres de caja, macromedición y avisos, con la forma que usa el frontend. */
@RestController
@RequestMapping("/api/vista")
@Tag(name = "Vista (frontend)")
public class OperacionVista {
    private final MaterialRepositorio materiales;
    private final MovimientoRepositorio movimientos;
    private final EgresoRepositorio egresos;
    private final CierreCajaRepositorio cierres;
    private final CajaServicio caja;
    private final MacromedicionRepositorio macro;
    private final AvisoEnviadoRepositorio avisos;
    private final PredioRepositorio predios;

    public OperacionVista(MaterialRepositorio materiales, MovimientoRepositorio movimientos, EgresoRepositorio egresos, CierreCajaRepositorio cierres,
                          CajaServicio caja, MacromedicionRepositorio macro, AvisoEnviadoRepositorio avisos, PredioRepositorio predios) {
        this.materiales = materiales;
        this.movimientos = movimientos;
        this.egresos = egresos;
        this.cierres = cierres;
        this.caja = caja;
        this.macro = macro;
        this.avisos = avisos;
        this.predios = predios;
    }

    private static Map<String, Object> material(Material m) {
        Map<String, Object> o = new LinkedHashMap<>();
        o.put("id", m.getCodigo());
        o.put("nombre", m.getNombre());
        o.put("categoria", Etiquetas.CATEGORIA_MATERIAL.get(m.getCategoria()));
        o.put("unidad", m.getUnidad());
        o.put("stock", m.getStock());
        o.put("minimo", m.getMinimo());
        o.put("costo", m.getCosto());
        return o;
    }

    private static Map<String, Object> movimiento(MovimientoInventario m) {
        Map<String, Object> o = new LinkedHashMap<>();
        o.put("id", "MV-" + m.getId());
        o.put("ts", m.getFecha().toEpochMilli());
        o.put("materialId", m.getMaterial().getCodigo());
        o.put("tipo", Etiquetas.TIPO_MOVIMIENTO.get(m.getTipo()));
        o.put("cantidad", m.getCantidad());
        o.put("motivo", m.getMotivo());
        o.put("usuario", m.getUsuario() == null ? "" : m.getUsuario());
        return o;
    }

    private static Map<String, Object> egreso(Egreso e) {
        Map<String, Object> o = new LinkedHashMap<>();
        o.put("id", "EG-" + e.getId());
        o.put("fecha", e.getFecha().toString());
        o.put("categoria", Etiquetas.CATEGORIA_EGRESO.get(e.getCategoria()));
        o.put("descripcion", e.getDescripcion());
        o.put("proveedor", e.getProveedor() == null ? "" : e.getProveedor());
        o.put("valor", e.getValor());
        o.put("medio", Etiquetas.MEDIO_EGRESO.get(e.getMedio()));
        if (e.getSoporteImagen() != null) o.put("soporte", e.getSoporteImagen());
        else if (e.getSoporte() != null) o.put("soporte", e.getSoporte());
        o.put("usuario", e.getRegistradoPor() == null ? "" : e.getRegistradoPor());
        o.put("ts", e.getCreado() == null ? e.getFecha().atStartOfDay(FacturacionServicio.ZONA).toInstant().toEpochMilli() : e.getCreado().toEpochMilli());
        return o;
    }

    private static Map<String, Object> cierre(CierreCaja c) {
        Map<String, Object> o = new LinkedHashMap<>();
        o.put("fecha", c.getFecha().toString());
        o.put("cajero", c.getCajero() == null ? "" : c.getCajero());
        // En pantalla, "efectivo del sistema" es lo que debería haber en caja: base + cobros en efectivo - gastos en efectivo
        o.put("efectivoSistema", c.getBase() + c.getEfectivoSistema() - c.getEgresosEfectivo());
        o.put("efectivoContado", c.getEfectivoContado());
        o.put("egresosEfectivo", c.getEgresosEfectivo());
        o.put("transferencias", c.getTransferencias());
        o.put("enLinea", c.getEnLinea());
        o.put("diferencia", c.getDiferencia());
        if (c.getNota() != null) o.put("nota", c.getNota());
        o.put("ts", c.getCreado() == null ? 0 : c.getCreado().toEpochMilli());
        return o;
    }

    @GetMapping("/operacion")
    @Transactional(readOnly = true)
    public Map<String, Object> operacion() {
        return Map.of(
            "materiales", materiales.findAll().stream().sorted(Comparator.comparing(Material::getCodigo)).map(OperacionVista::material).toList(),
            "movimientos", movimientos.findAll().stream().sorted(Comparator.comparing(MovimientoInventario::getFecha).reversed()).limit(300).map(OperacionVista::movimiento).toList(),
            "egresos", egresos.findAll().stream().sorted(Comparator.comparing(Egreso::getFecha).thenComparing(Egreso::getId).reversed()).map(OperacionVista::egreso).toList(),
            "cierres", cierres.findAll().stream().sorted(Comparator.comparing(CierreCaja::getFecha).reversed()).map(OperacionVista::cierre).toList());
    }

    public record MaterialForm(String id, String nombre, String categoria, String unidad, Integer stock, Integer minimo, Long costo) {}

    @PutMapping("/materiales/{codigo}")
    @Transactional
    public Map<String, Object> guardarMaterial(@PathVariable String codigo, @RequestBody MaterialForm f) {
        AdministracionVista.exigir("inventario");
        Material m = materiales.findByCodigo(codigo).orElseGet(() -> { Material n = new Material(); n.setCodigo(codigo); return n; });
        if (f.nombre() == null || f.nombre().isBlank()) throw new ErrorNegocio("Escribe el nombre del material");
        m.setNombre(f.nombre().trim());
        m.setCategoria(Etiquetas.de(Etiquetas.CATEGORIA_MATERIAL, f.categoria(), "la categoría"));
        m.setUnidad(f.unidad() == null || f.unidad().isBlank() ? "und" : f.unidad().trim());
        if (m.getId() == null && f.stock() != null) m.setStock(Math.max(0, f.stock())); // el stock de uno existente cambia con movimientos
        if (f.minimo() != null) m.setMinimo(Math.max(0, f.minimo()));
        if (f.costo() != null) m.setCosto(Math.max(0, f.costo()));
        return material(materiales.save(m));
    }

    public record MovimientoForm(String materialId, String tipo, int cantidad, String motivo) {}

    @PostMapping("/movimientos")
    @Transactional
    public Map<String, Object> mover(@RequestBody MovimientoForm f) {
        AdministracionVista.exigir("inventario");
        Material mat = materiales.findByCodigo(f.materialId()).orElseThrow(() -> new NoEncontrado("No existe el material " + f.materialId()));
        MovimientoInventario.Tipo tipo = Etiquetas.de(Etiquetas.TIPO_MOVIMIENTO, f.tipo(), "el tipo de movimiento");
        if (f.cantidad() < 0 || (tipo != MovimientoInventario.Tipo.AJUSTE && f.cantidad() == 0)) throw new ErrorNegocio("Cantidad inválida");
        if (f.motivo() == null || f.motivo().isBlank()) throw new ErrorNegocio("Escribe el motivo del movimiento");
        int nuevo = switch (tipo) {
            case ENTRADA -> mat.getStock() + f.cantidad();
            case SALIDA -> {
                if (f.cantidad() > mat.getStock()) throw new ErrorNegocio("Solo hay " + mat.getStock() + " " + mat.getUnidad() + " de " + mat.getNombre());
                yield mat.getStock() - f.cantidad();
            }
            case AJUSTE -> f.cantidad();
        };
        mat.setStock(nuevo);
        materiales.save(mat);
        MovimientoInventario mv = new MovimientoInventario();
        mv.setMaterial(mat);
        mv.setTipo(tipo);
        mv.setCantidad(f.cantidad());
        mv.setStockResultante(nuevo);
        mv.setMotivo(f.motivo().trim());
        mv.setUsuario(Sesion.nombre());
        mv.setFecha(Instant.now());
        return movimiento(movimientos.save(mv));
    }

    public record EgresoForm(String fecha, String categoria, String descripcion, String proveedor, long valor, String medio, String soporte) {}

    @PostMapping("/egresos")
    @Transactional
    public Map<String, Object> registrarEgreso(@RequestBody EgresoForm f) {
        if (!Sesion.cuenta().getRol().puede("gastos") && !Sesion.cuenta().getRol().puede("pagos")) throw new ErrorNegocio("Tu rol no tiene permiso para registrar gastos");
        if (f.valor() <= 0) throw new ErrorNegocio("El valor debe ser mayor que cero");
        if (f.descripcion() == null || f.descripcion().isBlank()) throw new ErrorNegocio("Describe el gasto");
        Egreso e = new Egreso();
        e.setFecha(f.fecha() == null || f.fecha().isBlank() ? LocalDate.now(FacturacionServicio.ZONA) : LocalDate.parse(f.fecha()));
        e.setCategoria(Etiquetas.de(Etiquetas.CATEGORIA_EGRESO, f.categoria(), "la categoría"));
        e.setDescripcion(f.descripcion().trim());
        e.setProveedor(f.proveedor());
        e.setValor(f.valor());
        e.setMedio(Etiquetas.de(Etiquetas.MEDIO_EGRESO, f.medio(), "el medio de pago"));
        if (f.soporte() != null && f.soporte().startsWith("data:")) e.setSoporteImagen(f.soporte());
        else e.setSoporte(f.soporte());
        e.setRegistradoPor(Sesion.nombre());
        return egreso(egresos.save(e));
    }

    public record CierreForm(String fecha, long efectivoContado, String nota) {}

    @PostMapping("/cierres")
    @Transactional
    public Map<String, Object> cerrarCaja(@RequestBody CierreForm f) {
        AdministracionVista.exigir("pagos");
        LocalDate dia = f.fecha() == null ? LocalDate.now(FacturacionServicio.ZONA) : LocalDate.parse(f.fecha());
        return cierre(caja.cerrar(dia, f.efectivoContado(), f.nota(), Sesion.cuenta()));
    }

    /* ---------------------- Macromedición (agua que entra) ---------------------- */

    @GetMapping("/macromediciones")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> macromediciones() {
        return macro.findAll().stream().filter(m -> m.getSector() != null)
            .map(m -> Map.<String, Object>of("anio", m.getAnio(), "mes", m.getMes(), "sector", m.getSector().getNombre(), "volumen", m.getVolumen()))
            .toList();
    }

    /* --------------------------------- Avisos --------------------------------- */

    public record AvisoForm(String predio, String telefono, String plantilla, String mensaje) {}

    @PostMapping("/avisos")
    @Transactional
    public Map<String, Object> registrarAviso(@RequestBody AvisoForm f) {
        AdministracionVista.exigir("avisos");
        AvisoEnviado a = new AvisoEnviado();
        if (f.predio() != null) predios.findByCodigo(f.predio()).ifPresent(a::setPredio);
        String tel = f.telefono() == null ? "" : f.telefono().replaceAll("\\D", "");
        a.setTelefono(tel.length() > 10 ? tel.substring(tel.length() - 10) : tel);
        a.setPlantilla(f.plantilla() == null ? "libre" : f.plantilla().length() > 30 ? f.plantilla().substring(0, 30) : f.plantilla());
        a.setMensaje(f.mensaje() == null ? "" : f.mensaje());
        a.setEnviadoPor(Sesion.nombre());
        a.setFecha(Instant.now());
        avisos.save(a);
        return Map.of("ok", true);
    }

    /** Avisos enviados hoy (para marcar "Enviado" en la lista aunque se recargue la página). */
    @GetMapping("/avisos/hoy")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> avisosHoy() {
        Instant desde = LocalDate.now(FacturacionServicio.ZONA).atStartOfDay(FacturacionServicio.ZONA).toInstant();
        return avisos.findAll().stream().filter(a -> a.getFecha().isAfter(desde))
            .map(a -> Map.<String, Object>of("predio", a.getPredio() == null ? "" : a.getPredio().getCodigo(), "plantilla", a.getPlantilla(), "ts", a.getFecha().toEpochMilli()))
            .toList();
    }
}

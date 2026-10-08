package co.emcagua.api.vista;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import co.emcagua.api.caja.CajaServicio;
import co.emcagua.api.comun.ErrorNegocio;
import co.emcagua.api.comun.NoEncontrado;
import co.emcagua.api.comun.Periodo;
import co.emcagua.api.facturacion.Factura;
import co.emcagua.api.facturacion.FacturaRepositorio;
import co.emcagua.api.facturacion.FacturacionServicio;
import co.emcagua.api.facturacion.Pago;
import co.emcagua.api.facturacion.PagoRepositorio;
import co.emcagua.api.seguridad.Sesion;
import co.emcagua.api.suscriptores.AlarmaMedidor;
import co.emcagua.api.suscriptores.AlarmaRepositorio;
import co.emcagua.api.suscriptores.Barrio;
import co.emcagua.api.suscriptores.BarrioRepositorio;
import co.emcagua.api.suscriptores.Sector;
import co.emcagua.api.suscriptores.SectorRepositorio;
import co.emcagua.api.suscriptores.Lectura;
import co.emcagua.api.suscriptores.LecturaRepositorio;
import co.emcagua.api.suscriptores.Medidor;
import co.emcagua.api.suscriptores.MedidorRepositorio;
import co.emcagua.api.suscriptores.Predio;
import co.emcagua.api.suscriptores.PredioRepositorio;
import co.emcagua.api.suscriptores.Propietario;
import co.emcagua.api.suscriptores.PropietarioRepositorio;
import co.emcagua.api.suscriptores.SolicitudRegistro;
import co.emcagua.api.suscriptores.SolicitudRegistroRepositorio;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Servicios hechos a la medida de las pantallas del frontend (React): devuelven los datos ya armados
 * como los usa la aplicación (un suscriptor con su historial de facturas, un recibo con sus facturas…),
 * para no tener que hacer decenas de peticiones por pantalla.
 */
@RestController
@RequestMapping("/api/vista")
@Tag(name = "Vista (frontend)", description = "Datos armados para las pantallas de Usuarios, Facturación, Pagos y Lecturas")
public class VistaControlador {
    private final PredioRepositorio predios;
    private final PropietarioRepositorio propietarios;
    private final SolicitudRegistroRepositorio solicitudes;
    private final MedidorRepositorio medidores;
    private final LecturaRepositorio lecturas;
    private final FacturaRepositorio facturas;
    private final PagoRepositorio pagos;
    private final FacturacionServicio facturacion;
    private final CajaServicio caja;
    private final AlarmaRepositorio alarmas;
    private final SectorRepositorio sectores;
    private final BarrioRepositorio barrios;

    public VistaControlador(PredioRepositorio predios, PropietarioRepositorio propietarios, MedidorRepositorio medidores, LecturaRepositorio lecturas,
                            FacturaRepositorio facturas, PagoRepositorio pagos, FacturacionServicio facturacion, CajaServicio caja, AlarmaRepositorio alarmas,
                            SectorRepositorio sectores, BarrioRepositorio barrios, SolicitudRegistroRepositorio solicitudes) {
        this.solicitudes = solicitudes;
        this.alarmas = alarmas;
        this.sectores = sectores;
        this.barrios = barrios;
        this.predios = predios;
        this.propietarios = propietarios;
        this.medidores = medidores;
        this.lecturas = lecturas;
        this.facturas = facturas;
        this.pagos = pagos;
        this.facturacion = facturacion;
        this.caja = caja;
    }

    private static void exigir(String modulo) {
        if (!Sesion.cuenta().getRol().puede(modulo)) throw new ErrorNegocio("Tu rol no tiene permiso para el módulo " + modulo);
    }

    private static String telefono(String t) {
        return t != null && t.length() == 10 ? t.substring(0, 3) + " " + t.substring(3, 6) + " " + t.substring(6) : t == null ? "" : t;
    }

    private static String soloDigitos(String s) { return s == null ? "" : s.replaceAll("\\D", ""); }

    private Sector sector(String nombre) {
        if (nombre == null || nombre.isBlank()) throw new ErrorNegocio("Elige el sector del predio");
        return sectores.findByNombreIgnoreCase(nombre.trim()).orElseThrow(() -> new ErrorNegocio("Sector desconocido: " + nombre));
    }

    /** Barrio del sector (vacío = sin definir). Debe existir: se crean en Configuración → Sectores y barrios. */
    private Barrio barrio(Sector s, String nombre) {
        if (nombre == null || nombre.isBlank()) return null;
        return barrios.findBySectorAndNombreIgnoreCase(s, nombre.trim()).orElseThrow(() -> new ErrorNegocio("El barrio " + nombre + " no existe en el sector " + s.getNombre()));
    }

    private static String metodo(Pago.Metodo m) {
        return switch (m) { case EFECTIVO -> "Efectivo"; case TRANSFERENCIA -> "Transferencia"; case EN_LINEA -> "En línea"; };
    }

    private static Pago.Metodo metodo(String m) {
        if (m == null) throw new ErrorNegocio("Elige el método de pago");
        return switch (m) { case "Efectivo" -> Pago.Metodo.EFECTIVO; case "Transferencia" -> Pago.Metodo.TRANSFERENCIA; case "En línea" -> Pago.Metodo.EN_LINEA; default -> Pago.Metodo.valueOf(m); };
    }

    /* ------------------------------ Suscriptores ------------------------------ */

    static Map<String, Object> suscriptor(Predio p, Map<Long, String> serial, List<Factura> fs) {
        Map<String, Object> u = new LinkedHashMap<>();
        u.put("id", p.getCodigo());
        u.put("nombre", p.getPropietario().getNombre());
        u.put("cedula", p.getPropietario().getCedula());
        u.put("direccion", p.getDireccion());
        if (p.getOcupanteNombre() != null && !p.getOcupanteNombre().isBlank())
            u.put("ocupante", Map.of("nombre", p.getOcupanteNombre(), "telefono", telefono(p.getOcupanteTelefono())));
        u.put("sector", p.nombreSector());
        u.put("barrio", p.getBarrio() == null ? "" : p.getBarrio().getNombre());
        u.put("estrato", Math.max(1, Math.min(3, p.getEstrato())));
        u.put("medidor", serial.getOrDefault(p.getId(), ""));
        u.put("conMedidor", p.medido());
        u.put("telefono", telefono(p.getPropietario().getTelefono()));
        u.put("cuentaPortal", p.getPropietario().isCuentaPortal());
        u.put("estado", p.getEstado() == Predio.Estado.CORTADO ? "Cortado" : "Activo");
        List<Map<String, Object>> historial = new ArrayList<>();
        BigDecimal base = null;
        for (Factura f : fs) {
            if (f.getEstado() == Factura.Estado.ANULADA) continue;
            Map<String, Object> h = new LinkedHashMap<>();
            h.put("mes", f.getMes());
            h.put("anio", f.getAnio());
            h.put("consumo", f.getConsumo());
            h.put("estado", switch (f.getEstado()) { case PAGADA -> "Pagada"; case SUSPENDIDO -> "Suspendido"; default -> "Pendiente"; });
            if (f.getFechaPago() != null) h.put("fechaPago", f.getFechaPago().toEpochMilli());
            if (f.isEstimado()) h.put("estimado", true);
            if (Boolean.TRUE.equals(f.getTarifaFija())) h.put("fija", true);
            h.put("monto", f.getTotal());
            if (f.getCodigoVerificacion() != null) h.put("codigo", f.getCodigoVerificacion());
            historial.add(h);
            if (f.getLecturaActual() != null) base = f.getLecturaActual();
        }
        u.put("historial", historial);
        if (base != null) u.put("lecturaBase", base.setScale(0, java.math.RoundingMode.HALF_UP).intValue());
        return u;
    }

    @Operation(summary = "Todos los suscriptores (predios) con su propietario, medidor e historial de facturas")
    @GetMapping("/suscriptores")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> suscriptores() {
        Map<Long, String> serial = medidores.findAll().stream().filter(m -> m.getPredio() != null)
            .collect(Collectors.toMap(m -> m.getPredio().getId(), Medidor::getSerial, (a, b) -> a));
        Map<Long, List<Factura>> porPredio = facturas.findAll().stream()
            .sorted(Comparator.comparingInt((Factura f) -> f.getAnio() * 12 + f.getMes()))
            .collect(Collectors.groupingBy(f -> f.getPredio().getId(), LinkedHashMap::new, Collectors.toList()));
        return predios.findAll().stream()
            .filter(p -> p.getEstado() != Predio.Estado.RETIRADO)
            .sorted(Comparator.comparing(Predio::getCodigo))
            .map(p -> suscriptor(p, serial, porPredio.getOrDefault(p.getId(), List.of())))
            .toList();
    }

    public record Ocupante(String nombre, String telefono) {}
    public record FormSuscriptor(String id, String nombre, String cedula, String direccion, Ocupante ocupante, String sector, String barrio, Integer estrato, String medidor, String telefono, Boolean conMedidor) {}

    private void aplicar(Predio p, FormSuscriptor f) {
        String cedula = soloDigitos(f.cedula());
        if (cedula.length() < 5) throw new ErrorNegocio("La cédula debe tener al menos 5 números");
        if (f.nombre() == null || f.nombre().isBlank()) throw new ErrorNegocio("Escribe el nombre del propietario");
        // El dueño se identifica por la cédula: si ya existe se le agrega este predio y se actualizan sus datos
        Propietario dueno = propietarios.findByCedula(cedula).orElseGet(() -> new Propietario(cedula, f.nombre().trim(), null));
        dueno.setNombre(f.nombre().trim());
        String tel = soloDigitos(f.telefono());
        dueno.setTelefono(tel.isEmpty() ? null : tel);
        dueno = propietarios.save(dueno);
        p.setPropietario(dueno);
        p.setDireccion(f.direccion() == null || f.direccion().isBlank() ? "Sin dirección" : f.direccion().trim());
        Sector sec = sector(f.sector());
        p.setSector(sec);
        p.setBarrio(barrio(sec, f.barrio()));
        p.setEstrato(f.estrato() == null ? 1 : f.estrato());
        if (f.conMedidor() != null) p.setConMedidor(f.conMedidor());
        if (f.ocupante() != null && f.ocupante().nombre() != null && !f.ocupante().nombre().isBlank()) {
            p.setOcupanteNombre(f.ocupante().nombre().trim());
            String t = soloDigitos(f.ocupante().telefono());
            p.setOcupanteTelefono(t.isEmpty() ? null : t);
        } else {
            p.setOcupanteNombre(null);
            p.setOcupanteTelefono(null);
        }
    }

    private void medidor(Predio p, String serial) {
        String s = serial == null || serial.isBlank() ? "MED-" + p.getCodigo() : serial.trim();
        Medidor actual = medidores.findByPredio(p).orElse(null);
        if (actual != null && actual.getSerial().equals(s)) return;
        medidores.findBySerial(s).ifPresent(otro -> {
            if (otro.getPredio() != null && !otro.getPredio().getId().equals(p.getId()))
                throw new ErrorNegocio("El medidor " + s + " ya está instalado en el predio " + otro.getPredio().getCodigo());
        });
        if (actual != null) {
            actual.setSerial(s);
            medidores.save(actual);
        } else {
            medidores.save(new Medidor(s, p, LocalDate.now(FacturacionServicio.ZONA)));
        }
    }

    @Operation(summary = "Crear un predio (y su propietario si es nuevo)")
    @PostMapping("/suscriptores")
    @Transactional
    public Map<String, Object> crear(@RequestBody FormSuscriptor f) {
        exigir("usuarios");
        if (f.id() == null || !f.id().matches("\\d{3,10}")) throw new ErrorNegocio("El código del predio debe tener solo números (3 a 10 dígitos)");
        if (predios.findByCodigo(f.id()).isPresent()) throw new ErrorNegocio("Ya existe un usuario con el ID " + f.id());
        Predio p = new Predio();
        p.setCodigo(f.id());
        aplicar(p, f);
        p = predios.save(p);
        medidor(p, f.medidor());
        return Map.of("id", p.getCodigo());
    }

    @Operation(summary = "Editar un predio y los datos de su propietario")
    @PutMapping("/suscriptores/{codigo}")
    @Transactional
    public Map<String, Object> editar(@PathVariable String codigo, @RequestBody FormSuscriptor f) {
        exigir("usuarios");
        Predio p = predios.findByCodigo(codigo).orElseThrow(() -> new NoEncontrado("No existe el predio " + codigo));
        aplicar(p, f);
        predios.save(p);
        medidor(p, f.medidor());
        return Map.of("id", p.getCodigo());
    }

    @Operation(summary = "Cortar el servicio de un predio")
    @PostMapping("/suscriptores/{codigo}/cortar")
    @Transactional
    public Map<String, Object> cortar(@PathVariable String codigo) {
        exigir("usuarios");
        Predio p = predios.findByCodigo(codigo).orElseThrow(() -> new NoEncontrado("No existe el predio " + codigo));
        p.setEstado(Predio.Estado.CORTADO);
        predios.save(p);
        return Map.of("id", p.getCodigo(), "estado", "Cortado");
    }

    @Operation(summary = "Quitar la contraseña de la oficina virtual (el suscriptor la olvidó: vuelve a crear su cuenta)")
    @DeleteMapping("/suscriptores/{codigo}/cuenta-portal")
    @Transactional
    public Map<String, Object> quitarCuentaPortal(@PathVariable String codigo) {
        exigir("usuarios");
        Predio p = predios.findByCodigo(codigo).orElseThrow(() -> new NoEncontrado("No existe el predio " + codigo));
        Propietario dueno = p.getPropietario();
        dueno.setClavePortal(null);
        dueno.setCuentaPortalCreada(null);
        propietarios.save(dueno);
        return Map.of("id", p.getCodigo(), "cuentaPortal", false);
    }

    /* ---------------- Solicitudes de registro (oficina virtual) ---------------- */

    private static Map<String, Object> solicitud(SolicitudRegistro x) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", x.getId());
        m.put("radicado", x.getRadicado());
        m.put("nombre", x.getNombre());
        m.put("cedula", x.getCedula());
        m.put("telefono", telefono(x.getTelefono()));
        m.put("correo", x.getCorreo() == null ? "" : x.getCorreo());
        m.put("direccion", x.getDireccion());
        m.put("sector", x.getSector() == null ? "" : x.getSector());
        m.put("barrio", x.getBarrio() == null ? "" : x.getBarrio());
        m.put("estrato", x.getEstrato());
        m.put("conMedidor", x.isConMedidor());
        m.put("medidor", x.getMedidor() == null ? "" : x.getMedidor());
        m.put("observacion", x.getObservacion() == null ? "" : x.getObservacion());
        m.put("estado", switch (x.getEstado()) { case PENDIENTE -> "Pendiente"; case APROBADA -> "Aprobada"; case RECHAZADA -> "Rechazada"; });
        m.put("motivo", x.getMotivo() == null ? "" : x.getMotivo());
        m.put("predio", x.getPredio() == null ? "" : x.getPredio());
        m.put("creada", x.getCreado() == null ? 0 : x.getCreado().toEpochMilli());
        m.put("revisadaPor", x.getRevisadaPor() == null ? "" : x.getRevisadaPor());
        return m;
    }

    @Operation(summary = "Solicitudes de registro hechas desde la oficina virtual")
    @GetMapping("/solicitudes")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> solicitudes() {
        exigir("usuarios");
        return solicitudes.findAllByOrderByCreadoDesc().stream().limit(200).map(VistaControlador::solicitud).toList();
    }

    @Operation(summary = "Aprobar una solicitud: crea el predio con los datos revisados y deja lista la cuenta de la oficina virtual")
    @PostMapping("/solicitudes/{id}/aprobar")
    @Transactional
    public Map<String, Object> aprobar(@PathVariable Long id, @RequestBody FormSuscriptor f) {
        exigir("usuarios");
        SolicitudRegistro x = solicitudes.findById(id).orElseThrow(() -> new NoEncontrado("No existe esa solicitud"));
        if (x.getEstado() != SolicitudRegistro.Estado.PENDIENTE) throw new ErrorNegocio("Esa solicitud ya fue revisada");
        Map<String, Object> r = crear(f);
        Predio p = predios.findByCodigo(String.valueOf(r.get("id"))).orElseThrow();
        Propietario dueno = p.getPropietario();
        if (dueno.getClavePortal() == null) {
            dueno.setClavePortal(x.getClave());
            dueno.setCuentaPortalCreada(java.time.Instant.now());
        }
        if (dueno.getCorreo() == null && x.getCorreo() != null) dueno.setCorreo(x.getCorreo());
        propietarios.save(dueno);
        x.setEstado(SolicitudRegistro.Estado.APROBADA);
        x.setPredio(p.getCodigo());
        x.setRevisadaPor(Sesion.cuenta().getNombre());
        x.setRevisadaEn(java.time.Instant.now());
        solicitudes.save(x);
        return solicitud(x);
    }

    public record Rechazo(String motivo) {}

    @Operation(summary = "Rechazar una solicitud de registro")
    @PostMapping("/solicitudes/{id}/rechazar")
    @Transactional
    public Map<String, Object> rechazar(@PathVariable Long id, @RequestBody Rechazo b) {
        exigir("usuarios");
        SolicitudRegistro x = solicitudes.findById(id).orElseThrow(() -> new NoEncontrado("No existe esa solicitud"));
        if (x.getEstado() != SolicitudRegistro.Estado.PENDIENTE) throw new ErrorNegocio("Esa solicitud ya fue revisada");
        if (b.motivo() == null || b.motivo().isBlank()) throw new ErrorNegocio("Escribe el motivo del rechazo (se le muestra a la persona)");
        x.setEstado(SolicitudRegistro.Estado.RECHAZADA);
        x.setMotivo(b.motivo().trim());
        x.setRevisadaPor(Sesion.cuenta().getNombre());
        x.setRevisadaEn(java.time.Instant.now());
        solicitudes.save(x);
        return solicitud(x);
    }

    /* --------------------------------- Pagos --------------------------------- */

    static Map<String, Object> pago(Pago p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getNumero());
        m.put("clienteId", p.getPredio().getCodigo());
        m.put("cliente", p.getPredio().getPropietario().getNombre());
        m.put("facturaIds", p.getFacturas().stream().map(Factura::getNumero).toList());
        m.put("concepto", p.getConcepto());
        m.put("monto", p.getMonto());
        m.put("metodo", metodo(p.getMetodo()));
        if (p.getRecibido() != null) m.put("recibido", p.getRecibido());
        if (p.getVueltos() != null) m.put("vueltos", p.getVueltos());
        if (p.getComprobanteImagen() != null) m.put("comprobante", p.getComprobanteImagen());
        else if (p.getComprobante() != null) m.put("comprobante", p.getComprobante());
        m.put("cajero", p.getCajero() != null ? p.getCajero().getNombre() : "Portal web");
        m.put("timestamp", p.getFecha().toEpochMilli());
        if (p.getCodigoVerificacion() != null) m.put("codigo", p.getCodigoVerificacion());
        return m;
    }

    @Operation(summary = "Recibos de caja, del más reciente al más antiguo")
    @GetMapping("/pagos")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> pagos() {
        return pagos.findAll().stream().sorted(Comparator.comparing(Pago::getFecha).reversed()).map(VistaControlador::pago).toList();
    }

    public record Cobro(List<String> facturas, String metodo, Long recibido, String comprobante, boolean reconectar, String predio) {}

    @Operation(summary = "Cobrar facturas por su número (FAC-2026-09-10234) y, si se pide, reconectar el predio")
    @PostMapping("/cobrar")
    @Transactional
    public Map<String, Object> cobrar(@RequestBody Cobro c) {
        exigir("pagos");
        List<Long> ids = (c.facturas() == null ? List.<String>of() : c.facturas()).stream()
            .map(n -> facturas.findByNumero(n).orElseThrow(() -> new NoEncontrado("No existe la factura " + n)).getId())
            .toList();
        Long predio = c.predio() == null ? null : predios.findByCodigo(c.predio()).orElseThrow(() -> new NoEncontrado("No existe el predio " + c.predio())).getId();
        Pago p = caja.cobrar(new CajaServicio.Cobro(ids, metodo(c.metodo()), c.recibido(), c.comprobante(), c.reconectar(), predio), Sesion.cuenta());
        return pago(p);
    }

    /* ------------------------------ Telemetría ------------------------------ */

    @Operation(summary = "Estado de comunicación de cada medidor y eventos abiertos que reportó el equipo")
    @GetMapping("/telemetria")
    @Transactional(readOnly = true)
    public Map<String, Object> telemetria() {
        Map<Long, List<String>> eventos = new HashMap<>();
        for (AlarmaMedidor a : alarmas.findByResueltaIsNull()) {
            String e = a.getTipo() == AlarmaMedidor.Tipo.MANIPULACION ? "manipulacion" : a.getTipo() == AlarmaMedidor.Tipo.FLUJO_INVERSO ? "flujo_inverso" : null;
            if (e != null) eventos.computeIfAbsent(a.getMedidor().getId(), k -> new ArrayList<>()).add(e);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        for (Medidor m : medidores.findAll()) {
            if (m.getPredio() == null || m.getUltimaComunicacion() == null) continue;
            Map<String, Object> t = new LinkedHashMap<>();
            t.put("ultimaComunicacion", m.getUltimaComunicacion().toEpochMilli());
            t.put("senal", m.getSenal() == null ? 0 : m.getSenal());
            t.put("eventos", eventos.getOrDefault(m.getId(), List.of()));
            out.put(m.getPredio().getCodigo(), t);
        }
        return out;
    }

    /* ------------------------------- Lecturas ------------------------------- */

    /** Desde cuándo cuentan las lecturas del periodo que está en toma de lecturas. */
    private Instant inicioToma() {
        return facturacion.periodoEnLectura().anterior().generacion().atStartOfDay(FacturacionServicio.ZONA).toInstant();
    }

    @Operation(summary = "Lectura del periodo en curso de cada predio (la tomada en sitio manda sobre la de telemetría)")
    @GetMapping("/lecturas")
    @Transactional(readOnly = true)
    public Map<String, Object> lecturas() {
        Instant desde = inicioToma();
        Map<String, Lectura> elegida = new HashMap<>();
        for (Lectura l : lecturas.findAll()) {
            if (l.getFecha().isBefore(desde)) continue;
            Medidor m = l.getMedidor();
            if (m.getPredio() == null) continue;
            String codigo = m.getPredio().getCodigo();
            Lectura antes = elegida.get(codigo);
            boolean mejor = antes == null
                || (l.getOrigen() == Lectura.Origen.MANUAL && antes.getOrigen() != Lectura.Origen.MANUAL)
                || (l.getOrigen() == antes.getOrigen() && l.getFecha().isAfter(antes.getFecha()));
            if (mejor) elegida.put(codigo, l);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        elegida.forEach((codigo, l) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("valor", l.getValor().setScale(0, java.math.RoundingMode.HALF_UP).intValue());
            m.put("ts", l.getFecha().toEpochMilli());
            m.put("lector", l.getLector() == null ? "Telemetría" : l.getLector());
            m.put("origen", l.getOrigen() == Lectura.Origen.MANUAL ? "manual" : "telemetria");
            if (l.getNota() != null) m.put("nota", l.getNota());
            if (l.getFotoImagen() != null) m.put("foto", l.getFotoImagen());
            out.put(codigo, m);
        });
        return out;
    }

    public record NuevaLectura(String predio, BigDecimal valor, String nota, String foto) {}

    @Operation(summary = "Guardar una lectura tomada en sitio")
    @PostMapping("/lecturas")
    @Transactional
    public Map<String, Object> registrarLectura(@RequestBody NuevaLectura n) {
        exigir("lecturas");
        if (n.valor() == null || n.valor().signum() < 0) throw new ErrorNegocio("Escribe la lectura del medidor");
        Predio p = predios.findByCodigo(n.predio()).orElseThrow(() -> new NoEncontrado("No existe el predio " + n.predio()));
        Medidor m = medidores.findByPredio(p).orElseThrow(() -> new ErrorNegocio("El predio " + p.getCodigo() + " no tiene medidor"));
        Lectura l = new Lectura(m, Instant.now(), n.valor(), Lectura.Origen.MANUAL, Sesion.nombre());
        l.setNota(n.nota());
        if (n.foto() != null && !n.foto().isBlank()) l.setFotoImagen(n.foto());
        lecturas.save(l);
        return Map.of("predio", p.getCodigo());
    }

    @Operation(summary = "Quitar las lecturas en sitio del periodo en curso (vuelve a usarse la de telemetría)")
    @DeleteMapping("/lecturas/{codigo}")
    @Transactional
    public Map<String, Object> borrarLectura(@PathVariable String codigo) {
        exigir("lecturas");
        Predio p = predios.findByCodigo(codigo).orElseThrow(() -> new NoEncontrado("No existe el predio " + codigo));
        Instant desde = inicioToma();
        int n = 0;
        for (Medidor m : medidores.findByPredio(p).stream().toList()) {
            for (Lectura l : lecturas.findByMedidorOrderByFechaDesc(m)) {
                if (l.getOrigen() == Lectura.Origen.MANUAL && !l.getFecha().isBefore(desde)) { lecturas.delete(l); n++; }
            }
        }
        return Map.of("borradas", n);
    }

    @Operation(summary = "Cerrar el periodo en toma de lecturas y generar sus facturas")
    @PostMapping("/facturar")
    public FacturacionServicio.Resumen facturar() {
        exigir("facturacion");
        Periodo p = facturacion.periodoEnLectura();
        return facturacion.cerrar(p);
    }
}

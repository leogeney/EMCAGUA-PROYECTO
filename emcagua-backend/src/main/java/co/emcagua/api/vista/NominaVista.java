package co.emcagua.api.vista;

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

import co.emcagua.api.comun.ErrorNegocio;
import co.emcagua.api.comun.NoEncontrado;
import co.emcagua.api.facturacion.FacturacionServicio;
import co.emcagua.api.nomina.Empleado;
import co.emcagua.api.nomina.EmpleadoRepositorio;
import co.emcagua.api.nomina.NovedadNomina;
import co.emcagua.api.nomina.NovedadNominaRepositorio;
import co.emcagua.api.nomina.ParametrosNomina;
import co.emcagua.api.nomina.ParametrosNominaRepositorio;
import co.emcagua.api.nomina.PeriodoNomina;
import co.emcagua.api.nomina.PeriodoNominaRepositorio;
import co.emcagua.api.seguridad.Sesion;
import io.swagger.v3.oas.annotations.tags.Tag;

/** Nómina (parámetros, empleados, periodos con novedades y bitácora) con la forma que usa el frontend. */
@RestController
@RequestMapping("/api/vista/nomina")
@Tag(name = "Vista (frontend)")
public class NominaVista {
    private final ParametrosNominaRepositorio parametros;
    private final EmpleadoRepositorio empleados;
    private final PeriodoNominaRepositorio periodos;
    private final NovedadNominaRepositorio novedades;

    public NominaVista(ParametrosNominaRepositorio parametros, EmpleadoRepositorio empleados, PeriodoNominaRepositorio periodos, NovedadNominaRepositorio novedades) {
        this.parametros = parametros;
        this.empleados = empleados;
        this.periodos = periodos;
        this.novedades = novedades;
    }

    private static void exigir() { AdministracionVista.exigir("nomina"); }

    private static String clave(int anio, int mes) { return "%d-%02d".formatted(anio, mes); }

    private static Map<String, Object> parametros(ParametrosNomina p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("anio", p.getAnio());
        m.put("smmlv", p.getSmmlv());
        m.put("auxilioTransporte", p.getAuxilioTransporte());
        m.put("horasMes", p.getHorasMes());
        m.put("saludEmpleado", p.getSaludEmpleado());
        m.put("pensionEmpleado", p.getPensionEmpleado());
        m.put("saludEmpleador", p.getSaludEmpleador());
        m.put("pensionEmpleador", p.getPensionEmpleador());
        m.put("caja", p.getCaja());
        m.put("icbf", p.getIcbf());
        m.put("sena", p.getSena());
        m.put("exoneradoParafiscales", p.isExoneradoParafiscales());
        m.put("recargoNocturno", p.getRecargoNocturno());
        m.put("recargoDominical", p.getRecargoDominical());
        m.put("heDiurna", p.getHeDiurna());
        m.put("heNocturna", p.getHeNocturna());
        m.put("limiteHorasExtraMes", p.getLimiteHorasExtraMes());
        return m;
    }

    private static Map<String, Object> empleado(Empleado e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", String.valueOf(e.getId()));
        m.put("nombre", e.getNombre());
        m.put("cedula", e.getCedula());
        m.put("cargo", e.getCargo());
        m.put("area", Etiquetas.AREA.get(e.getArea()));
        m.put("salario", e.getSalario());
        m.put("fechaIngreso", e.getFechaIngreso().toString());
        m.put("contrato", Etiquetas.CONTRATO.get(e.getContrato()));
        m.put("riesgoArl", e.getRiesgoArl());
        m.put("eps", e.getEps() == null ? "" : e.getEps());
        m.put("pension", e.getPension() == null ? "" : e.getPension());
        m.put("diasVacacionesDisfrutados", e.getDiasVacacionesDisfrutados());
        m.put("activo", e.isActivo());
        return m;
    }

    private static Map<String, Object> novedad(NovedadNomina n) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("dias", n.getDias());
        m.put("hed", n.getHed());
        m.put("hen", n.getHen());
        m.put("heddf", n.getHeddf());
        m.put("hendf", n.getHendf());
        m.put("rn", n.getRn());
        m.put("rdf", n.getRdf());
        m.put("comisiones", n.getComisiones());
        m.put("bonificacion", n.getBonificacion());
        m.put("prestamo", n.getPrestamo());
        m.put("libranza", n.getLibranza());
        m.put("retencion", n.getRetencion());
        m.put("otrosDescuentos", n.getOtrosDescuentos());
        if (n.getNota() != null) m.put("nota", n.getNota());
        return m;
    }

    private Map<String, Object> periodo(PeriodoNomina p, List<Empleado> activos) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("clave", clave(p.getAnio(), p.getMes()));
        m.put("anio", p.getAnio());
        m.put("mes", p.getMes());
        m.put("estado", Etiquetas.ESTADO_NOMINA.get(p.getEstado()));
        Map<String, Object> nov = new LinkedHashMap<>();
        for (NovedadNomina n : novedades.findByPeriodo(p)) nov.put(String.valueOf(n.getEmpleado().getId()), novedad(n));
        // En borrador, los empleados activos sin novedades aparecen con el mes completo
        if (p.getEstado() == PeriodoNomina.Estado.BORRADOR)
            for (Empleado e : activos) nov.putIfAbsent(String.valueOf(e.getId()), novedad(new NovedadNomina()));
        m.put("novedades", nov);
        m.put("log", p.getBitacora().stream().map(e -> Map.<String, Object>of("ts", e.getFecha().toEpochMilli(), "usuario", e.getUsuario() == null ? "sistema" : e.getUsuario(), "accion", e.getAccion())).toList());
        return m;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public Map<String, Object> todo() {
        exigir();
        int anio = LocalDate.now(FacturacionServicio.ZONA).getYear();
        ParametrosNomina p = parametros.findByAnio(anio).orElseGet(() -> parametros.findAll().stream().max(Comparator.comparingInt(ParametrosNomina::getAnio)).orElse(null));
        List<Empleado> lista = empleados.findAll().stream().sorted(Comparator.comparing(Empleado::getId)).toList();
        List<Empleado> activos = lista.stream().filter(Empleado::isActivo).toList();
        Map<String, Object> per = new LinkedHashMap<>();
        periodos.findAll().stream().sorted(Comparator.comparingInt(x -> x.getAnio() * 12 + x.getMes()))
            .forEach(x -> per.put(clave(x.getAnio(), x.getMes()), periodo(x, activos)));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("parametros", p == null ? null : parametros(p));
        out.put("empleados", lista.stream().map(NominaVista::empleado).toList());
        out.put("periodos", per);
        return out;
    }

    /**
     * Empleados para otras pantallas (responsables de PQR, certificados laborales, cuentas).
     * El salario y la seguridad social solo los ven quienes tienen nómina o documentos.
     */
    @GetMapping("/directorio")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> directorio() {
        var rol = Sesion.cuenta().getRol();
        boolean completo = rol.puede("nomina") || rol.puede("documentos");
        return empleados.findAll().stream().sorted(Comparator.comparing(Empleado::getId)).map(e -> {
            Map<String, Object> m = empleado(e);
            if (!completo) { m.put("salario", 0); m.put("eps", ""); m.put("pension", ""); m.put("cedula", ""); }
            return m;
        }).toList();
    }

    public record ParametrosForm(int anio, long smmlv, long auxilioTransporte, int horasMes, double saludEmpleado, double pensionEmpleado, double saludEmpleador,
                                 double pensionEmpleador, double caja, double icbf, double sena, boolean exoneradoParafiscales, double recargoNocturno,
                                 double recargoDominical, double heDiurna, double heNocturna, int limiteHorasExtraMes) {}

    @PutMapping("/parametros")
    @Transactional
    public Map<String, Object> guardarParametros(@RequestBody ParametrosForm f) {
        exigir();
        ParametrosNomina p = parametros.findByAnio(f.anio()).orElseGet(ParametrosNomina::new);
        p.setAnio(f.anio());
        p.setSmmlv(f.smmlv());
        p.setAuxilioTransporte(f.auxilioTransporte());
        p.setHorasMes(f.horasMes());
        p.setSaludEmpleado(f.saludEmpleado());
        p.setPensionEmpleado(f.pensionEmpleado());
        p.setSaludEmpleador(f.saludEmpleador());
        p.setPensionEmpleador(f.pensionEmpleador());
        p.setCaja(f.caja());
        p.setIcbf(f.icbf());
        p.setSena(f.sena());
        p.setExoneradoParafiscales(f.exoneradoParafiscales());
        p.setRecargoNocturno(f.recargoNocturno());
        p.setRecargoDominical(f.recargoDominical());
        p.setHeDiurna(f.heDiurna());
        p.setHeNocturna(f.heNocturna());
        p.setLimiteHorasExtraMes(f.limiteHorasExtraMes());
        return parametros(parametros.save(p));
    }

    public record EmpleadoForm(String nombre, String cedula, String cargo, String area, long salario, String fechaIngreso, String contrato, int riesgoArl,
                               String eps, String pension, int diasVacacionesDisfrutados, boolean activo) {}

    @PutMapping("/empleados/{id}")
    @Transactional
    public Map<String, Object> guardarEmpleado(@PathVariable String id, @RequestBody EmpleadoForm f) {
        exigir();
        if (f.cedula() == null || f.cedula().isBlank()) throw new ErrorNegocio("Escribe la cédula");
        Empleado e = (id.matches("\\d+") ? empleados.findById(Long.valueOf(id)) : java.util.Optional.<Empleado>empty())
            .or(() -> empleados.findByCedula(f.cedula().trim()))
            .orElseGet(Empleado::new);
        e.setNombre(f.nombre());
        e.setCedula(f.cedula().trim());
        e.setCargo(f.cargo());
        e.setArea(Etiquetas.de(Etiquetas.AREA, f.area(), "el área"));
        e.setSalario(f.salario());
        e.setFechaIngreso(LocalDate.parse(f.fechaIngreso()));
        e.setContrato(Etiquetas.de(Etiquetas.CONTRATO, f.contrato(), "el contrato"));
        e.setRiesgoArl(Math.max(1, Math.min(5, f.riesgoArl())));
        e.setEps(f.eps());
        e.setPension(f.pension());
        e.setDiasVacacionesDisfrutados(f.diasVacacionesDisfrutados());
        if (e.isActivo() && !f.activo()) e.setFechaRetiro(LocalDate.now(FacturacionServicio.ZONA));
        e.setActivo(f.activo());
        return empleado(empleados.save(e));
    }

    private PeriodoNomina asegurar(String clave) {
        String[] p = clave.split("-");
        int anio = Integer.parseInt(p[0]), mes = Integer.parseInt(p[1]);
        return periodos.findByAnioAndMes(anio, mes).orElseGet(() -> {
            PeriodoNomina n = new PeriodoNomina();
            n.setAnio(anio);
            n.setMes(mes);
            n.getBitacora().add(new PeriodoNomina.Evento(Sesion.nombre(), "Nómina creada"));
            return periodos.save(n);
        });
    }

    public record NovedadForm(int dias, double hed, double hen, double heddf, double hendf, double rn, double rdf, long comisiones, long bonificacion,
                              long prestamo, long libranza, long retencion, long otrosDescuentos, String nota) {}

    @PutMapping("/{clave}/novedades/{empleadoId}")
    @Transactional
    public Map<String, Object> guardarNovedad(@PathVariable String clave, @PathVariable Long empleadoId, @RequestBody NovedadForm f) {
        exigir();
        PeriodoNomina p = asegurar(clave);
        if (p.getEstado() != PeriodoNomina.Estado.BORRADOR) throw new ErrorNegocio("La nómina de ese mes ya fue aprobada; no se puede modificar");
        Empleado e = empleados.findById(empleadoId).orElseThrow(() -> new NoEncontrado("No existe el empleado"));
        NovedadNomina n = novedades.findByPeriodoAndEmpleado(p, e).orElseGet(() -> { NovedadNomina x = new NovedadNomina(); x.setPeriodo(p); x.setEmpleado(e); return x; });
        n.setDias(Math.max(0, Math.min(30, f.dias())));
        n.setHed(f.hed());
        n.setHen(f.hen());
        n.setHeddf(f.heddf());
        n.setHendf(f.hendf());
        n.setRn(f.rn());
        n.setRdf(f.rdf());
        n.setComisiones(f.comisiones());
        n.setBonificacion(f.bonificacion());
        n.setPrestamo(f.prestamo());
        n.setLibranza(f.libranza());
        n.setRetencion(f.retencion());
        n.setOtrosDescuentos(f.otrosDescuentos());
        n.setNota(f.nota());
        novedades.save(n);
        p.getBitacora().add(new PeriodoNomina.Evento(Sesion.nombre(), "Novedades editadas: " + e.getNombre()));
        periodos.save(p);
        return Map.of("ok", true);
    }

    public record EstadoForm(String estado, String detalle) {}

    @PostMapping("/{clave}/estado")
    @Transactional
    public Map<String, Object> cambiarEstado(@PathVariable String clave, @RequestBody EstadoForm f) {
        exigir();
        PeriodoNomina p = asegurar(clave);
        PeriodoNomina.Estado e = Etiquetas.de(Etiquetas.ESTADO_NOMINA, f.estado(), "el estado");
        p.setEstado(e);
        if (e == PeriodoNomina.Estado.APROBADA) {
            p.setAprobadaPor(Sesion.nombre());
            p.setAprobadaEn(java.time.Instant.now());
            // Las novedades de los empleados activos quedan guardadas tal como se aprobaron
            for (Empleado emp : empleados.findAll()) {
                if (emp.isActivo() && novedades.findByPeriodoAndEmpleado(p, emp).isEmpty()) {
                    NovedadNomina n = new NovedadNomina();
                    n.setPeriodo(p);
                    n.setEmpleado(emp);
                    novedades.save(n);
                }
            }
        }
        String accion = f.detalle() != null && !f.detalle().isBlank() ? f.detalle()
            : e == PeriodoNomina.Estado.APROBADA ? "Nómina aprobada" : e == PeriodoNomina.Estado.PAGADA ? "Nómina marcada como pagada" : "Nómina devuelta a borrador";
        p.getBitacora().add(new PeriodoNomina.Evento(Sesion.nombre(), accion));
        periodos.save(p);
        return Map.of("ok", true);
    }
}

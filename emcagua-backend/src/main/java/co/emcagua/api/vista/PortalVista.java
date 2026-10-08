package co.emcagua.api.vista;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import java.time.Instant;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import co.emcagua.api.caja.CajaServicio;
import co.emcagua.api.comun.ErrorNegocio;
import co.emcagua.api.comun.NoEncontrado;
import co.emcagua.api.facturacion.Factura;
import co.emcagua.api.facturacion.FacturaRepositorio;
import co.emcagua.api.facturacion.Pago;
import co.emcagua.api.facturacion.TarifaRepositorio;
import co.emcagua.api.pqr.EventoPqrRepositorio;
import co.emcagua.api.pqr.Pqr;
import co.emcagua.api.pqr.PqrRepositorio;
import co.emcagua.api.pqr.PqrServicio;
import co.emcagua.api.suscriptores.Medidor;
import co.emcagua.api.suscriptores.MedidorRepositorio;
import co.emcagua.api.suscriptores.Predio;
import co.emcagua.api.suscriptores.PredioRepositorio;
import co.emcagua.api.suscriptores.Propietario;
import co.emcagua.api.suscriptores.PropietarioRepositorio;
import co.emcagua.api.suscriptores.BarrioRepositorio;
import co.emcagua.api.suscriptores.SectorRepositorio;
import co.emcagua.api.suscriptores.SolicitudRegistro;
import co.emcagua.api.suscriptores.SolicitudRegistroRepositorio;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Oficina virtual (pública): el suscriptor entra con su código o cédula y los últimos 4 dígitos del celular,
 * y recibe sus predios con la misma forma que usa la pantalla del portal.
 */
@RestController
@RequestMapping("/api/portal/vista")
@Tag(name = "Portal (público)")
public class PortalVista {
    private final PredioRepositorio predios;
    private final MedidorRepositorio medidores;
    private final FacturaRepositorio facturas;
    private final PqrRepositorio pqrs;
    private final EventoPqrRepositorio eventos;
    private final PqrServicio pqr;
    private final CajaServicio caja;
    private final TarifaRepositorio tarifas;
    private final PropietarioRepositorio propietarios;
    private final PasswordEncoder cifrador;
    private final SolicitudRegistroRepositorio solicitudes;
    private final SectorRepositorio sectores;
    private final BarrioRepositorio barrios;

    public PortalVista(PredioRepositorio predios, MedidorRepositorio medidores, FacturaRepositorio facturas, PqrRepositorio pqrs, EventoPqrRepositorio eventos, PqrServicio pqr, CajaServicio caja, TarifaRepositorio tarifas,
                       PropietarioRepositorio propietarios, PasswordEncoder cifrador, SolicitudRegistroRepositorio solicitudes, SectorRepositorio sectores, BarrioRepositorio barrios) {
        this.solicitudes = solicitudes;
        this.sectores = sectores;
        this.barrios = barrios;
        this.propietarios = propietarios;
        this.cifrador = cifrador;
        this.tarifas = tarifas;
        this.predios = predios;
        this.medidores = medidores;
        this.facturas = facturas;
        this.pqrs = pqrs;
        this.eventos = eventos;
        this.pqr = pqr;
        this.caja = caja;
    }

    public record Acceso(String codigo, String ultimos4, String clave) {}

    private List<Predio> casasDe(String codigo) {
        String q = codigo == null ? "" : codigo.replaceAll("\\D", "");
        return predios.findByCodigo(q).map(p -> predios.findByPropietarioCedula(p.getPropietario().getCedula())).orElseGet(() -> predios.findByPropietarioCedula(q));
    }

    private static List<Predio> activas(List<Predio> casas) {
        return casas.stream().filter(p -> p.getEstado() != Predio.Estado.RETIRADO).sorted(Comparator.comparing(Predio::getCodigo)).toList();
    }

    /** Con cuenta creada se entra con la contraseña; sin cuenta, con los últimos 4 dígitos del celular. */
    private List<Predio> acceder(String codigo, String ultimos4, String clave) {
        List<Predio> casas = casasDe(codigo);
        if (casas.isEmpty()) {
            // ¿Se registró solo y su solicitud sigue en revisión?
            String ced = codigo == null ? "" : codigo.replaceAll("\\D", "");
            solicitudes.findFirstByCedulaOrderByCreadoDesc(ced).filter(sol -> clave != null && cifrador.matches(clave, sol.getClave())).ifPresent(sol -> {
                if (sol.getEstado() == SolicitudRegistro.Estado.PENDIENTE)
                    throw new ErrorNegocio("Tu solicitud " + sol.getRadicado() + " está en revisión. Te avisaremos al celular cuando la aprueben.");
                if (sol.getEstado() == SolicitudRegistro.Estado.RECHAZADA)
                    throw new ErrorNegocio("Tu solicitud " + sol.getRadicado() + " no fue aprobada" + (sol.getMotivo() == null || sol.getMotivo().isBlank() ? "." : ": " + sol.getMotivo()) + " Acércate a la oficina.");
            });
            throw new ErrorNegocio("El código o la cédula no coinciden con la contraseña.");
        }
        Propietario dueno = casas.get(0).getPropietario();
        if (dueno.isCuentaPortal()) {
            if (clave == null || !cifrador.matches(clave, dueno.getClavePortal()))
                throw new ErrorNegocio("El código o la cédula no coinciden con la contraseña.");
        } else if (clave != null && !clave.isEmpty() && (ultimos4 == null || ultimos4.isEmpty())) {
            throw new ErrorNegocio("Todavía no tienes cuenta en la oficina virtual. Créala con el botón «Crear cuenta».");
        } else {
            String tel = dueno.getTelefono();
            if (tel == null || ultimos4 == null || ultimos4.length() != 4 || !tel.endsWith(ultimos4))
                throw new ErrorNegocio("El código o la cédula no coinciden con los últimos 4 dígitos del celular.");
        }
        return activas(casas);
    }

    @GetMapping("/zonas")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> zonas() {
        return sectores.findAllByOrderByOrdenAscNombreAsc().stream().map(sec -> Map.<String, Object>of(
            "nombre", sec.getNombre(), "barrios", barrios.findBySectorOrderByNombreAsc(sec).stream().map(b -> b.getNombre()).toList())).toList();
    }

    public record Solicitud(String nombre, String cedula, String telefono, String correo, String direccion, String sector, String barrio,
                            Integer estrato, Boolean conMedidor, String medidor, String observacion, String clave, Boolean aceptaDatos) {}

    private static String txt(String s, int max) { return s == null ? "" : s.trim().replaceAll("\\s+", " ").substring(0, Math.min(max, s.trim().replaceAll("\\s+", " ").length())); }

    @PostMapping("/solicitud")
    @Transactional
    public Map<String, Object> solicitar(@RequestBody Solicitud f) {
        String nombre = txt(f.nombre(), 120);
        String cedula = f.cedula() == null ? "" : f.cedula().replaceAll("\\D", "");
        String tel = f.telefono() == null ? "" : f.telefono().replaceAll("\\D", "");
        if (nombre.length() < 5 || !nombre.contains(" ")) throw new ErrorNegocio("Escribe tu nombre completo (nombre y apellido).");
        if (cedula.length() < 5 || cedula.length() > 15) throw new ErrorNegocio("Escribe tu número de cédula, solo números.");
        if (!tel.matches("3\\d{9}")) throw new ErrorNegocio("Escribe un celular de 10 dígitos que empiece por 3.");
        if (txt(f.direccion(), 200).length() < 5) throw new ErrorNegocio("Escribe la dirección del predio.");
        if (f.sector() == null || sectores.findByNombreIgnoreCase(f.sector().trim()).isEmpty()) throw new ErrorNegocio("Elige el sector donde está el predio.");
        int estrato = f.estrato() == null ? 1 : f.estrato();
        if (estrato < 1 || estrato > 6) throw new ErrorNegocio("Elige el estrato que aparece en tu recibo de luz.");
        String correo = txt(f.correo(), 120);
        if (!correo.isEmpty() && !correo.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+")) throw new ErrorNegocio("El correo no es válido (o déjalo vacío).");
        String clave = f.clave() == null ? "" : f.clave();
        if (clave.length() < 8 || clave.chars().noneMatch(Character::isLetter) || clave.chars().noneMatch(Character::isDigit))
            throw new ErrorNegocio("La contraseña debe tener mínimo 8 caracteres, con letras y números.");
        if (!Boolean.TRUE.equals(f.aceptaDatos())) throw new ErrorNegocio("Debes autorizar el tratamiento de tus datos personales para registrarte.");
        if (!predios.findByPropietarioCedula(cedula).isEmpty())
            throw new ErrorNegocio("Ya eres suscriptor de EMCAGUA. Usa «Ya tengo factura» con tu código o cédula para crear tu contraseña.");
        solicitudes.findFirstByCedulaAndEstadoOrderByCreadoDesc(cedula, SolicitudRegistro.Estado.PENDIENTE).ifPresent(x -> {
            throw new ErrorNegocio("Ya tienes una solicitud en revisión (" + x.getRadicado() + "). Te avisaremos cuando la aprueben.");
        });
        SolicitudRegistro s = new SolicitudRegistro();
        s.setRadicado("SOL-%d-%04d".formatted(java.time.Year.now().getValue(), solicitudes.count() + 1));
        s.setNombre(nombre);
        s.setCedula(cedula);
        s.setTelefono(tel);
        s.setCorreo(correo.isEmpty() ? null : correo);
        s.setDireccion(txt(f.direccion(), 200));
        s.setSector(sectores.findByNombreIgnoreCase(f.sector().trim()).get().getNombre());
        s.setBarrio(txt(f.barrio(), 80).isEmpty() ? null : txt(f.barrio(), 80));
        s.setEstrato(estrato);
        s.setConMedidor(Boolean.TRUE.equals(f.conMedidor()));
        s.setMedidor(Boolean.TRUE.equals(f.conMedidor()) && !txt(f.medidor(), 40).isEmpty() ? txt(f.medidor(), 40) : null);
        s.setObservacion(txt(f.observacion(), 500).isEmpty() ? null : txt(f.observacion(), 500));
        s.setClave(cifrador.encode(clave));
        solicitudes.save(s);
        return Map.of("radicado", s.getRadicado(), "nombre", s.getNombre());
    }

    public record Registro(String codigo, String ultimos4, String clave) {}

    @PostMapping("/registro")
    @Transactional
    public Map<String, Object> registro(@RequestBody Registro r) {
        List<Predio> casas = casasDe(r.codigo());
        if (casas.isEmpty()) throw new ErrorNegocio("No encontramos ese código de suscriptor o cédula. Revisa tu factura.");
        Propietario dueno = casas.get(0).getPropietario();
        if (dueno.isCuentaPortal()) throw new ErrorNegocio("Ya tienes una cuenta: entra con tu contraseña. Si la olvidaste, acércate a la oficina.");
        String tel = dueno.getTelefono();
        if (tel == null || tel.isBlank()) throw new ErrorNegocio("Tu predio no tiene celular registrado. Acércate a la oficina para actualizarlo.");
        if (r.ultimos4() == null || r.ultimos4().length() != 4 || !tel.endsWith(r.ultimos4()))
            throw new ErrorNegocio("Los últimos 4 dígitos no coinciden con el celular registrado en tu factura.");
        String clave = r.clave() == null ? "" : r.clave();
        if (clave.length() < 8) throw new ErrorNegocio("La contraseña debe tener mínimo 8 caracteres.");
        if (clave.chars().noneMatch(Character::isLetter) || clave.chars().noneMatch(Character::isDigit))
            throw new ErrorNegocio("La contraseña debe tener letras y números.");
        dueno.setClavePortal(cifrador.encode(clave));
        dueno.setCuentaPortalCreada(Instant.now());
        propietarios.save(dueno);
        return cuenta(new Acceso(r.codigo(), null, clave));
    }

    @PostMapping("/cuenta")
    @Transactional(readOnly = true)
    public Map<String, Object> cuenta(@RequestBody Acceso a) {
        List<Predio> casas = acceder(a.codigo(), a.ultimos4(), a.clave());
        String q = a.codigo() == null ? "" : a.codigo().replaceAll("\\D", "");
        String inicial = casas.stream().map(Predio::getCodigo).filter(q::equals).findFirst().orElse(casas.get(0).getCodigo());
        Map<Long, String> serial = casas.stream().map(p -> medidores.findByPredio(p)).filter(java.util.Optional::isPresent).map(java.util.Optional::get)
            .collect(Collectors.toMap(m -> m.getPredio().getId(), Medidor::getSerial, (x, y) -> x));
        List<Map<String, Object>> usuarios = casas.stream().map(p -> VistaControlador.suscriptor(p, serial,
            facturas.findByPredioOrderByAnioDescMesDesc(p).stream().sorted(Comparator.comparingInt(f -> f.getAnio() * 12 + f.getMes())).toList())).toList();
        List<Map<String, Object>> susPqr = casas.stream().flatMap(p -> pqrs.findByPredioCodigo(p.getCodigo()).stream())
            .sorted(Comparator.comparing(Pqr::getRadicadaEn).reversed())
            .map(x -> PqrVista.dto(x, eventos.findByPqrOrderByFechaAsc(x))).toList();
        return Map.of("inicial", inicial, "usuarios", usuarios, "pqrs", susPqr,
            "tarifas", tarifas.findAllByOrderByDesdeAnioAscDesdeMesAsc().stream().map(AdministracionVista::tarifa).toList());
    }

    public record Pagar(String codigo, String ultimos4, String clave, List<String> facturas, String referencia) {}

    @PostMapping("/pagar")
    @Transactional
    public Map<String, Object> pagar(@RequestBody Pagar p) {
        List<Predio> casas = acceder(p.codigo(), p.ultimos4(), p.clave());
        if (p.facturas() == null || p.facturas().isEmpty()) throw new ErrorNegocio("Elige qué facturas vas a pagar");
        List<Long> ids = p.facturas().stream().map(n -> {
            Factura f = facturas.findByNumero(n).orElseThrow(() -> new NoEncontrado("No existe la factura " + n));
            if (casas.stream().noneMatch(c -> c.getId().equals(f.getPredio().getId()))) throw new ErrorNegocio("Solo puedes pagar facturas de tus predios");
            return f.getId();
        }).toList();
        Pago pago = caja.cobrar(new CajaServicio.Cobro(ids, Pago.Metodo.EN_LINEA, null, p.referencia(), false, null), null);
        return VistaControlador.pago(pago);
    }

    public record Radicar(String codigo, String ultimos4, String clave, String predio, String tipo, String categoria, String descripcion) {}

    @PostMapping("/pqr")
    @Transactional
    public Map<String, Object> radicar(@RequestBody Radicar r) {
        List<Predio> casas = acceder(r.codigo(), r.ultimos4(), r.clave());
        Predio p = casas.stream().filter(c -> c.getCodigo().equals(r.predio())).findFirst().orElse(casas.get(0));
        Pqr x = pqr.radicar(new PqrServicio.Radicacion(
            r.tipo() == null ? null : Etiquetas.de(Etiquetas.TIPO_PQR, r.tipo(), "el tipo"),
            r.categoria() == null || r.categoria().isBlank() ? null : Etiquetas.de(Etiquetas.CATEGORIA_PQR, r.categoria(), "la categoría"),
            Pqr.Canal.PORTAL_WEB, p.getCodigo(), p.getPropietario().getNombre(), p.getPropietario().getTelefono(), p.nombreSector(), r.descripcion()), "Portal web");
        return PqrVista.dto(x, eventos.findByPqrOrderByFechaAsc(x));
    }
}

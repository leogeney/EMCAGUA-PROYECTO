package co.emcagua.api.comun;

import java.time.LocalDate;
import java.util.List;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import co.emcagua.api.caja.CajaServicio;
import co.emcagua.api.facturacion.Factura;
import co.emcagua.api.facturacion.FacturaRepositorio;
import co.emcagua.api.facturacion.FacturacionServicio;
import co.emcagua.api.facturacion.Pago;
import co.emcagua.api.pqr.Pqr;
import co.emcagua.api.pqr.PqrServicio;
import co.emcagua.api.suscriptores.Predio;
import co.emcagua.api.suscriptores.PredioRepositorio;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Oficina virtual (público): el suscriptor entra con su código o su cédula y los últimos 4 dígitos del celular.
 * Ve sus predios y facturas, paga en línea y radica PQR.
 */
@RestController
@RequestMapping("/api/portal")
@Tag(name = "Portal del usuario (público)")
public class PortalControlador {
    private final PredioRepositorio predios;
    private final FacturaRepositorio facturas;
    private final CajaServicio caja;
    private final PqrServicio pqr;

    public PortalControlador(PredioRepositorio predios, FacturaRepositorio facturas, CajaServicio caja, PqrServicio pqr) {
        this.predios = predios;
        this.facturas = facturas;
        this.caja = caja;
        this.pqr = pqr;
    }

    public record Acceso(String codigo, String ultimos4) {}
    public record FacturaVista(Long id, String numero, String periodo, int consumo, boolean estimado, long total, LocalDate vence, String estado, boolean vencida, String codigoVerificacion) {}
    public record PredioVista(String codigo, String direccion, String barrio, int estrato, String estado, long deuda, List<FacturaVista> facturas) {}
    public record CuentaPortal(String nombre, List<PredioVista> predios) {}

    /** Con el código entra a ese predio; con la cédula, a todos los del dueño. */
    private List<Predio> acceder(Acceso a) {
        String q = a.codigo() == null ? "" : a.codigo().replaceAll("\\D", "");
        List<Predio> casas = predios.findByCodigo(q).map(p -> predios.findByPropietarioCedula(p.getPropietario().getCedula())).orElseGet(() -> predios.findByPropietarioCedula(q));
        if (casas.isEmpty()) throw new ErrorNegocio("El código o la cédula no coinciden con los últimos 4 dígitos del celular");
        String tel = casas.get(0).getPropietario().getTelefono();
        if (tel == null || a.ultimos4() == null || !tel.endsWith(a.ultimos4())) throw new ErrorNegocio("El código o la cédula no coinciden con los últimos 4 dígitos del celular");
        return casas;
    }

    @Operation(summary = "Entrar al portal y ver predios y facturas")
    @PostMapping("/cuenta")
    @Transactional(readOnly = true)
    public CuentaPortal cuenta(@RequestBody Acceso a) {
        LocalDate hoy = LocalDate.now(FacturacionServicio.ZONA);
        List<Predio> casas = acceder(a);
        return new CuentaPortal(casas.get(0).getPropietario().getNombre(), casas.stream().map(p -> {
            List<FacturaVista> fs = facturas.findByPredioOrderByAnioDescMesDesc(p).stream().limit(12)
                .map(f -> new FacturaVista(f.getId(), f.getNumero(), f.periodo().nombre(), f.getConsumo(), f.isEstimado(), f.getTotal(), f.getVencimiento(), f.getEstado().name(), f.vencida(hoy), f.getCodigoVerificacion())).toList();
            long deuda = fs.stream().filter(f -> f.estado().equals("PENDIENTE")).mapToLong(FacturaVista::total).sum();
            return new PredioVista(p.getCodigo(), p.getDireccion(), p.ubicacion(), p.getEstrato(), p.getEstado().name(), deuda, fs);
        }).toList());
    }

    public record PagoEnLinea(String codigo, String ultimos4, List<Long> facturas, String referencia) {}

    @Operation(summary = "Pagar en línea (la referencia la entrega la pasarela de pagos)")
    @PostMapping("/pagar")
    @Transactional
    public Pago pagar(@RequestBody PagoEnLinea p) {
        List<Long> propias = acceder(new Acceso(p.codigo(), p.ultimos4())).stream().flatMap(x -> facturas.findByPredioOrderByAnioDescMesDesc(x).stream()).map(Factura::getId).toList();
        if (p.facturas() == null || p.facturas().isEmpty() || !propias.containsAll(p.facturas())) throw new ErrorNegocio("Solo puedes pagar facturas de tus predios");
        return caja.cobrar(new CajaServicio.Cobro(p.facturas(), Pago.Metodo.EN_LINEA, null, p.referencia(), false, null), null);
    }

    public record Solicitud(String codigo, String ultimos4, Pqr.Tipo tipo, String descripcion) {}

    @Operation(summary = "Radicar una PQR desde el portal")
    @PostMapping("/pqr")
    @Transactional
    public Pqr radicar(@RequestBody Solicitud s) {
        Predio p = acceder(new Acceso(s.codigo(), s.ultimos4())).get(0);
        return pqr.radicar(new PqrServicio.Radicacion(s.tipo(), null, Pqr.Canal.PORTAL_WEB, p.getCodigo(), p.getPropietario().getNombre(), p.getPropietario().getTelefono(), null, s.descripcion()), "Portal web");
    }
}

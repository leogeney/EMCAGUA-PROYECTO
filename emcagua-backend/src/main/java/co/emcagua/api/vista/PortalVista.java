package co.emcagua.api.vista;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.transaction.annotation.Transactional;
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

    public PortalVista(PredioRepositorio predios, MedidorRepositorio medidores, FacturaRepositorio facturas, PqrRepositorio pqrs, EventoPqrRepositorio eventos, PqrServicio pqr, CajaServicio caja, TarifaRepositorio tarifas) {
        this.tarifas = tarifas;
        this.predios = predios;
        this.medidores = medidores;
        this.facturas = facturas;
        this.pqrs = pqrs;
        this.eventos = eventos;
        this.pqr = pqr;
        this.caja = caja;
    }

    public record Acceso(String codigo, String ultimos4) {}

    private List<Predio> acceder(String codigo, String ultimos4) {
        String q = codigo == null ? "" : codigo.replaceAll("\\D", "");
        List<Predio> casas = predios.findByCodigo(q).map(p -> predios.findByPropietarioCedula(p.getPropietario().getCedula())).orElseGet(() -> predios.findByPropietarioCedula(q));
        String tel = casas.isEmpty() ? null : casas.get(0).getPropietario().getTelefono();
        if (tel == null || ultimos4 == null || ultimos4.length() != 4 || !tel.endsWith(ultimos4))
            throw new ErrorNegocio("El código o la cédula no coinciden con los últimos 4 dígitos del celular.");
        return casas.stream().filter(p -> p.getEstado() != Predio.Estado.RETIRADO).sorted(Comparator.comparing(Predio::getCodigo)).toList();
    }

    @PostMapping("/cuenta")
    @Transactional(readOnly = true)
    public Map<String, Object> cuenta(@RequestBody Acceso a) {
        List<Predio> casas = acceder(a.codigo(), a.ultimos4());
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

    public record Pagar(String codigo, String ultimos4, List<String> facturas, String referencia) {}

    @PostMapping("/pagar")
    @Transactional
    public Map<String, Object> pagar(@RequestBody Pagar p) {
        List<Predio> casas = acceder(p.codigo(), p.ultimos4());
        if (p.facturas() == null || p.facturas().isEmpty()) throw new ErrorNegocio("Elige qué facturas vas a pagar");
        List<Long> ids = p.facturas().stream().map(n -> {
            Factura f = facturas.findByNumero(n).orElseThrow(() -> new NoEncontrado("No existe la factura " + n));
            if (casas.stream().noneMatch(c -> c.getId().equals(f.getPredio().getId()))) throw new ErrorNegocio("Solo puedes pagar facturas de tus predios");
            return f.getId();
        }).toList();
        Pago pago = caja.cobrar(new CajaServicio.Cobro(ids, Pago.Metodo.EN_LINEA, null, p.referencia(), false, null), null);
        return VistaControlador.pago(pago);
    }

    public record Radicar(String codigo, String ultimos4, String predio, String tipo, String categoria, String descripcion) {}

    @PostMapping("/pqr")
    @Transactional
    public Map<String, Object> radicar(@RequestBody Radicar r) {
        List<Predio> casas = acceder(r.codigo(), r.ultimos4());
        Predio p = casas.stream().filter(c -> c.getCodigo().equals(r.predio())).findFirst().orElse(casas.get(0));
        Pqr x = pqr.radicar(new PqrServicio.Radicacion(
            r.tipo() == null ? null : Etiquetas.de(Etiquetas.TIPO_PQR, r.tipo(), "el tipo"),
            r.categoria() == null || r.categoria().isBlank() ? null : Etiquetas.de(Etiquetas.CATEGORIA_PQR, r.categoria(), "la categoría"),
            Pqr.Canal.PORTAL_WEB, p.getCodigo(), p.getPropietario().getNombre(), p.getPropietario().getTelefono(), p.nombreSector(), r.descripcion()), "Portal web");
        return PqrVista.dto(x, eventos.findByPqrOrderByFechaAsc(x));
    }
}

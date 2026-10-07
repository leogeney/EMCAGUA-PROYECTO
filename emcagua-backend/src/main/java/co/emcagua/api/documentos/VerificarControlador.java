package co.emcagua.api.documentos;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import co.emcagua.api.facturacion.Factura;
import co.emcagua.api.facturacion.FacturaRepositorio;
import co.emcagua.api.facturacion.FacturacionServicio;
import co.emcagua.api.facturacion.PagoRepositorio;
import co.emcagua.api.suscriptores.Predio;
import co.emcagua.api.suscriptores.PredioRepositorio;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/** Página pública /verificar: comprueba con el número y el código del QR si un papel es auténtico. */
@RestController
@RequestMapping("/api/verificar")
@Tag(name = "Verificación (público)", description = "Comprobar facturas, recibos y documentos por su QR")
public class VerificarControlador {
    private final PagoRepositorio pagos;
    private final FacturaRepositorio facturas;
    private final DocumentoRepositorio documentos;
    private final PredioRepositorio predios;

    public VerificarControlador(PagoRepositorio pagos, FacturaRepositorio facturas, DocumentoRepositorio documentos, PredioRepositorio predios) {
        this.pagos = pagos;
        this.facturas = facturas;
        this.documentos = documentos;
        this.predios = predios;
    }

    /** estado: ok | alterado | anulado | no-existe. Solo devuelve datos si el código coincide (no se filtra información con números inventados). */
    public record Resultado(String estado, String tipo, String numero, Map<String, Object> datos, String hoy) {}

    private static String ocultar(String cedula) { return cedula == null || cedula.length() < 3 ? "—" : "•••••" + cedula.substring(cedula.length() - 3); }

    @Operation(summary = "Verificar un documento por su número (d) y código de seguridad (c)")
    @GetMapping
    @Transactional(readOnly = true)
    public Resultado verificar(@RequestParam String d, @RequestParam(required = false) String c) {
        String num = d.trim().toUpperCase();
        String cod = VerificacionServicio.normalizar(c);
        if (num.startsWith("PAG-")) {
            return pagos.findByNumero(num).map(p -> {
                if (!cod.equals(p.getCodigoVerificacion())) return new Resultado("alterado", "Recibo de pago", num, Map.of(), null);
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("Pagado por", p.getPredio().getPropietario().getNombre());
                m.put("Suscriptor", p.getPredio().getCodigo());
                m.put("Valor", p.getMonto());
                m.put("Fecha", p.getFecha().toString());
                m.put("Concepto", p.getConcepto());
                m.put("Medio de pago", p.getMetodo().name());
                m.put("Recibió", p.getCajero() == null ? "Portal web" : p.getCajero().getNombre());
                return new Resultado("ok", "Recibo de pago", num, m, null);
            }).orElse(new Resultado("no-existe", "Recibo de pago", num, Map.of(), null));
        }
        if (num.startsWith("FAC-")) {
            return facturas.findByNumero(num).map(f -> {
                if (!cod.equals(f.getCodigoVerificacion())) return new Resultado("alterado", "Factura", num, Map.of(), null);
                if (f.getEstado() == Factura.Estado.ANULADA) return new Resultado("anulado", "Factura", num, Map.of(), null);
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("Suscriptor", f.getPredio().getCodigo() + " · " + f.getPredio().getPropietario().getNombre());
                m.put("Periodo", f.periodo().nombre());
                m.put("Consumo", f.getConsumo() + " m³");
                m.put("Valor", f.getTotal());
                m.put("Vence", f.getVencimiento());
                String hoy = f.getEstado() == Factura.Estado.PAGADA ? "Esta factura ya está PAGADA." : f.vencida(LocalDate.now(FacturacionServicio.ZONA)) ? "Esta factura está PENDIENTE y ya venció." : "Esta factura está PENDIENTE de pago.";
                return new Resultado("ok", "Factura", num, m, hoy);
            }).orElse(new Resultado("no-existe", "Factura", num, Map.of(), null));
        }
        return documentos.findByConsecutivo(num).map(doc -> {
            if (!cod.equals(doc.getCodigoVerificacion())) return new Resultado("alterado", doc.getNombre(), num, Map.of(), null);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("Documento", doc.getNombre());
            m.put("A nombre de", doc.getDirigidoA());
            Predio predio = doc.getSujetoId() == null ? null : predios.findByCodigo(doc.getSujetoId()).orElse(null);
            if (predio != null) {
                m.put("Cédula", ocultar(predio.getPropietario().getCedula()));
                m.put("Suscriptor", predio.getCodigo() + " · " + predio.getDireccion() + ", " + predio.ubicacion());
            }
            m.put("Expedido", doc.getEmitido().toString());
            m.put("Expedido por", doc.getEmitidoPor());
            if (doc.getAnulado() != null) {
                m.put("Anulado", doc.getAnulado().toString());
                m.put("Motivo", doc.getMotivoAnulacion());
                return new Resultado("anulado", doc.getNombre(), num, m, null);
            }
            // Paz y salvo y certificados: cómo está HOY el suscriptor (o todos los predios del dueño)
            String hoy = null;
            if (predio != null && doc.getPlantillaId().matches("paz-salvo.*|cert-suscriptor")) {
                List<Predio> casas = doc.getPlantillaId().equals("paz-salvo-propietario") ? predios.findByPropietarioCedula(predio.getPropietario().getCedula()) : List.of(predio);
                long deuda = casas.stream().flatMap(x -> facturas.findByPredioOrderByAnioDescMesDesc(x).stream()).filter(x -> x.getEstado() == Factura.Estado.PENDIENTE).mapToLong(Factura::getTotal).sum();
                hoy = deuda == 0 ? "Hoy sigue a paz y salvo." : "Hoy tiene un saldo pendiente de $" + String.format("%,d", deuda).replace(',', '.') + ".";
            }
            return new Resultado("ok", doc.getNombre(), num, m, hoy);
        }).orElse(new Resultado("no-existe", "Documento", num, Map.of(), null));
    }
}

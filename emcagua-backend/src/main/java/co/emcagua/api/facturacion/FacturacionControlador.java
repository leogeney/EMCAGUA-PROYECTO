package co.emcagua.api.facturacion;

import java.time.LocalDate;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import co.emcagua.api.comun.Periodo;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/facturacion")
@Tag(name = "Facturación", description = "Cierre mensual, calendario y simulador de tarifas")
public class FacturacionControlador {
    private final FacturacionServicio servicio;
    private final TarifaServicio tarifas;

    public FacturacionControlador(FacturacionServicio servicio, TarifaServicio tarifas) {
        this.servicio = servicio;
        this.tarifas = tarifas;
    }

    @Operation(summary = "Periodo en toma de lecturas, fecha de cierre y de vencimiento")
    @GetMapping("/calendario")
    public Map<String, Object> calendario() {
        Periodo p = servicio.periodoEnLectura();
        LocalDate hoy = LocalDate.now(FacturacionServicio.ZONA);
        return Map.of("periodo", p.toString(), "nombre", p.nombre(), "cierre", p.generacion(), "vencimiento", p.vencimiento(),
            "diasParaCierre", Math.max(0, java.time.temporal.ChronoUnit.DAYS.between(hoy, p.generacion())));
    }

    @Operation(summary = "Cerrar un periodo y generar sus facturas (normalmente se hace solo cada mes)")
    @PostMapping("/cerrar")
    public FacturacionServicio.Resumen cerrar(@RequestParam int anio, @RequestParam int mes) { return servicio.cerrar(new Periodo(anio, mes)); }

    @Operation(summary = "Calcular cuánto se cobraría por un consumo (simulador)")
    @GetMapping("/liquidar")
    public TarifaServicio.Liquidacion liquidar(@RequestParam int consumo, @RequestParam int estrato, @RequestParam int anio, @RequestParam int mes) {
        return tarifas.liquidar(consumo, estrato, new Periodo(anio, mes));
    }

    public record Motivo(String motivo) {}

    @Operation(summary = "Anular una factura (queda el registro con su estado ANULADA)")
    @PostMapping("/facturas/{id}/anular")
    public Factura anular(@PathVariable Long id, @RequestBody Motivo m) { return servicio.anular(id, m.motivo()); }
}

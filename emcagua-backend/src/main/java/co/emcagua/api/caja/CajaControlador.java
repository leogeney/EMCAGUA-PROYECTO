package co.emcagua.api.caja;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import co.emcagua.api.facturacion.FacturacionServicio;
import co.emcagua.api.facturacion.Pago;
import co.emcagua.api.seguridad.Sesion;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/caja")
@Tag(name = "Caja", description = "Cobrar facturas, reconectar y hacer el arqueo del día")
public class CajaControlador {
    private final CajaServicio servicio;

    public CajaControlador(CajaServicio servicio) { this.servicio = servicio; }

    @Operation(summary = "Cobrar una o varias facturas en un solo recibo (y opcionalmente la reconexión)")
    @PostMapping("/cobrar")
    public Pago cobrar(@RequestBody CajaServicio.Cobro c) { return servicio.cobrar(c, Sesion.cuenta()); }

    @Operation(summary = "Resumen de la caja de un día (por defecto hoy)")
    @GetMapping("/dia")
    public CajaServicio.ResumenDia dia(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        return servicio.resumen(fecha != null ? fecha : LocalDate.now(FacturacionServicio.ZONA));
    }

    public record Arqueo(@DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha, long efectivoContado, String nota) {}

    @Operation(summary = "Cerrar la caja del día con el efectivo contado")
    @PostMapping("/cerrar")
    public CierreCaja cerrar(@RequestBody Arqueo a) {
        return servicio.cerrar(a.fecha() != null ? a.fecha() : LocalDate.now(FacturacionServicio.ZONA), a.efectivoContado(), a.nota(), Sesion.cuenta());
    }
}

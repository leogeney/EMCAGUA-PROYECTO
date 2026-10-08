package co.emcagua.api.vista;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import co.emcagua.api.comun.ErrorNegocio;
import co.emcagua.api.comun.NoEncontrado;
import co.emcagua.api.comun.Periodo;
import co.emcagua.api.documentos.VerificacionServicio;
import co.emcagua.api.empresa.ConfiguracionServicio;
import co.emcagua.api.facturacion.Factura;
import co.emcagua.api.facturacion.FacturaRepositorio;
import co.emcagua.api.facturacion.FacturacionServicio;
import co.emcagua.api.facturacion.Pago;
import co.emcagua.api.facturacion.PagoRepositorio;
import co.emcagua.api.facturacion.TarifaServicio;
import co.emcagua.api.seguridad.Sesion;
import co.emcagua.api.suscriptores.Lectura;
import co.emcagua.api.suscriptores.LecturaRepositorio;
import co.emcagua.api.suscriptores.Medidor;
import co.emcagua.api.suscriptores.MedidorRepositorio;
import co.emcagua.api.suscriptores.Predio;
import co.emcagua.api.suscriptores.PredioRepositorio;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Pruebas: le da a un predio nuevo (sin facturas) un consumo simulado para ver el sistema funcionando:
 * 6 meses de lecturas, facturas pagadas y sus recibos, y la lectura del mes en curso por telemetría.
 * Solo el gerente puede usarlo, y solo en predios que aún no tienen facturas.
 */
@RestController
@RequestMapping("/api/vista/simular")
@Tag(name = "Vista (frontend)")
public class SimulacionVista {
    private static final int MESES = 6;
    private static final double[] FACTOR_MES = { 1.08, 1.12, 1.1, 0.98, 0.94, 0.96, 1.05, 1.1, 1.02, 0.95, 0.92, 1.0 };

    private final PredioRepositorio predios;
    private final MedidorRepositorio medidores;
    private final LecturaRepositorio lecturas;
    private final FacturaRepositorio facturas;
    private final PagoRepositorio pagos;
    private final FacturacionServicio facturacion;
    private final TarifaServicio tarifas;
    private final VerificacionServicio verificacion;
    private final ConfiguracionServicio config;

    public SimulacionVista(PredioRepositorio predios, MedidorRepositorio medidores, LecturaRepositorio lecturas, FacturaRepositorio facturas, PagoRepositorio pagos,
                           FacturacionServicio facturacion, TarifaServicio tarifas, VerificacionServicio verificacion, ConfiguracionServicio config) {
        this.config = config;
        this.predios = predios;
        this.medidores = medidores;
        this.lecturas = lecturas;
        this.facturas = facturas;
        this.pagos = pagos;
        this.facturacion = facturacion;
        this.tarifas = tarifas;
        this.verificacion = verificacion;
    }

    public record PeriodoForm(int anio, int mes) {}

    @Operation(summary = "Pruebas: genera UNA factura pendiente de un periodo para un predio (si el vencimiento ya pasó, queda vencida)")
    @PostMapping("/{codigo}/factura")
    @Transactional
    public Map<String, Object> factura(@PathVariable String codigo, @RequestBody PeriodoForm per) {
        if (!Sesion.cuenta().getRol().isFijo()) throw new ErrorNegocio("Solo el gerente puede generar facturas de prueba");
        Predio p = predios.findByCodigo(codigo).orElseThrow(() -> new NoEncontrado("No existe el predio " + codigo));
        if (per.mes() < 1 || per.mes() > 12) throw new ErrorNegocio("Mes inválido");
        Periodo periodo = new Periodo(per.anio(), per.mes());
        if (facturas.findByPredioAndAnioAndMes(p, periodo.anio(), periodo.mes()).isPresent()) throw new ErrorNegocio("El predio ya tiene factura de " + periodo.nombre());
        LocalDate hoy = LocalDate.now(FacturacionServicio.ZONA);
        Factura f = new Factura();
        f.setPredio(p);
        f.setAnio(periodo.anio());
        f.setMes(periodo.mes());
        f.setEstrato(p.getEstrato());
        f.setNumero("FAC-%d-%02d-%s".formatted(periodo.anio(), periodo.mes(), codigo));
        f.setEmision(periodo.generacion().isAfter(hoy) ? hoy : periodo.generacion());
        f.setVencimiento(periodo.vencimiento());
        if (config.actual().sinMedidores() || !p.medido()) {
            long valor = config.actual().cobroFijo(p.getEstrato());
            f.setTarifaFija(true);
            f.setConsumo(0);
            f.setCargoFijo(valor);
            f.setTotal(valor);
        } else {
            f.setConsumo(facturacion.promedio(p));
            f.setEstimado(true);
            var liq = tarifas.liquidar(f.getConsumo(), p.getEstrato(), periodo);
            f.setCargoFijo(liq.cargoFijo());
            f.setValorConsumo(liq.valorConsumo());
            f.setSubsidio(liq.subsidio());
            f.setTotal(liq.total());
        }
        f.setEstado(Factura.Estado.PENDIENTE);
        f.setCodigoVerificacion(verificacion.codigoFactura(f.getNumero(), codigo, f.getTotal()));
        facturas.save(f);
        return Map.of("numero", f.getNumero(), "total", f.getTotal(), "vence", f.getVencimiento().toString(), "vencida", f.getVencimiento().isBefore(hoy), "fija", Boolean.TRUE.equals(f.getTarifaFija()));
    }

    private static Instant alCierre(LocalDate dia) { return dia.minusDays(1).atTime(LocalTime.of(23, 0)).atZone(FacturacionServicio.ZONA).toInstant(); }

    @Operation(summary = "Pruebas: consumo simulado de 6 meses para un predio sin facturas")
    @PostMapping("/{codigo}")
    @Transactional
    public Map<String, Object> simular(@PathVariable String codigo) {
        if (!Sesion.cuenta().getRol().isFijo()) throw new ErrorNegocio("Solo el gerente puede simular consumos");
        Predio p = predios.findByCodigo(codigo).orElseThrow(() -> new NoEncontrado("No existe el predio " + codigo));
        if (!facturas.findByPredioOrderByAnioDescMesDesc(p).isEmpty()) throw new ErrorNegocio("El predio " + codigo + " ya tiene facturas: la simulación es solo para predios nuevos");

        // La simulación es de un predio con medidor inteligente instalado
        p.setConMedidor(true);
        predios.save(p);
        Medidor m = medidores.findByPredio(p).orElseGet(() -> medidores.save(new Medidor("MED-" + codigo, p, LocalDate.now(FacturacionServicio.ZONA).minusMonths(MESES + 1))));
        Random rnd = new Random(codigo.hashCode());
        int base = switch (p.getEstrato()) { case 1 -> 12; case 2 -> 15; default -> 18; } + rnd.nextInt(5);

        // Los 6 periodos anteriores al que está en toma de lecturas
        Periodo enLectura = facturacion.periodoEnLectura();
        List<Periodo> periodos = new ArrayList<>();
        for (Periodo x = enLectura.anterior(); periodos.size() < MESES; x = x.anterior()) periodos.add(0, x);

        BigDecimal acumulado = BigDecimal.valueOf(300 + rnd.nextInt(500));
        lecturas.save(new Lectura(m, alCierre(periodos.get(0).anterior().generacion()), acumulado, Lectura.Origen.TELEMETRIA, "Telemetría"));
        Instant ahora = Instant.now();
        long totalFacturado = 0;
        List<Integer> consumos = new ArrayList<>();
        for (Periodo per : periodos) {
            int consumo = Math.max(3, (int) Math.round(base * FACTOR_MES[per.mes() - 1]) + rnd.nextInt(5) - 2);
            BigDecimal anterior = acumulado;
            acumulado = acumulado.add(BigDecimal.valueOf(consumo));
            lecturas.save(new Lectura(m, alCierre(per.generacion()), acumulado, Lectura.Origen.TELEMETRIA, "Telemetría"));

            Factura f = new Factura();
            f.setPredio(p);
            f.setAnio(per.anio());
            f.setMes(per.mes());
            f.setEstrato(p.getEstrato());
            f.setNumero("FAC-%d-%02d-%s".formatted(per.anio(), per.mes(), codigo));
            f.setEmision(per.generacion());
            f.setVencimiento(per.vencimiento());
            f.setLecturaAnterior(anterior);
            f.setLecturaActual(acumulado);
            f.setConsumo(consumo);
            var liq = tarifas.liquidar(consumo, p.getEstrato(), per);
            f.setCargoFijo(liq.cargoFijo());
            f.setValorConsumo(liq.valorConsumo());
            f.setSubsidio(liq.subsidio());
            f.setTotal(liq.total());
            f.setCodigoVerificacion(verificacion.codigoFactura(f.getNumero(), codigo, f.getTotal()));

            // Pagada entre la generación y el vencimiento (nunca en el futuro)
            Instant desde = per.generacion().atTime(LocalTime.of(9, 0)).atZone(FacturacionServicio.ZONA).toInstant();
            Instant hasta = per.vencimiento().atTime(LocalTime.of(17, 0)).atZone(FacturacionServicio.ZONA).toInstant();
            if (hasta.isAfter(ahora)) hasta = ahora.minusSeconds(3600);
            Instant fecha = desde.plusSeconds((long) (rnd.nextDouble() * Math.max(1, Duration.between(desde, hasta).getSeconds())));
            f.setEstado(Factura.Estado.PAGADA);
            f.setFechaPago(fecha);
            f = facturas.save(f);

            Pago pago = new Pago();
            pago.setNumero("PAG-%05d".formatted(pagos.count() + 1));
            pago.setPredio(p);
            pago.setFacturas(new LinkedHashSet<>(List.of(f)));
            pago.setConcepto("Factura " + per.nombre() + " (historial simulado)");
            pago.setMonto(f.getTotal());
            pago.setMetodo(Pago.Metodo.EN_LINEA);
            pago.setComprobante("SIMULADO");
            pago.setFecha(fecha);
            pago.setCodigoVerificacion(verificacion.codigoRecibo(pago.getNumero(), codigo, pago.getMonto(), fecha));
            pagos.save(pago);
            totalFacturado += f.getTotal();
            consumos.add(consumo);
        }

        // Mes en curso: lo que el medidor lleva marcado desde el último cierre
        LocalDate hoy = LocalDate.now(FacturacionServicio.ZONA);
        LocalDate inicio = enLectura.anterior().generacion();
        long dias = Math.max(1, Duration.between(inicio.atStartOfDay(), hoy.atStartOfDay()).toDays());
        int parcial = (int) Math.round(base * Math.min(1.0, dias / 30.0));
        lecturas.save(new Lectura(m, ahora.minusSeconds(60L * (5 + rnd.nextInt(60))), acumulado.add(BigDecimal.valueOf(parcial)), Lectura.Origen.TELEMETRIA, "Telemetría"));
        m.setUltimaComunicacion(ahora.minusSeconds(60L * rnd.nextInt(30)));
        m.setSenal(80 + rnd.nextInt(18));
        medidores.save(m);

        return Map.of("predio", codigo, "meses", MESES, "consumos", consumos, "facturado", totalFacturado, "mesEnCurso", parcial);
    }
}

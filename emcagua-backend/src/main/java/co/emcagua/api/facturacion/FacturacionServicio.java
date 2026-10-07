package co.emcagua.api.facturacion;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.emcagua.api.comun.ErrorNegocio;
import co.emcagua.api.comun.Periodo;
import co.emcagua.api.documentos.VerificacionServicio;
import co.emcagua.api.empresa.ConfiguracionServicio;
import co.emcagua.api.suscriptores.Lectura;
import co.emcagua.api.suscriptores.LecturaRepositorio;
import co.emcagua.api.suscriptores.Medidor;
import co.emcagua.api.suscriptores.MedidorRepositorio;
import co.emcagua.api.suscriptores.Predio;
import co.emcagua.api.suscriptores.PredioRepositorio;

/**
 * Cierre mensual automático: el día de generación (14 días antes del vencimiento) se toma la última lectura
 * de cada medidor y se generan las facturas. Sin lectura se cobra el promedio; los suspendidos no pagan consumo.
 */
@Service
public class FacturacionServicio {
    private static final Logger log = LoggerFactory.getLogger(FacturacionServicio.class);
    public static final ZoneId ZONA = ZoneId.of("America/Bogota");

    private final PredioRepositorio predios;
    private final MedidorRepositorio medidores;
    private final LecturaRepositorio lecturas;
    private final FacturaRepositorio facturas;
    private final TarifaServicio tarifas;
    private final VerificacionServicio verificacion;
    private final ConfiguracionServicio config;

    public FacturacionServicio(PredioRepositorio predios, MedidorRepositorio medidores, LecturaRepositorio lecturas, FacturaRepositorio facturas, TarifaServicio tarifas, VerificacionServicio verificacion, ConfiguracionServicio config) {
        this.config = config;
        this.predios = predios;
        this.medidores = medidores;
        this.lecturas = lecturas;
        this.facturas = facturas;
        this.tarifas = tarifas;
        this.verificacion = verificacion;
    }

    public record Resumen(String periodo, int leidos, int estimados, int suspendidos, int yaExistian, long totalFacturado, int tarifaFija) {}

    /** Periodo que está en toma de lecturas: el siguiente al último facturado (o el mes pasado si no hay facturas). */
    public Periodo periodoEnLectura() {
        Integer ultimo = facturas.ultimoPeriodoFacturado();
        if (ultimo == null) {
            // Sin facturas todavía: el mes actual, o el siguiente si su fecha de generación ya pasó (igual que el frontend)
            LocalDate hoy = LocalDate.now(ZONA);
            Periodo actual = Periodo.de(hoy);
            return hoy.isBefore(actual.generacion()) ? actual : actual.siguiente();
        }
        return new Periodo(ultimo / 12, ultimo % 12 + 1).siguiente();
    }

    @Transactional
    public Resumen cerrar(Periodo p) {
        if (p.compareTo(Periodo.de(LocalDate.now(ZONA))) > 0) throw new ErrorNegocio("No se puede facturar un mes que no ha empezado");
        Instant corte = p.generacion().atStartOfDay(ZONA).toInstant();
        Instant corteAnterior = p.anterior().generacion().atStartOfDay(ZONA).toInstant();
        int leidos = 0, estimados = 0, suspendidos = 0, existian = 0, fijos = 0;
        long total = 0;
        boolean todosFijos = config.actual().sinMedidores();
        for (Predio predio : predios.findAll()) {
            if (predio.getEstado() == Predio.Estado.RETIRADO) continue;
            if (facturas.findByPredioAndAnioAndMes(predio, p.anio(), p.mes()).isPresent()) { existian++; continue; }
            Factura f = new Factura();
            f.setPredio(predio);
            f.setAnio(p.anio());
            f.setMes(p.mes());
            f.setEstrato(predio.getEstrato());
            f.setNumero("FAC-%d-%02d-%s".formatted(p.anio(), p.mes(), predio.getCodigo()));
            f.setEmision(p.generacion());
            f.setVencimiento(p.vencimiento());
            if (predio.getEstado() == Predio.Estado.CORTADO) {
                f.setEstado(Factura.Estado.SUSPENDIDO);
                suspendidos++;
            } else if (todosFijos || !predio.medido()) {
                // Modo sin medidores o predio sin medidor instalado: valor fijo mensual según el estrato (Configuración)
                long valor = config.actual().cobroFijo(predio.getEstrato());
                f.setTarifaFija(true);
                f.setConsumo(0);
                f.setCargoFijo(valor);
                f.setValorConsumo(0);
                f.setSubsidio(0);
                f.setTotal(valor);
                total += valor;
                fijos++;
            } else {
                Optional<Medidor> m = medidores.findByPredio(predio);
                Optional<Lectura> actual = m.flatMap(x -> lecturas.findFirstByMedidorAndFechaLessThanOrderByFechaDesc(x, corte));
                BigDecimal anterior = facturas.findByPredioAndAnioAndMes(predio, p.anterior().anio(), p.anterior().mes()).map(Factura::getLecturaActual)
                    .or(() -> m.flatMap(x -> lecturas.findFirstByMedidorAndFechaLessThanOrderByFechaDesc(x, corteAnterior)).map(Lectura::getValor))
                    .orElse(null);
                boolean lecturaDelMes = actual.isPresent() && actual.get().getFecha().isAfter(corteAnterior);
                if (lecturaDelMes && anterior != null) {
                    BigDecimal dif = actual.get().getValor().subtract(anterior).max(BigDecimal.ZERO);
                    f.setLecturaAnterior(anterior);
                    f.setLecturaActual(actual.get().getValor());
                    f.setConsumo(dif.setScale(0, RoundingMode.HALF_UP).intValue());
                    leidos++;
                } else {
                    // Ley 142, art. 146: sin lectura se factura el promedio de los últimos meses
                    f.setConsumo(promedio(predio));
                    f.setEstimado(true);
                    f.setLecturaAnterior(anterior);
                    f.setLecturaActual(anterior == null ? null : anterior.add(BigDecimal.valueOf(f.getConsumo())));
                    estimados++;
                }
                var liq = tarifas.liquidar(f.getConsumo(), predio.getEstrato(), p);
                f.setCargoFijo(liq.cargoFijo());
                f.setValorConsumo(liq.valorConsumo());
                f.setSubsidio(liq.subsidio());
                f.setTotal(liq.total());
                total += liq.total();
            }
            f.setCodigoVerificacion(verificacion.codigoFactura(f.getNumero(), predio.getCodigo(), f.getTotal()));
            facturas.save(f);
        }
        var r = new Resumen(p.nombre(), leidos, estimados, suspendidos, existian, total, fijos);
        log.info("Cierre de {}: {}", p.nombre(), r);
        return r;
    }

    /** Promedio de los últimos 6 meses facturados con consumo (sin contar suspendidos). */
    int promedio(Predio predio) {
        List<Factura> ult = facturas.findByPredioOrderByAnioDescMesDesc(predio).stream().filter(x -> x.getEstado() != Factura.Estado.SUSPENDIDO && x.getEstado() != Factura.Estado.ANULADA && !Boolean.TRUE.equals(x.getTarifaFija())).limit(6).toList();
        return ult.isEmpty() ? 0 : (int) Math.round(ult.stream().mapToInt(Factura::getConsumo).average().orElse(0));
    }

    /** Todos los días a las 12:10 a. m.: si ya llegó la fecha de generación del periodo, se factura solo. */
    @Scheduled(cron = "0 10 0 * * *", zone = "America/Bogota")
    @Transactional
    public void cierreAutomatico() {
        Periodo p = periodoEnLectura();
        if (!LocalDate.now(ZONA).isBefore(p.generacion())) cerrar(p);
    }

    @Transactional
    public Factura anular(Long id, String motivo) {
        Factura f = facturas.findById(id).orElseThrow(() -> new ErrorNegocio("No existe la factura"));
        if (f.getEstado() == Factura.Estado.PAGADA) throw new ErrorNegocio("No se puede anular una factura pagada");
        if (motivo == null || motivo.isBlank()) throw new ErrorNegocio("Escribe el motivo de la anulación");
        f.setEstado(Factura.Estado.ANULADA);
        log.info("Factura {} anulada: {}", f.getNumero(), motivo);
        return facturas.save(f);
    }
}

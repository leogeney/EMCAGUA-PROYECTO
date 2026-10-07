package co.emcagua.api.caja;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.emcagua.api.comun.ErrorNegocio;
import co.emcagua.api.comun.NoEncontrado;
import co.emcagua.api.documentos.VerificacionServicio;
import co.emcagua.api.empresa.ConfiguracionServicio;
import co.emcagua.api.facturacion.Factura;
import co.emcagua.api.facturacion.FacturaRepositorio;
import co.emcagua.api.facturacion.FacturacionServicio;
import co.emcagua.api.facturacion.Pago;
import co.emcagua.api.facturacion.PagoRepositorio;
import co.emcagua.api.seguridad.Cuenta;
import co.emcagua.api.suscriptores.Predio;
import co.emcagua.api.suscriptores.PredioRepositorio;

/** Cobro de facturas (una o varias, de uno o varios predios), reconexión y arqueo diario. */
@Service
public class CajaServicio {
    private final FacturaRepositorio facturas;
    private final PagoRepositorio pagos;
    private final PredioRepositorio predios;
    private final EgresoRepositorio egresos;
    private final CierreCajaRepositorio cierres;
    private final ConfiguracionServicio config;
    private final VerificacionServicio verificacion;

    public CajaServicio(FacturaRepositorio facturas, PagoRepositorio pagos, PredioRepositorio predios, EgresoRepositorio egresos, CierreCajaRepositorio cierres, ConfiguracionServicio config, VerificacionServicio verificacion) {
        this.facturas = facturas;
        this.pagos = pagos;
        this.predios = predios;
        this.egresos = egresos;
        this.cierres = cierres;
        this.config = config;
        this.verificacion = verificacion;
    }

    /** facturas: ids a pagar · predio: solo para reconectar un predio que ya no debe facturas. */
    public record Cobro(List<Long> facturas, Pago.Metodo metodo, Long recibido, String comprobante, boolean reconectar, Long predio) {}

    /** Registra un recibo: marca las facturas como pagadas y, si se pide, reconecta el servicio cobrando la reconexión. */
    @Transactional
    public Pago cobrar(Cobro c, Cuenta cajero) {
        if (c.metodo() == null) throw new ErrorNegocio("Elige el método de pago");
        List<Factura> lista = new ArrayList<>();
        for (Long id : c.facturas() == null ? List.<Long>of() : c.facturas()) {
            Factura f = facturas.findById(id).orElseThrow(() -> new NoEncontrado("No existe la factura " + id));
            if (f.getEstado() != Factura.Estado.PENDIENTE) throw new ErrorNegocio("La factura " + f.getNumero() + " no está pendiente");
            lista.add(f);
        }
        if (lista.isEmpty() && !c.reconectar()) throw new ErrorNegocio("No hay nada que cobrar");
        Predio principal = !lista.isEmpty() ? lista.get(0).getPredio() : c.predio() != null ? predios.findById(c.predio()).orElseThrow(() -> new NoEncontrado("No existe el predio")) : null;
        long reconexion = 0;
        if (c.reconectar()) {
            if (principal == null) throw new ErrorNegocio("Indica el predio que se va a reconectar");
            if (principal.getEstado() != Predio.Estado.CORTADO) throw new ErrorNegocio("El predio " + principal.getCodigo() + " no está cortado");
            // Para reconectar se paga todo lo que debe ese predio
            boolean faltan = facturas.findByPredioOrderByAnioDescMesDesc(principal).stream().anyMatch(f -> f.getEstado() == Factura.Estado.PENDIENTE && !lista.contains(f));
            if (faltan) throw new ErrorNegocio("Para reconectar hay que pagar todas las facturas pendientes del predio");
            reconexion = config.actual().getReconexion();
            principal.setEstado(Predio.Estado.ACTIVO);
            predios.save(principal);
        }
        long total = lista.stream().mapToLong(Factura::getTotal).sum() + reconexion;
        if (c.metodo() == Pago.Metodo.EFECTIVO && c.recibido() != null && c.recibido() < total) throw new ErrorNegocio("El efectivo recibido es menor que el total");

        Instant ahora = Instant.now();
        Pago p = new Pago();
        p.setNumero("PAG-%05d".formatted(pagos.count() + 1));
        p.setPredio(principal);
        p.setFacturas(new LinkedHashSet<>(lista));
        long predioDistintos = lista.stream().map(f -> f.getPredio().getId()).distinct().count();
        String periodos = lista.stream().map(f -> f.periodo().nombre()).collect(Collectors.joining(", "));
        String concepto = lista.isEmpty() ? "Reconexión del servicio" : (reconexion > 0 ? "Reconexión + " : "") + (predioDistintos > 1 ? lista.size() + " facturas de " + predioDistintos + " predios" : "Facturas " + periodos);
        // La columna tiene 200 caracteres: con muchas facturas atrasadas la lista de meses no cabe
        p.setConcepto(concepto.length() > 200 ? concepto.substring(0, 197) + "..." : concepto);
        p.setMonto(total);
        p.setReconexion(reconexion);
        p.setMetodo(c.metodo());
        if (c.metodo() == Pago.Metodo.EFECTIVO && c.recibido() != null) { p.setRecibido(c.recibido()); p.setVueltos(c.recibido() - total); }
        if (c.comprobante() != null && c.comprobante().startsWith("data:")) p.setComprobanteImagen(c.comprobante());
        else p.setComprobante(c.comprobante() != null && c.comprobante().length() > 300 ? c.comprobante().substring(0, 300) : c.comprobante());
        p.setCajero(cajero);
        p.setFecha(ahora);
        p.setCodigoVerificacion(verificacion.codigoRecibo(p.getNumero(), principal.getCodigo(), total, ahora));
        lista.forEach(f -> { f.setEstado(Factura.Estado.PAGADA); f.setFechaPago(ahora); });
        facturas.saveAll(lista);
        return pagos.save(p);
    }

    public record ResumenDia(LocalDate fecha, long base, long efectivo, long transferencias, long enLinea, long egresosEfectivo, long efectivoEsperado, int pagos, boolean cerrada) {}

    public ResumenDia resumen(LocalDate dia) {
        Instant desde = dia.atStartOfDay(FacturacionServicio.ZONA).toInstant(), hasta = dia.plusDays(1).atStartOfDay(FacturacionServicio.ZONA).toInstant();
        List<Pago> del = pagos.findByFechaBetweenOrderByFechaDesc(desde, hasta);
        long ef = del.stream().filter(p -> p.getMetodo() == Pago.Metodo.EFECTIVO).mapToLong(Pago::getMonto).sum();
        long tr = del.stream().filter(p -> p.getMetodo() == Pago.Metodo.TRANSFERENCIA).mapToLong(Pago::getMonto).sum();
        long el = del.stream().filter(p -> p.getMetodo() == Pago.Metodo.EN_LINEA).mapToLong(Pago::getMonto).sum();
        long eg = egresos.findByFechaBetweenOrderByFechaDesc(dia, dia).stream().filter(e -> e.getMedio() == Egreso.Medio.EFECTIVO_CAJA).mapToLong(Egreso::getValor).sum();
        long base = config.actual().getBaseCaja();
        return new ResumenDia(dia, base, ef, tr, el, eg, base + ef - eg, del.size(), cierres.findByFecha(dia).isPresent());
    }

    @Transactional
    public CierreCaja cerrar(LocalDate dia, long contado, String nota, Cuenta cajero) {
        if (cierres.findByFecha(dia).isPresent()) throw new ErrorNegocio("La caja de ese día ya está cerrada");
        ResumenDia r = resumen(dia);
        CierreCaja c = new CierreCaja();
        c.setFecha(dia);
        c.setCajero(cajero.getNombre());
        c.setBase(r.base());
        c.setEfectivoSistema(r.efectivo());
        c.setEgresosEfectivo(r.egresosEfectivo());
        c.setTransferencias(r.transferencias());
        c.setEnLinea(r.enLinea());
        c.setEfectivoContado(contado);
        c.setDiferencia(contado - r.efectivoEsperado());
        c.setNota(nota);
        return cierres.save(c);
    }
}

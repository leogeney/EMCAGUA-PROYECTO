package co.emcagua.api.facturacion;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import co.emcagua.api.comun.Entidad;
import co.emcagua.api.comun.Periodo;
import co.emcagua.api.suscriptores.Predio;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Factura mensual de un predio. Guarda el desglose con la tarifa que estaba vigente (no cambia si la tarifa cambia después). */
@Entity
@Table(name = "factura",
    uniqueConstraints = @UniqueConstraint(name = "uk_factura_predio_periodo", columnNames = { "predio_id", "anio", "mes" }),
    indexes = { @Index(name = "ix_factura_estado", columnList = "estado"), @Index(name = "ix_factura_periodo", columnList = "anio, mes") })
@Getter
@Setter
@NoArgsConstructor
public class Factura extends Entidad {
    public enum Estado { PENDIENTE, PAGADA, SUSPENDIDO, ANULADA }

    /** FAC-2026-09-10234 */
    @Column(nullable = false, unique = true, length = 30)
    private String numero;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    private Predio predio;

    private int anio;
    private int mes;

    /** Estrato con el que se liquidó (por si después cambia). */
    private int estrato;

    @Column(precision = 12, scale = 3)
    private BigDecimal lecturaAnterior;

    @Column(precision = 12, scale = 3)
    private BigDecimal lecturaActual;

    private int consumo;

    /** true = no hubo lectura y se cobró el promedio (Ley 142, art. 146). */
    private boolean estimado;

    /** true = predio sin medidor: se cobró el valor fijo mensual de su estrato (no hay consumo medido). */
    @Column(columnDefinition = "boolean default false")
    private Boolean tarifaFija = false;

    private long cargoFijo;
    private long valorConsumo;
    private long subsidio;
    private long total;

    private LocalDate emision;
    private LocalDate vencimiento;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private Estado estado = Estado.PENDIENTE;

    private Instant fechaPago;

    /** Código de seguridad del QR de verificación. */
    @Column(length = 9)
    private String codigoVerificacion;

    public Periodo periodo() { return new Periodo(anio, mes); }

    public boolean vencida(LocalDate hoy) { return estado == Estado.PENDIENTE && vencimiento != null && hoy.isAfter(vencimiento); }
}

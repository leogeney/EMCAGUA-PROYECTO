package co.emcagua.api.facturacion;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;

import co.emcagua.api.comun.Entidad;
import co.emcagua.api.seguridad.Cuenta;
import co.emcagua.api.suscriptores.Predio;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Recibo de caja: puede pagar varias facturas (de uno o varios predios del mismo dueño) y la reconexión. */
@Entity
@Table(name = "pago")
@Getter
@Setter
@NoArgsConstructor
public class Pago extends Entidad {
    public enum Metodo { EFECTIVO, TRANSFERENCIA, EN_LINEA }

    /** PAG-00001 */
    @Column(nullable = false, unique = true, length = 20)
    private String numero;

    /** Predio principal del pago (el primero de las facturas). */
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    private Predio predio;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "pago_factura")
    private Set<Factura> facturas = new LinkedHashSet<>();

    @Column(nullable = false, length = 200)
    private String concepto;

    private long monto;

    /** Valor de reconexión incluido en el monto (0 si no hubo). */
    private long reconexion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private Metodo metodo;

    /** Efectivo recibido y vueltos (solo pagos en efectivo). */
    private Long recibido;
    private Long vueltos;

    /** Foto del comprobante de transferencia o referencia de la pasarela. */
    @Column(length = 300)
    private String comprobante;

    /** Foto del comprobante (data URL) adjunta en caja. */
    @Column(columnDefinition = "text")
    private String comprobanteImagen;

    /** Funcionario que recibió el pago; null si lo hizo el usuario en el portal. */
    @ManyToOne(fetch = FetchType.EAGER)
    private Cuenta cajero;

    @Column(nullable = false)
    private Instant fecha;

    @Column(length = 9)
    private String codigoVerificacion;
}

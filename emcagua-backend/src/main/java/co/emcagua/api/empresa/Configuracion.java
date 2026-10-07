package co.emcagua.api.empresa;

import co.emcagua.api.comun.Entidad;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/** Datos de la empresa y parámetros de operación (una sola fila). Equivale a la pantalla Configuración. */
@Entity
@Table(name = "configuracion")
@Getter
@Setter
public class Configuracion extends Entidad {
    @NotBlank private String nombre = "EMCAGUA APC";
    @Column(length = 300) private String razon = "Empresa de Servicios Públicos de El Carmen y Guamalito · Administración Pública Cooperativa";
    private String nit = "";
    private String direccion = "";
    private String ciudad = "El Carmen, Norte de Santander";
    private String telefono = "";
    private String whatsapp = "";
    private String correo = "";
    private String horario = "Lunes a viernes, 8:00 a. m. a 12:00 m. y 2:00 a 6:00 p. m.";
    private String gerente = "";
    /** Dirección pública del sistema (va dentro de los QR de verificación). */
    private String urlPublica = "";

    /** $ que se cobran por reconectar un servicio suspendido. */
    @Min(0) private long reconexion = 30_000;
    /** m³ por mes a partir de los cuales el consumo se considera alto. */
    @Min(1) private int umbralAlto = 30;
    /** Efectivo con el que abre la caja cada día. */
    @Min(0) private long baseCaja = 200_000;
    /** Meta de agua no contabilizada (0.30 = 30 %). */
    @Min(0) @Max(1) private double metaIanc = 0.30;

    /** Cobro mensual fijo de los predios SIN medidor instalado, por estrato (estrato 4 o más usa el del 3). */
    @Column(columnDefinition = "bigint default 14000") private Long cobroFijoEstrato1 = 14_000L;
    @Column(columnDefinition = "bigint default 16000") private Long cobroFijoEstrato2 = 16_000L;
    @Column(columnDefinition = "bigint default 20000") private Long cobroFijoEstrato3 = 20_000L;

    /** Modo sin medidores: mientras la empresa no tenga medidores instalados, TODOS los predios pagan el valor fijo de su estrato. */
    @Column(columnDefinition = "boolean default true") private Boolean modoSinMedidores = true;

    public boolean sinMedidores() { return !Boolean.FALSE.equals(modoSinMedidores); }

    /** Valor fijo del mes para un predio sin medidor. */
    public long cobroFijo(int estrato) {
        Long v = estrato <= 1 ? cobroFijoEstrato1 : estrato == 2 ? cobroFijoEstrato2 : cobroFijoEstrato3;
        return v == null ? (estrato <= 1 ? 14_000 : estrato == 2 ? 16_000 : 20_000) : v;
    }
}

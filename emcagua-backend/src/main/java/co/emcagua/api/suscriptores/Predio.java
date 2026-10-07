package co.emcagua.api.suscriptores;

import co.emcagua.api.comun.Entidad;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Predio = suscriptor del servicio (una casa o un local). Tiene su medidor, su estrato y su factura.
 * Un propietario puede tener varios predios; no se suman sus consumos.
 */
@Entity
@Table(name = "predio")
@Getter
@Setter
@NoArgsConstructor
public class Predio extends Entidad {
    public enum Estado { ACTIVO, CORTADO, RETIRADO }
    public enum Uso { RESIDENCIAL, COMERCIAL, OFICIAL }

    /** Código de suscriptor que aparece en la factura (ej. 10234). */
    @NotBlank
    @Column(nullable = false, unique = true, length = 12)
    private String codigo;

    @NotNull
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    private Propietario propietario;

    @NotBlank
    @Column(nullable = false, length = 120)
    private String direccion;

    /** Sector de la red (obligatorio). En la base de datos la columna admite vacío para poder migrar predios antiguos. */
    @NotNull
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "sector_id")
    private Sector sector;

    /** Barrio dentro del sector (puede quedar sin definir mientras se cargan los barrios). */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "barrio_id")
    private Barrio barrio;

    @Min(1) @Max(6)
    private int estrato;

    /** true = tiene medidor instalado y se cobra por consumo; false = se cobra el valor fijo mensual de su estrato. */
    @Column(name = "con_medidor", columnDefinition = "boolean default false")
    private Boolean conMedidor = false;

    public boolean medido() { return Boolean.TRUE.equals(conMedidor); }

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private Uso uso = Uso.RESIDENCIAL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private Estado estado = Estado.ACTIVO;

    /** Quien vive en el predio si no es el dueño (arrendatario). Recibe avisos de cortes y fugas. */
    @Column(length = 120)
    private String ocupanteNombre;

    @Column(length = 10)
    private String ocupanteTelefono;

    public Predio(String codigo, Propietario propietario, String direccion, Sector sector, int estrato) {
        this.codigo = codigo;
        this.propietario = propietario;
        this.direccion = direccion;
        this.sector = sector;
        this.estrato = estrato;
    }

    /** "Las Flores, Centro" o solo "Centro" si aún no tiene barrio. */
    public String ubicacion() {
        String s = sector == null ? "" : sector.getNombre();
        return barrio == null ? s : barrio.getNombre() + ", " + s;
    }

    public String nombreSector() { return sector == null ? "" : sector.getNombre(); }
}

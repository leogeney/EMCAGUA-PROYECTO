package co.emcagua.api.suscriptores;

import co.emcagua.api.comun.Entidad;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Barrio dentro de un sector. Más adelante cada barrio tendrá sus calles. */
@Entity
@Table(name = "barrio", uniqueConstraints = @UniqueConstraint(name = "uk_barrio_sector_nombre", columnNames = { "sector_id", "nombre" }))
@Getter
@Setter
@NoArgsConstructor
public class Barrio extends Entidad {
    @NotNull
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "sector_id", nullable = false)
    private Sector sector;

    @NotBlank
    @Column(nullable = false, length = 80)
    private String nombre;

    public Barrio(Sector sector, String nombre) {
        this.sector = sector;
        this.nombre = nombre;
    }
}

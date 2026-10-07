package co.emcagua.api.suscriptores;

import co.emcagua.api.comun.Entidad;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Sector de la red de acueducto (Centro, Líbano, Pique Tierra, Calle Nueva, San Luis). Agrupa barrios. */
@Entity
@Table(name = "sector")
@Getter
@Setter
@NoArgsConstructor
public class Sector extends Entidad {
    @NotBlank
    @Column(nullable = false, unique = true, length = 60)
    private String nombre;

    /** Orden en que se muestra en las listas. */
    private int orden;

    public Sector(String nombre, int orden) {
        this.nombre = nombre;
        this.orden = orden;
    }
}

package co.emcagua.api.perdidas;

import co.emcagua.api.comun.Entidad;
import co.emcagua.api.suscriptores.Sector;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Agua que entró a un sector en un mes (m³). Con lo facturado da el agua no contabilizada (IANC).
 * sector = null significa la salida total de la planta.
 */
@Entity
@Table(name = "macromedicion", uniqueConstraints = @UniqueConstraint(name = "uk_macro_periodo_sector", columnNames = { "anio", "mes", "sector_id" }))
@Getter
@Setter
@NoArgsConstructor
public class Macromedicion extends Entidad {
    @Min(2020) private int anio;
    @Min(1) @Max(12) private int mes;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "sector_id")
    private Sector sector;

    @PositiveOrZero private long volumen;

    /** MEDIDO (macromedidor) o ESTIMADO (horas de bombeo × caudal). */
    @Column(length = 10) private String origen = "ESTIMADO";
    @Column(length = 300) private String nota;
}

package co.emcagua.api.nomina;

import co.emcagua.api.comun.Entidad;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Lo que pasó en el mes con un empleado: días, horas extra, recargos, comisiones y descuentos. */
@Entity
@Table(name = "novedad_nomina", uniqueConstraints = @UniqueConstraint(columnNames = { "periodo_id", "empleado_id" }))
@Getter
@Setter
@NoArgsConstructor
public class NovedadNomina extends Entidad {
    @ManyToOne(fetch = FetchType.EAGER, optional = false) private PeriodoNomina periodo;
    @ManyToOne(fetch = FetchType.EAGER, optional = false) private Empleado empleado;

    @Min(0) @Max(30) private int dias = 30;
    /** Horas extra: diurnas, nocturnas, diurnas dominicales/festivas, nocturnas dominicales/festivas. */
    @Min(0) private double hed;
    @Min(0) private double hen;
    @Min(0) private double heddf;
    @Min(0) private double hendf;
    /** Horas ordinarias con recargo nocturno y dominical/festivo. */
    @Min(0) private double rn;
    @Min(0) private double rdf;
    @Min(0) private long comisiones;
    /** No salarial. */
    @Min(0) private long bonificacion;
    @Min(0) private long prestamo;
    @Min(0) private long libranza;
    @Min(0) private long retencion;
    @Min(0) private long otrosDescuentos;
    @Column(length = 300) private String nota;
}

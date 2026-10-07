package co.emcagua.api.facturacion;

import co.emcagua.api.comun.Entidad;
import co.emcagua.api.comun.Periodo;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Tarifa con la estructura de la CRA: cargo fijo + cargo por consumo (básico y complementario) y subsidios por estrato.
 * Aplica desde un periodo hacia adelante; nunca es retroactiva.
 */
@Entity
@Table(name = "tarifa", uniqueConstraints = @UniqueConstraint(columnNames = { "desde_anio", "desde_mes" }))
@Getter
@Setter
@NoArgsConstructor
public class Tarifa extends Entidad {
    @Min(2020) private int desdeAnio;
    @Min(1) @Max(12) private int desdeMes;

    @Min(0) private long acueductoCargoFijo;
    @Min(0) private long acueductoPorM3;
    @Min(0) private long alcantarilladoCargoFijo;
    @Min(0) private long alcantarilladoPorM3;

    /** m³ subsidiables al mes (consumo básico). */
    @Min(0) private int consumoBasico = 13;

    /** Subsidio por estrato (0.5 = 50 %). Topes legales: 70 %, 40 % y 15 %. */
    @DecimalMin("0") @DecimalMax("0.7") private double subsidioEstrato1;
    @DecimalMin("0") @DecimalMax("0.4") private double subsidioEstrato2;
    @DecimalMin("0") @DecimalMax("0.15") private double subsidioEstrato3;

    /** Acuerdo o resolución que la aprobó. */
    @Column(length = 200)
    private String soporte;

    public Periodo desde() { return new Periodo(desdeAnio, desdeMes); }

    public double subsidio(int estrato) {
        return switch (estrato) { case 1 -> subsidioEstrato1; case 2 -> subsidioEstrato2; case 3 -> subsidioEstrato3; default -> 0; };
    }
}

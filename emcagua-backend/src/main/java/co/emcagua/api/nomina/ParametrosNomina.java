package co.emcagua.api.nomina;

import co.emcagua.api.comun.Entidad;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Valores legales de nómina de un año (salario mínimo, aportes, recargos). Se editan cada enero. */
@Entity
@Table(name = "parametros_nomina")
@Getter
@Setter
@NoArgsConstructor
public class ParametrosNomina extends Entidad {
    @Column(nullable = false, unique = true) @Min(2020) private int anio;
    private long smmlv;
    private long auxilioTransporte;
    /** Divisor del valor hora (42 h/semana desde 15-jul-2026 ⇒ 210). */
    private int horasMes = 210;
    private double saludEmpleado = 0.04;
    private double pensionEmpleado = 0.04;
    private double saludEmpleador = 0.085;
    private double pensionEmpleador = 0.12;
    private double caja = 0.04;
    private double icbf = 0.03;
    private double sena = 0.02;
    /** Art. 114-1 E.T.: exonera salud del empleador, SENA e ICBF para trabajadores con menos de 10 SMMLV. */
    private boolean exoneradoParafiscales;
    private double recargoNocturno = 0.35;
    private double recargoDominical = 0.9;
    private double heDiurna = 1.25;
    private double heNocturna = 1.75;
    private int limiteHorasExtraMes = 48;
}

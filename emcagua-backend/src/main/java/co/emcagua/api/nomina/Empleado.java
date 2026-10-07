package co.emcagua.api.nomina;

import java.time.LocalDate;

import co.emcagua.api.comun.Entidad;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "empleado")
@Getter
@Setter
@NoArgsConstructor
public class Empleado extends Entidad {
    public enum Area { ADMINISTRATIVA, OPERATIVA }
    public enum Contrato { INDEFINIDO, TERMINO_FIJO }

    @NotBlank @Column(nullable = false, unique = true, length = 15) private String cedula;
    @NotBlank @Column(nullable = false, length = 120) private String nombre;
    @NotBlank @Column(nullable = false, length = 80) private String cargo;
    @NotNull @Enumerated(EnumType.STRING) @Column(nullable = false, length = 15) private Area area;
    @Min(0) private long salario;
    @NotNull private LocalDate fechaIngreso;
    @NotNull @Enumerated(EnumType.STRING) @Column(nullable = false, length = 15) private Contrato contrato;
    /** Clase de riesgo ARL (1 a 5). */
    @Min(1) @Max(5) private int riesgoArl = 1;
    @Column(length = 60) private String eps;
    @Column(length = 60) private String pension;
    @Min(0) private int diasVacacionesDisfrutados;
    private boolean activo = true;
    private LocalDate fechaRetiro;
}

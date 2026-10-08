package co.emcagua.api.suscriptores;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonIgnore;

import co.emcagua.api.comun.Entidad;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Dueño de uno o varios predios. Se identifica por la cédula (o NIT). */
@Entity
@Table(name = "propietario")
@Getter
@Setter
@NoArgsConstructor
public class Propietario extends Entidad {
    @NotBlank
    @Pattern(regexp = "\\d{5,15}", message = "Solo números, sin puntos")
    @Column(nullable = false, unique = true, length = 15)
    private String cedula;

    @NotBlank
    @Column(nullable = false, length = 120)
    private String nombre;

    @Pattern(regexp = "3\\d{9}|", message = "Celular de 10 dígitos que empiece por 3")
    @Column(length = 10)
    private String telefono;

    @Column(length = 120)
    private String correo;

    /** Contraseña de la oficina virtual (BCrypt). null = el suscriptor aún no ha creado su cuenta. Nunca sale en la API. */
    @JsonIgnore
    @Column(length = 100)
    private String clavePortal;

    /** Cuándo creó su cuenta en la oficina virtual. */
    private Instant cuentaPortalCreada;

    public boolean isCuentaPortal() { return clavePortal != null; }

    public Propietario(String cedula, String nombre, String telefono) {
        this.cedula = cedula;
        this.nombre = nombre;
        this.telefono = telefono;
    }
}

package co.emcagua.api.seguridad;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

import co.emcagua.api.comun.Entidad;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Cuenta de un funcionario para entrar al sistema. La contraseña se guarda cifrada (BCrypt), nunca en texto. */
@Entity
@Table(name = "cuenta")
@Getter
@Setter
@NoArgsConstructor
public class Cuenta extends Entidad {
    @NotBlank
    @Pattern(regexp = "[a-z0-9._-]{3,30}", message = "Usuario en minúsculas, sin espacios (3 a 30 caracteres)")
    @Column(nullable = false, unique = true, length = 30)
    private String usuario;

    @NotBlank
    @Column(nullable = false, length = 120)
    private String nombre;

    @Column(length = 80)
    private String cargo;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    private Rol rol;

    private boolean activo = true;

    private Instant ultimoAcceso;

    @JsonIgnore
    @Column(nullable = false, length = 100)
    private String claveHash;

    /** Solo para crear o cambiar la contraseña desde la API; se cifra antes de guardar y no se devuelve nunca. */
    @Transient
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String clave;

    public Cuenta(String usuario, String nombre, String cargo, Rol rol, String claveHash) {
        this.usuario = usuario;
        this.nombre = nombre;
        this.cargo = cargo;
        this.rol = rol;
        this.claveHash = claveHash;
    }
}

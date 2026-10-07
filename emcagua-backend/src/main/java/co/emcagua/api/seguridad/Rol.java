package co.emcagua.api.seguridad;

import java.util.LinkedHashSet;
import java.util.Set;

import co.emcagua.api.comun.Entidad;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Rol de los funcionarios con los módulos que puede ver. El rol fijo (Gerente) ve todo. */
@Entity
@Table(name = "rol")
@Getter
@Setter
@NoArgsConstructor
public class Rol extends Entidad {
    @NotBlank
    @Column(nullable = false, unique = true, length = 40)
    private String codigo;

    @NotBlank
    @Column(nullable = false, length = 80)
    private String nombre;

    @Column(length = 300)
    private String descripcion;

    /** Rol de administrador: tiene acceso a todos los módulos y no se puede borrar. */
    private boolean fijo;

    /** Ids de los módulos permitidos (iguales a las rutas del frontend: "pagos", "nomina"...). */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "rol_permiso", joinColumns = @JoinColumn(name = "rol_id"))
    @Column(name = "modulo", length = 40)
    private Set<String> permisos = new LinkedHashSet<>();

    public Rol(String codigo, String nombre, String descripcion, boolean fijo, Set<String> permisos) {
        this.codigo = codigo;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.fijo = fijo;
        this.permisos = new LinkedHashSet<>(permisos);
    }

    public boolean puede(String modulo) { return fijo || permisos.contains(modulo); }
}

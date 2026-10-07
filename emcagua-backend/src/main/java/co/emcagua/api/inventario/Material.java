package co.emcagua.api.inventario;

import co.emcagua.api.comun.Entidad;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Material de bodega (medidores, tubería, químicos, dotación). */
@Entity
@Table(name = "material")
@Getter
@Setter
@NoArgsConstructor
public class Material extends Entidad {
    public enum Categoria { MEDIDORES, TUBERIA_Y_ACCESORIOS, QUIMICOS_DE_PLANTA, DOTACION_Y_HERRAMIENTAS }

    @NotBlank @Column(nullable = false, unique = true, length = 20) private String codigo;
    @NotBlank @Column(nullable = false, length = 120) private String nombre;
    @NotNull @Enumerated(EnumType.STRING) @Column(nullable = false, length = 25) private Categoria categoria;
    @NotBlank @Column(nullable = false, length = 30) private String unidad;
    @Min(0) private int stock;
    @Min(0) private int minimo;
    @Min(0) private long costo;

    public Material(String codigo, String nombre, Categoria categoria, String unidad, int stock, int minimo, long costo) {
        this.codigo = codigo;
        this.nombre = nombre;
        this.categoria = categoria;
        this.unidad = unidad;
        this.stock = stock;
        this.minimo = minimo;
        this.costo = costo;
    }

    public String estadoStock() { return stock <= 0 ? "AGOTADO" : stock < minimo ? "BAJO" : "OK"; }
}

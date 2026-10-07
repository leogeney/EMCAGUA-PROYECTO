package co.emcagua.api.inventario;

import java.time.Instant;

import co.emcagua.api.comun.Entidad;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Entrada, salida o ajuste de un material. El stock se actualiza solo (ver InventarioControlador). */
@Entity
@Table(name = "movimiento_inventario")
@Getter
@Setter
@NoArgsConstructor
public class MovimientoInventario extends Entidad {
    public enum Tipo { ENTRADA, SALIDA, AJUSTE }

    @ManyToOne(fetch = FetchType.EAGER, optional = false) private Material material;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 10) private Tipo tipo;
    private int cantidad;
    private int stockResultante;
    @Column(nullable = false, length = 200) private String motivo;
    @Column(length = 120) private String usuario;
    @Column(nullable = false) private Instant fecha;
}

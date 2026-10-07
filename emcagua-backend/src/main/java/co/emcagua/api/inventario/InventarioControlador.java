package co.emcagua.api.inventario;

import java.time.Instant;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import co.emcagua.api.comun.ErrorNegocio;
import co.emcagua.api.comun.NoEncontrado;
import co.emcagua.api.seguridad.Sesion;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/inventario")
@Tag(name = "Inventario", description = "Entradas, salidas y ajustes de bodega")
public class InventarioControlador {
    private final MaterialRepositorio materiales;
    private final MovimientoRepositorio movimientos;

    public InventarioControlador(MaterialRepositorio materiales, MovimientoRepositorio movimientos) {
        this.materiales = materiales;
        this.movimientos = movimientos;
    }

    public record Mover(Long material, MovimientoInventario.Tipo tipo, int cantidad, String motivo) {}

    @Operation(summary = "Registrar una entrada, salida o ajuste (el ajuste deja el stock en la cantidad indicada)")
    @PostMapping("/mover")
    @Transactional
    public MovimientoInventario mover(@RequestBody Mover m) {
        Material mat = materiales.findById(m.material()).orElseThrow(() -> new NoEncontrado("No existe el material"));
        if (m.cantidad() < 0 || (m.tipo() != MovimientoInventario.Tipo.AJUSTE && m.cantidad() == 0)) throw new ErrorNegocio("Cantidad inválida");
        if (m.motivo() == null || m.motivo().isBlank()) throw new ErrorNegocio("Escribe el motivo del movimiento");
        int nuevo = switch (m.tipo()) {
            case ENTRADA -> mat.getStock() + m.cantidad();
            case SALIDA -> {
                if (m.cantidad() > mat.getStock()) throw new ErrorNegocio("Solo hay " + mat.getStock() + " " + mat.getUnidad() + " de " + mat.getNombre());
                yield mat.getStock() - m.cantidad();
            }
            case AJUSTE -> m.cantidad();
        };
        mat.setStock(nuevo);
        materiales.save(mat);
        MovimientoInventario mv = new MovimientoInventario();
        mv.setMaterial(mat);
        mv.setTipo(m.tipo());
        mv.setCantidad(m.cantidad());
        mv.setStockResultante(nuevo);
        mv.setMotivo(m.motivo().trim());
        mv.setUsuario(Sesion.nombre());
        mv.setFecha(Instant.now());
        return movimientos.save(mv);
    }
}

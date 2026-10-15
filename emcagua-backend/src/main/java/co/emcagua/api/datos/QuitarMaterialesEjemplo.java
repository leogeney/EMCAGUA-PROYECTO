package co.emcagua.api.datos;

import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import co.emcagua.api.comun.EmcaguaProps;
import co.emcagua.api.inventario.Material;
import co.emcagua.api.inventario.MaterialRepositorio;
import co.emcagua.api.inventario.MovimientoRepositorio;

/**
 * Antes la base nueva traía 14 materiales de ejemplo (M01…M14) en cero. Como todavía no se sabe
 * qué materiales usa la empresa, se quitan al arrancar, pero solo los de ejemplo que nadie ha usado
 * (sin existencias y sin movimientos). Los materiales que registre la empresa no se tocan.
 */
@Component
@Order(20)
public class QuitarMaterialesEjemplo implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(QuitarMaterialesEjemplo.class);
    private static final Set<String> EJEMPLO = Set.of("M01", "M02", "M03", "M04", "M05", "M06", "M07", "M08", "M09", "M10", "M11", "M12", "M13", "M14");

    private final MaterialRepositorio materiales;
    private final MovimientoRepositorio movimientos;
    private final EmcaguaProps props;

    public QuitarMaterialesEjemplo(MaterialRepositorio materiales, MovimientoRepositorio movimientos, EmcaguaProps props) {
        this.materiales = materiales;
        this.movimientos = movimientos;
        this.props = props;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (props.datosDemo()) return;
        Set<Long> usados = new java.util.HashSet<>();
        movimientos.findAll().forEach(m -> usados.add(m.getMaterial().getId()));
        var sobran = materiales.findAll().stream()
            .filter(m -> EJEMPLO.contains(m.getCodigo()) && m.getStock() == 0 && !usados.contains(m.getId()))
            .toList();
        if (sobran.isEmpty()) return;
        materiales.deleteAll(sobran);
        log.info("Inventario: se quitaron {} materiales de ejemplo sin uso.", sobran.size());
    }
}

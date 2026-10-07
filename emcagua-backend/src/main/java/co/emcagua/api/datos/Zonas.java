package co.emcagua.api.datos;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import co.emcagua.api.suscriptores.Sector;
import co.emcagua.api.suscriptores.SectorRepositorio;

/**
 * Sectores de la red y migración desde la versión anterior (cuando los "barrios" eran una lista fija de 4).
 * Corre en cada arranque: si no hay sectores, crea los 5 de El Carmen; si quedan columnas antiguas, las pasa al nuevo modelo.
 */
@Component
@Order(1)
public class Zonas implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(Zonas.class);
    public static final List<String> SECTORES = List.of("Centro", "Líbano", "Pique Tierra", "Calle Nueva", "San Luis");

    private final SectorRepositorio sectores;
    private final JdbcTemplate jdbc;

    public Zonas(SectorRepositorio sectores, JdbcTemplate jdbc) {
        this.sectores = sectores;
        this.jdbc = jdbc;
    }

    private boolean columnaTexto(String tabla, String columna) {
        Integer n = jdbc.queryForObject("select count(*) from information_schema.columns where table_schema = 'public' and table_name = ? and column_name = ? and data_type = 'character varying'",
            Integer.class, tabla, columna);
        return n != null && n > 0;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (sectores.count() == 0) {
            for (int i = 0; i < SECTORES.size(); i++) sectores.save(new Sector(SECTORES.get(i), i + 1));
            log.info("Sectores creados: {}", SECTORES);
        }
        // Versión anterior: predio.barrio era un texto (CENTRO, GUAMALITO…). Se pasa al sector que coincida (o al primero) y se quita.
        if (columnaTexto("predio", "barrio")) {
            Sector primero = sectores.findAllByOrderByOrdenAscNombreAsc().get(0);
            jdbc.update("update predio set sector_id = coalesce((select s.id from sector s where upper(translate(s.nombre, 'áéíóú ', 'aeiou_')) = predio.barrio), ?) where sector_id is null", primero.getId());
            jdbc.execute("alter table predio drop column barrio");
            log.info("Migración: predio.barrio (texto) pasó a sector_id");
        }
        if (columnaTexto("macromedicion", "sector")) {
            jdbc.update("delete from macromedicion");
            jdbc.execute("alter table macromedicion drop column sector");
            log.info("Migración: macromedicion.sector (texto) pasó a sector_id");
        }
    }
}

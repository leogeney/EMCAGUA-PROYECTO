package co.emcagua.api.datos;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Empezar de cero sin borrar la base de datos a mano: si al arrancar existe el archivo
 * "reiniciar-base-de-datos.txt" en la carpeta del backend, se vacían TODAS las tablas,
 * se borra el archivo y se vuelven a crear los datos iniciales (solo el administrador).
 * Es una acción que no se puede deshacer; por eso no está en la pantalla del sistema.
 */
@Component
@Order(0)
public class ReinicioBase implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(ReinicioBase.class);
    public static final Path MARCA = Path.of("reiniciar-base-de-datos.txt");

    private final JdbcTemplate jdbc;

    public ReinicioBase(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        if (!Files.exists(MARCA)) return;
        List<String> tablas = jdbc.queryForList("select tablename from pg_tables where schemaname = 'public'", String.class);
        if (!tablas.isEmpty()) jdbc.execute("truncate table " + String.join(", ", tablas.stream().map(t -> "\"" + t + "\"").toList()) + " restart identity cascade");
        Files.deleteIfExists(MARCA);
        log.warn("Base de datos reiniciada: se vaciaron {} tablas. Se crean de nuevo los datos iniciales.", tablas.size());
    }
}

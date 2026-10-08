package co.emcagua.api.respaldos;

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import co.emcagua.api.comun.ErrorNegocio;
import co.emcagua.api.empresa.ConfiguracionServicio;

/**
 * Copias de seguridad de la base de datos con pg_dump (formato comprimido de PostgreSQL).
 * Se hace una cada noche a las 11 p. m. y al encender el servidor si la última tiene más de un día.
 * Se guardan las últimas {@value #CONSERVAR}; opcionalmente se copia cada una a una segunda carpeta
 * (OneDrive, una memoria USB...) que se elige en Configuración.
 */
@Service
public class RespaldoServicio {
    private static final Logger log = LoggerFactory.getLogger(RespaldoServicio.class);
    public static final int CONSERVAR = 30;
    private static final ZoneId ZONA = ZoneId.of("America/Bogota");
    private static final DateTimeFormatter NOMBRE = DateTimeFormatter.ofPattern("yyyy-MM-dd_HHmm");

    private final Path carpeta;
    private final String pgBin;
    private final String url;
    private final String usuario;
    private final String clave;
    private final ConfiguracionServicio config;
    private volatile String ultimoError;
    private volatile Instant ultimoIntento;

    public RespaldoServicio(@Value("${emcagua.respaldos.carpeta}") String carpeta, @Value("${emcagua.respaldos.pg-bin}") String pgBin,
                            @Value("${spring.datasource.url}") String url, @Value("${spring.datasource.username}") String usuario,
                            @Value("${spring.datasource.password}") String clave, ConfiguracionServicio config) {
        this.carpeta = Path.of(carpeta);
        this.pgBin = pgBin;
        this.url = url;
        this.usuario = usuario;
        this.clave = clave;
        this.config = config;
    }

    public record Archivo(String nombre, long bytes, Instant fecha) {}
    public record Estado(String carpeta, String carpetaExtra, List<Archivo> archivos, String ultimoError, Instant ultimoIntento, int conservar) {}

    public Path carpeta() { return carpeta; }

    public Estado estado() {
        String extra = config.actual().getCarpetaRespaldoExtra();
        return new Estado(carpeta.toAbsolutePath().toString(), extra == null ? "" : extra, archivos(), ultimoError, ultimoIntento, CONSERVAR);
    }

    public List<Archivo> archivos() {
        if (!Files.isDirectory(carpeta)) return List.of();
        try (Stream<Path> s = Files.list(carpeta)) {
            return s.filter(p -> p.getFileName().toString().startsWith("emcagua-") && p.getFileName().toString().endsWith(".backup"))
                .map(p -> { try { return new Archivo(p.getFileName().toString(), Files.size(p), Files.getLastModifiedTime(p).toInstant()); } catch (IOException e) { return null; } })
                .filter(a -> a != null).sorted(Comparator.comparing(Archivo::fecha).reversed()).toList();
        } catch (IOException e) {
            return List.of();
        }
    }

    /** Archivo de un respaldo por su nombre (sin dejar salir de la carpeta). */
    public Path archivo(String nombre) {
        if (nombre == null || !nombre.matches("emcagua-[0-9_\\-]+\\.backup")) throw new ErrorNegocio("Nombre de respaldo inválido");
        Path p = carpeta.resolve(nombre);
        if (!Files.exists(p)) throw new ErrorNegocio("No existe ese respaldo");
        return p;
    }

    private String pgDump() {
        File f = Path.of(pgBin, System.getProperty("os.name", "").toLowerCase().contains("win") ? "pg_dump.exe" : "pg_dump").toFile();
        return f.exists() ? f.getAbsolutePath() : "pg_dump";
    }

    /** Hace una copia ahora. Devuelve el archivo creado o lanza el error con un mensaje claro. */
    public synchronized Archivo respaldar() {
        ultimoIntento = Instant.now();
        try {
            Files.createDirectories(carpeta);
            // jdbc:postgresql://host:puerto/base
            URI u = URI.create(url.replaceFirst("^jdbc:", ""));
            String host = u.getHost() == null ? "localhost" : u.getHost();
            int puerto = u.getPort() > 0 ? u.getPort() : 5432;
            String base = u.getPath().replaceFirst("^/", "").replaceAll("\\?.*$", "");
            Path destino = carpeta.resolve("emcagua-" + LocalDateTime.now(ZONA).format(NOMBRE) + ".backup");
            Path temporal = carpeta.resolve(destino.getFileName() + ".tmp");
            ProcessBuilder pb = new ProcessBuilder(pgDump(), "-h", host, "-p", String.valueOf(puerto), "-U", usuario, "-F", "c", "-Z", "6", "-f", temporal.toString(), base);
            pb.environment().put("PGPASSWORD", clave);
            pb.redirectErrorStream(true);
            Process proc = pb.start();
            String salida = new String(proc.getInputStream().readAllBytes());
            if (!proc.waitFor(10, TimeUnit.MINUTES)) { proc.destroyForcibly(); throw new IOException("pg_dump tardó demasiado"); }
            if (proc.exitValue() != 0 || !Files.exists(temporal) || Files.size(temporal) == 0) {
                Files.deleteIfExists(temporal);
                throw new IOException("pg_dump terminó con error: " + salida.trim());
            }
            Files.move(temporal, destino, StandardCopyOption.REPLACE_EXISTING);
            copiarAExtra(destino);
            limpiar();
            ultimoError = null;
            log.info("Copia de seguridad creada: {} ({} KB)", destino, Files.size(destino) / 1024);
            return new Archivo(destino.getFileName().toString(), Files.size(destino), Files.getLastModifiedTime(destino).toInstant());
        } catch (IOException e) {
            ultimoError = e.getMessage().contains("Cannot run program") ? "No encontré pg_dump (PostgreSQL). Revisa la ruta en emcagua.respaldos.pg-bin." : e.getMessage();
            log.error("No se pudo hacer la copia de seguridad: {}", ultimoError);
            throw new ErrorNegocio("No se pudo hacer la copia de seguridad: " + ultimoError);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ErrorNegocio("Se interrumpió la copia de seguridad");
        }
    }

    private void copiarAExtra(Path archivo) {
        String extra = config.actual().getCarpetaRespaldoExtra();
        if (extra == null || extra.isBlank()) return;
        try {
            Path destino = Path.of(extra.trim());
            Files.createDirectories(destino);
            Files.copy(archivo, destino.resolve(archivo.getFileName()), StandardCopyOption.REPLACE_EXISTING);
            // También se dejan solo las últimas copias en la carpeta extra
            try (Stream<Path> s = Files.list(destino)) {
                List<Path> viejos = new ArrayList<>(s.filter(p -> p.getFileName().toString().matches("emcagua-[0-9_\\-]+\\.backup")).sorted(Comparator.comparing(Path::getFileName).reversed()).toList());
                for (Path p : viejos.subList(Math.min(CONSERVAR, viejos.size()), viejos.size())) Files.deleteIfExists(p);
            }
        } catch (IOException | RuntimeException e) {
            // La copia principal sí quedó: se avisa pero no se considera fallida
            ultimoError = "La copia quedó en " + carpeta + " pero no se pudo copiar a la segunda carpeta (" + extra + "): " + e.getMessage();
            log.warn(ultimoError);
        }
    }

    private void limpiar() throws IOException {
        List<Archivo> todos = archivos();
        for (Archivo a : todos.subList(Math.min(CONSERVAR, todos.size()), todos.size())) Files.deleteIfExists(carpeta.resolve(a.nombre()));
    }

    /** Todas las noches a las 11:00 p. m. */
    @Scheduled(cron = "0 0 23 * * *", zone = "America/Bogota")
    public void nocturno() {
        try { respaldar(); } catch (RuntimeException e) { /* ya quedó registrado en ultimoError */ }
    }

    /** Al encender: si el computador estuvo apagado a las 11 p. m., se hace la copia que faltó. */
    @EventListener(ApplicationReadyEvent.class)
    public void alEncender() {
        List<Archivo> a = archivos();
        if (a.isEmpty() || Duration.between(a.get(0).fecha(), Instant.now()).toHours() >= 24) {
            Thread t = new Thread(() -> { try { respaldar(); } catch (RuntimeException e) { /* registrado */ } }, "respaldo-inicial");
            t.setDaemon(true);
            t.start();
        }
    }
}

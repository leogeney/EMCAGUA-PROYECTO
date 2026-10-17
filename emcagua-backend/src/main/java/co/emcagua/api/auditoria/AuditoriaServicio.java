package co.emcagua.api.auditoria;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import co.emcagua.api.seguridad.Cuenta;
import jakarta.servlet.http.HttpServletRequest;

@Service
public class AuditoriaServicio {
    private static final Logger log = LoggerFactory.getLogger(AuditoriaServicio.class);
    private static final ZoneId ZONA = ZoneId.of("America/Bogota");

    private final AuditoriaRepositorio repo;

    public AuditoriaServicio(AuditoriaRepositorio repo) {
        this.repo = repo;
    }

    /**
     * Obtiene la IP del cliente actual considerando proxies inversos (Nginx, Cloudflare).
     */
    public static String ipClienteActual() {
        try {
            var attrs = RequestContextHolder.getRequestAttributes();
            if (attrs instanceof ServletRequestAttributes sAttrs) {
                HttpServletRequest req = sAttrs.getRequest();
                String xff = req.getHeader("X-Forwarded-For");
                if (xff != null && !xff.isBlank()) {
                    return xff.split(",")[0].trim();
                }
                String realIp = req.getHeader("X-Real-IP");
                if (realIp != null && !realIp.isBlank()) {
                    return realIp.trim();
                }
                return req.getRemoteAddr();
            }
        } catch (Exception ignored) {}
        return "127.0.0.1";
    }

    /**
     * Registra una acción de auditoría con detección automática de usuario e IP.
     * Usa PROPAGATION_REQUIRES_NEW para garantizar que el registro se guarde incluso si
     * la transacción principal requiere auditoría previa.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditoriaLog registrar(String modulo, String accion, String descripcion,
                                  String entidadTipo, String entidadId, String detalle) {
        String usuario = "sistema";
        String nombre = "Sistema";
        String rol = "Sistema";

        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof Cuenta c) {
                usuario = c.getUsuario();
                nombre = c.getNombre();
                rol = c.getRol() != null ? c.getRol().getNombre() : "Funcionario";
            }
        } catch (Exception ignored) {}

        String ip = ipClienteActual();
        return registrar(usuario, nombre, rol, modulo, accion, descripcion, entidadTipo, entidadId, detalle, ip);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditoriaLog registrar(String usuario, String nombreUsuario, String rol,
                                  String modulo, String accion, String descripcion,
                                  String entidadTipo, String entidadId, String detalle, String ip) {
        try {
            AuditoriaLog l = new AuditoriaLog(usuario, nombreUsuario, rol, modulo, accion,
                                             descripcion, entidadTipo, entidadId, detalle, ip);
            return repo.save(l);
        } catch (Exception e) {
            log.warn("No se pudo guardar el log de auditoría: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Sobrecarga simple para registrar acciones sin entidad específica.
     */
    public AuditoriaLog registrar(String modulo, String accion, String descripcion) {
        return registrar(modulo, accion, descripcion, null, null, null);
    }

    /**
     * Búsqueda paginada y filtrada.
     */
    @Transactional(readOnly = true)
    public Page<AuditoriaLog> buscar(String usuario, String modulo, String accion,
                                    Instant desde, Instant hasta, String q, Pageable pageable) {
        return repo.buscarConFiltros(
            (usuario != null && !usuario.isBlank()) ? usuario.trim() : null,
            (modulo != null && !modulo.isBlank()) ? modulo.trim() : null,
            (accion != null && !accion.isBlank()) ? accion.trim() : null,
            desde,
            hasta,
            (q != null && !q.isBlank()) ? q.trim() : null,
            pageable
        );
    }

    /**
     * Estadísticas rápidas para el panel de auditoría.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> resumenEstadisticas() {
        Map<String, Object> m = new LinkedHashMap<>();
        Instant inicioHoy = LocalDate.now(ZONA).atStartOfDay(ZONA).toInstant();
        long totalHoy = repo.countByFechaGreaterThanEqual(inicioHoy);
        long totalGeneral = repo.count();

        m.put("totalHoy", totalHoy);
        m.put("totalGeneral", totalGeneral);
        m.put("usuarios", repo.usuariosDistintos());
        m.put("modulos", repo.modulosDistintos());
        m.put("acciones", repo.accionesDistintas());
        return m;
    }
}

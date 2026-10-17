package co.emcagua.api.auditoria;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import co.emcagua.api.comun.ErrorNegocio;
import co.emcagua.api.seguridad.Sesion;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/vista/auditoria")
@Tag(name = "Auditoría", description = "Consulta y trazabilidad de operaciones realizadas por los funcionarios")
public class AuditoriaControlador {
    private static final ZoneId ZONA = ZoneId.of("America/Bogota");
    private final AuditoriaServicio servicio;

    public AuditoriaControlador(AuditoriaServicio servicio) {
        this.servicio = servicio;
    }

    private static void exigirAuditoria() {
        if (!Sesion.cuenta().getRol().puede("auditoria") && !Sesion.cuenta().getRol().isFijo()) {
            throw new ErrorNegocio("Tu rol no tiene permiso para consultar el módulo de Auditoría");
        }
    }

    private static Map<String, Object> mapear(AuditoriaLog l) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", l.getId());
        m.put("fecha", l.getFecha().toEpochMilli());
        m.put("usuario", l.getUsuario());
        m.put("nombreUsuario", l.getNombreUsuario());
        m.put("rol", l.getRol());
        m.put("modulo", l.getModulo());
        m.put("accion", l.getAccion());
        m.put("descripcion", l.getDescripcion());
        m.put("entidadTipo", l.getEntidadTipo());
        m.put("entidadId", l.getEntidadId());
        m.put("detalle", l.getDetalle());
        m.put("ip", l.getIp());
        return m;
    }

    @Operation(summary = "Obtiene los logs de auditoría con filtros y resumen estadístico")
    @GetMapping
    @Transactional(readOnly = true)
    public Map<String, Object> listar(
        @RequestParam(required = false) String usuario,
        @RequestParam(required = false) String modulo,
        @RequestParam(required = false) String accion,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
        @RequestParam(required = false) String q,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "50") int size
    ) {
        exigirAuditoria();
        int tamano = Math.min(Math.max(1, size), 200);
        var pageable = PageRequest.of(Math.max(0, page), tamano);

        var desdeInst = desde != null ? desde.atStartOfDay(ZONA).toInstant() : null;
        var hastaInst = hasta != null ? hasta.plusDays(1).atStartOfDay(ZONA).toInstant() : null;

        Page<AuditoriaLog> resultado = servicio.buscar(usuario, modulo, accion, desdeInst, hastaInst, q, pageable);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("logs", resultado.getContent().stream().map(AuditoriaControlador::mapear).toList());
        resp.put("total", resultado.getTotalElements());
        resp.put("pagina", resultado.getNumber());
        resp.put("totalPaginas", resultado.getTotalPages());
        resp.put("resumen", servicio.resumenEstadisticas());
        return resp;
    }
}

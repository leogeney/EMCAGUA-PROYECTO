package co.emcagua.api.vista;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import co.emcagua.api.facturacion.FacturacionServicio;
import co.emcagua.api.pqr.EventoPqr;
import co.emcagua.api.pqr.EventoPqrRepositorio;
import co.emcagua.api.pqr.Pqr;
import co.emcagua.api.pqr.PqrRepositorio;
import co.emcagua.api.pqr.PqrServicio;
import co.emcagua.api.seguridad.Sesion;
import io.swagger.v3.oas.annotations.tags.Tag;

/** PQR con su historial, como las usa la pantalla de PQR. */
@RestController
@RequestMapping("/api/vista/pqrs")
@Tag(name = "Vista (frontend)")
public class PqrVista {
    private final PqrRepositorio repo;
    private final EventoPqrRepositorio eventos;
    private final PqrServicio servicio;

    public PqrVista(PqrRepositorio repo, EventoPqrRepositorio eventos, PqrServicio servicio) {
        this.repo = repo;
        this.eventos = eventos;
        this.servicio = servicio;
    }

    static Map<String, Object> dto(Pqr p, List<EventoPqr> historial) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("radicado", p.getRadicado());
        m.put("tipo", Etiquetas.TIPO_PQR.get(p.getTipo()));
        m.put("categoria", Etiquetas.CATEGORIA_PQR.get(p.getCategoria()));
        m.put("canal", Etiquetas.CANAL_PQR.get(p.getCanal()));
        if (p.getPredio() != null) m.put("suscriptorId", p.getPredio().getCodigo());
        m.put("nombre", p.getNombre());
        m.put("telefono", p.getTelefono() == null ? "" : p.getTelefono());
        m.put("barrio", p.getBarrio() == null ? "" : p.getBarrio());
        m.put("descripcion", p.getDescripcion());
        m.put("estado", Etiquetas.ESTADO_PQR.get(p.getEstado()));
        m.put("radicadaEn", p.getRadicadaEn().toEpochMilli());
        m.put("vence", p.getVence().atTime(LocalTime.of(18, 0)).atZone(FacturacionServicio.ZONA).toInstant().toEpochMilli());
        if (p.getResponsable() != null) m.put("responsable", p.getResponsable());
        if (p.getRespuesta() != null) m.put("respuesta", p.getRespuesta());
        if (p.getRespondidaEn() != null) m.put("respondidaEn", p.getRespondidaEn().toEpochMilli());
        List<Map<String, Object>> h = new ArrayList<>();
        for (EventoPqr e : historial) h.add(Map.of("ts", e.getFecha().toEpochMilli(), "usuario", e.getUsuario() == null ? "sistema" : e.getUsuario(), "accion", e.getAccion()));
        m.put("historial", h);
        return m;
    }

    private void exigir() {
        if (!Sesion.cuenta().getRol().puede("pqr")) throw new co.emcagua.api.comun.ErrorNegocio("Tu rol no tiene permiso para el módulo pqr");
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<Map<String, Object>> lista() {
        Map<Long, List<EventoPqr>> porPqr = eventos.findAll().stream()
            .sorted(Comparator.comparing(EventoPqr::getFecha))
            .collect(Collectors.groupingBy(e -> e.getPqr().getId()));
        return repo.findAll().stream()
            .sorted(Comparator.comparing(Pqr::getRadicadaEn).reversed())
            .map(p -> dto(p, porPqr.getOrDefault(p.getId(), List.of())))
            .toList();
    }

    public record Nueva(String tipo, String categoria, String canal, String suscriptorId, String nombre, String telefono, String barrio, String descripcion) {}

    @PostMapping
    @Transactional
    public Map<String, Object> radicar(@RequestBody Nueva n) {
        exigir();
        Pqr p = servicio.radicar(new PqrServicio.Radicacion(
            n.tipo() == null ? null : Etiquetas.de(Etiquetas.TIPO_PQR, n.tipo(), "el tipo"),
            n.categoria() == null ? null : Etiquetas.de(Etiquetas.CATEGORIA_PQR, n.categoria(), "la categoría"),
            n.canal() == null ? null : Etiquetas.de(Etiquetas.CANAL_PQR, n.canal(), "el canal"),
            n.suscriptorId(), n.nombre(), n.telefono() == null ? null : n.telefono().replaceAll("\\D", ""), n.barrio(), n.descripcion()), Sesion.nombre());
        return dto(p, eventos.findByPqrOrderByFechaAsc(p));
    }

    public record Texto(String texto) {}

    @PostMapping("/{radicado}/asignar")
    @Transactional
    public Map<String, Object> asignar(@PathVariable String radicado, @RequestBody Texto t) {
        exigir();
        Pqr p = servicio.asignar(radicado, t.texto(), Sesion.nombre());
        return dto(p, eventos.findByPqrOrderByFechaAsc(p));
    }

    @PostMapping("/{radicado}/responder")
    @Transactional
    public Map<String, Object> responder(@PathVariable String radicado, @RequestBody Texto t) {
        exigir();
        Pqr p = servicio.responder(radicado, t.texto(), Sesion.nombre());
        return dto(p, eventos.findByPqrOrderByFechaAsc(p));
    }

    @PostMapping("/{radicado}/estado")
    @Transactional
    public Map<String, Object> estado(@PathVariable String radicado, @RequestBody Texto t) {
        exigir();
        Pqr.Estado e = Etiquetas.de(Etiquetas.ESTADO_PQR, t.texto(), "el estado");
        Pqr p = e == Pqr.Estado.CERRADA ? servicio.cerrar(radicado, Sesion.nombre()) : servicio.buscar(radicado);
        if (e != Pqr.Estado.CERRADA) {
            p.setEstado(e);
            p = repo.save(p);
            eventos.save(new EventoPqr(p, Sesion.nombre(), "Estado: " + Etiquetas.ESTADO_PQR.get(e)));
        }
        return dto(p, eventos.findByPqrOrderByFechaAsc(p));
    }
}
